
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query
} from "./_generated/server";
import { generateEmbedding } from "./ai";

export const storeClient = mutation({
  args: {
    lectureIds: v.array(v.id("lectures")),
    moduleId: v.id("modules"),
  },
  handler: async (ctx, args) => {
    // Schedule the fetch and process action

    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authorized to use this endpoint.");
    }

    const user = await ctx.db.query("users").withIndex("by_clerkId").first();

    if (!user) {
      throw new Error("User not found.");
    }

    const moduleUser = await ctx.db.get(args.moduleId);

    if (!moduleUser) {
      throw new Error("Module not found.");
    }

    if (moduleUser.userId !== identity.subject) {
      throw new Error("Not allowed to create notes for this module.");
    }

    await ctx.scheduler.runAfter(
      0,
      internal.noteAction.fetchAndProcessTranscriptions,
      {
        lectureIds: args.lectureIds,
        noteTakingStyle: user.noteTakingStyle,
        learningStyle: user.learningStyle,
        course: user.course,
        levelOfStudy: user.levelOfStudy,
      },
    );

    return {
      success: true,
      message: "Lecture transcription processing scheduled.",
    };
  },
});

export const getLecture = internalQuery({
  args: { lectureId: v.id("lectures") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.lectureId);
  },
});

export const storeNotes = internalMutation({
  args: {
    noteChunkIds: v.array(v.id("_storage")),
    lectureIds: v.array(v.id("lectures")),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const firstLectureId = args.lectureIds[0];

    const firstLecture = await ctx.db.get(firstLectureId);

    if (firstLecture == null) {
      throw new Error("Lectures must be present for notes.");
    }

    const moduleId = firstLecture?.moduleId;

    const moduleUser = await ctx.db.get(moduleId);

    if (moduleUser == null) {
      throw new Error("Module cannot be null.");
    }

    const noteId = await ctx.db.insert("notes", {
      textChunks: args.noteChunkIds,
      lectureIds: args.lectureIds,
      moduleId: moduleId,
      noteEmbedding: args.embedding,
    });

    // Create a notification for the user
    await ctx.db.insert("notifications", {
      userId: moduleUser.userId,
      message: `Notes have been generated for ${moduleUser.name}`,
      type: "note_generation",
      relatedId: noteId,
      createdAt: new Date().toISOString(),
      isRead: false,
    });

    await ctx.scheduler.runAfter(0, internal.activities.store, {
      userId: moduleUser.userId,
      type: "note_created",
      noteId,
    });
  },
});

export const getNotesForModule = query({
  args: {
    moduleId: v.id("modules"),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_moduleId", (q) => q.eq("moduleId", args.moduleId))
      .order("desc")
      .collect();

    return notes;
  },
});

export const getNote = internalQuery({
  args: { noteId: v.id("notes"), userId: v.string() },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);

    if (!note) {
      throw new Error("Note not found.");
    }

    const moduleUser = await ctx.db.get(note.moduleId);

    if (moduleUser == null) {
      throw new Error("Module not allowed to be null.");
    }

    if (args.userId != moduleUser.userId) {
      throw new Error("Not authorized to get this note.");
    }
    return await ctx.db.get(args.noteId);
  },
});

export const searchNotesByContent = action({
  args: {
    moduleId: v.optional(v.id("modules")),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const queryEmbedding = await generateEmbedding(args.query);

    const notes = await ctx.vectorSearch("notes", "by_noteEmbedding", {
      vector: queryEmbedding,
      limit: 10,
      filter: args.moduleId
        ? (q) => q.eq("moduleId", args.moduleId as Id<"modules">)
        : undefined,
    });

    return notes;
  },
});

export const deleteNote = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Authentication not present.");
    }

    const note = await ctx.db.get(args.noteId);

    if (!note) {
      throw new Error(`Note with ID ${args.noteId} not found.`);
    }

    const moduleUser = await ctx.db.get(note.moduleId);

    if (!moduleUser) {
      throw new Error("Module cannot be null.");
    }

    if (moduleUser.userId != identity.subject) {
      throw new Error("Not authorized to delete this note.");
    }

    // Delete the note's text chunks from storage
    for (const chunkId of note.textChunks) {
      await ctx.storage.delete(chunkId);
    }

    // Delete the note from the database
    await ctx.db.delete(args.noteId);

    return { success: true, message: "Note deleted successfully." };
  },
});




