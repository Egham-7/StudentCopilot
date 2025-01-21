"use node";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx, action, internalAction } from "./_generated/server";
import { generateEmbedding } from "./ai";
import { noteGraph } from "./aiAgent/noteAgent";
import { MemorySaver } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import { retrier } from "./index";
type LearningStyle = "auditory" | "visual" | "kinesthetic" | "analytical";
type StudyLevel = "Bachelors" | "Associate" | "Masters" | "PhD";

const checkpointer = new MemorySaver();
const compiledGraph = noteGraph.compile({ checkpointer });
const executionConfig = { configurable: { thread_id: uuidv4() } };

async function validateUser(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authorized to use this action.");
  }
  return identity;
}

interface ProcessedChunk {
  storageId: Id<"_storage">;
  embedding: number[];
}

interface ProcessResult {
  noteChunkIds: Id<"_storage">[];
  embeddings: number[][];
}

async function processContentChunks(
  chunks: string[],
  args: {
    noteTakingStyle: string;
    learningStyle: LearningStyle;
    levelOfStudy: StudyLevel;
    course: string;
  },
  ctx: ActionCtx,
): Promise<ProcessResult> {
  const runIds = await Promise.all(
    chunks.map(
      async (chunk) =>
        await retrier.run(
          ctx,
          internal.noteAction.processChunkWithGraph,
          {
            chunk,
            ...args,
          },
          {
            initialBackoffMs: 500,
            base: 2.71,
            maxFailures: 10,
          },
        ),
    ),
  );

  console.log("Run IDs: ", runIds);

  const chunksResult: (ProcessedChunk | undefined)[] = await Promise.all(
    runIds.map(async (runId) => {
      while (true) {
        const status = await retrier.status(ctx, runId);

        if (status.type === "inProgress") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        if (status.type === "completed" && status.result.type === "success") {
          const result = status.result.returnValue;
          const storageId = await ctx.storage.store(
            new Blob([result.note.toString()], { type: "text/plain" }),
          );
          const embedding = await generateEmbedding(
            ctx,
            result.note.toString(),
          );
          console.log("Embedding: ", embedding);
          await retrier.cleanup(ctx, runId);
          return { storageId, embedding };
        }

        // If we get here, the run failed
        console.warn(`Chunk processing failed for runId: ${runId}`);
      }
    }),
  );
  const processedChunks = chunksResult.filter((chunk) => chunk !== undefined);

  console.log("Processed Chunks: ", processedChunks);
  return processedChunks.reduce<ProcessResult>(
    (acc, curr) => {
      acc.noteChunkIds.push(curr.storageId);
      acc.embeddings.push(curr.embedding);
      return acc;
    },
    { noteChunkIds: [], embeddings: [] },
  );
}

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
        args.lectureIds.map((id) =>
          ctx.runAction(internal.lectures.getLectureContent, { lectureId: id }),
        ),
      ),
      Promise.all(
        args.flashCardSetIds.map((id) =>
          ctx.runQuery(internal.flashcards.getFlashcardContent, {
            flashCardSetId: id,
          }),
        ),
      ),
      Promise.all(
        args.noteIds.map((id) =>
          ctx.runAction(internal.noteAction.getNoteContents, {
            noteId: id,
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

    await retrier.run(
      ctx,
      internal.noteAction.generateNotes,
      {
        contentChunks: contentChunks,
        lectureIds: args.lectureIds,
        flashCardSetIds: args.flashCardSetIds,
        noteTakingStyle: args.noteTakingStyle,
        learningStyle: args.learningStyle,
        course: args.course,
        levelOfStudy: args.levelOfStudy,
      },
      {
        initialBackoffMs: 500,
        base: 2.71,
        maxFailures: 3,
      },
    );
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
    console.log("Processing chunk with args:", JSON.stringify(args, null, 2));

    const result = await compiledGraph.invoke(
      {
        chunk: args.chunk,
        noteTakingStyle: args.noteTakingStyle,
        learningStyle: args.learningStyle,
        levelOfStudy: args.levelOfStudy,
        course: args.course,
      },
      executionConfig,
    );

    if (!result?.note) {
      throw new Error("No note generated from chunk processing");
    }

    console.log("Processing Result Curr Note: ", result.note);
    return result;
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
    const { noteChunkIds, embeddings } = await processContentChunks(
      args.contentChunks,
      {
        noteTakingStyle: args.noteTakingStyle,
        learningStyle: args.learningStyle,
        levelOfStudy: args.levelOfStudy,
        course: args.course,
      },
      ctx,
    );

    const averageEmbedding = new Float32Array(1536);
    embeddings.forEach((embedding) => {
      embedding.forEach((value, i) => {
        averageEmbedding[i] += value || 0;
      });
    });
    averageEmbedding.forEach((_, i) => {
      averageEmbedding[i] /= embeddings.length;
    });

    await ctx.runMutation(internal.notes.storeNotes, {
      noteChunkIds,
      lectureIds: args.lectureIds,
      flashCardSetIds: args.flashCardSetIds,
      embedding: Array.from(averageEmbedding),
    });
  },
});

export const getNoteById = action({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args): Promise<Doc<"notes" & { content: string }>> => {
    const identity = await validateUser(ctx);

    // First get the note
    const noteResult = await ctx.runQuery(internal.notes.getNote, {
      noteId: args.noteId,
      userId: identity.subject,
    });

    if (!noteResult) {
      throw new Error("Note not found");
    }

    // Then get the module with proper typing
    const noteModule = await ctx.runQuery(internal.modules.getByIdInternal, {
      id: noteResult.moduleId as Id<"modules">,
    });

    if (!noteModule || noteModule.userId !== identity.subject) {
      throw new Error("Unauthorized access");
    }

    const textContent = await Promise.all(
      noteResult.textChunks.map(async (chunkId: string) => {
        const url = await ctx.storage.getUrl(chunkId as Id<"_storage">);
        if (!url) throw new Error(`Failed to get URL for chunk ${chunkId}`);
        return (await fetch(url)).text();
      }),
    );

    return {
      ...noteResult,
      content: textContent.join("\n\n\n\n"),
    };
  },
});

export const getNoteContents = internalAction({
  args: { noteId: v.id("notes"), userId: v.string() },
  handler: async (ctx, args): Promise<string[]> => {
    const note = await ctx.runQuery(internal.notes.getNote, args);
    if (!note) throw new Error("Note not found");

    return Promise.all(
      note.textChunks.map(async (storageId) => {
        const content = await ctx.storage.get(storageId);
        return content?.toString() ?? "";
      }),
    );
  },
});
