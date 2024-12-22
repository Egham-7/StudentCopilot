"use node";

import {
  Annotation,
  END,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { imageSearchTool } from "./utils";
import { notePrompt, planPrompt } from "./prompts/noteAgent";
import { AIMessage } from "@langchain/core/messages";

const inputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  chunk: Annotation<string>,
  noteTakingStyle: Annotation<string>,
  learningStyle: Annotation<
    "visual" | "auditory" | "kinesthetic" | "analytical"
  >,
  levelOfStudy: Annotation<"Bachelors" | "Associate" | "Masters" | "PhD">,
  course: Annotation<string>,
  note: Annotation<string>,
});

const outputAnnotation = Annotation.Root({
  note: Annotation<string>,
});

const tools = [imageSearchTool];
const toolNode = new ToolNode(tools);

export async function generateNote(
  state: typeof inputAnnotation.State,
): Promise<typeof outputAnnotation.State> {
  const { chunk } = state;

  const plan = state.messages[state.messages.length - 1];

  const model = new ChatOpenAI({
    model: "gpt-4o-mini-2024-07-18",
  });

  const chain = notePrompt.pipe(model);

  const result = await chain.invoke({
    chunk,
    plan,
  });
  
  return {
    note: result.content.toString(),
  };
}

export async function planChunk(
  _state: typeof inputAnnotation.State,
): Promise<{ messages: AIMessage }> {
  // Initialize the ChatOpenAI model with specific parameters
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini-2024-07-18",
  });

  // Create a pipeline for the prompt and LLM
  const chain = planPrompt.pipe(llm);

  // Invoke the pipeline with input data
  const result = await chain.invoke({
    chunk1: _state.chunk,
    noteTakingStyle1: _state.noteTakingStyle,
    learningStyle1: _state.learningStyle,
    levelOfStudy1: _state.levelOfStudy,
    course1: _state.course,
  });

  // Return the result as a structured response
  return { messages: result };
}

export async function enhanceWithImages(state: typeof inputAnnotation.State) {
  const { note } = state;
  const model = new ChatOpenAI({
    model: "gpt-4o-mini-2024-07-18",
  }).bindTools(tools);

  const sections = note.split("\n#");
  let enhancedNote = sections[0];

  for (const section of sections.slice(1)) {
    const imageDecision = await model.invoke(`
      Analyze this markdown section and decide if it needs an image:
      ${section}
      
      If visual aid would help, use the image_search tool with a specific search query.
      If no image is needed, respond with 'No image needed'.
    `);

    if (imageDecision.tool_calls?.length) {
      const imageUrl = await imageSearchTool.invoke({
        query: imageDecision.tool_calls[0].args.query,
      });
      if (imageUrl) {
        enhancedNote += `\n#${section}\n![](${imageUrl})`;
      }
    } else {
      enhancedNote += "\n#" + section;
    }
  }

  return {
    note: enhancedNote,
  };
}

function shouldContinue(state: typeof inputAnnotation.State) {
  return state.note ? "enhance_images" : "generate_note";
}

export const noteGraph = new StateGraph({
  input: inputAnnotation,
  output: outputAnnotation,
})
  .addNode("generate_plan", planChunk)
  .addNode("generate_note", generateNote)
  .addNode("enhance_images", enhanceWithImages)
  .addNode("image_search", toolNode)
  .addEdge("__start__", "generate_plan")
  .addEdge("generate_plan", "generate_note")
  .addConditionalEdges("generate_note", shouldContinue)
  .addEdge("enhance_images", END);
