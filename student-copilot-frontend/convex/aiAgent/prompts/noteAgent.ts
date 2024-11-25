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
You are an expert note-taker specializing in creating concise, structured, and visually organized notes. Your task is to generate clear and actionable notes from a provided lecture content chunk, following a **detailed plan**. This plan will be provided as input, and your job is to use it to guide the note generation. Make sure to adhere to the following guidelines:

### Input Data for the Plan:
- **Plan**: {plan}

### Guidelines for Note Generation:
1. **Content Extraction**:
   - Identify and summarize the most important points from the provided content chunk based on the plan.
   - Ensure the notes integrate seamlessly with any previously generated content to avoid redundancy and repetition.

2. **Structure and Formatting**:
   - Follow the structure outlined in the plan and apply it to format the notes.
   - Use clear section titles, bullet points, and short sentences for key ideas.

3. **Conciseness**:
   - Limit the generated notes to one-third of the original content chunk. Prioritize brevity while retaining clarity and completeness.

4. **Tone and Language**:
   - Maintain a professional and neutral tone, ensuring the language is accessible to the target audience based on the user details.

5. **Format Output**:
   - Output the notes in a clear, organized format that aligns with the user’s note-taking style and ensures easy readability.

6. **Actionable Steps**:
   - If the plan suggests actionable steps, list them in clear, easy-to-follow formats.

7. **Visual and Multimedia Suggestions**:
   - If the plan includes recommendations for visuals, suggest appropriate diagrams or examples to support understanding.

`),
  HumanMessagePromptTemplate.fromTemplate(`
### Input Data:
- **Content Chunk**: {chunk}
- **Plan**: {plan}

### Task:
- Generate concise, well-structured notes from the provided content chunk using the given plan.
- Ensure the output follows the formatting, structure, and instructions outlined in the plan.
- Provide the formatted notes only, without any additional explanations or commentary.
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

Purpose and Objectives:

Define the main purpose of this chunk of the lecture, based on the user's level of study and course.
Identify the learning objectives for this section, tailoring the objectives to the user's learning style and academic level.
Key Concepts to Expand:

List the key ideas or concepts in this section. Suggest how these can be expanded in a way that aligns with the user's note-taking style. For example, if the user prefers mind maps, how can concepts be connected visually?
Examples and Case Studies:

Recommend examples, case studies, or analogies that would resonate with the user’s learning style. For example, visual learners may benefit from diagrams, while auditory learners might prefer an audio explanation or discussion.
Level of Study Considerations:

Provide suggestions for tailoring the content based on the user's level of study. For example, graduate-level students may require a deeper dive into theory, while high school students may benefit from simplified explanations and more foundational examples.
Interactive Elements:

Suggest interactive elements (questions, exercises, discussions) to engage the user, based on their learning style. For instance, kinesthetic learners may benefit from hands-on activities, while reading/writing learners could benefit from written exercises or prompts.
Visual or Multimedia Suggestions:

Based on the user’s learning preferences and the course content, recommend relevant visuals or multimedia that will enhance understanding. For example, provide links to relevant diagrams, videos, or simulations that cater to visual or auditory learners.
Summary and Key Takeaways:

Offer a concise summary of the key points, emphasizing what is most important for the user to retain based on their note-taking style and level of study.
Next Steps/Transition:

Suggest how the user can transition to the next section, based on the user’s course and learning style. For instance, if the user is in a business management course, propose practical applications or real-world scenarios for further exploration.

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

