import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { generateEmbedding, transcribeAudioChunk } from "./ai";
import { Id } from "./_generated/dataModel";

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
    await ctx.db.patch(args.id, { completed: args.completed });
  },
});


export const searchLecturesByTranscription = action({
  args: {
    moduleId: v.id("modules"),
    query: v.string(),
  },

  handler: async (ctx, args) => {
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
    videoStorageId: v.id("_storage"),
    lectureTranscription: v.array(v.id("_storage")),
    lectureTranscriptionEmbedding: v.array(v.float64()),
    title: v.string(),
    description: v.optional(v.string()),
    moduleId: v.id("modules"),
    completed: v.boolean()
  },

  handler: async (ctx, args) => {


    ctx.db.insert("lectures", {
      title: args.title,
      description: args.description,
      videoUrl: args.videoStorageId,
      lectureTranscription: args.lectureTranscription,
      lectureTranscriptionEmbedding: args.lectureTranscriptionEmbedding,
      moduleId: args.moduleId,
      completed: args.completed

    })

  }
})


export const extractAudioAndTranscribe = action({
  args: {
    videoChunk: v.bytes(),
    chunkIndex: v.number(),
  },
  handler: async (ctx, args) => {


    const transcription = await transcribeAudioChunk(args.videoChunk);

    // Generate embedding for the transcription
    const embedding = await generateEmbedding(transcription);

    const paddedEmbedding = embedding.concat(Array(1536 - embedding.length).fill(0));

    // Store the transcription
    const uploadUrl = await ctx.storage.generateUploadUrl();
    const transcriptionResult = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcription })
    });

    if (!transcriptionResult.ok) {
      throw new Error('Failed to upload transcription');
    }

    const uploadResult = await transcriptionResult.json();
    const storageId = uploadResult.storageId as Id<"_storage">;

    return { storageId, paddedEmbedding };
  }
});
