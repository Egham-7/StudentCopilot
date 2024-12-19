"use node";
import { AIMessage } from "@langchain/core/messages";
import { Annotation, END, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import axios from 'axios';
import {
  paragraphPrompt,
  planPrompt} from "./prompts/noteAgent.ts"
// import schema for image block data

// Define input annotations for processing note data

const InputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  chunk: Annotation<string>,
  noteTakingStyle: Annotation<string>,
  learningStyle: Annotation<"visual" | "auditory" | "kinesthetic" | "analytical">,
  levelOfStudy: Annotation<"Bachelors" | "Associate" | "Masters" | "PhD">,
  course: Annotation<string>,
  prev_note:Annotation<string>,
});

// Define output annotation structure
const OutputAnnotation = Annotation.Root({
  note: Annotation<string>,
});

// API keys for Google Custom Search
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CX = process.env.CX;

// Utility function to fetch an image link from Google Custom Search based on a query
export async function fetchImageLink(query: string): Promise<string> {
  const searchUrl = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${CX}&key=${GOOGLE_API_KEY}&searchType=image&num=1`;

  try {
    const response = await axios.get(searchUrl);
    const imageLink = response?.data?.items?.[0]?.link;
    if (imageLink) {
      return imageLink;
    } else {
      console.error('Unexpected response structure:', response.data);
      throw new Error('Unexpected response structure: no image link found');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error with Axios:', error.message);
      if (error.response) {
        console.error('Server response error:', error.response.data);
        console.error('Status code:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      }
    } else {
      console.error('Error during request:', error);
    }
    throw new Error('Image link retrieval failed');
  }
}


/*
// Function to generate an image search query based on note context and retrieve an image link
async function generateImageSearchQuery(_state: typeof InputAnnotation.State): Promise<{messages:AIMessage}> {
  const prompt = `
    Create a succinct search query, limited to 4-6 words, that captures the core theme of the following lecture content:
    ${_state.chunk}
    `;
  const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18" });
  const result = await llm.invoke(prompt);
  return {messages:result};
}

export function getParagraphLines(text: string): string[] {
  return text.split('\n').filter(line => line.trim().length > 0);
}


// Function to generate structured lecture notes
export async function generateTitle(_state: typeof InputAnnotation.State): Promise<{messages:AIMessage}> {
    
  
    const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18" });
  
    const chain = titlePrompt.pipe(llm);
    
    const chunk = _state.chunk;

    const result = await chain.invoke({
      chunk
   })
    return {messages:result};

  }
*/

// Function to generate structured lecture notes
export async function generateParagraph(_state: typeof InputAnnotation.State): Promise<typeof OutputAnnotation.State> {
    
  
    const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18"});

    const chain = paragraphPrompt.pipe(llm);

    const {chunk,prev_note} = _state;

    const plan = _state.messages[_state.messages.length-1];
  
    const result = await chain.invoke({
      chunk,
      plan,
      prev_note
    });
    const string_result = result.content as string
    

    return {note:string_result };
  }

  /*
  export const decideIfImageNeeded = async (state: typeof InputAnnotation.State) => {
  
    // Invoke the model
    const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18"});

    const chain = imageGenerationPrompt.pipe(llm);

    const {  chunk , ImgArr } = state;
    
    try {
      // Invoke the model
      const categorizationResponse = await chain.invoke({ chunk, ImgArr });
      
      // Validate response using Zod
      const schema = z.object({
        requiresTitle: z.enum(["Yes", "No"]),
      });
  
      const validatedResponse = schema.parse({
        requiresTitle: categorizationResponse.content,
      });
      
      // Return parsed result
      return { messages: validatedResponse.requiresTitle };
    } catch (error) {
      console.error("Error in decideIfImageNeeded:", error);
      throw new Error("Failed to determine if a title is needed.");
    }
  };
  */


  export async function planChunk(
    _state: typeof InputAnnotation.State
  ): Promise<{ messages: AIMessage }> {
    // Initialize the ChatOpenAI model with specific parameters
    const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18", temperature: 0.3 });
  
    // Create a pipeline for the prompt and LLM
    const chain = planPrompt.pipe(llm);
  
    // Invoke the pipeline with input data
    const result = await chain.invoke({
      chunk1: _state.chunk,
      noteTakingStyle1: _state.noteTakingStyle,
      learningStyle1: _state.learningStyle,
      levelOfStudy1:_state.levelOfStudy,
      course1: _state.course,
    });
  
    // Return the result as a structured response
    return { messages: result };
  }



// Set up the state graph to control annotation processing flow
export const graph = new StateGraph({
  input: InputAnnotation,
  output: OutputAnnotation,
})
.addNode("gen_plan",planChunk)
.addNode("gen_paragraph",generateParagraph)

.addEdge("__start__", "gen_plan")
.addEdge("gen_plan","gen_paragraph")
.addEdge("gen_paragraph",END)


