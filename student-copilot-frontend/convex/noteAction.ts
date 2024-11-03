"use node";
import { internal } from "./_generated/api";

import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
} from "./_generated/server";
import { generateEmbedding } from "./ai";
import { graph } from "./aiAgent/noteAgent";
import { exponentialBackoff } from "./utils";

export const fetchAndProcessTranscriptions = internalAction({
  args: {
    lectureIds: v.array(v.id("lectures")),
    noteTakingStyle: v.string(),
    learningStyle: v.union(
      v.literal("auditory"),
      v.literal("visual"),
      v.literal("kinesthetic"),
      v.literal("analytical"),
    ),
    course: v.string(),
    levelOfStudy: v.union(
      v.literal("Bachelors"),
      v.literal("Associate"),
      v.literal("Masters"),
      v.literal("PhD"),
    ),
  },
  handler: async (ctx, args) => {
    const transcriptionChunks: string[] = [];

    for (const lectureId of args.lectureIds) {
      const lecture = await ctx.runQuery(internal.notes.getLecture, {
        lectureId,
      });
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
    await ctx.scheduler.runAfter(0, internal.noteAction.generateNotes, {
      transcriptionChunks,
      lectureIds: args.lectureIds,
      noteTakingStyle: args.noteTakingStyle,
      learningStyle: args.learningStyle,
      course: args.course,
      levelOfStudy: args.levelOfStudy,
    });
  },
});

export const generateNotes = internalAction({
  args: {
    transcriptionChunks: v.array(v.string()),
    lectureIds: v.array(v.id("lectures")),
    noteTakingStyle: v.string(),
    learningStyle: v.union(
      v.literal("auditory"),
      v.literal("visual"),
      v.literal("kinesthetic"),
      v.literal("analytical"),
    ),
    course: v.string(),
    levelOfStudy: v.union(
      v.literal("Bachelors"),
      v.literal("Associate"),
      v.literal("Masters"),
      v.literal("PhD"),
    ),
  },
  handler: async (ctx, args) => {
    const {
      transcriptionChunks,
      noteTakingStyle,
      learningStyle,
      course,
      levelOfStudy,
    } = args;

    // Process chunks in parallel

    const chunkPromises = transcriptionChunks.map(async (chunk) => {
      return exponentialBackoff(async () => {
        //Work11

        //
        const info = {
          chunk: chunk,
          noteTakingStyle: noteTakingStyle,
          learningStyle: learningStyle,
          course: course,
          levelOfStudy: levelOfStudy,
          notes: [],
          messages: []
        }
        const result = await graph.invoke(info);


        if (typeof result.notes !== 'string') {
          throw new Error('Invalid notes format');
        }


        const noteChunkBlob = new Blob([result.notes], { type: "text/plain" })//"application/json";

        const storageId = await ctx.storage.store(noteChunkBlob);

        // Generate embedding for the chunk
        const embedding = await generateEmbedding(result.notes);

        return { storageId, embedding };
      });
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
      const sum = allEmbeddings.reduce(
        (acc, embedding) => acc + (embedding[i] || 0),
        0,
      );
      concatenatedEmbedding.push(sum / allEmbeddings.length);
    }

    // Store the list of note chunk IDs and the concatenated embedding in the database
    await ctx.runMutation(internal.notes.storeNotes, {
      noteChunkIds: noteChunkIds,
      lectureIds: args.lectureIds,
      embedding: concatenatedEmbedding,
    });
  },
});

export const getNoteById = action({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args): Promise<Doc<"notes" & { content: string }>> => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authorized to use this action.");
    }

    const note = await ctx.runQuery(internal.notes.getNote, {
      noteId: args.noteId,
      userId: identity.subject,
    });
    if (!note) {
      throw new Error(`Note with ID ${args.noteId} not found.`);
    }

    const noteModule = await ctx.runQuery(internal.modules.getByIdInternal, {
      id: note.moduleId as Id<"modules">,
    });

    if (!noteModule) {
      throw new Error(`Module with ID ${note.moduleId} not found.`);
    }

    if (noteModule.userId !== identity.subject) {
      throw new Error("Not authorized to view this note.");
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
      }),
    );

    // Combine all text chunks
    const fullContent = textContent.join("\n");

    return {
      ...note,
      content: fullContent,
    };
  },
});

