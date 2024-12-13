"use node";
import { AIMessage } from "@langchain/core/messages";
import {
  Annotation,
  END,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import axios from "axios";
import { z } from "zod";

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
async function generateImageSearchQuery(_state: typeof InputAnnotation.State): Promise<typeof OutputAnnotation.State> {
  const prompt = `
    Create a succinct search query, limited to 4-6 words, that captures the core theme of the following lecture content:
    ${_state.chunk}
    `;

  const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18" });
  const generatedNotes = await generateNotes(_state);


  const combinedNotes: TNoteBlock[] = [
    ...(Array.isArray(generatedNotes) ? generatedNotes : [generatedNotes]),
  ];
  
  if (Array.isArray(generatedNotes) && generatedNotes[0]?.type === "header") {
    const result = await llm.invoke(prompt);
    const resStr=result.content as string
    const imageUrl = await fetchImageLink(resStr);
  
    combinedNotes.push({
      type: "image",
      data: {
        file: {
          url: imageUrl,
        },
        caption: resStr,
        withBorder: true,
        withBackground: false,
        stretched: false,
      },
    });
  }

  return { note: combinedNotes };
}

// Function to generate structured lecture notes
export async function generateNotes(_state: typeof InputAnnotation.State): Promise<TNoteBlock[]> {
  const prompt = `Generate concise, well-structured, and visually organized notes based on the provided lecture plan and content chunk. The output should be formatted into **distinct blocks** for easy readability and integration into a note-taking application like Editor.js. Follow these instructions:

                    ---


                    2. **Chunk Content**: Focus on summarizing the provided content, extracting key points, and ensuring smooth integration with prior notes if applicable.  
                    Content: ${_state.chunk}

                    3. **Previous Notes**: Avoid repetition by referencing earlier notes. Use consistent terminology and build on existing points logically.

                    ---

                    ### Formatting Instructions:

                    1. **Section Titles (Header Blocks)**:  
                    - Each section or sub-topic should have a clear and descriptive title.  
                    - Use the hierarchy of headers to organize main ideas (e.g., 2 for main sections, 3 for subsections).

                    2. **Bullet Points (List Blocks)**:  
                    - Break down key ideas into bullet points for clarity.  
                    - Ensure each bullet contains only one main idea, keeping it concise and focused.  
                    - Use nested lists for sub-points or steps, ensuring proper indentation.

                    3. **Paragraphs (Text Blocks)**:  
                    - Use paragraphs for explanations or descriptions that don’t fit into bullet points.  
                    - Ensure each paragraph is short and focused on one idea.

                    4. **Key Terms and Highlights**:  
                    - Bold important terms or phrases.  
                    - Provide brief definitions for technical terms or complex concepts.

                    5. **Action Items (Optional)**:  
                    - For kinesthetic learners, include practical steps, applications, or real-world examples when applicable.

                    ---

                    ### Content Style:

                    1. **Conciseness**:  
                    - Summarize ideas without oversimplifying. Avoid excessive detail and keep each point meaningful.

                    2. **Clarity and Flow**:  
                    - Ensure logical progression from one section to the next.  
                    - Conclude major sections with a summary sentence to reinforce key takeaways.

                    3. **User Preferences**:  
                    - Adapt the tone and style based on the user's preferences:
                        - **Learning Style**: ${_state.learningStyle}  
                        - **Level of Study**: ${_state.levelOfStudy}  
                        - **Note Taking Style**: ${_state.noteTakingStyle}

                    -
`;

  const llm = new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18" });
  const structuredLlm = llm.withStructuredOutput(NoteBlockSchema);
  const result = await structuredLlm.invoke(prompt);

  const dataResponse = await NoteBlockSchema.safeParseAsync(result);

  if (!dataResponse.success) {
    throw new Error("Incorrect structure.");
  }

  return [dataResponse.data];
}

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

// Set up the state graph to control annotation processing flow
export const graph = new StateGraph({
  input: InputAnnotation,
  output: OutputAnnotation,
})
  .addNode("generate_image", generateImageSearchQuery)
  .addEdge("__start__", "generate_image")
  .addEdge("generate_image", END);
