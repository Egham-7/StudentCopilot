"use node";
import { internal } from "./_generated/api";

import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { generateEmbedding } from "./ai";
import { graph, planLectureNotes } from "./aiAgent/noteAgent";
import { exponentialBackoff } from "./utils";
import { v4 as uuidv4 } from "uuid";
import { MemorySaver } from "@langchain/langgraph";

export const fetchAndProcessContent = internalAction({
  args: {
    userId: v.string(),
    lectureIds: v.array(v.id("lectures")),
    noteIds: v.array(v.id("notes")),
    flashCardSetIds: v.array(v.id("flashCardSets")),
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
    const [lectureChunks, flashcardChunks, noteChunks] = await Promise.all([
      Promise.all(
        args.lectureIds.map((lectureId) =>
          ctx.runAction(internal.lectures.getLectureContent, { lectureId }),
        ),
      ),
      Promise.all(
        args.flashCardSetIds.map((flashCardSetId) =>
          ctx.runQuery(internal.flashcards.getFlashcardContent, {
            flashCardSetId,
          }),
        ),
      ),

      Promise.all(
        args.noteIds.map((noteId) =>
          ctx.runAction(internal.noteAction.getNoteContents, {
            noteId,
            userId: args.userId,
          }),
        ),
      ),
    ]);

    const contentChunks = [
      ...lectureChunks.flat(),
      ...flashcardChunks.flat(),
      ...noteChunks.flat(),
    ];

    await ctx.scheduler.runAfter(0, internal.noteAction.generateNotes, {
      contentChunks,
      lectureIds: args.lectureIds,
      flashCardSetIds: args.flashCardSetIds,
      noteTakingStyle: args.noteTakingStyle,
      learningStyle: args.learningStyle,
      course: args.course,
      levelOfStudy: args.levelOfStudy,
    });
  },
});

export const generateNotes = internalAction({
  args: {
    contentChunks: v.array(v.string()),
    lectureIds: v.array(v.id("lectures")),
    flashCardSetIds: v.array(v.id("flashCardSets")),
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
      contentChunks,
      noteTakingStyle,
      learningStyle,
      course,
      levelOfStudy,
      lectureIds,
      flashCardSetIds,
    } = args;

    // Initialize a memory manager for saving the processing state
    const memoryManager = new MemorySaver();

    // Plan lecture notes based on the provided preferences and a portion of transcription chunks
    const lectureNotePlan = await planLectureNotes(
      noteTakingStyle,
      learningStyle,
      levelOfStudy,
      course,
      contentChunks,
    );

    // Compile the application state graph with memory checkpointing enabled
    const appGraph = graph.compile({ checkpointer: memoryManager });

    // Configuration for the application with a unique thread ID
    const executionConfig = { configurable: { thread_id: uuidv4() } };

    // Process each transcription chunk in parallel
    const chunkProcessingPromises = contentChunks.map(async (chunk) => {
      return exponentialBackoff(async () => {
        // Prepare input data for each chunk, including user preferences and plan details
        const processingData = {
          chunk: chunk,
          noteTakingStyle: noteTakingStyle,
          learningStyle: learningStyle,
          levelOfStudy: levelOfStudy,
          course: course,
          plan: lectureNotePlan,
        };

        // Invoke the application graph with the current chunk data and config
        const processingResult = await appGraph.invoke(
          processingData,
          executionConfig,
        );

        // Extract the generated note from the result and add it to the noteBlocks array

        // Convert the processed note into JSON format for storage
        const finalResultJson = JSON.stringify({
          type: "note",
          blocks: processingResult.note,
        });

        // Create a blob from the JSON data for storage
        const noteChunkBlob = new Blob([finalResultJson], {
          type: "application/json",
        });

        // Store the blob in storage and retrieve the storage ID
        const storageId = await ctx.storage.store(noteChunkBlob);

        // Generate an embedding for the current chunk and return the storage ID with the embedding
        const chunkEmbedding = await generateEmbedding(
          JSON.stringify(processingResult),
        );

        return { storageId, chunkEmbedding };
      });
    });

    const processedChunks = await Promise.all(chunkProcessingPromises);

    const noteChunkIds: Id<"_storage">[] = [];
    const allEmbeddings: number[][] = [];

    for (const { storageId, chunkEmbedding } of processedChunks) {
      noteChunkIds.push(storageId);
      allEmbeddings.push(chunkEmbedding);
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
      lectureIds: lectureIds,
      flashCardSetIds: flashCardSetIds,
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
      note.textChunks.map(async (chunkId: string) => {
        const url = await ctx.storage.getUrl(chunkId as Id<"_storage">);
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

export const getNoteContents = internalAction({
  args: { noteId: v.id("notes"), userId: v.string() },
  handler: async (ctx, args): Promise<string[]> => {
    // Get the note
    const note = await ctx.runQuery(internal.notes.getNote, args);

    if (!note) {
      throw new Error("Cannot get content for a nonexistent note.");
    }

    const contents = await Promise.all(
      note.textChunks.map(async (storageId) => {
        const content = await ctx.storage.get(storageId);
        return content?.toString() ?? "";
      }),
    );

    return contents;
  },
});
