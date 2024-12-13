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

type InputAnnotationState = typeof inputAnnotation.State;

const inputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  contentChunk: Annotation<string>,
  learningStyle: Annotation<string>,
  levelOfStudy: Annotation<"Bachelors" | "Associate" | "Masters" | "PhD">,
  course: Annotation<string>,
  plan: Annotation<string>,
  allFlashCards: Annotation<Doc<"flashcards">[]>,
});

const outputAnnotation = Annotation.Root({
  flashCardsObject: Annotation<FlashCardArray>,
});

type OutputAnnotationState = typeof outputAnnotation.State;

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
    (flashcard: Doc<"flashcards">) => {
      return flashcard.front;
    },
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

  const flashCardsObject = uncheckedFlashCardStruct.data;

  return {
    flashCardsObject,
  };
}

export const graph = new StateGraph({
  input: inputAnnotation,
  output: outputAnnotation,
})
  .addNode("generate_flashcards", generateFlashCard)
  .addEdge("__start__", "generate_flashcards")
  .addEdge("generate_flashcards", END);
