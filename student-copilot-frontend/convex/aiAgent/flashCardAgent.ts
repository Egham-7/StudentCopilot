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
import { imageSearchTool } from "./utils";
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

const tools = [imageSearchTool];
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
      try {
        const imageDecision = await model.invoke(`
          Analyze this flashcard and decide if it needs an image:

          Front: ${card.front}
          Back: ${card.back}
          
          If visual aid would help, use the fetch_image tool with a specific search query.
          If no image is needed, respond with 'No image needed'.
        `);

        if (imageDecision.tool_calls?.length) {
          try {
            const imageUrl = await imageSearchTool.invoke({
              query: imageDecision.tool_calls[0].args.query,
            });

            return {
              ...card,
              image: imageUrl,
            };
          } catch (imageSearchError) {
            console.error(
              "Image search failed for card:",
              card.front,
              imageSearchError,
            );
            // If image search fails, return the original card without an image
            return card;
          }
        }

        return card;
      } catch (modelInvocationError) {
        console.error(
          "Model invocation failed for card:",
          card.front,
          modelInvocationError,
        );
        // If model invocation fails for a specific card, return the original card
        return card;
      }
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
