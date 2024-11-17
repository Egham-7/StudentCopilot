"use node";
import { AIMessage } from "@langchain/core/messages";
import { Annotation, END, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import axios from 'axios';
import { z } from 'zod';

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
      console.log('Fetched image link:', imageLink);
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
  
    let index=0;
    // Check if _state.messages[0] exists and print it
    while (_state.messages[index]) {
        console.log(_state.messages[index]);
        if(index==1){
            combinedNotes.push({
                type:"header",
                data: {
                text: _state.messages[1].content.toString(),
                level: "1",
              },
        })
        }
        index=index+1;
    }
    

      /*
      combinedNotes.push({
          type: "paragraph",
        data: {
          text:_state.messages[0].content.toString(),
          alignment:'center'
        },
      })
  
      combinedNotes.push({
        type: "image",
        data: {
          file: {
            url: "",
          },
          caption: "",
          withBorder: true,
          withBackground: false,
          stretched: true,
        },
      });
      */
  
    return { note: combinedNotes };
  }
  
// Function to generate structured lecture notes
export async function generateTitle(_state: typeof InputAnnotation.State): Promise<{messages:AIMessage}> {
    const prompt = `You are an expert at creating concise and impactful titles. Based on the provided text chunk, generate a suitable title that aligns with the following criteria:

Relevance: The title must reflect the main topic or purpose of the chunk.

Clarity: The title should be straightforward, easy to understand, and not ambiguous.

Brevity: Keep the title concise, ideally between 3 to 8 words.

Tone: Match the tone of the content—professional, academic, casual, or creative—based on the text style.
Structure: Use keywords or phrases that summarize the main idea, avoiding overly generic or vague titles.

Chunk:
${_state.chunk}

Instructions:
Analyze the chunk carefully and generate a title that captures its core idea. Respond with the title only, without any explanation or additional text.
                    
  `;
  
    const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18" });
    const result = await llm.invoke(prompt);
   
    return {messages:result};
  }


// Function to generate structured lecture notes
export async function generateParagraph(_state: typeof InputAnnotation.State): Promise<{messages:AIMessage}> {
    const sysPrompt = `You are an AI tasked with generating concise, well-structured, and visually organized notes based on a provided lecture plan and chunk of content. The output should be formatted in distinct blocks for easy readability and integration into note-taking applications like Editor.js. Ensure that the content is clear, brief, and organized into sections (with titles, bullet points, and paragraphs where necessary). Avoid markdown formatting that will result in large paragraph blocks. The result should look like the following structure:

Overview:

Provide a brief summary of the chunk content.
Avoid repeating prior notes unless reinforcing essential concepts.
Section Titles (Header Blocks):

Use clear, concise titles for each main idea or section.
Use Header 2 (H2) for main sections and Header 3 (H3) for sub-sections.
Bullet Points (List Blocks):

Organize key ideas into brief, concise bullet points.
Each bullet should present one key idea.
Use nested bullet points for additional sub-points or details.
Paragraphs (Text Blocks):

If necessary, include short paragraphs that explain a concept.
Each paragraph should focus on one clear idea.
Key Terms and Highlights:

Bold key terms or important phrases.
Include brief definitions for complex or technical terms.
Action Items (Optional):

For kinesthetic learners, add practical steps or real-world examples.
The output should focus on conciseness without oversimplification and maintain clarity and logical flow. Ensure each section flows smoothly from one to the next.
                      
  `;

  const userPrompt = `You are tasked with summarizing the following chunk of content based on the lecture plan. Your goal is to generate concise, well-structured, and visually organized notes. The output should follow these guidelines:

Content Chunk:
Focus on summarizing the provided content, extracting key points, and keeping the summary brief and to the point. Ensure smooth integration with any prior notes if applicable.

Formatting:

Use section titles (H2 or H3) to separate main ideas.
Break down key points into bullet points for clarity.
Use short paragraphs to explain complex ideas without unnecessary detail.
Bold key terms or phrases where necessary, and provide brief definitions when complex concepts are mentioned.
Learning Style and User Preferences:

Learning Style: ${_state.learningStyle}
Level of Study: ${_state.levelOfStudy}
Note-Taking Style: ${_state.noteTakingStyle}
Your summary should focus on conciseness, clarity, and logical flow, keeping each point meaningful and ensuring the notes are easily readable and ready for integration into a note-taking app like Editor.js.

`;
  
    const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18" });
    const result = await llm.invoke(   [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt },
      ]);
   
    return {messages:result};
  }

  export const decideIfTitleNeeded = async (state: typeof InputAnnotation.State) => {

    const CATEGORIZATION_SYSTEM_TEMPLATE = `You are an expert decision-making system for determining title necessity.
  Analyze the text and use memory of previous chat provide a clear answer if a title is required.`;
  
    const CATEGORIZATION_HUMAN_TEMPLATE = `The provided text is as follows:
  Chunk: ${state.chunk}
  
  Decide if the text chunk requires a title based on the following:
  - Consistency with prior responses.
  - Clarity of structure and organization.
  - Continuity and flow.
  
  Respond with "Yes" if a title is required, otherwise "No".`;
  
    // Invoke the model
    const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18" });
    const categorizationResponse = await llm.invoke(
      [
        { role: "system", content: CATEGORIZATION_SYSTEM_TEMPLATE },
        { role: "user", content: CATEGORIZATION_HUMAN_TEMPLATE },
      ]
    );
  
    // Use zod to validate the response
    const schema = z.object({
      requiresTitle: z.enum(["Yes", "No"]),
    });
  
    // Validate response content
    const validatedResponse = schema.parse({ requiresTitle: categorizationResponse.content});
    return { messages: validatedResponse.requiresTitle};

  };
  
  
  


// Function to create a lecture plan based on preferences and lecture content
export async function planLectureNotes(
  noteTakingStyle: string,
  learningStyle: "auditory" | "visual" | "kinesthetic" | "analytical",
  levelOfStudy: "Bachelors" | "Associate" | "Masters" | "PhD",
  course: string,
  lectureContent: string[]
): Promise<AIMessage> {
  const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18" });
  let fullPlan: string = "";

  // Function to process a single batch of lecture content
  async function generateBatchPlan(batchContent: string[]): Promise<AIMessage> {
    const prompt = `
            Create a partial lecture plan for generating summary notes based on the preferences:
            - Note style: ${noteTakingStyle}
            - Learning style: ${learningStyle}
            - Level of study: ${levelOfStudy}
            - Course: ${course}
            - Lecture content: ${batchContent}
        `;
    return await llm.invoke(prompt);
  }

  // Process lecture content in batches of 14 if needed
  const batchSize = 14;
  const batchCount = Math.ceil(lectureContent.length / batchSize);

  for (let i = 0; i < batchCount; i++) {
    const batchContent = lectureContent.slice(i * batchSize, (i + 1) * batchSize);
    const batchPlan = await generateBatchPlan(batchContent);
    fullPlan += `\n### Batch ${i + 1} Plan\n${batchPlan.content}`;
  }

  // Return combined plan as a single AIMessage
  return new AIMessage(fullPlan.trim());
}

const decisionLogic = (state: typeof InputAnnotation.State) => {
    // Check if the first message content is "Yes"
    if (state.messages[0]?.content === "Yes") {
        return "generate_title";  // Transition to generate_title
    } else {
        return "generate_paragraph";  // Transition to generate_paragraph
    }
};

// Set up the state graph to control annotation processing flow
export const graph = new StateGraph({
  input: InputAnnotation,
  output: OutputAnnotation,
})
.addNode("title_decision",decideIfTitleNeeded)
.addNode("generate_title",generateTitle)
.addNode("generate_image", generateImageSearchQuery)
.addNode("generate_paragraph",generateParagraph)
.addNode("collector",collector)
.addEdge("__start__", "title_decision")
.addConditionalEdges("title_decision", (state: typeof InputAnnotation.State) => {
    // Call the synchronous logic function to get the transition
    const nextStep = decisionLogic(state);
    return nextStep;  // This will return either "generate_title" or "generate_paragraph"
})
.addEdge("generate_title","generate_image")
.addEdge("generate_image","generate_paragraph")
.addEdge("generate_paragraph","collector")
.addEdge("collector",END)



