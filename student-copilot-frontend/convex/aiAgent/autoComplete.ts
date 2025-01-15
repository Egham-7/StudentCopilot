
"use node"
import {
  Annotation,
  END,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";
import { autoCompletePrompt,analyserPrompt } from "./prompts/autoComplete";

const inputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  SimilaireChunk: Annotation<string>,
  prevNote: Annotation<string>,
  query: Annotation<string>,
}); 
const outputAnnotation = Annotation.Root({
  note: Annotation<string>,
}); 


export async function analyser(
    _state: typeof inputAnnotation.State,
  ): Promise<{ messages: AIMessage }> {
    // Initialize the ChatOpenAI model with specific parameters
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini-2024-07-18",
    });
  
    // Create a pipeline for the prompt and LLM
    const chain = analyserPrompt.pipe(llm);
  
    // Invoke the pipeline with input data
    const result = await chain.invoke({
        prev_note:_state.prevNote
    });
  
    // Return the result as a structured response
    return { messages: result };
  }

  export async function autoCompleter(
    _state: typeof inputAnnotation.State,
  ): Promise<typeof outputAnnotation.State> {
    // Initialize the ChatOpenAI model with specific parameters
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini-2024-07-18",
    });
  
    // Create a pipeline for the prompt and LLM
    const chain = autoCompletePrompt.pipe(llm);
    
    // Invoke the pipeline with input data
    const result = await chain.invoke({
        mentioned_style: _state.messages[_state.messages.length - 1] || "",
        query :_state.query,
        similaire_chunk: _state.SimilaireChunk
    });
  
    // Return the result as a structured response
    return {
        note: result.content.toString(),
      };
  }


export const autocompleteGraph = new StateGraph({
  input: inputAnnotation,
  output: outputAnnotation,
})
  .addNode("analyser", analyser)
  .addNode("auto_complete",autoCompleter)
  .addEdge("__start__", "analyser")
  .addEdge("analyser","auto_complete")
  .addEdge("auto_complete", END)


  

 