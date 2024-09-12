import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";
import { callChatCompletionsAPI } from "./ai";

export const storeClient = mutation({
  args: {
    lectureIds: v.array(v.id("lectures")),
  },
  handler: async (ctx, args) => {
    // Schedule the fetch and process action
    await ctx.scheduler.runAfter(0, internal.notes.fetchAndProcessTranscriptions, {
      lectureIds: args.lectureIds
    });

    return { success: true, message: "Lecture transcription processing scheduled." };
  },
});

export const fetchAndProcessTranscriptions = internalAction({
  args: {
    lectureIds: v.array(v.id("lectures")),
  },
  handler: async (ctx, args) => {
    const transcriptionChunks: string[] = [];

    for (const lectureId of args.lectureIds) {
      const lecture = await ctx.runQuery(internal.notes.getLecture, { lectureId });
      if (!lecture) {
        throw new Error(`Lecture with ID ${lectureId} not found.`);
      }

      for (const chunkId of lecture.lectureTranscription) {
        const chunkUrl = await ctx.storage.getUrl(chunkId);
        if (!chunkUrl) {
          throw new Error(`Transcription chunk with ID ${chunkId} not found.`);
        }

        const response = await fetch(chunkUrl);
        const chunkText = await response.text();
        transcriptionChunks.push(chunkText);
      }
    }

    // Schedule the note generation task
    await ctx.scheduler.runAfter(0, internal.notes.generateNotes, {
      transcriptionChunks,
      lectureIds: args.lectureIds
    });
  },
});

export const getLecture = internalQuery({
  args: { lectureId: v.id("lectures") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.lectureId);
  },
});

export const generateNotes = internalAction({
  args: {
    transcriptionChunks: v.array(v.string()),
    lectureIds: v.array(v.id("lectures"))
  },
  handler: async (ctx, args) => {
    const { transcriptionChunks } = args;
    const noteChunkIds: Id<"_storage">[] = [];

    for (const chunk of transcriptionChunks) {
      const noteChunk = await processChunk(chunk);
      const noteChunkBlob = new Blob([noteChunk], { type: 'text/plain' });
      const storageId = await ctx.storage.store(noteChunkBlob);
      noteChunkIds.push(storageId);
    }

    // Store the list of note chunk IDs in the database
    await ctx.runMutation(internal.notes.storeNotes, {
      noteChunkIds: noteChunkIds,
      lectureIds: args.lectureIds
    });
  }
});

export const storeNotes = internalMutation({
  args: {
    noteChunkIds: v.array(v.id("_storage")),
    lectureIds: v.array(v.id("lectures"))
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notes", {
      textChunks: args.noteChunkIds,
      lectureIds: args.lectureIds
    });
  }
});

async function processChunk(chunk: string): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are an expert note taker catering to any topic, any style. Summarize the following lecture chunk into concise, well-structured notes."
    },
    {
      role: "user",
      content: chunk
    }
  ];

  const response = await callChatCompletionsAPI(messages);
  return response;
}

