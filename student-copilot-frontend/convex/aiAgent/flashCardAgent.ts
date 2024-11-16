"use node";


import { z } from "zod";
import { Annotation, END, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { flashcardSchema } from "./types/flashCardAgent";
import { flashCardGeneratorPrompt } from "./prompts/flashCardAgent";

type FlashCard = z.infer<typeof flashcardSchema>;
type InputAnnotationState = typeof inputAnnotation.State;

const inputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  contentChunk: Annotation<string>,
  learningStyle: Annotation<"visual" | "auditory" | "kinesthetic" | "analytical">,
  levelOfStudy: Annotation<"Bachelors" | "Associate" | "Masters" | "PhD">,
  course: Annotation<string>,
  plan: Annotation<string>,
});


const outputAnnotation = Annotation.Root({

  flashCard: Annotation<FlashCard>
})

export async function generateFlashCard(state: InputAnnotationState) {

  const { plan, contentChunk, learningStyle, levelOfStudy, course } = state;


  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
  });

  const structuredModel = model.withStructuredOutput(flashcardSchema);

  const chain = flashCardGeneratorPrompt.pipe(structuredModel);


  const result = await chain.invoke({
    plan,
    contentChunk,
    learningStyle,
    levelOfStudy,
    course
  })

  const uncheckedFlashCardStruct = await flashcardSchema.safeParseAsync(result);

  if (!uncheckedFlashCardStruct.success) {
    throw new Error("Failed to generate proper flashcard.")
  }

  const flashCard = uncheckedFlashCardStruct.data;

  return {
    flashCard
  };


}

export const graph = new StateGraph({
  input: inputAnnotation,
  output: outputAnnotation,
})
  .addNode("generate_flashcard", generateFlashCard)
  .addEdge("__start__", "generate_flashcard")
  .addEdge("generate_flashcard", END);

