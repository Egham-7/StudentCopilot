"use node";

import {
  Annotation,
  END,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { FlashCardArray, flashcardArraySchema } from "./types/flashCardAgent";
import { flashCardGeneratorPrompt } from "./prompts/flashCardAgent";
import { Doc } from "convex/_generated/dataModel";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import axios from "axios";
import { ToolNode } from "@langchain/langgraph/prebuilt";

type InputAnnotationState = typeof inputAnnotation.State;

const inputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  contentChunk: Annotation<string>,
  learningStyle: Annotation<string>,
  levelOfStudy: Annotation<"Bachelors" | "Associate" | "Masters" | "PhD">,
  course: Annotation<string>,
  plan: Annotation<string>,
  allFlashCards: Annotation<Doc<"flashcards">[]>,
  flashCardsObject: Annotation<FlashCardArray>,
});

const outputAnnotation = Annotation.Root({
  flashCardsObject: Annotation<FlashCardArray>,
});

type OutputAnnotationState = typeof outputAnnotation.State;

// Define image fetching tool
const imageFetchTool = tool(
  async ({ query }) => {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const CX = process.env.CX;
    const searchUrl = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${CX}&key=${GOOGLE_API_KEY}&searchType=image&num=1`;

    try {
      const response = await axios.get(searchUrl);
      const imageLink = response?.data?.items?.[0]?.link;
      if (imageLink) {
        return imageLink;
      }
      throw new Error("No image found");
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch image link.",
      );
    }
  },
  {
    name: "fetch_image",
    description: "Fetches an image URL based on a search query",
    schema: z.object({
      query: z.string().describe("The search query to find an image"),
    }),
  },
);

const tools = [imageFetchTool];
const toolNode = new ToolNode(tools);

export async function generateFlashCard(
  state: InputAnnotationState,
): Promise<OutputAnnotationState> {
  const {
    plan,
    contentChunk,
    learningStyle,
    levelOfStudy,
    course,
    allFlashCards,
  } = state;

  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
  });

  const structuredModel = model.withStructuredOutput(flashcardArraySchema);
  const chain = flashCardGeneratorPrompt.pipe(structuredModel);

  const allFlashCardFronts = allFlashCards.map(
    (flashcard: Doc<"flashcards">) => flashcard.front,
  );

  const result = await chain.invoke({
    plan,
    contentChunk,
    learningStyle,
    levelOfStudy,
    course,
    allFlashCardFronts,
  });

  const uncheckedFlashCardStruct =
    await flashcardArraySchema.safeParseAsync(result);

  if (!uncheckedFlashCardStruct.success) {
    throw new Error(
      `Failed to generate proper flashcard: ${uncheckedFlashCardStruct.error}`,
    );
  }

  return {
    flashCardsObject: uncheckedFlashCardStruct.data,
  };
}

export async function decideImageNode(state: InputAnnotationState) {
  const { flashCardsObject } = state;
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
  }).bindTools(tools);

  const enhancedCards = await Promise.all(
    flashCardsObject.flashCards.map(async (card) => {
      const imageDecision = await model.invoke(`
        Analyze this flashcard and decide if it needs an image:
        Front: ${card.front}
        Back: ${card.back}
        
        If visual aid would help, use the fetch_image tool with a specific search query.
        If no image is needed, respond with 'No image needed'.
      `);

      if (imageDecision.tool_calls?.length) {
        console.log("Need image.");
        const imageUrl = await imageFetchTool.invoke({
          query: imageDecision.tool_calls[0].args.query,
        });
        return {
          ...card,
          image: imageUrl,
        };
      }
      return card;
    }),
  );

  return {
    flashCardsObject: {
      flashCards: enhancedCards,
    },
  };
}

function shouldContinue(state: InputAnnotationState) {
  return state.flashCardsObject ? "decide_images" : "generate_flashcards";
}

export const graph = new StateGraph({
  input: inputAnnotation,
  output: outputAnnotation,
})
  .addNode("generate_flashcards", generateFlashCard)
  .addNode("decide_images", decideImageNode)
  .addNode("fetch_image", toolNode)
  .addEdge("__start__", "generate_flashcards")
  .addConditionalEdges("generate_flashcards", shouldContinue)
  .addEdge("decide_images", END);
