"use node";
import { Annotation, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import axios from 'axios';
import { z } from 'zod';


const GOOGLE_API_KEY = process.env.Google_API_KEY;
const CX = process.env.CX;

const NoteBlockType = z.enum([ 'header','image', 'paragraph'])

const ImageBlockData = z.object({
  url: z.string().url().describe("Here should be the URL for Image which best suit notes"),
  caption: z.string().optional(),
  withBorder: z.boolean().optional(),
  withBackground: z.boolean().optional(),
  stretched: z.boolean().optional(),
})

const ParagraphBlockData = z.object({
  text: z.string().describe("text of note"),
  alignment: z.enum(['left', 'center', 'right']).optional().describe("precise th alignment of paragraph 'left' OR 'center' OR'right'"),
})

const HeaderBlockData = z.object({
  text: z.string().describe("title of the paragraph of note"),
  level: z.string().describe("size of the title"),
})

const NoteBlock = z.object({
    type: z.enum(['header', 'paragraph','image']),
    data: z.union([HeaderBlockData, ParagraphBlockData,ImageBlockData]),
});


const tempNoteBlock = z.object({
    title: z.string(),
    title_size: z.string(),
    paragraph: z.string(),
    image:z.string().optional(),
})
export type TempTNoteBlock= z.infer<typeof tempNoteBlock>
export type TNoteBlock = z.infer<typeof NoteBlock>
export type TNoteBlockType = z.infer<typeof NoteBlockType>

export { NoteBlock, NoteBlockType };

const InputAnnotation = Annotation.Root({
    ...MessagesAnnotation.spec,  // If `messages` is part of this spec, it should work
    chunk: Annotation<string>,
    noteTakingStyle: Annotation<string>,
    learningStyle: Annotation<"visual" | "auditory" | "kinesthetic" | "analytical">,
    levelOfStudy: Annotation<"Bachelors" | "Associate" | "Masters" | "PhD">,
    course: Annotation<string>,
    notes: Annotation<[TNoteBlock]>,
  });
const OutputAnnotation=Annotation.Root ({
    notes:Annotation<TNoteBlock>
})

// Helper to get an image link based on a query
async function getImageLink(query: string): Promise<string> {
    const url = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${CX}&key=${GOOGLE_API_KEY}&searchType=image&num=1`;
    try {
        const response = await axios.get(url);
        const items = response.data.items;
        return items && items.length > 0 ? items[0].link : 'No images found';
    } catch (error) {
        console.error('Error fetching image:', error);
        throw error;
    }
}

async function generateImageSearchQuery(_state: typeof InputAnnotation.State): Promise<{imageblock:TNoteBlock }> {
    const prompt = `
    Your task is to:
    1.Highlight Core Themes: Identify and focus on the main concepts and themes present in the note. Ensure that the image encapsulates these key ideas visually.
    2.Use Simple and Clear Visuals: Create or select images that use clear, simple designs and symbols to represent complex ideas. Avoid clutter to enhance understanding and retention.
    3.Incorporate Relevant Context: Ensure that the image includes relevant contextual elements that help visual learners connect the visual representation with the information in the notes. Use annotations, labels, or color coding to provide additional clarity.
    4.Please ensure the search query does not exceed a maximum of 6 words to maintain clarity and focus.

    Given the note, provide the most relevant search query to find a highly accurate image that visually explains or represents the key concept. Focus on the essential elements and context of the note to create the search query.
    Based on the following lecture : ${_state.chunk},
    generate the most relevant search query to find an accurate image that visually explains or represents the key concept of this content.
    Focus on the essential elements and context to ensure the search query retrieves the best possible image.`;
    const llm = new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0 });
    const result = await llm.invoke(prompt);
    const Link=await getImageLink(result.toString());
    const imageblock: TNoteBlock = {
        type: 'image', // Specify the type
        data: {
          url: Link, // Assign a specific URL here
          caption: 'An example image',
          withBorder: true,
          withBackground: false,
          stretched: true,
        },
      };
    //const valid= NoteBlock.parse(result);
    return {imageblock:imageblock};
}


// Function to generate a structured Markdown note
async function generateNote1(_state: typeof InputAnnotation.State): Promise<typeof OutputAnnotation.State > {
    
    const prompt = `Your task is to:

    1.Thorough Analysis: Carefully analyze the provided lecture chunk for its main ideas, key concepts, and supporting details.
    2.Comprehensive Summary: Create a detailed summary in Markdown format that aligns with the user’s specific note-taking and learning style.
    3.Markdown Formatting: Utilize appropriate Markdown syntax for:
        Headings and Subheadings: Ensure that all titles are formatted correctly for a .md file (e.g., using # for main titles, ## for subheadings).
        Lists (bullet and numbered)
        Emphasis (bold and italics)
    4.Highlight Key Points: Clearly identify and emphasize key concepts, definitions, and critical information.
    5.Logical Organization: Structure the notes in a logical hierarchy, grouping related ideas together for clarity.
    6.Incorporate Examples: Include relevant examples or case studies mentioned in the lecture to illustrate key points.
    7.Readable Format: Use bullet points or numbered lists for easy scanning and readability.
    8.Conciseness: Ensure notes are succinct yet informative, appropriate for the user's level of study. Aim to keep notes to no more than one-third of the original text length.
    9.Code Blocks: Use code blocks for any multiline code content or complex structures to enhance clarity.
    10.Math Syntax: Apply Markdown math syntax compatible with KaTeX for any formulas or equations mentioned.
    11.Key Takeaways: Conclude with a brief "Key Takeaways" section to summarize the essential points.
    12.Visual Aids: For visual learners, suggest relevant diagrams, charts, or visual aids to enhance understanding.
    13.Mnemonics for Auditory Learners: Highlight key phrases or create mnemonics that can aid memory retention for auditory learners.
    14.Practical Applications: For kinesthetic learners, recommend hands-on activities or real-world applications related to the content.
    15.Logical Connections: For analytical learners, provide logical breakdowns and connections between concepts to enhance understanding.
    16.Exclude Unnecessary Information: Omit any superfluous information such as citations or footnotes that do not contribute directly to the understanding of the content.
    17.Complete Ideas: If the lecture chunk appears to be cut off or incomplete, use your best judgment to infer the intended meaning and complete the idea logically. Avoid leaving any sentences or thoughts unfinished in your summary.
    18. Don't add dash in any new line "-" ,
    19.Utilize the following structure that includes all previously generated titles and images and the titles size so you can keep the flow.
    Please summarize the following lecture chunk into well-structured Markdown notes, tailored to the user's preferences:

    ${_state.chunk}

    This context is relevant to:

        Note-taking style: ${_state.noteTakingStyle}
        Learning style: ${_state.learningStyle}
        Level of study: ${_state.levelOfStudy}
        Course: ${_state.course}
        previous_notes: ${_state.notes}

    Important: Ensure that all titles are formatted correctly for a Markdown (.md) file.
    `;
    const llm = new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0 });

    const structuredLlm = llm.withStructuredOutput(NoteBlock);

    const result = await structuredLlm.invoke(prompt);
    
    const valid= NoteBlock.parse(result);

    return {notes:valid};
    }


    
// Graph construction and invocation

export const graph= new StateGraph({
    input:InputAnnotation,
    output:OutputAnnotation
})
.addNode("generate_note", () => generateNote1)
/*
.addNode("image_tool", () => generateImageSearchQuery)
.addConditionalEdges("__start__",async () => {
    return info.learningStyle === "visual" ? "image_tool" : "generate_note";
})
.addEdge("image_tool", "generate_note")
.addEdge("generate_note","__end__")
*/
.addEdge("__start__","generate_note")
.compile();


  




