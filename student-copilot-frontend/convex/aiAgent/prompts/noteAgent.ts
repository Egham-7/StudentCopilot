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
- **Previous Notes**: {noteArr}

### Task:
- Create a set of concise, well-structured notes based on the provided content chunk.
- Follow the provided guidelines closely and ensure the output is suitable for use in note-taking tools like Editor.js.
- Respond with the formatted notes only. Do not include explanations, commentary, or additional context.
`)
]);




export const categorizationPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`
You are an expert decision-making system specializing in determining the necessity of a title in a block of notes. Your task is to analyze the provided text chunk and decide if a title is required. Follow these detailed guidelines:

1. **Consistency**:
   - Ensure alignment with prior responses to maintain consistency.
   - Consider the memory of previous chat interactions, represented as prior notes.

2. **Clarity and Organization**:
   - Assess the text chunk for clarity of structure and organization.
   - Identify whether a title would enhance the chunk's readability or understanding.

3. **Continuity and Flow**:
   - Determine if adding a title improves the flow and coherence of the notes with surrounding content.

### Decision:
- Respond with "Yes" if a title is required for the text chunk.
- Respond with "No" if a title is not necessary.
  `),
  HumanMessagePromptTemplate.fromTemplate(`
### Input Data:
- **Content Chunk**: {chunk}
- **Prior Notes**: {noteArr}

### Instructions:
- Analyze the provided content chunk and the prior notes.
- Decide if a title is required based on the provided guidelines.
- Respond with either "Yes" or "No" without additional explanation.
  `)
]);
