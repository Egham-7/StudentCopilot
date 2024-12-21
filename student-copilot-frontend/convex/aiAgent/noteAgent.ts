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
import { notePrompt } from "./prompts/noteAgent";

const inputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  chunk: Annotation<string>,
  noteTakingStyle: Annotation<string>,
  learningStyle: Annotation<
    "visual" | "auditory" | "kinesthetic" | "analytical"
  >,
  levelOfStudy: Annotation<"Bachelors" | "Associate" | "Masters" | "PhD">,
  course: Annotation<string>,
  prev_note: Annotation<string>,
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
  const {
    chunk,
    noteTakingStyle,
    learningStyle,
    levelOfStudy,
    course,
    prev_note,
  } = state;

  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
  });

  const chain = notePrompt.pipe(model);

  const result = await chain.invoke({
    chunk,
    noteTakingStyle,
    learningStyle,
    levelOfStudy,
    course,
    prev_note,
  });

  return {
    note: result.content.toString(),
  };
}

export async function enhanceWithImages(state: typeof inputAnnotation.State) {
  const { note } = state;

  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
  }).bindTools(tools);

  const sections = note.split("\n#");

  let enhancedNote = sections[0];

  for (const section of sections.slice(1)) {
    try {
      const imageDecision = await model.invoke(`
        Analyze this markdown section and decide if it needs an image:

        ${section}
        
        If visual aid would help, use the image_search tool with a specific search query.

        If no image is needed, respond with 'No image needed'.
      `);

      if (imageDecision.tool_calls?.length) {
        try {
          const imageUrl = await imageSearchTool.invoke({
            query: imageDecision.tool_calls[0].args.query,
          });

          enhancedNote += `\n#${section}\n![](${imageUrl})`;
        } catch (imageSearchError) {
          console.error("Image search failed:", imageSearchError);
          // If image search fails, just add the section without an image
          enhancedNote += "\n#" + section;
        }
      } else {
        enhancedNote += "\n#" + section;
      }
    } catch (modelInvocationError) {
      console.error("Model invocation failed:", modelInvocationError);
      // If model invocation fails, return the original note
      return { note };
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
  .addNode("generate_note", generateNote)
  .addNode("enhance_images", enhanceWithImages)
  .addNode("image_search", toolNode)
  .addEdge("__start__", "generate_note")
  .addConditionalEdges("generate_note", shouldContinue)
  .addEdge("enhance_images", END);
