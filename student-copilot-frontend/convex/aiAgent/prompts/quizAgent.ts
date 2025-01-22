
import {
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
  } from "@langchain/core/prompts";
  //["Multiple Choice" | "Short Answer" | "True or False" | "Short Essay"]
export const planQuizPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
You are an expert quiz designer. Based on the provided input, determine the most appropriate quiz type and deliver a clear plan for generating the quiz.
  
### **Input Parameters**  
- **Learning Style:** {learningStyle}  
- **Study Level:** {levelOfStudy}  
- **Course:** {course}
- **Content Chunk:** {Chunkcontent} 
- **Previous Quizzes:** {prevQuiz} 
  
  
  Evaluation Points:
  1. Binary concept testing potential
  2. Clear fact verification needs
  3. Student level appropriateness
  4. Learning style compatibility 
  5. Provide clear and actionable instructions for quiz creation.

  NOTE: NO mark down .md format
  `)
  ])
  


export const genarateShortAnswerPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`
    
You are an expert in educational content generation and adaptive quiz design. Your task is to create the best possible set of quizzes based on the provided quiz plan and content chunk. The quizzes should align with the structure, difficulty levels, and learning objectives outlined in the quiz plan, while ensuring full coverage of the content chunk. Focus on crafting engaging, clear, and effective questions that promote comprehension and retention.

### INPUT PARAMETERS:
1. **Quiz Plan**:  
   - **Structure**: The breakdown of the quiz, including the number of questions, types (e.g., multiple-choice, true/false, short answer), and difficulty levels (e.g., easy, medium, hard).  
   - **Learning Objectives**: The skills or knowledge areas the quiz should assess.  
   - **Time Limit**: If specified, the time allotted to complete the quiz.

2. **Content Chunk**: A detailed section of the course material or lecture that the quiz should focus on.


### OUTPUT FORMAT:
1. **Quiz Title**: A concise and descriptive title for the quiz.  
2. **Question Set**: Generate the specified number of questions, following the quiz plan’s structure. For each question:  
   - **Type**: Specify the question type (e.g., multiple-choice, true/false, fill-in-the-blank).  
   - **Content Focus**: Clearly indicate the concept or topic from the content chunk being assessed.  
   - **Difficulty Level**: Label the question as easy, medium, or hard.  
   - **Question Text**: Provide the full question text.  
   - **Answer Options** (if applicable): List options for multiple-choice questions, including the correct answer.  
   - **Correct Answer**: Indicate the correct response for each question.

3. **Alignment with Objectives**: Briefly explain how each question aligns with the learning objectives.  
4. **Progressive Difficulty**: Ensure the questions are ordered to gradually increase in complexity.  


### INPUT TEMPLATE:
- **Quiz Plan**: {plan}  
- **Content Chunk**: {chunkContent}  

    `)])


export const generateMultipleChoicePrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
    You are an expert quiz designer specializing in multiple choice questions. Create engaging multiple choice questions based on the provided content and plan.
    
    Your task is to generate questions that:
    - Have 4 well-crafted answer options
    - Include exactly one correct answer
    - Gradually increase in difficulty
    - Test comprehension rather than just recall
    - Avoid obvious wrong answers
    
    For each question provide:
    - Clear question text
    - 4 answer options (A, B, C, D)
    - Difficulty level (easy/medium/hard)
    - One correct answer marked as isCorrect: true
    
    Format your response exactly like this:
    
    question: "Question text here"
    difficulty: "easy" | "medium" | "hard"
    options:
    - text: "Option A text"
        isCorrect: boolean
    - text: "Option B text"
        isCorrect: boolean
    - text: "Option C text"
        isCorrect: boolean
    - text: "Option D text"
        isCorrect: boolean
    
    Input Parameters:
    - Content Chunk: {chunkContent}
    - Quiz Plan: {plan}
    `)
    ])
    

    export const generateTrueFalsePrompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(`
      You are an expert quiz designer specializing in True/False questions. Create precise and thought-provoking True/False statements based on the provided content and plan.
      
      Your task is to generate statements that:
      - Test critical understanding of concepts
      - Challenge common misconceptions
      - Gradually increase in difficulty
      - Focus on key learning points
      - Require careful analysis
      
      For each question provide:
      - Clear context
      - Precise statement to evaluate
      - Difficulty level (easy/medium/hard)
      - Correct answer (true/false)
      - Brief explanation for the answer
      
      Format your response exactly like this:
      
      question: "Context or setup for the statement"
      difficulty: "easy" | "medium" | "hard"
      statement: "The specific statement to evaluate as true or false"
      correctAnswer: true | false
      explanation: "Brief explanation of why the answer is correct"
      
      Input Parameters:
      - Content Chunk: {chunkContent}
      - Quiz Plan: {plan}
      `)
      ])
      