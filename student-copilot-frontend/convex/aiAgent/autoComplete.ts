"use node";

// Import required modules and components from LangChain and custom files.
// These include tools for defining annotations, state-based workflows (StateGraph), and interacting with OpenAI models.
import {
  Annotation,
  END,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";
import { autoCompletePrompt, analyserPrompt } from "./prompts/autoComplete";

// Define the structure for input and output annotations.
// These annotations specify the expected format and type of data to be used in the workflow.
const inputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec, // Standard message structure
  SimilaireChunk: Annotation<string>, // Custom data annotations for specific inputs
  prevNote: Annotation<string>,
  query: Annotation<string>,
});
const outputAnnotation = Annotation.Root({
  note: Annotation<string>, // Custom annotation for the resulting output
});

// Define the "analyser" function.
// This function processes input data using a ChatOpenAI model and a predefined prompt pipeline.
export async function analyser(
  _state: typeof inputAnnotation.State,
): Promise<{ messages: AIMessage }> {
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini-2024-07-18", // Initialize the LLM with specific parameters
  });

  const chain = analyserPrompt.pipe(llm); // Create a processing pipeline
  const result = await chain.invoke({
    prev_note: _state.prevNote, // Pass input data to the pipeline
  });

  return { messages: result }; // Return the processed messages
}

// Define the "autoCompleter" function.
// This function completes the input data based on the LLM's predictions and a predefined prompt pipeline.
export async function autoCompleter(
  _state: typeof inputAnnotation.State,
): Promise<typeof outputAnnotation.State> {
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini-2024-07-18", // Initialize the LLM
  });

  const chain = autoCompletePrompt.pipe(llm); // Create a processing pipeline
  const result = await chain.invoke({
    mentioned_style: _state.messages[_state.messages.length - 1] || "", // Use the last message as context
    query: _state.query,
    similaire_chunk: _state.SimilaireChunk,
  });

  return {
    note: result.content.toString(), // Return the completed data as output
  };
}

// Create a StateGraph to define the workflow for processing inputs and generating outputs.
// The graph specifies nodes (functions) and edges (transitions) to model the flow.
export const autocompleteGraph = new StateGraph({
  input: inputAnnotation, // Define input structure
  output: outputAnnotation, // Define output structure
})
  .addNode("analyser", analyser) // Add nodes for each processing step
  .addNode("auto_complete", autoCompleter)
  .addEdge("__start__", "analyser") // Define transitions between nodes
  .addEdge("analyser", "auto_complete")
  .addEdge("auto_complete", END); // Define the endpoint of the workflow
