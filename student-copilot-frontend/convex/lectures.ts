import {
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import { generateEmbedding, transcribeAudioChunk } from "./ai";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
export const getLecturesByModuleId = query({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User not authenticated");
    }

    const moduleUser = await ctx.db.get(args.moduleId);

    if (!moduleUser) {
      throw new Error("Module not found");
    }

    if (moduleUser.userId !== identity.subject) {
      throw new Error("User not authorized to access this module");
    }

    const lectures = await ctx.db
      .query("lectures")
      .withIndex("by_moduleId", (q) => q.eq("moduleId", args.moduleId))
      .collect();

    if (!lectures) {
      return null;
    }

    const lecturesWithUrl = await Promise.all(
      lectures.map(async (lecture) => {
        const contentUrl = await ctx.storage.getUrl(lecture.contentUrl);

        const imageUrl =
          lecture.image !== undefined
            ? await ctx.storage.getUrl(lecture.image)
            : undefined;

        // Assert that these URLs are always strings
        if (contentUrl === null) {
          throw new Error("Expected content URL and image URL to be non-null");
        }

        return {
          ...lecture,
          contentUrl,
          image: imageUrl,
        };
      }),
    );

    return lecturesWithUrl;
  },
});

export const getLecturesByModuleIdInternal = internalQuery({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, args) => {
    const lectures = await ctx.db
      .query("lectures")
      .withIndex("by_moduleId", (q) => q.eq("moduleId", args.moduleId))
      .collect();

    const lecturesWithUrl = await Promise.all(
      lectures.map(async (lecture) => {
        const contentUrl = await ctx.storage.getUrl(lecture.contentUrl);

        const transcriptionIds = lecture.lectureTranscription;

        const lectureTranscription = await Promise.all(
          transcriptionIds.map((id) => ctx.storage.getUrl(id)),
        );

        const imageUrl =
          lecture.image !== undefined
            ? await ctx.storage.getUrl(lecture.image)
            : undefined;

        // Assert that these URLs are always strings
        if (contentUrl === null) {
          throw new Error("Expected content URL and image URL to be non-null");
        }

        return {
          ...lecture,
          contentUrl,
          lectureTranscription,
          image: imageUrl,
        };
      }),
    );

    return lecturesWithUrl;
  },
});

export const getLecturesByIds = query({
  args: { lectureIds: v.array(v.id("lectures")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User not authenticated");
    }

    const firstLecture = await ctx.db.get(args.lectureIds[0]);

    if (!firstLecture) {
      throw new Error("Lecture not found");
    }

    const moduleUser = await ctx.db.get(firstLecture.moduleId);

    if (!moduleUser) {
      throw new Error("Module not found");
    }

    if (moduleUser.userId !== identity.subject) {
      throw new Error("User not authorized to access this module");
    }

    const lectures = await Promise.all(
      args.lectureIds.map(async (id) => {
        const lecture = await ctx.db.get(id);

        if (lecture == null) {
          throw new Error("lecture cannot be null in chat.");
        }

        const contentUrl = await ctx.storage.getUrl(lecture.contentUrl);
        const imageUrl =
          lecture.image !== undefined
            ? await ctx.storage.getUrl(lecture.image)
            : undefined;

        // Assert that these URLs are always strings
        if (contentUrl === null) {
          throw new Error("Expected content URL and image URL to be non-null");
        }

        return {
          ...lecture,
          contentUrl: contentUrl,
          image: imageUrl,
        };
      }),
    );
    return lectures;
  },
});

export const getLecturesByIdsInternal = internalQuery({
  args: { lectureIds: v.array(v.id("lectures")) },
  handler: async (ctx, args) => {
    const lectures = await Promise.all(
      args.lectureIds.map(async (id) => {
        const lecture = await ctx.db.get(id);

        if (lecture == null) {
          throw new Error("lecture cannot be null in chat.");
        }

        const contentUrl = await ctx.storage.getUrl(lecture.contentUrl);
        const imageUrl =
          lecture.image !== undefined
            ? await ctx.storage.getUrl(lecture?.image)
            : null;

        // Assert that these URLs are always strings
        if (contentUrl === null) {
          throw new Error("Expected content URL and image URL to be non-null");
        }

        return {
          ...lecture,
          contentUrl: contentUrl,
          image: imageUrl,
        };
      }),
    );
    return lectures;
  },
});

export const updateLectureCompletion = mutation({
  args: { id: v.id("lectures"), completed: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Called getUser without authentication present.");
    }

    const lecture = await ctx.db.get(args.id);

    if (lecture == null) {
      throw new Error("Lecture not allowed to be null.");
    }

    const moduleId = lecture.moduleId;

    const moduleUser = await ctx.db
      .query("modules")
      .filter((q) => q.eq(q.field("_id"), moduleId))
      .first();

    if (moduleUser == null) {
      throw new Error("Module not allowed to be null.");
    }

    if (moduleUser.userId != identity.subject) {
      throw new Error("You are not authorized to modify this lecture.");
    }

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId: moduleUser.userId,
      message: `Lecture "${lecture.title}" has been marked as ${args.completed ? "completed" : "incomplete"}`,
      type: "lecture_completion_update",
      relatedId: args.id,
    });

    await ctx.db.patch(args.id, { completed: args.completed });
  },
});

export const searchLecturesByTranscription = action({
  args: {
    moduleId: v.id("modules"),
    query: v.string(),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Called getUser without authentication present.");
    }

    const moduleUser = await ctx.runQuery(internal.modules.getByIdInternal, {
      id: args.moduleId,
    });

    if (moduleUser == null) {
      throw new Error("Module not allowed to be null.");
    }
    if (moduleUser.userId !== identity.subject) {
      throw new Error("You are not authorized to search this module.");
    }

    // Generate embedding for the query
    const embedding = await generateEmbedding(args.query);

    // Perform vector search
    const results = await ctx.vectorSearch(
      "lectures",
      "by_lectureTranscriptionEmbedding",
      {
        vector: embedding,
        limit: 10,
        filter: (q) => q.eq("moduleId", args.moduleId),
      },
    );

    return results;
  },
});

export const store = mutation({
  args: {
    contentStorageId: v.id("_storage"),
    lectureTranscription: v.array(v.id("_storage")),
    lectureTranscriptionEmbedding: v.array(v.float64()),
    title: v.string(),
    description: v.optional(v.string()),
    moduleId: v.id("modules"),
    completed: v.boolean(),
    fileType: v.union(
      v.literal("pdf"),
      v.literal("audio"),
      v.literal("video"),
      v.literal("website"),
    ),
    image: v.optional(v.id("_storage")),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Called getUser without authentication present.");
    }

    const module = await ctx.db
      .query("modules")
      .filter((q) => q.eq(q.field("_id"), args.moduleId))
      .first();

    if (!module) {
      throw new Error("Module not allowed to be null.");
    }

    if (module.userId !== identity.subject) {
      throw new Error("You are not allowed to upload lectures to this module.");
    }

    const lectureId = await ctx.db.insert("lectures", {
      title: args.title,
      description: args.description,
      contentUrl: args.contentStorageId,
      lectureTranscription: args.lectureTranscription,
      lectureTranscriptionEmbedding: args.lectureTranscriptionEmbedding,
      moduleId: args.moduleId,
      completed: args.completed,
      userId: identity.subject,
      fileType: args.fileType,
      image: args.image,
    });

    // Schedule notification
    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId: module.userId,
      message: `New lecture "${args.title}" has been added to the module`,
      type: "new_lecture",
      relatedId: lectureId,
    });

    await ctx.scheduler.runAfter(0, internal.activities.store, {
      userId: identity.subject,
      type: "lecture_created",
      lectureId,
    });
  },
});

export const deleteLecture = mutation({
  args: {
    id: v.id("lectures"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Called getUser without authentication present.");
    }

    const lecture = await ctx.db.get(args.id);

    if (lecture == null) {
      throw new Error("Lecture is not found.");
    }

    const moduleId = lecture.moduleId;

    const moduleUser = await ctx.db.get(moduleId);

    if (moduleUser == null) {
      throw new Error("Module cannot be null.");
    }

    if (moduleUser.userId != identity.subject) {
      throw new Error("Not authorized to delete this module.");
    }

    await ctx.scheduler.runAfter(0, internal.lectures.deleteLectureVideo, {
      videoId: lecture.contentUrl,
    });

    await ctx.db.delete(lecture._id);

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId: moduleUser.userId,
      message: `Lecture "${lecture.title}" has been deleted`,
      type: "lecture_deleted",
      relatedId: args.id,
    });

    return args.id;
  },
});

export const deleteLectureVideo = internalMutation({
  args: {
    videoId: v.id("_storage"),
  },

  handler: async (ctx, args) => {
    await ctx.storage.delete(args.videoId);
  },
});

export const transcribeAudio = action({
  args: {
    audioChunk: v.bytes(),
    chunkIndex: v.number(),
  },

  handler: async (ctx, args) => {
    try {
      // Transcribe the audio chunk
      const transcription = await transcribeAudioChunk(args.audioChunk);

      // Generate embedding for the transcription
      const embedding = await generateEmbedding(transcription);

      // Store the transcription as a Blob
      const transcriptionBlob = new Blob([transcription], {
        type: "text/plain",
      });
      const storageId = await ctx.storage.store(transcriptionBlob);

      // Return the results
      return { storageId, embedding, chunkIndex: args.chunkIndex };
    } catch (error) {
      console.error("Error in transcribeAudio:", error);
      throw new Error(
        `Failed to process audio chunk ${args.chunkIndex}: ${error}`,
      );
    }
  },
});

export const fetchTranscription = internalAction({
  args: {
    transcriptionIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { transcriptionIds } = args;

    const transcription = await Promise.all(
      transcriptionIds.map(async (transcriptionId) => {
        const url = await ctx.storage.getUrl(transcriptionId);
        if (!url) throw new Error("COntent url cannot be null.");

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch transcription: ${response.statusText}`,
          );
        }
        return response.text();
      }),
    );

    return transcription.join("\n");
  },
});

export const getLecture = internalQuery({
  args: { lectureId: v.id("lectures") },
  handler: async (ctx, args) => {
    const lecture = await ctx.db.get(args.lectureId);
    if (!lecture) {
      throw new Error("Lecture not found");
    }
    return lecture;
  },
});

export const getLectureContent = internalAction({
  args: { lectureId: v.id("lectures") },
  handler: async (ctx, args): Promise<string[]> => {
    const lecture = await ctx.runQuery(internal.lectures.getLecture, {
      lectureId: args.lectureId,
    });
    if (!lecture) {
      throw new Error(`Lecture ${args.lectureId} not found`);
    }

    const chunks: string[] = [];
    for (const chunkId of lecture.lectureTranscription) {
      const url = await ctx.storage.getUrl(chunkId as Id<"_storage">);
      if (!url) continue;

      const response = await fetch(url);
      const text = await response.text();
      chunks.push(text);
    }

    return chunks;
  },
});
