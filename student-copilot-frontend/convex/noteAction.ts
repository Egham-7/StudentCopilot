"use node";

import { internal } from "./_generated/api";


import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { generateEmbedding, generateEmbeddingsArray, findMostSimilarLectureChunk } from "./ai";
import { noteGraph } from "./aiAgent/noteAgent";
import {autocompleteGraph} from "./aiAgent/autoComplete";
import { MemorySaver } from "@langchain/langgraph";
import { exponentialBackoff } from "./utils";
import { v4 as uuidv4 } from "uuid";
const checkpointer = new MemorySaver();
const compiledGraph = noteGraph.compile({ checkpointer });
const executionConfig = { configurable: { thread_id: uuidv4() } };

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


export const processChunkWithGraph = internalAction({
  args: {
    chunk: v.string(),
    noteTakingStyle: v.string(),
    learningStyle: v.union(
      v.literal("auditory"),
      v.literal("visual"),
      v.literal("kinesthetic"),
      v.literal("analytical"),
    ),
    levelOfStudy: v.union(
      v.literal("Bachelors"),
      v.literal("Associate"),
      v.literal("Masters"),
      v.literal("PhD"),
    ),
    course: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      // Add more detailed logging
      console.log("Processing chunk with args:", JSON.stringify(args, null, 2));

      const processingResult = await compiledGraph.invoke(
        {
          chunk: args.chunk,
          noteTakingStyle: args.noteTakingStyle,
          learningStyle: args.learningStyle,
          levelOfStudy: args.levelOfStudy,
          course: args.course,
        },
        executionConfig,
      );

      // Validate the processing result
      if (!processingResult || !processingResult.note) {
        throw new Error("No note generated from chunk processing");
      }

      console.log("Processing Result Curr Note: ", processingResult.note);


      return processingResult;
    } catch (error) {
      console.error("Error in processChunkWithGraph:", error);
      throw error;
    }
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

    const chunkProcessingPromises = contentChunks.map(async (chunk) => {
      return exponentialBackoff(async () => {
        const processingResult = await ctx.runAction(
          internal.noteAction.processChunkWithGraph,
          {
            chunk,
            noteTakingStyle,
            learningStyle,
            levelOfStudy,
            course,
          },
        );

        const storageId = await ctx.storage.store(
          new Blob([processingResult.note.toString()], { type: "text/plain" }),
        );

        const chunkEmbedding = await generateEmbedding(
          processingResult.note.toString(),
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

    const concatenatedEmbedding = new Float32Array(1536);
    const embeddingCount = allEmbeddings.length;

    for (const embedding of allEmbeddings) {
      for (let i = 0; i < 1536; i++) {
        concatenatedEmbedding[i] += embedding[i] || 0;
      }
    }
    //Similarity:   //************** */
    // Function to generate embeddings for all lecture chunks
      
    

    const ChunksEmbedding = await generateEmbeddingsArray(contentChunks);

    const searchSimilarNotes = async (searchQuery: string) => {
      const queryEmbedding = await generateEmbedding(searchQuery);
      const result = findMostSimilarLectureChunk(queryEmbedding, ChunksEmbedding);
      
      // Fetch the actual content from storage
      const chunkContent = contentChunks[result.index];
      
      if (!chunkContent) {
        throw new Error(`Lecture chunk not found for index: ${result.index}`);
      }
      
      return {
        content: chunkContent,
        similarity: result.similarity,
      };
    };
    
    /**************AutoCompleteTESt**********/
    const Query: string = "Digestive System is"
    const result = await searchSimilarNotes(Query);
    const similaireChunk = result.content as string;
    const PrevNote : string =  
    `
    # Anatomy and Physiology Lecture Notes

**Anatomy**:

- *Definition*: Study of shape, structure, and location of organs.

- **Divisions**:

  - **Gross Anatomy**: Visible to the naked eye.

  - **Histology** (Microscopic Anatomy): Study using a microscope.

**Physiology**:

- *Definition*: Study of functions of cells, tissues, and organs.

- *Key Question*: What do the organs do?

- **Goal**: Understanding how body parts work together.
    `;

    const app = autocompleteGraph.compile()

    const auto_complete_paragraph = await app.invoke({
      SimilaireChunk: similaireChunk,
      prevNote: PrevNote,
      query: Query
    })
    
    
    if (auto_complete_paragraph ) {
      console.log("Complete:", auto_complete_paragraph.note.toString());
    } else {
      console.error("Auto-complete paragraph  is undefined.");
    }
  ///******************* */

    for (let i = 0; i < 1536; i++) {
      concatenatedEmbedding[i] /= embeddingCount;
    }

    await ctx.runMutation(internal.notes.storeNotes, {
      noteChunkIds: noteChunkIds,
      lectureIds: lectureIds,
      flashCardSetIds: flashCardSetIds,
      embedding: Array.from(concatenatedEmbedding),
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
        return await response.text();
      }),
    );

    // Combine all text chunks
    const fullContent = textContent.join("\n\n\n\n");

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
