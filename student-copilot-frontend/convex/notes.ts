import { internalAction, internalMutation, internalQuery, mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import OpenAI from "openai";
import { callChatCompletionsAPI, generateEmbedding } from "./ai";

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

    // Process chunks in parallel
    const chunkPromises = transcriptionChunks.map(async (chunk) => {
      const noteChunk = await processChunk(chunk);
      const noteChunkBlob = new Blob([noteChunk], { type: 'text/plain' });
      const storageId = await ctx.storage.store(noteChunkBlob);

      // Generate embedding for the chunk
      const embedding = await generateEmbedding(noteChunk);

      return { storageId, embedding };
    });

    const processedChunks = await Promise.all(chunkPromises);

    const noteChunkIds: Id<"_storage">[] = [];
    const allEmbeddings: number[][] = [];

    for (const { storageId, embedding } of processedChunks) {
      noteChunkIds.push(storageId);
      allEmbeddings.push(embedding);
    }

    // Concatenate embeddings into a single 1536-dimensional vector
    const concatenatedEmbedding: number[] = [];
    for (let i = 0; i < 1536; i++) {
      const sum = allEmbeddings.reduce((acc, embedding) => acc + (embedding[i] || 0), 0);
      concatenatedEmbedding.push(sum / allEmbeddings.length);
    }

    // Store the list of note chunk IDs and the concatenated embedding in the database
    await ctx.runMutation(internal.notes.storeNotes, {
      noteChunkIds: noteChunkIds,
      lectureIds: args.lectureIds,
      embedding: concatenatedEmbedding
    });
  }
});




export const storeNotes = internalMutation({
  args: {
    noteChunkIds: v.array(v.id("_storage")),
    lectureIds: v.array(v.id("lectures")),
    embedding: v.array(v.float64())
  },
  handler: async (ctx, args) => {

    const firstLectureId = args.lectureIds[0];

    const firstLecture = await ctx.db.get(firstLectureId);

    if (firstLecture == null) {
      throw new Error("Lectures must be present for notes.");
    }

    const moduleId = firstLecture?.moduleId;

    await ctx.db.insert("notes", {
      textChunks: args.noteChunkIds,
      lectureIds: args.lectureIds,
      moduleId: moduleId,
      noteEmbedding: args.embedding
    });
  }
});

async function processChunk(chunk: string): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are an expert note-taker and summarizer with a keen ability to distill complex information into clear, concise, and well-structured notes. Your task is to:

1. Analyze the given lecture chunk thoroughly.
2. Create a comprehensive summary in Markdown format.
3. Use appropriate Markdown syntax for headings, subheadings, lists, and emphasis.
4. Highlight key concepts, definitions, and important points.
5. Organize the information logically and hierarchically.
6. Include any relevant examples or case studies mentioned.
7. If applicable, add bullet points for easy readability.
8. Ensure the notes are concise yet informative.
9. Use code blocks for any technical content or formulas.
10. End with a brief "Key Takeaways" section if appropriate.

Produce notes that would be valuable for review and quick reference.`
    },
    {
      role: "user",
      content: `Please summarize the following lecture chunk into well-structured Markdown notes:

${chunk}`
    }
  ];

  const response = await callChatCompletionsAPI(messages);
  return response;
}


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
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.noteId);
  },
});

export const getNoteById = action({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args): Promise<Doc<"notes" & { content: string }>> => {
    const note = await ctx.runQuery(internal.notes.getNote, { noteId: args.noteId });
    if (!note) {
      throw new Error(`Note with ID ${args.noteId} not found.`);
    }

    // Fetch content for each text chunk
    const textContent = await Promise.all(
      note.textChunks.map(async (chunkId) => {
        const url = await ctx.storage.getUrl(chunkId);
        if (!url) {
          throw new Error(`Failed to get URL for chunk ${chunkId}`);
        }
        const response = await fetch(url);
        return response.text();
      })
    );

    // Combine all text chunks
    const fullContent = textContent.join("\n");

    return {
      ...note,
      content: fullContent,
    };
  },
});


export const searchNotesByContent = action({
  args: {
    moduleId: v.optional(v.id("modules")),
    query: v.string()
  },
  handler: async (ctx, args) => {
    const queryEmbedding = await generateEmbedding(args.query);

    const notes = await ctx.vectorSearch("notes", "by_noteEmbedding", {
      vector: queryEmbedding,
      limit: 10,
      filter: args.moduleId
        ? (q) => q.eq("moduleId", args.moduleId as Id<"modules">)
        : undefined
    });

    return notes;
  }
});


