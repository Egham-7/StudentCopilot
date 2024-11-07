"use node";
import { AIMessage, AIMessageChunk } from "@langchain/core/messages";
import { Annotation, END, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import axios from 'axios';
import { z } from 'zod';
import { BaseMessage } from "@langchain/core/messages";



const NoteBlockType = z.enum(['header', 'image', 'paragraph'])

const ImageBlockData = z.object({
url: z.string().url().describe("Here should be the URL for Image which best suit notes"),
caption: z.string().optional(),
withBorder: z.boolean().optional(),
withBackground: z.boolean().optional(),
stretched: z.boolean().optional(),
})

const ParagraphBlockData = z.object({
    text: z.string().describe("The main content or body text of the note"),
    alignment: z.enum(['left', 'center', 'right'])
    .optional()
    .describe("Alignment of the paragraph text; can be 'left', 'center', or 'right' (optional)"),
});

const HeaderBlockData = z.object({
text: z.string().describe("The title or header text of the paragraph in the note"),
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
});

const OutputAnnotation = Annotation.Root({
    note: Annotation<TNoteBlock[]>,
    });
// Helper to get an image link based on a query
const GOOGLE_API_KEY = process.env.Google_API_KEY;
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
  const result = await llm.invoke(prompt);
  //const Link = await getImageLink(result.toString());
  const Link = "https://cdn.britannica.com/70/234870-050-D4D024BB/Orange-colored-cat-yawns-displaying-teeth.jpg";
  // First, await the note generation
  const generatedNotes = await generateNote1(_state);
  // Then combine the image block with the generated notes
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
.compile();


/*
const chunk=`The Double-Slit Experiment: Where Waves Behave Like Particles

Alright, everyone, buckle up because today we're diving into one of the most mind-bending experiments in all of physics: the double-slit experiment. This experiment, seemingly simple in its setup, reveals a fundamental strangeness at the heart of quantum mechanics.

Imagine shining a beam of light at a barrier with two narrow slits. Behind the barrier is a screen. Now, classical physics, the physics of our everyday world, tells us that the light passing through the slits should create two bright bands on the screen, corresponding to the two slits.

And indeed, if we were talking about classical particles, like tiny marbles, that's exactly what we'd see. But light, as we know, isn't just a stream of particles. It also behaves like a wave.

So, what happens when we shine the light through `;
const chunk1= `the two slits? We get an interference pattern! Instead of two bright bands, we see a series of bright and dark fringes on the screen. This is a classic wave phenomenon, where waves passing through the slits interfere with each other, creating areas of reinforcement (bright fringes) and cancellation (dark fringes).

So far, so good, right? Here's where things get really weird.

Instead of light, let's fire individual electrons, those tiny particles of matter, at the slits. Now, common sense tells us that each electron should pass through one slit or the other, creating two distinct bands on the screen, just like the marbles.

But that's not `;

const chunk2 = `what happens

Even when firing electrons one by one, we still observe an interference pattern! It's as if each electron somehow passes through both slits simultaneously, interferes with itself, and then hits the screen. This is the essence of wave-particle duality, a cornerstone of quantum mechanics.

But it gets even stranger. If we try to observe which slit the electron goes through, the interference pattern disappears! The act of observation, of measurement, forces the electron to "choose" a single path, collapsing the wave function and destroying the interference.

This experiment highlights the probabilistic nature of quantum mechanics. We can't know for certain which slit the electron will go through, only the probability of finding it at a particular location on the screen. It challenges our classical intuitions about how the world works and forces us to embrace a reality that is fundamentally uncertain, yet undeniably fascinating.`;

/*                            
const chunk3=`This experiment highlights the probabilistic nature of quantum mechanics. We can't know exactly where an electron will hit the screen—only the likelihood of where it might appear. It's as if reality, at this tiny scale, isn’t set in stone until we observe it.

But what does this really mean? Imagine for a moment that particles like electrons don’t follow fixed, predictable paths like a baseball thrown in the air. Instead, they exist in a state of possibilities, a cloud of potential positions, speeds, and paths all at once. This is what's known as a "wave function," a mathematical description of all these potential states.

When we don’t observe the `
const chunk4=`electron, it behaves as if it passes through both slits, like a wave, creating an interference pattern. But the instant we try to observe or measure it—forcing it to reveal which slit it actually passed through—the wave function collapses. The electron then behaves like a particle, choosing a definite path, and the interference pattern vanishes.

So, what causes this wave-particle duality, and why does observation change the outcome? This is one of the biggest mysteries in physics. One interpretation, known as the Copenhagen Interpretation, suggests that particles exist in a state of superposition, occupying all possible positions simultaneously until observed. In other words, reality is a "smear" of probabilities until we take a look.

Another theory, the Many-Worlds `;
const chunk5=`Interpretation, takes things even further. It suggests that every possible outcome of a quantum measurement actually happens, but in separate, parallel universes. When we observe the electron, we’re simply "branching off" into one of those universes where it went through a specific slit.

Both theories are fascinating, but neither fully resolves the mystery. What’s certain is that quantum mechanics has forced us to rethink the nature of reality itself. We live in a universe where particles can be waves, where observation changes reality, and where uncertainty is built into the fabric of existence.

As mind-bending as it sounds, the double-slit experiment is only the beginning of the weirdness that quantum mechanics has in store.`;
        


let chunkArray: string[] = [chunk,chunk1];
let noteArray: TNoteBlock[] = [];

async function processChunks() {
    for (let i = 0; i < chunkArray.length; i++) {
        const info = {
            chunk: chunkArray[i],
            noteTakingStyle: "bullet point",
            learningStyle: "auditory",
            levelOfStudy: "Bachelors",
            course: "physics",
            messages: [],
            arrNote: noteArray,
        };

        try {
            const result = await graph.invoke(info);
            console.log("Graph invocation result ",i," :", result.notes);
            noteArray.push(result.notes);
        } catch (error) {
            console.error("Error invoking graph:", error);
        }
    }
}

processChunks();
*/