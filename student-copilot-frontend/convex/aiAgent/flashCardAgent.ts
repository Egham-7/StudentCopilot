
import { z } from "zod";
import { AIMessage } from "@langchain/core/messages";
import { Annotation, END, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { flashCardSetSchema } from "./types";

type FlashCardSet = z.infer<typeof flashCardSetSchema>;

const inputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  contentChunk: Annotation<string>,
  learningStyle: Annotation<"visual" | "auditory" | "kinesthetic" | "analytical">,
  levelOfStudy: Annotation<"Bachelors" | "Associate" | "Masters" | "PhD">,
  course: Annotation<string>,
  plan: Annotation<string>,
});


const outputAnnotation = Annotation.Root({

  flashCardSet: Annotation<FlashCardSet>
})

export const graph = new StateGraph({
  input: inputAnnotation,
  output: outputAnnotation,
})
