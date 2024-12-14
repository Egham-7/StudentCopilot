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
 You are an expert note-taker specializing in creating concise, structured, and visually organized notes. Your task is to generate well-structured notes in HTML format, based on a provided lecture content chunk and a detailed plan. The notes must adhere to the following requirements:
 
 ### Input Data for the Plan:
 - **Plan**: {plan}
 
 ### Guidelines for Note Generation:
 1. **Content Extraction**:
    - Extract the most relevant points from the content chunk and format them according to the provided plan.
    - Ensure the notes integrate seamlessly with any previously generated content.
 
 2. **Structure and Formatting**:
    - Format the notes as HTML using headings (<h3>, <h4>) and lists (<ul>, <ol>) to organize the information.
    - Highlight key terms using <strong> tags and ensure semantic HTML is applied.
 
 3. **Conciseness**:
    - Limit the generated notes to the essential points, ensuring clarity and completeness.
 
 4. **Visual Style in Output**:
    - The output must include styled HTML with nested bullet points and ordered lists where applicable. Use this format:
 
 
 <h3>Title</h3>
 <h4>Subsection</h4>
 <ul>
   <li><strong>Key Point</strong>: Description or details.</li>
   <li><strong>Another Point</strong>:<ol>
     <li>First sub-point.</li>
     <li>Second sub-point.</li>
   </ol>
   </li>
 </ul>
 
 
 5. **Additional Features**:
    - Include interactive suggestions like visual aids or diagrams if indicated in the plan.
 
 ### Output Example:
 Ensure the notes follow this detailed format:
 \`\`\`html
 <h3>Notes on Cryptography</h3>
 <h4>Purpose and Objectives</h4>
 <ul>
   <li><strong>Main Purpose</strong>: Understand encryption and decryption concepts in cryptography.</li>
   <li><strong>Learning Objectives</strong>:<ol>
     <li>Define and differentiate between plaintext, ciphertext, encryption key, and decryption key.</li>
     <li>Explain the roles of the interceptor in cryptographic security.</li>
     <li>Understand adversarial and attack models in cryptography.</li>
   </ol>
   </li>
 </ul>
 <h4>Key Concepts</h4>
 <ul>
   <li><strong>Plaintext</strong>: Raw data that needs protection; the input to a cipher.</li>
   <li><strong>Ciphertext</strong>: Result of applying an encryption algorithm to plaintext.</li>
   <li><strong>Encryption Key</strong>: Value known to the sender, used to encrypt plaintext.</li>
 </ul>
 <h4>Visual Aids</h4>
 <ul>
   <li>Diagrams showing relationships between plaintext, ciphertext, and keys.</li>
   <li>Flowcharts of adversarial models.</li>
 </ul>

 
 Output only the formatted HTML notes as shown above, without explanations or additional commentary.
 `),
   HumanMessagePromptTemplate.fromTemplate(`
 ### Input Data:
 - **Content Chunk**: {chunk}
 - **Plan**: {plan}
 
 ### Task:
 - Extract and format notes as structured HTML based on the provided plan.
 - Adhere strictly to the HTML format and example provided in the System Message.
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

