import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { generateEmbedding } from "./ai";

type StoreClientArgs = {
  lectureIds?: Id<"lectures">[];
  flashCardSetIds?: Id<"flashCardSets">[];
  noteIds?: Id<"notes">[];
  moduleId: Id<"modules">;
};

async function validateUserModule(
  ctx: QueryCtx | MutationCtx,
  moduleId: Id<"modules">,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authorized to use this endpoint.");
  }

  const user = await ctx.db.query("users").withIndex("by_clerkId").first();
  if (!user) {
    throw new Error("User not found.");
  }

  const moduleUser = await ctx.db.get(moduleId);
  if (!moduleUser) {
    throw new Error("Module not found.");
  }

  if (moduleUser.userId !== identity.subject) {
    throw new Error("Not allowed to access this module.");
  }

  return { user, moduleUser };
}

async function getModuleFromSources(
  ctx: MutationCtx,
  lectureIds: Id<"lectures">[],
  flashCardSetIds: Id<"flashCardSets">[],
) {
  const sources = [
    { type: "lecture", ids: lectureIds },
    { type: "flashcard", ids: flashCardSetIds },
  ];

  for (const source of sources) {
    if (source.ids.length > 0) {
      const item = await ctx.db.get(source.ids[0]);
      if (item?.moduleId) {
        return item.moduleId;
      }
    }
  }
  throw new Error("No valid source found to extract moduleId");
}

export const storeClient = mutation({
  args: {
    lectureIds: v.optional(v.array(v.id("lectures"))),
    flashCardSetIds: v.optional(v.array(v.id("flashCardSets"))),
    noteIds: v.optional(v.array(v.id("notes"))),
    moduleId: v.id("modules"),
  },
  handler: async (ctx, args: StoreClientArgs) => {
    const { user } = await validateUserModule(ctx, args.moduleId);

    await ctx.scheduler.runAfter(
      0,
      internal.noteAction.fetchAndProcessContent,
      {
        lectureIds: args.lectureIds ?? [],
        noteIds: args.noteIds ?? [],
        noteTakingStyle: user.noteTakingStyle,
        learningStyle: user.learningStyle,
        course: user.course,
        levelOfStudy: user.levelOfStudy,
        flashCardSetIds: args.flashCardSetIds ?? [],
        userId: user.clerkId,
      },
    );

    return {
      success: true,
      message: "Lecture transcription processing scheduled.",
    };
  },
});

export const storeNotes = internalMutation({
  args: {
    noteChunkIds: v.array(v.id("_storage")),
    lectureIds: v.array(v.id("lectures")),
    flashCardSetIds: v.array(v.id("flashCardSets")),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const moduleId = await getModuleFromSources(
      ctx,
      args.lectureIds,
      args.flashCardSetIds,
    );
    const moduleUser = await ctx.db.get(moduleId);
    if (!moduleUser) {
      throw new Error("Module not found");
    }

    const noteId = await ctx.db.insert("notes", {
      textChunks: args.noteChunkIds,
      lectureIds: args.lectureIds,
      flashCardSetIds: args.flashCardSetIds,
      moduleId,
      noteEmbedding: args.embedding,
    });

    await Promise.all([
      ctx.db.insert("notifications", {
        userId: moduleUser.userId,
        message: `Notes have been generated for ${moduleUser.name}`,
        type: "note_generation",
        relatedId: noteId,
        createdAt: new Date().toISOString(),
        isRead: false,
      }),
      ctx.scheduler.runAfter(0, internal.activities.store, {
        userId: moduleUser.userId,
        type: "Note Created",
        noteId,
      }),
    ]);
  },
});

export const getNotesForModule = query({
  args: {
    moduleId: v.id("modules"),
  },
  handler: async (ctx, args) => {
    await validateUserModule(ctx, args.moduleId);

    return ctx.db
      .query("notes")
      .withIndex("by_moduleId", (q) => q.eq("moduleId", args.moduleId))
      .order("desc")
      .collect();
  },
});

export const getNotesForModuleInternal = internalQuery({
  args: {
    moduleId: v.id("modules"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("notes")
      .withIndex("by_moduleId", (q) => q.eq("moduleId", args.moduleId))
      .order("desc")
      .collect();
  },
});

export const getNote = internalQuery({
  args: {
    noteId: v.id("notes"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Note not found.");
    }

    const moduleUser = await ctx.db.get(note.moduleId);
    if (!moduleUser || moduleUser.userId !== args.userId) {
      throw new Error("Not authorized to get this note.");
    }

    return note;
  },
});

export const searchNotesByContent = action({
  args: {
    moduleId: v.optional(v.id("modules")),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const queryEmbedding = await generateEmbedding(ctx, args.query);
    return ctx.vectorSearch("notes", "by_noteEmbedding", {
      vector: queryEmbedding,
      limit: 10,
      filter: args.moduleId
        ? (q) => q.eq("moduleId", args.moduleId as Id<"modules">)
        : undefined,
    });
  },
});

export const deleteNote = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error(`Note with ID ${args.noteId} not found.`);
    }

    await validateUserModule(ctx, note.moduleId);

    await Promise.all([
      ...note.textChunks.map((chunkId) => ctx.storage.delete(chunkId)),
      ctx.db.delete(args.noteId),
    ]);

    return { success: true, message: "Note deleted successfully." };
  },
});
