
import {
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
  } from "@langchain/core/prompts";
  //["Multiple Choice" | "Short Answer" | "True or False" | "Short Essay"]
export const planQuizPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
  You are an expert quiz designer. Based on the provided content and parameters, recommend the most effective quiz type and create a focused plan.
  
  Input Parameters:
  - Learning Style: {learningStyle}
  - Study Level: {levelOfStudy} 
  - Course: {course}
  - Previous Quizzes: {prevQuiz}
  
  Provide output in this format:
  {
    "types": Short Answer,
    "plan": "Brief 2-3 sentence explanation of why this quiz type best suits the content and learning objectives"
  }
  
  Focus on:
  1. Selecting the most appropriate question type for the content
  2. Progressive difficulty to enhance learning
  3. Avoiding overlap with previous quizzes
  4. Aligning with the student's learning style and level
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
- **Content Chunk**: {Chunkcontent}  

    `)])