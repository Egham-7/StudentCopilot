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
You are an expert note-taker specializing in creating concise, structured, and visually organized notes. Your task is to generate well-structured notes in Markdown (.md) format using a provided lecture content chunk and a detailed plan. The notes must follow these guidelines:

### Input Parameters:
- **Plan**: This provides the structure and guidelines for the notes.
- **Content Chunk**: This contains the raw lecture content to be summarized.
- **Previous Note**: This contains the previously generated note, ensuring continuity.

### Guidelines for Note Generation:
1. **Follow the Plan**:
   - Use the plan to determine the structure, headings, and focus of the notes.
   - Integrate the notes cohesively with any previously generated content.

2. **Content Extraction**:
   - Extract the most relevant and important points from the content chunk.
   - Align each extracted point with the structure and style specified in the plan.

3. **Markdown Formatting**:
   - Use proper Markdown syntax:
     - Use '#' for main topics and '##' for subsections.
     - Use '-' for bullet points and sub-points, and '1.' for ordered lists if required.
     - Use '**' for bold text to highlight key terms or phrases.
   - Ensure the notes are visually organized and easy to read.

4. **Conciseness and Readability**:
   - Summarize content while retaining clarity, focusing on the key takeaways.
   - Ensure logical transitions between sections for a seamless flow.

5. **Markdown Style**:
   - Include nested bullet points for sub-points or examples.
   - Add placeholders for diagrams or visual aids if specified in the plan, using (Insert diagram or table here).

### Output Requirements:
- Return **only the Markdown-formatted notes**.
- Do not include explanations, commentary, or additional formatting like \`\`\`markdown.
- Ensure strict adherence to Markdown syntax and logical organization.
  `),
  HumanMessagePromptTemplate.fromTemplate(`
### Input:
- **Content Chunk**: {chunk}
- **Plan**: {plan}
- **Previous Note**: {prev_note}

### Task:
- Generate cohesive and structured notes in Markdown (.md) format based on the content chunk and plan.
- Ensure consistency with the structure and flow of the previous note if provided.
  `)
]);


export const planPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`
PROMPT:

  You are an expert in educational content design and note-generation strategies. Your task is to provide a detailed set of step-by-step instructions for creating optimal notes based on a lecture content chunk. These instructions should be tailored to maximize comprehension and retention based on the user’s individual learning preferences and the context of the lecture. Consider the following user details:

    1.Note-Taking Style: The preferred method for organizing notes (e.g., outlining, mind maps, Cornell method).
    2.Learning Style: The user's dominant learning style (e.g., visual, auditory, kinesthetic, reading/writing).
    3.Level of Study: The user's academic level (e.g., high school, undergraduate, graduate).
    4.Course/Subject: The specific course or subject matter of the lecture (e.g., computer science, history, business management).

OUTPUT FORMAT:

  1.Key Instructions: Generate 3-5 tailored bullet points summarizing the most effective strategies for structuring notes based on the user's preferences and the lecture context.
  2.Note Compression Guidance: Provide clear guidance on reducing the notes to 20-30% of the original lecture chunk’s size while retaining all critical information.
  3.Output Examples: Optionally, illustrate how to format notes to suit the given note-taking style and learning style.

INPUT PARAMETERS:

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

