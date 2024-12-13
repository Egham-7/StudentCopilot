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
  url: z.string().url().describe("URL of the image relevant to the notes"),
  caption: z.string().optional(),
  withBorder: z.boolean().optional(),
  withBackground: z.boolean().optional(),
  stretched: z.boolean().optional(),
});

// Define schema for paragraph block data
const ParagraphBlockSchema = z.object({
  text: z.string().describe("Content of the paragraph"),
  alignment: z
    .enum(["left", "center", "right"])
    .optional()
    .describe("Text alignment in the paragraph (optional)"),
});

// Define schema for header block data
const HeaderBlockSchema = z.object({
  text: z.string().describe("Title or header text"),
  level: z
    .string()
    .describe("Heading level, e.g., '1' for H1, '2' for H2, etc."),
});

// Define schema for note blocks, which can be of header, paragraph, or image type
export const NoteBlockSchema = z.object({
  type: z.enum(["header", "paragraph", "image"]),
  data: z.union([HeaderBlockSchema, ParagraphBlockSchema, ImageBlockSchema]),
});

// Define TypeScript types from Zod schemas
export type TNoteBlock = z.infer<typeof NoteBlockSchema>;

// Define input annotations for processing note data
const InputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  chunk: Annotation<string>,
  noteTakingStyle: Annotation<string>,
  learningStyle: Annotation<
    "visual" | "auditory" | "kinesthetic" | "analytical"
  >,
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
      console.log("Fetched image link:", imageLink);
      return imageLink;
    } else {
      console.error("Unexpected response structure:", response.data);
      throw new Error("Unexpected response structure: no image link found");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error with Axios:", error.message);
      if (error.response) {
        console.error("Server response error:", error.response.data);
        console.error("Status code:", error.response.status);
      } else if (error.request) {
        console.error("No response received:", error.request);
      }
    } else {
      console.error("Error during request:", error);
    }
    throw new Error("Image link retrieval failed");
  }
}

// Function to generate an image search query based on note context and retrieve an image link
async function generateImageSearchQuery(
  _state: typeof InputAnnotation.State,
): Promise<typeof OutputAnnotation.State> {
  const prompt = `
    Create a succinct search query, limited to 4-6 words, that captures the core theme of the following lecture content:
    ${_state.chunk}
    `;

  const llm = new ChatOpenAI({ model: "gpt-3.5-turbo" });
  const generatedNotes = await generateNotes(_state);

  let imageUrl = "";
  if (generatedNotes[0].type === "header") {
    const result = await llm.invoke(prompt);
    imageUrl = await fetchImageLink(result.content.toString());
  }

  const combinedNotes: TNoteBlock[] = [
    {
      type: "image",
      data: {
        url: imageUrl,
        caption: "Relevant image for note",
        withBorder: true,
        withBackground: false,
        stretched: true,
      },
    },
    ...(Array.isArray(generatedNotes) ? generatedNotes : [generatedNotes]),
  ];

  return { note: combinedNotes };
}

// Function to generate structured lecture notes
export async function generateNotes(
  _state: typeof InputAnnotation.State,
): Promise<TNoteBlock[]> {
  const prompt = `Generate well-structured, concise, and informative notes based on the provided lecture plan and chunk content, following these instructions to ensure alignment with the user's preferences:

                    Context and Structure:
                    
                    1.Lecture Plan: Use the plan details provided to shape the structure and flow of the notes. Ensure each section, sub-topic, or point follows the outlined sequence in the plan.
                    Plan: ${_state.plan}
                    
                    2.Current Content: Focus on summarizing and organizing key points from this chunk, weaving them smoothly with previous notes when appropriate.
                        Content: ${_state.chunk}
                    Formatting:
                    
                    3.Previous Notes: Reference and build on points from prior notes to maintain flow and prevent redundancy. When new content overlaps with previous sections, reinforce rather than repeat, ensuring consistency in terminology and context.
                    
                    
                    Formatting:
                    1.Section Titles: Use clear, descriptive titles for each section or topic derived from the lecture plan, even if the titles aren’t explicitly in the content. This helps guide the user through each main idea effectively.

                    2.Bullet Points:

                    . Break down information into bullet points for clarity, especially when listing facts, processes, or sequential steps.
                    . Each bullet point should contain one main idea or fact, keeping sentences concise but informative.
                        Subsections and Indentation: If a section has multiple sub-points or steps, use indentation or numbered lists for readability. Make sub-sections visually distinct for better understanding.

                    4.Keywords and Definitions:

                    . Bold key terms or phrases for emphasis, especially if they are crucial to understanding the topic.
                    . Provide brief definitions or explanations of key terms where necessary to ensure clarity, particularly for complex topics.
                    
                    
                        Content Style:
                    1.Note Style: Adapt the language and tone based on the user's note-taking style. Use plain, straightforward language if the user prefers a more direct style, or add relevant context if they favor in-depth understanding.

                    2.Learning Style:

                    .Auditory: Include brief descriptions or analogies that could be imagined as spoken, as if explaining to a listener.
                    .Visual: Use more descriptive language and spatial formatting (e.g., bullet points, headings) to create a visually organized structure.
                    .Kinesthetic: If possible, incorporate action-oriented phrases or real-world applications to aid understanding through association.
                    .Analytical: Use a logical, fact-based approach; emphasize reasoning, cause-effect relationships, and structured information flow.
                    
                    3.Level of Study:

                    . Bachelors or Associate: Focus on foundational knowledge and essential concepts; avoid overly technical language unless crucial for understanding.
                    . Masters or PhD: Include advanced terminology and assume a higher level of prior knowledge. Emphasize critical analysis, implications, and any points that suggest further exploration.
                    
                    Content Rules:
                    
                    1. Conciseness: Condense complex ideas without oversimplifying, ensuring every point is meaningful. Avoid repetition unless it reinforces a critical concept.

                    2. Relevance: Stick closely to the plan and chunk content, excluding unrelated details. Focus on extracting and distilling the most relevant information that directly supports the lecture goals.

                    3. Clarity and Flow:

                    Ensure that each section flows logically into the next, creating a coherent structure.
                    Summarize each major section in a final summary sentence if possible, to reinforce the key takeaways.
                    
                    
                    
                    Output Example:
                    Example based on fictitious content for demonstration purposes only:

                    Introduction to Neural Networks

                        . Definition: Neural networks are computing systems inspired by biological neural networks.
                        . Key Components:
                            Neurons: Fundamental units that process and transmit information.
                            Layers: Organized groups of neurons where data is processed in stages.
                    
                    Training Process

                        1.Data Input: The model receives input data, which it processes layer by layer.
                        2.Backpropagation: A method used to adjust weights and minimize error.
                            . This iterative process helps the model learn from its errors.
                    
                    Applications in Image Recognition

                    Facial Recognition: Neural networks are widely used to identify unique facial features.
                    Medical Imaging: Applications include detecting anomalies in X-rays or MRIs.
                    
                Additional Instructions:
                End the notes with a brief summary if possible, consolidating the major points covered.
                Ensure the notes remain accessible for future reference, with each point clearly associated with its section or topic.
                Use this structured approach to create high-quality notes that are well-organized, visually clear, and tailored to the user's preferences.

                Context and Information about the user:
                    .Learning Style: ${_state.learningStyle}
                    .Course: ${_state.course}
                    .Level of Study: ${_state.levelOfStudy}
                    .Note Taking style: ${_state.noteTakingStyle}`;

  const llm = new ChatOpenAI({ model: "gpt-3.5-turbo" });
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
  lectureContent: string[],
): Promise<string> {
  const llm = new ChatOpenAI({ model: "gpt-3.5-turbo" });
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
    const batchContent = lectureContent.slice(
      i * batchSize,
      (i + 1) * batchSize,
    );
    const batchPlan = await generateBatchPlan(batchContent);
    fullPlan += `\n### Batch ${i + 1} Plan\n${batchPlan.content}`;
  }

  // Return combined plan as a single AIMessage
  return fullPlan.trim();
}

// Set up the state graph to control annotation processing flow
export const graph = new StateGraph({
  input: InputAnnotation,
  output: OutputAnnotation,
})
  .addNode("generate_image", generateImageSearchQuery)
  .addEdge("__start__", "generate_image")
  .addEdge("generate_image", END);
