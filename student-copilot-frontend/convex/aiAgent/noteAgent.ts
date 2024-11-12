"use node";
import { AIMessage, AIMessageChunk } from "@langchain/core/messages";
import { Annotation, END, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import axios from 'axios';
import { string, z } from 'zod';
import { BaseMessage } from "@langchain/core/messages";
import { link } from "fs";



const NoteBlockType = z.enum(['header', 'image', 'paragraph'])

const ImageBlockData = z.object({
url: z.string().url().describe("Here should be the URL for Image which best suit notes"),
caption: z.string().optional(),
withBorder: z.boolean().optional(),
withBackground: z.boolean().optional(),
stretched: z.boolean().optional(),
})

const ParagraphBlockData = z.object({
    text: z.string().describe("Paragraph"),
    alignment: z.enum(['left', 'center', 'right'])
    .optional()
    .describe("Alignment of the paragraph text; can be 'left', 'center', or 'right' (optional)"),
});

const HeaderBlockData = z.object({
text: z.string().describe("The title or header "),
level: z.string().describe("The size or heading level of the title (e.g., '1', '2', etc.)"),
});

const YesOrNo = z.object({
    text: z.string().describe("yes or no")
})


export const NoteBlock = z.object({
type: z.enum(['header', 'paragraph', 'image']),
data: z.union([HeaderBlockData, ParagraphBlockData, ImageBlockData]),
});

/*
const tempNoteBlock = z.object({
title: z.string(),
title_size: z.string(),
paragraph: z.string(),
image: z.string().optional(),
})
*/

export type TYesOrNo = z.infer<typeof YesOrNo>;
export type TempTNoteBlock = z.infer<typeof ParagraphBlockData>;
export type TNoteBlock = z.infer<typeof NoteBlock>;
export type TNoteBlockType = z.infer<typeof NoteBlockType>;

const InputAnnotation = Annotation.Root({
...MessagesAnnotation.spec,  // If `messages` is part of this spec, it should work
chunk: Annotation<string>,
noteTakingStyle: Annotation<string>,
learningStyle: Annotation<"visual" | "auditory" | "kinesthetic" | "analytical">,
levelOfStudy: Annotation<"Bachelors" | "Associate" | "Masters" | "PhD">,
course: Annotation<string>,
arrNote: Annotation<[TNoteBlock]>,
plan:Annotation<string>
});

const OutputAnnotation = Annotation.Root({
    note: Annotation<TNoteBlock[]>,
    });
// Helper to get an image link based on a query
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CX = process.env.CX;
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');




export async function getImageLink(query: string): Promise<string> {
    const url = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${CX}&key=${GOOGLE_API_KEY}&searchType=image&num=1`;
    try {
        const response = await axios.get(url);

        // Check if response structure is as expected
        if (response.data && response.data.items && response.data.items[0] && response.data.items[0].link) {
            console.log('Image link:', response.data.items[0].link);
            return response.data.items[0].link;
        } else {
            // Log the unexpected structure
            console.error('Unexpected response structure:', response.data);
            throw new Error('Unexpected response structure: items or link not found');
        }
    } catch (error) {
        // More specific error logging for different scenarios
        if (axios.isAxiosError(error)) {
            console.error('Axios error:', error.message);
            if (error.response) {
                // Error response from server
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            } else if (error.request) {
                // Request was made but no response received
                console.error('No response received:', error.request);
            }
        } else {
            // Non-Axios error, could be an issue with URL or encoding
            console.error('Non-Axios error:', error);
        }
        
        throw new Error('Failed to fetch image link');
    }
}


async function generateImageSearchQuery(_state: typeof InputAnnotation.State): Promise<typeof OutputAnnotation.State> {
const prompt = `
Your task is to:
    1.Highlight Core Themes: Identify and focus on the main concepts and themes present in the note. Ensure that the image encapsulates these key ideas visually.
    2.Use Simple and Clear Visuals: Create or select images that use clear, simple designs and symbols to represent complex ideas. Avoid clutter to enhance understanding and retention.
    3.Incorporate Relevant Context: Ensure that the image includes relevant contextual elements that help visual learners connect the visual representation with the information in the notes. Use annotations, labels, or color coding to provide additional clarity.
    4.Please ensure the search query does not exceed a maximum of 6 words to maintain clarity and focus.

Given the note, provide the most relevant search query to find a highly accurate image that visually explains or represents the key concept. Focus on the essential elements and context of the note to create the search query.
Based on the following lecture : ${_state.chunk},
generate the most relevant search query to find an accurate image that visually explains or represents the key concept of this content.
Focus on the essential elements and context to ensure the search query retrieves the best possible image.

Important: don't make the search query bigger than 4 words`;

const llm = new ChatOpenAI({ model: "gpt-3.5-turbo" });
  
  // First, await the note generation
  const generatedNotes = await generateNote2(_state);
  // Then combine the image block with the generated notes
  let Link="";
  if(generatedNotes[0].type=="header"){
    const result = await llm.invoke(prompt);
    Link = await getImageLink(result.content.toString());
  }

  
  const combinedBlocks: TNoteBlock[] = [
    {
      type: 'image',
      data: {
        url: Link,
        caption: "caption",
        withBorder: true,
        withBackground: false,
        stretched: true,
      }
    },
    ...(Array.isArray(generatedNotes) ? generatedNotes : [generatedNotes])
  ];

  return {note:combinedBlocks};

}
// Function to generate a structured Markdown note
export async function generateNote1(_state: typeof InputAnnotation.State):Promise<TNoteBlock[]> {

const prompt = `Your task is to:

    1. Thorough Analysis: Carefully analyze the provided lecture chunk for its main ideas, key concepts, and supporting details.
    2. Comprehensive Summary: Create a detailed summary in Markdown format that aligns with the user’s specific note-taking and learning style.
    3. Markdown Formatting: Utilize appropriate Markdown syntax for:
        - Headings and Subheadings: Ensure that all titles are formatted correctly for a .md file (e.g., using # for main titles, ## for subheadings).
        - Lists (bullet and numbered)
        - Emphasis (bold and italics)
    4. Highlight Key Points: Clearly identify and emphasize key concepts, definitions, and critical information.
    5. Logical Organization: Structure the notes in a logical hierarchy, grouping related ideas together for clarity.
    6. Incorporate Examples: Include relevant examples or case studies mentioned in the lecture to illustrate key points.
    7. Readable Format: Use bullet points or numbered lists for easy scanning and readability.
    8. Conciseness: Ensure notes are succinct yet informative, appropriate for the user's level of study. Aim to keep notes to no more than one-third of the original text length.
    9. Code Blocks: Use code blocks for any multiline code content or complex structures to enhance clarity.
    10. Math Syntax: Apply Markdown math syntax compatible with KaTeX for any formulas or equations mentioned.
    11. Key Takeaways: Conclude with a brief "Key Takeaways" section to summarize the essential points.
    12. Visual Aids: For visual learners, suggest relevant diagrams, charts, or visual aids to enhance understanding.
    13. Mnemonics for Auditory Learners: Highlight key phrases or create mnemonics that can aid memory retention for auditory learners.
    14. Practical Applications: For kinesthetic learners, recommend hands-on activities or real-world applications related to the content.
    15. Logical Connections: For analytical learners, provide logical breakdowns and connections between concepts to enhance understanding.
    16. Exclude Unnecessary Information: Omit any superfluous information such as citations or footnotes that do not contribute directly to the understanding of the content.
    17. Complete Ideas: If the lecture chunk appears to be cut off or incomplete, use your best judgment to infer the intended meaning and complete the idea logically. Avoid leaving any sentences or thoughts unfinished in your summary.
    18. Use the Array of Previous Notes to keep the flow consistent. Here is the latest previous note: ${_state.arrNote}
    19. You should produce a mixture of content types, such as both paragraph and header types together in one response if the content structure suggests it.
    
    Please summarize the following lecture chunk into well-structured Markdown notes, tailored to the user's preferences. Include a mix of both header and paragraph entries where appropriate:

    ${_state.chunk}

    This context is relevant to:

        - Note-taking style: ${_state.noteTakingStyle}
        - Learning style: ${_state.learningStyle}
        - Level of study: ${_state.levelOfStudy}
        - Course: ${_state.course}`;
const llm = new ChatOpenAI({ model: "gpt-3.5-turbo" });

// Define array type for structured output


const structuredLlm = llm.withStructuredOutput(NoteBlock);
const res = await structuredLlm.invoke(prompt);

const res2 = NoteBlock.parse(res);

/*
const result = await llm.invoke([
{
    role: "system",
    content: "You are a helpful assistant that creates well-structured markdown notes from lecture content."
},
{
    role: "user",
    content: prompt
}
]);
*/
// Parse the array result

return [res2];

}
export async function generateNote2(_state: typeof InputAnnotation.State):Promise<TNoteBlock[]> {

    const prompt = `You are a note generator, tasked with creating a structured summary note based on the following inputs:

        1. **Previous Notes & Context**: Use previous chunk and previously generated notes to maintain continuity with prior content.
        2. **Lecture Content**: Analyze the provided small chunk of lecture content in detail.
        3. **Lecture Plan**: Refer to the lecture plan for an overall structure, ensuring alignment in headings and sections.

        Your task is to:
        1. Generate a concise note based on the current chunk of lecture content, which may include a title and a paragraph, or just a paragraph.
        - **Title**: If a title is needed, limit it to exactly *X* words (or characters) to concisely encapsulate the main theme.
        - **Paragraph**: Expand on the theme in a paragraph, expressing related ideas clearly.
        - Ensure the title and paragraph flow naturally when provided together, maintaining coherence with previous topics covered.
        2. Follow the provided plan closely, positioning this note within the appropriate section and heading.
        3. Tailor the note to the following user preferences:
        - **Note Style**: ${_state.noteTakingStyle} style
        - **Learning Style**: ${_state.learningStyle}
        - **Level of Study**: ${_state.levelOfStudy}
        - **Course**: ${_state.course}
        4. Start a new section or subheading if indicated by the plan, or integrate this content with the existing section cohesively.
        5. Use straightforward language, focusing only on essential ideas, and avoid unnecessary details.
        6. Exclude citations or extraneous references, and capture only the lecture content.

### Lecture Plan:
${_state.plan}

### Content Chunk:
${_state.chunk}
`;

    const llm = new ChatOpenAI({ model: "gpt-3.5-turbo" });
    
    // Define array type for structured output
    
    
    const structuredLlm = llm.withStructuredOutput(NoteBlock);
    const res = await structuredLlm.invoke(prompt);
    const res2 = NoteBlock.parse(res);
    console.log(res2);
    return [res2];
    
    }


export async function generateNote3(_state: typeof InputAnnotation.State):Promise<TNoteBlock[]> {
    console.log("Arr of notes:",_state.arrNote);
    const prompt = `
    Based on previous lecture chunks if there any,
    
    Generate note for next chunk :${_state.chunk}
    
    3. Ensure the note is aligned with the user's preferences:
   - ${_state.noteTakingStyle} note style
   - ${_state.learningStyle} learning style
   - ${_state.levelOfStudy} level of study
   - ${_state.course} course

    Make short notes.
`;
    const llm = new ChatOpenAI({ model: "gpt-3.5-turbo" });

    // Define array type for structured output
    
    
    const structuredLlm = llm.withStructuredOutput(NoteBlock);
    const res = await structuredLlm.invoke(prompt);
    const res2 = NoteBlock.parse(res);
    console.log(res2);
    return [res2];
    }
    
async function gen_img_or_no(_state: typeof InputAnnotation.State):Promise<{ messages: AIMessageChunk }>{
    const prompt1 =`Your task is to:
    
    1. Analyse on previous generated note chunks: ${_state.arrNote}
    2. if there was no image generated unders close meaning 
    return yes

    Don't add any string form just yes or no
    `;

    const llm = new ChatOpenAI({ model: "gpt-3.5-turbo" });
    const res = await llm.invoke(prompt1);
    
    return { messages: res};
}


const shouldgenerate = (_state: typeof InputAnnotation.State) => {
    // Log the state to check its structure and contents
    
    // Ensure that messages exist and check the content of the last message
    if (_state.messages.length === 0 || _state.messages[_state.messages.length - 1].content !== "yes") {
        return "__end__";
    }
    return "generate_image";
};


// Graph construction and invocation

export const graph = new StateGraph({
    input:InputAnnotation,
    output:OutputAnnotation
})
.addNode("generate_img",generateImageSearchQuery)
//.addNode("generate_image",generateImageSearchQuery)
.addEdge("__start__", "generate_img")
//.addEdge("generate_note","generate_image")
.addEdge("generate_img",END)



export async function Noteplanner( noteTakingStyle: string,
    learningStyle: "auditory" | "visual" | "kinesthetic" | "analytical",
    levelOfStudy: "Bachelors" | "Associate" | "Masters" | "PhD",
    course: string,
    lecture:string[]):Promise<AIMessage>{
    const prompt1 =`You are a Planner tasked with designing a lecture plan that will help generate the best summary notes based on the given preferences.
                    The plan must contain main titles, sub title and genral ideas of the lecture
                    Your task is to:
                    1. Analyze the provided lecture content and structure.
                    2. Create a structured plan that will help an LLM generate summary notes.
                    3. Ensure the plan fits the following user preferences:
                    - ${noteTakingStyle} note style
                    - ${learningStyle} learning style
                    - ${levelOfStudy} level of study
                    - ${course} course
                    4. The plan should be in Markdown (.md) format, with clear sections, headings, and subheadings (use titles and subtitles).
                    5. Focus on generating a high-level plan, including only the most relevant sections for the summary. Avoid unnecessary details.
                    6. Ensure the structure is clear and follows a logical flow based on the lecture content.

                    The lecture content: ${lecture}
                    
                    remember The plan must contain main titles, sub title and genral ideas of the lecture NO citations`;

    const llm = new ChatOpenAI({ model: "gpt-3.5-turbo" });
    const res = await llm.invoke(prompt1);
    return res;
}