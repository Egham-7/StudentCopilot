
import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { generateEmbedding, transcribeAudioChunk } from "./ai";
import { internal } from "./_generated/api";

export const getLecturesByModuleId = query({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lectures")
      .withIndex("by_moduleId", (q) => q.eq("moduleId", args.moduleId))
      .collect();
  },
});

export const updateLectureCompletion = mutation({
  args: { id: v.id("lectures"), completed: v.boolean() },
  handler: async (ctx, args) => {

    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Called getUser without authentication present.");
    }

    const lecture = await ctx.db
      .query("lectures")
      .filter(q => q.eq(q.field("_id"), args.id))
      .first()


    if (lecture == null) {
      throw new Error("Lecture not allowed to be null.");
    }

    const moduleId = lecture.moduleId;

    const moduleUser = await ctx.db.query("modules").filter(q => q.eq(q.field("_id"), moduleId)).first()

    if (moduleUser == null) {
      throw new Error("Module not allowed to be null.");
    }


    if (moduleUser.userId != identity.subject) {
      throw new Error("You are not authorized to modify this lecture.");
    }

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId: moduleUser.userId,
      message: `Lecture "${lecture.title}" has been marked as ${args.completed ? 'completed' : 'incomplete'}`,
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

    // Generate embedding for the query
    const embedding = await generateEmbedding(args.query);

    // Perform vector search
    const results = await ctx.vectorSearch("lectures", "by_lectureTranscriptionEmbedding", {
      vector: embedding,
      limit: 10,
      filter: (q) => q.eq("moduleId", args.moduleId),
    });

    return results;
  },
});

export const store = mutation({

  args:

  {
    contentStorageId: v.id("_storage"),
    lectureTranscription: v.array(v.id("_storage")),
    lectureTranscriptionEmbedding: v.array(v.float64()),
    title: v.string(),
    description: v.optional(v.string()),
    moduleId: v.id("modules"),
    completed: v.boolean()
  },

  handler: async (ctx, args) => {


    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Called getUser without authentication present.");
    }


    const module = await ctx.db
      .query("modules")
      .filter(q => q.eq(q.field("_id"), args.moduleId))
      .first()


    if (module == null) {
      throw new Error("Module not allowed to be null.");
    }


    if (module.userId != identity.subject) {
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
      userId: identity.subject

    })

    // Schedule notification
    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId: module.userId,
      message: `New lecture "${args.title}" has been added to the module`,
      type: "new_lecture",
      relatedId: lectureId,
    });


  }
})

export const deleteLecture = mutation({

  args: {
    id: v.id("lectures")
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


    await ctx.scheduler.runAfter(0, internal.lectures.deleteLectureVideo, { videoId: lecture.contentUrl })



    await ctx.db.delete(lecture._id);

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId: moduleUser.userId,
      message: `Lecture "${lecture.title}" has been deleted`,
      type: "lecture_deleted",
      relatedId: args.id,
    });


    return args.id;

  }
})

export const deleteLectureVideo = internalMutation({

  args: {
    videoId: v.id("_storage")
  },

  handler: async (ctx, args) => {


    await ctx.storage.delete(args.videoId);
  }
})




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
      const transcriptionBlob = new Blob([transcription], { type: 'text/plain' });
      const storageId = await ctx.storage.store(transcriptionBlob);

      // Return the results
      return { storageId, embedding, chunkIndex: args.chunkIndex };
    } catch (error) {
      console.error("Error in transcribeAudio:", error);
      throw new Error(`Failed to process audio chunk ${args.chunkIndex}: ${error}`);
    }
  },
});

