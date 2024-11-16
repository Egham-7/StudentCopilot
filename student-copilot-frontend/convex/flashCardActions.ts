"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { graph } from "./aiAgent/flashCardAgent";
import { MemorySaver } from "@langchain/langgraph";
import { flashCardPlanGenerationPrompt } from "./aiAgent/prompts/flashCardAgent";
import { v4 as uuidv4 } from "uuid";


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
    flashCardSetId: v.id("flashCardSets"),
    learningStyle: v.string(),
    course: v.string(),
    levelOfStudy: v.string()


  },

  handler: async (ctx, args) => {

    const { userId, lectureIds, noteIds, flashCardSetId, learningStyle, course, levelOfStudy } = args;


    const contentData = await ctx.runAction(internal.flashCardActions.getContent, {
      lectureIds,
      noteIds,
      userId
    })


    if (!contentData) {
      throw new Error("Content must not be null or undefined.");
    }

    if (contentData.length === 0) {
      throw new Error("Content is empty.");
    }


    const plan = await planFlashcardNotes(learningStyle, levelOfStudy, course, contentData);


    const memoryManager = new MemorySaver();


    const flashCardGraph = graph.compile({
      checkpointer: memoryManager
    })

    const executionConfig = { configurable: { thread_id: uuidv4() } };


    const flashCardPromises = contentData.map(async (contentChunk) => {


      const graphParams = {
        contentChunk,
        learningStyle,
        plan,
        course,
      };


      return await flashCardGraph.invoke(graphParams, executionConfig);
    })


    const flashCards = await Promise.all(flashCardPromises);


    const flashCardAddPromises = flashCards.map(flashCard =>
      ctx.runMutation(api.flashcards.addFlashCard, {
        front: flashCard.front,
        back: flashCard.back,
        flashCardSetId,
      })
    );

    await Promise.all(flashCardAddPromises);

  }
})



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
            const chunk = await fetch(chunkId);
            return chunk.toString();
          })
        );

        return chunkContents.join(' ');
      }))
      : [];

    const flattenedLectureTexts = lectureTexts.flat();
    return [...flattenedLectureTexts, ...noteTexts];
  }
});


