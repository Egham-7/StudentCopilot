import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";

export const titlePrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`
Your task is to generate concise, impactful, and contextually appropriate titles for provided text chunks. Follow these detailed guidelines to ensure optimal results:

1. **Relevance**: The title must precisely reflect the core topic or main purpose of the text chunk.
2. **Clarity**: The title should be clear, easily understandable, and free of ambiguity.
3. **Brevity**: Keep the title succinct—between 3 to 8 words—without sacrificing meaning.
4. **Tone Adaptation**: Match the tone of the text (e.g., professional, academic, casual, or creative) for consistency.
5. **Keyword Optimization**: Use specific and meaningful keywords or phrases that encapsulate the main idea. Avoid general or vague terms.

Focus on delivering a single, polished title that effectively communicates the essence of the text.
  `),
  HumanMessagePromptTemplate.fromTemplate(`
### Input Text Chunk:
{chunk}

### Instructions:
- Carefully analyze the text chunk.
- Generate a single title that aligns with the provided guidelines.
- Respond with the title only, avoiding explanations or extra information.
  `)
]);


export const paragraphPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`
You are an expert note-taker specializing in creating concise, structured, and visually organized notes. Your task is to generate well-structured notes in Markdown (.md) format using a provided lecture content chunk and a detailed plan. The notes must follow these instructions:

### Input Parameters:
- **Plan**: (This provides the structure and guidelines for the notes.)
- **Content Chunk**:  (This contains the raw lecture content to be summarized.)
- **Previous note**:  (This content the previous generated note.)

### Guidelines for Note Generation:
1. **Follow the Plan**:
  - Use the plan to determine the structure, headings, and focus of the notes.
  - Ensure the notes integrate cohesively with any previously generated content.

2. **Content Extraction**:
  - Extract the most relevant and important points from the content chunk.
  - Align each extracted point with the structure and style specified in the plan.

3. **Markdown Formatting**:
  - Use proper Markdown syntax for structure:
    - Use '#' for main topics and '##' for subsections.
    - Use '-' for bullet points and sub-points, and '1.' for ordered lists if required.
    - Use '**' for bold text to highlight key terms or phrases.
  - Ensure the notes are visually organized and easy to read.

4. **Conciseness and Readability**:
  - Keep the notes concise and focused while maintaining clarity and completeness.
  - Ensure logical transitions between sections for a cohesive flow.

5. **Visual Style in Markdown**:
  - Use nested bullet points for sub-points or examples.
  - Include placeholders for diagrams or visual aids if mentioned in the plan.

## Visual Aids
- Placeholder for diagrams or tables (if specified in the plan).
\`\`\`

### Output Requirements:
- Return **only the Markdown-formatted notes** without explanations or commentary.
- Adhere strictly to the Markdown syntax and formatting guidelines provided above.
-Don't add '''markdown just retur Markdown main text no addition.
  `),
  HumanMessagePromptTemplate.fromTemplate(`
### Input:
- **Content Chunk**: {chunk}
- **Plan**: {plan}
- **Previous Notes: {prev_note}

### Task:
- Generate cohesive and structured notes in Markdown (.md) format based on the content chunk and plan.
- Follow the Markdown example and formatting instructions provided in the System Message.
  `)
]);

 


export const planPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`
You are given a chunk of lecture content, and your task is to generate a detailed content plan tailored to the user’s specific learning needs. The plan should consider the following user details:

Note-Taking Style: How does the user prefer to take notes (e.g., outlining, mind maps, Cornell method, etc.)?
Learning Style: What is the user’s preferred learning style (e.g., visual, auditory, kinesthetic, reading/writing)?
Level of Study: What is the user's academic level (e.g., high school, undergraduate, graduate)?
Course: What specific course or subject is the chunk related to (e.g., computer science, history, business management)?
The plan should be structured as follows:


Define few bullet points based on user preferences so it can be used to generate a suitable notes>

Suggest the size of note it supposed to be around 20% to 30% of actuall chunk size.

### Input Text Chunk:
Chunk: {chunk1}
Note-Taking Style: {noteTakingStyle1}
Learning Style: {learningStyle1}
Level of Study: {levelOfStudy1}
Course: {course1}
`)]);




export const imageGenerationPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`
You are an AI system specialized in making decisions about generating images based on textual context and prior image captions. Your task is to analyze the provided text chunk and decide if a new image is necessary, following these guidelines:

1. **Relevance to Previous Images**:
   - Compare the content chunk with captions of previously generated images to assess thematic consistency.
   - Avoid duplicating images that cover the same concept or visuals unless a new perspective is required.

2. **Contextual Necessity**:
   - Evaluate if the current text introduces new ideas or visual details that would benefit from an accompanying image.
   - If the text elaborates on previously visualized ideas without significant new information, decide against generating an image.

3. **Clarity and Impact**:
   - Determine if a new image would improve comprehension or provide meaningful visual support for the content.
   - Favor generating an image if it can enhance understanding or engagement.

### Decision:
- Respond with "Yes" if an image is required for the text chunk.
- Respond with "No" if an image is not necessary.
`),
  HumanMessagePromptTemplate.fromTemplate(`
### Input Data:
- **Content Chunk**: {chunk}
- **Previous Image Captions**: {ImgArr}

### Instructions:
- Analyze the provided content chunk and the captions of prior images.
- Decide if generating a new image is necessary based on the guidelines.
- Respond with either "Yes" or "No" without additional explanation.
`)
]);

