"use node";
import { AIMessage } from "@langchain/core/messages";
import { Annotation, END, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import axios from 'axios';
import { z } from 'zod';
import { marked } from "marked";
import {titlePrompt,
  paragraphPrompt,
  imageGenerationPrompt,
  planPrompt} from "./prompts/noteAgent.ts"
// Define schema for image block data
const ImageBlockSchema = z.object({
  file: z.object({
    url: z.string()
      .url()
      .describe("URL of the image relevant to the notes.")
  }),
  caption: z.string().optional(),
  withBorder: z.boolean().optional(),
  withBackground: z.boolean().optional(),
  stretched: z.boolean().optional(),
});

// Define schema for paragraph block data
const ParagraphBlockSchema = z.object({
  text: z.string().describe("Content of the paragraph"),
  alignment: z.enum(['left', 'center', 'right'])
    .optional()
    .describe("Text alignment in the paragraph (optional)"),
});

// Define schema for header block data
const HeaderBlockSchema = z.object({
  text: z.string().describe("Title or header text"),
  level: z.string().describe("Heading level, e.g., '1' for H1, '2' for H2, etc."),
});


// Define schema for note blocks, which can be of header, paragraph, or image type
export const NoteBlockSchema = z.object({
  type: z.enum(['header', 'paragraph', 'image']),
  data: z.union([HeaderBlockSchema, ParagraphBlockSchema, ImageBlockSchema]),
});

// Define TypeScript types from Zod schemas
export type TNoteBlock = z.infer<typeof NoteBlockSchema>;


// Define input annotations for processing note data
const InputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  chunk: Annotation<string>,
  noteTakingStyle: Annotation<string>,
  learningStyle: Annotation<"visual" | "auditory" | "kinesthetic" | "analytical">,
  levelOfStudy: Annotation<"Bachelors" | "Associate" | "Masters" | "PhD">,
  course: Annotation<string>,
  plan: Annotation<string>,
  ImgArr: Annotation<string[]>,
});

// Define output annotation structure
const OutputAnnotation = Annotation.Root({
  note: Annotation<TNoteBlock[]>,
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

// Function to generate an image search query based on note context and retrieve an image link
async function collector(_state: typeof InputAnnotation.State): Promise<typeof OutputAnnotation.State> {
    const combinedNotes: TNoteBlock[] = [];

    //const imageUrl = await fetchImageLink(result.content.toString());
  
   
    // Check if _state.messages[0] exists and print it
    // Iterate through _state.messages and process them
    for (let index = 0; index < _state.messages.length; index++) {
      const message = _state.messages[index];
      const msgStr = message.content as string;
      
      const htmlContent = msgStr//await marked(msgStr);
      console.log(htmlContent);
      if (index === _state.messages.length - 3 && index == 0) {
        // Add an image block
        let url = "";
        try {
          url = await fetchImageLink(msgStr);
        } catch (error) {
          console.error("Error fetching image link:", error);
          url = ""; // Fallback to an empty string
        }
        if(url!=""){
        combinedNotes.push({
          type: "image",
          data: {
            file: {
              url: url,
            },
            caption: msgStr,
            withBorder: true,
            withBackground: false,
            stretched: false,
          },
        });
      }
      } 
      else if (index === _state.messages.length - 2) {
        // Add a header block
        combinedNotes.push({
          type: "header",
          data: {
            text: htmlContent,
            level: "1",
          },
        });
      }
    else if (index === _state.messages.length -1){
        // Add a paragraph block
        combinedNotes.push({
          type: "paragraph",
          data: {
            text: htmlContent,
            alignment: "center",
          },
        });
      }
      }
    return { note: combinedNotes };
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


// Function to generate structured lecture notes
export async function generateParagraph(_state: typeof InputAnnotation.State): Promise<{messages:AIMessage}> {
    
  
    const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18", temperature:0.3});

    const chain = paragraphPrompt.pipe(llm);

    const {chunk,plan} = _state;
  
    const result = await chain.invoke({
      chunk,
      plan
    });
   
    return {messages:result};
  }


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



  export async function planChunk(
    chunk1: string,
    noteTakingStyle1: string,
    learningStyle1: "visual" | "auditory" | "kinesthetic" | "analytical",
    levelOfStudy1: "Bachelors" | "Associate" | "Masters" | "PhD",
    course1: string
  ): Promise<{ messages: AIMessage }> {
    // Initialize the ChatOpenAI model with specific parameters
    const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18", temperature: 0.3 });
  
    // Create a pipeline for the prompt and LLM
    const chain = planPrompt.pipe(llm);
  
    // Invoke the pipeline with input data
    const result = await chain.invoke({
      chunk1: chunk1,
      noteTakingStyle1: noteTakingStyle1,
      learningStyle1: learningStyle1,
      levelOfStudy1: levelOfStudy1,
      course1: course1,
    });
  
    // Return the result as a structured response
    return { messages: result };
  }

// Set up the state graph to control annotation processing flow
export const graph = new StateGraph({
  input: InputAnnotation,
  output: OutputAnnotation,
})
.addNode("img_decision",decideIfImageNeeded)
.addNode("generate_title",generateTitle)
.addNode("generate_image", generateImageSearchQuery)
.addNode("generate_paragraph",generateParagraph)
.addNode("collector",collector)
.addEdge("__start__", "img_decision")
.addConditionalEdges("img_decision", (state: typeof InputAnnotation.State) => {
  return state.messages[0].content === "Yes" ? "generate_image" : "generate_title";
})
.addEdge("generate_image","generate_title")
.addEdge("generate_title","generate_paragraph")
.addEdge("generate_paragraph","collector")
.addEdge("collector",END)


