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
You are an expert note-taker specializing in creating concise, structured, and visually organized notes. Your task is to generate clear and actionable notes from a provided lecture content chunk, ensuring they are optimized for use in digital note-taking tools like Editor.js. Adhere to the following detailed guidelines:

### Guidelines for Note Generation:

1. **Content Extraction**:
   - Identify and summarize the most important points from the provided content chunk.
   - Ensure the notes integrate seamlessly with any previously generated content to avoid redundancy and repetition.

2. **Structure and Formatting**:
   - **Section Titles**: Use clear and descriptive titles to break the notes into logical sections. Avoid symbols or Markdown-like formatting (e.g., no **bold text** or special characters).
   - **Key Points**:
     - Present key ideas as short, precise sentences or bullet points.
     - Highlight critical terms or concepts using plain text, keeping emphasis subtle and readable.
     - Simplify technical terms where possible; if included, provide a brief explanation for clarity.
   - **Actionable Steps**:
     - List steps or instructions as a numbered list or in plain text format, making them clear and easy to follow.
   - **Readable Output**:
     - Ensure the notes are clean, well-organized, and free from clutter. Avoid using Markdown or complex formatting.

3. **Conciseness**:
   - Limit the generated notes to one-third of the original content chunk. Prioritize brevity while retaining clarity and completeness.

4. **Tone and Language**:
   - Maintain a professional and neutral tone.
   - Use language that is accessible to a broad audience, avoiding overly complex phrasing.

`),
  HumanMessagePromptTemplate.fromTemplate(`
### Input Data:
- **Content Chunk**: {chunk}


### Task:
- Create a set of concise, well-structured notes based on the provided content chunk.
- Follow the provided guidelines closely and ensure the output is suitable for use in note-taking tools like Editor.js.
- Respond with the formatted notes only. Do not include explanations, commentary, or additional context.
`)
]);




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

