"use node";
import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { graph } from "./aiAgent/flashCardAgent";
import { MemorySaver } from "@langchain/langgraph";
import {
  flashCardPlanGenerationPrompt,
  imageQueryPrompt,
} from "./aiAgent/prompts/flashCardAgent";
import { v4 as uuidv4 } from "uuid";
import { Doc } from "./_generated/dataModel";
import { fetchImageLink } from "./aiAgent/utils";

type FlashCard = Omit<Doc<"flashcards">, "_id" | "_creationTime">;

export async function planFlashcardNotes(
  learningStyle: string,
  levelOfStudy: string,
  course: string,
  lectureContent: string[],
): Promise<AIMessage> {
  const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
  const planPromises = lectureContent.map(async (content) => {
    const formattedPrompt = await flashCardPlanGenerationPrompt.formatMessages({
      learningStyle,
      levelOfStudy,
      course,
      content,
    });
    return llm.invoke(formattedPrompt);
  });
  const results = await Promise.all(planPromises);
  const fullPlan = results
    .map((result, index) => `### Section ${index + 1}\n${result.content}`)
    .join("\n\n");
  return new AIMessage(fullPlan);
}

export const generateFlashCards = internalAction({
  args: {
    userId: v.string(),
    lectureIds: v.optional(v.array(v.id("lectures"))),
    noteIds: v.optional(v.array(v.id("notes"))),
    flashCardSetId: v.optional(v.id("flashCardSets")),
    learningStyle: v.string(),
    course: v.string(),
    levelOfStudy: v.string(),
    description: v.optional(v.string()),
    title: v.string(),
    moduleId: v.id("modules"),
  },
  handler: async (ctx, args): Promise<Doc<"flashCardSets">> => {
    const {
      userId,
      lectureIds,
      noteIds,
      flashCardSetId,
      learningStyle,
      course,
      levelOfStudy,
      title,
      description,
      moduleId,
    } = args;

    const contentData = await ctx.runAction(
      internal.flashCardActions.getContent,
      {
        lectureIds,
        noteIds,
        userId,
      },
    );

    if (!contentData) {
      throw new Error("Content must not be null or undefined.");
    }
    if (contentData.length === 0) {
      throw new Error("Content is empty.");
    }

    const plan = await planFlashcardNotes(
      learningStyle,
      levelOfStudy,
      course,
      contentData,
    );

    const existingFlashCards = flashCardSetId
      ? await ctx.runQuery(internal.flashcards.getFlashCardsInternal, {
          flashCardSetId,
        })
      : [];

    const newFlashCards: FlashCard[] = [];
    const flashCardPromises = contentData.map((contentChunk) =>
      ctx.runAction(internal.flashCardActions.executeGraphLogic, {
        contentChunk,
        learningStyle,
        plan: plan.content as string,
        course,
        allFlashCards: [...existingFlashCards, ...newFlashCards], // Pass both existing and new cards to prevent duplicates
      }),
    );

    const setId =
      flashCardSetId ||
      (await ctx.runMutation(internal.flashcards.createFlashCardSetInternal, {
        title,
        description,
        lectureIds,
        noteIds,
        moduleId,
        userId,
      }));

    const flashCardResults = await Promise.all(flashCardPromises);

    flashCardResults.forEach((result) => {
      if (result?.flashCards) {
        const formattedCards: FlashCard[] = result.flashCards.map((card) => ({
          flashCardSetId: setId,
          front: card.front,
          back: card.back,
          image: card.image,
          difficulty: card.difficulty,
          status: card.status,
          reviewCount: 0,
          correctCount: 0,
          incorrectCount: 0,
          tags: card.tags,
          sourceContentId: undefined,
          nextReviewDate: new Date(Date.now()).toISOString(),
          lastReviewDate: new Date(Date.now()).toISOString(),
        }));

        newFlashCards.push(...formattedCards);
      }
    });

    console.log("New flashcards: ", newFlashCards);

    if (!newFlashCards.length) {
      throw new Error("Failed to generate any flashcards");
    }

    console.log("New Flashcards: ", newFlashCards);

    const BATCH_SIZE = 3;
    for (let i = 0; i < newFlashCards.length; i += BATCH_SIZE) {
      const batch = newFlashCards.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((flashCard) =>
          ctx.runMutation(internal.flashcards.addFlashCardInternal, {
            front: flashCard.front,
            back: flashCard.back,
            flashCardSetId: setId,
            status: flashCard.status,
            tags: flashCard.tags,
            image: flashCard.image,
            sourceContentId: flashCard.sourceContentId,
            difficulty: flashCard.difficulty,
            userId,
          }),
        ),
      );
    }

    const flashCardSet = await ctx.runQuery(
      internal.flashcards.getFlashCardSetInternal,
      {
        flashCardSetId: setId,
      },
    );

    if (!flashCardSet) {
      throw new Error("Flashcard set must have been successfully created.");
    }

    await Promise.all([
      ctx.scheduler.runAfter(0, internal.notifications.store, {
        userId: flashCardSet.userId,
        message: `Flashcards have been successfully generated for ${flashCardSet.title}`,
        type: "flashcards_generated",
        relatedId: flashCardSet._id,
      }),
      ctx.scheduler.runAfter(0, internal.activities.store, {
        userId: flashCardSet.userId,
        type: "Flashcards Generated",
        flashCardSetId: flashCardSet._id,
      }),
    ]);

    return flashCardSet;
  },
});

export const executeGraphLogic = internalAction({
  args: {
    contentChunk: v.string(),
    learningStyle: v.string(),
    plan: v.string(),
    course: v.string(),
    allFlashCards: v.array(v.any()),
  },
  handler: async (_ctx, args) => {
    const { contentChunk, learningStyle, plan, course, allFlashCards } = args;
    const memoryManager = new MemorySaver();
    const flashCardGraph = graph.compile({
      checkpointer: memoryManager,
    });
    const executionConfig = { configurable: { thread_id: uuidv4() } };
    const graphParams = {
      contentChunk,
      learningStyle,
      plan,
      course,
      allFlashCards,
    };
    const response = await flashCardGraph.invoke(graphParams, executionConfig);
    if (!response.flashCardsObject) {
      throw new Error("Failed to get response from the model.");
    }
    return response.flashCardsObject;
  },
});

export const getContent = internalAction({
  args: {
    lectureIds: v.optional(v.array(v.id("lectures"))),
    noteIds: v.optional(v.array(v.id("notes"))),
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const { lectureIds, noteIds, userId } = args;

    const lectureTexts = lectureIds
      ? await Promise.all(
          lectureIds.map(async (lectureId) => {
            const lecture = await ctx.runQuery(internal.lectures.getLecture, {
              lectureId,
            });
            if (!lecture) {
              throw new Error("Lecture not found");
            }
            return await ctx.runAction(internal.lectures.fetchTranscription, {
              transcriptionIds: lecture.lectureData.transcriptionChunks,
            });
          }),
        )
      : [];

    const noteTexts = noteIds
      ? await Promise.all(
          noteIds.map(async (noteId) => {
            const note = await ctx.runQuery(internal.notes.getNote, {
              noteId,
              userId,
            });
            if (!note) {
              throw new Error("Note ID must be valid.");
            }
            const chunkContents = await Promise.all(
              note.textChunks.map(async (chunkId) => {
                const url = await ctx.storage.getUrl(chunkId);
                if (!url) {
                  throw new Error("Url cannot be null.");
                }
                const response = await fetch(url);
                if (!response.ok) {
                  throw new Error("Failed to fetch chunk");
                }
                return response.text();
              }),
            );
            return chunkContents.join(" ");
          }),
        )
      : [];

    const flattenedLectureTexts = lectureTexts.flat();
    return [...flattenedLectureTexts, ...noteTexts];
  },
});

export const generateFlashcardImage = action({
  args: {
    cardId: v.id("flashcards"),
    front: v.string(),
  },

  handler: async (_ctx, args) => {
    const model = new ChatOpenAI({
      model: "gpt-4o-mini",
    });

    const chain = imageQueryPrompt.pipe(model);

    const query = await chain.invoke({
      content: args.front,
    });

    const imageLink = await fetchImageLink(query.content.toString());

    return imageLink;
  },
});
