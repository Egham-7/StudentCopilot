"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { graph } from "./aiAgent/flashCardAgent";
import { MemorySaver } from "@langchain/langgraph";
import { flashCardPlanGenerationPrompt } from "./aiAgent/prompts/flashCardAgent";
import { v4 as uuidv4 } from "uuid";
import { Id } from "./_generated/dataModel";


export async function planFlashcardNotes(
  learningStyle: string,
  levelOfStudy: string,
  course: string,
  lectureContent: string[]
): Promise<AIMessage> {
  const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

  const planPromises = lectureContent.map(async (content) => {
    const formattedPrompt = await flashCardPlanGenerationPrompt.formatMessages({
      learningStyle,
      levelOfStudy,
      course,
      content
    });

    return llm.invoke(formattedPrompt);
  });

  const results = await Promise.all(planPromises);
  const fullPlan = results
    .map((result, index) => `### Section ${index + 1}\n${result.content}`)
    .join('\n\n');

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
    moduleId: v.id("modules")
  },
  handler: async (ctx, args) => {
    const { userId, lectureIds, noteIds, flashCardSetId, learningStyle, course, levelOfStudy, title, description, moduleId } = args;

    const contentData = await ctx.runAction(internal.flashCardActions.getContent, {
      lectureIds,
      noteIds,
      userId
    });

    if (!contentData) {
      throw new Error("Content must not be null or undefined.");
    }

    if (contentData.length === 0) {
      throw new Error("Content is empty.");
    }

    const plan = await planFlashcardNotes(learningStyle, levelOfStudy, course, contentData);

    const allFlashCards = [];
    for (const contentChunk of contentData) {
      const flashCardsObject = await ctx.runAction(internal.flashCardActions.executeGraphLogic, {
        contentChunk,
        learningStyle,
        plan: plan.content as string,
        course
      });

      if (flashCardsObject && flashCardsObject.flashCards) {
        allFlashCards.push(...flashCardsObject.flashCards);
      }
    }

    if (!allFlashCards.length) {
      throw new Error("Flashcards response cannot be null.");
    }

    let setId: Id<"flashCardSets">;

    if (!flashCardSetId) {
      const response = await ctx.runMutation(internal.flashcards.createFlashCardSetInternal, {
        title,
        description,
        lectureIds,
        noteIds,
        moduleId,
        userId
      })

      if (!response) {
        throw new Error("Failed to create flashcard set.");
      }

      setId = response;

    } else {

      const response = await ctx.runMutation(internal.flashcards.updateFlashCardSet, {
        title,
        description,
        lectureIds,
        noteIds,
        flashCardSetId
      })

      if (!response) {
        throw new Error("Failed to update flashcard set.");
      }

      setId = response;
    }

    for (const flashCard of allFlashCards) {
      await ctx.runMutation(internal.flashcards.addFlashCardInternal, {
        front: flashCard.front,
        back: flashCard.back,
        flashCardSetId: setId,
        userId
      });
    }

    const flashCardSet = await ctx.runQuery(internal.flashcards.getFlashCardSetInternal, {
      flashCardSetId: setId
    });

    if (!flashCardSet) {
      throw new Error("Flashcard set must have been successfully created.");
    }

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId: flashCardSet.userId,
      message: `Flashcards have been successfully generated for ${flashCardSet.title}`,
      type: "flashcards_generated",
      relatedId: flashCardSet._id
    });

    // Track activity
    await ctx.scheduler.runAfter(0, internal.activities.store, {
      userId: flashCardSet.userId,
      type: "flashcards_generated",
      flashCardSetId: flashCardSet._id
    });
  }
});


export const executeGraphLogic = internalAction({
  args: {
    contentChunk: v.string(),
    learningStyle: v.string(),
    plan: v.string(),
    course: v.string()
  },
  handler: async (_ctx, args) => {
    const { contentChunk, learningStyle, plan, course } = args;

    const memoryManager = new MemorySaver();
    const flashCardGraph = graph.compile({
      checkpointer: memoryManager
    });

    const executionConfig = { configurable: { thread_id: uuidv4() } };
    const graphParams = {
      contentChunk,
      learningStyle,
      plan,
      course,
    };

    const response = await flashCardGraph.invoke(graphParams, executionConfig);


    if (!response.flashCardsObject) {
      throw new Error("Failed to get response from the model.");
    }
    return response.flashCardsObject;
  }
});




export const getContent = internalAction({
  args: {
    lectureIds: v.optional(v.array(v.id("lectures"))),
    noteIds: v.optional(v.array(v.id("notes"))),
    userId: v.string()
  },
  handler: async (ctx, args): Promise<string[]> => {
    const { lectureIds, noteIds, userId } = args;

    const lectureTexts = lectureIds
      ? await Promise.all(lectureIds.map(async (lectureId) => {
        const lecture = await ctx.runQuery(internal.lectures.getLecture, {
          lectureId
        });

        if (!lecture) {
          throw new Error("Lecture not found");
        }

        return await ctx.runAction(internal.lectures.fetchTranscription, {
          transcriptionIds: lecture.lectureTranscription
        });
      }))
      : [];

    const noteTexts = noteIds
      ? await Promise.all(noteIds.map(async (noteId) => {
        const note = await ctx.runQuery(internal.notes.getNote, {
          noteId,
          userId
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
          })
        );

        return chunkContents.join(' ');
      }))
      : [];

    const flattenedLectureTexts = lectureTexts.flat();
    return [...flattenedLectureTexts, ...noteTexts];
  }
});


