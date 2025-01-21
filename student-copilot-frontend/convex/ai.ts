import { v } from "convex/values";
import OpenAI from "openai";
import { action, internalAction, ActionCtx } from "./_generated/server";
import { embeddingsCache, transcriptionCache } from "./index";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Internal actions for caching
export const generateEmbeddingAction = internalAction({
  args: { text: v.string() },
  handler: async (_ctx, args) => {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: args.text,
    });
    return response.data[0].embedding;
  },
});

export const transcribeAudioAction = internalAction({
  args: {
    audioChunkBase64: v.string(),
  },
  handler: async (_ctx, args) => {
    const audioChunk = Buffer.from(args.audioChunkBase64, "base64");
    const file = new File([audioChunk], "audio.wav", { type: "audio/wav" });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });
    return transcription.text;
  },
});

// Public functions using cache
export const generateEmbedding = async (
  ctx: ActionCtx,
  text: string,
): Promise<Array<number>> => {
  const result = embeddingsCache.fetch(ctx, { text });

  return result;
};

export async function transcribeAudioChunk(
  audioChunk: ArrayBuffer,
  ctx: ActionCtx,
) {
  try {
    const base64Chunk = Buffer.from(audioChunk).toString("base64");
    return await transcriptionCache.fetch(ctx, {
      audioChunkBase64: base64Chunk,
    });
  } catch (error) {
    console.error("Error transcribing audio chunk:", error);
    throw error;
  }
}

export const generateTextEmbeddingClient = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args): Promise<number[]> => {
    return await embeddingsCache.fetch(ctx, { text: args.text });
  },
});

// Utility functions to manage cache
export const clearEmbeddingsCache = action({
  handler: async (ctx) => {
    await embeddingsCache.removeAllForName(ctx);
  },
});

export const clearTranscriptionCache = action({
  handler: async (ctx) => {
    await transcriptionCache.removeAllForName(ctx);
  },
});

export const clearSpecificEmbedding = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    await embeddingsCache.remove(ctx, { text: args.text });
  },
});
