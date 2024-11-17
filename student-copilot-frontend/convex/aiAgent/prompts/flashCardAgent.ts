import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";





export const flashCardGeneratorPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `You are an expert educational content creator specializing in creating high-quality flashcards.

Your task is to follow the provided study plan and generate MULTIPLE flashcards that match the student's learning style and academic level.

Guidelines:
- Generate at least 5 flashcards for each content chunk
- Follow the study plan structure for flashcard creation
- Create flashcards that build upon each other in a logical sequence
- Adapt content to match the specified learning style
- Maintain academic rigor appropriate for the study level
- Ensure all content aligns with the course objectives

Return all content as plain text without any markdown formatting.`
  ),
  HumanMessagePromptTemplate.fromTemplate(
    `Create multiple flashcards following this study plan:

{plan}

Parameters:
Learning Style: {learningStyle}
Academic Level: {levelOfStudy}
Course: {course}
Content: {contentChunk}

Generate an ARRAY of flashcard objects, each with "front" and "back" properties, following the progression outlined in the plan.

Each response must contain at least 5 flashcards. Return content as plain text only, no markdown formatting.`
  )
]);




export const flashCardPlanGenerationPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `You are an expert educational content creator specializing in creating personalized flashcard study plans.
     You adapt content based on learning styles while maintaining academic standards.`
  ),
  HumanMessagePromptTemplate.fromTemplate(
    `Generate a comprehensive flashcard study plan optimized for {learningStyle} learners:

    Context:
    - Course: {course}
    - Academic Level: {levelOfStudy}
    - Content: {content}

    Please structure the flashcards following these guidelines:
    1. Key Concepts: Identify main theories and principles
    2. Definitions: Include essential terminology
    3. Examples: Provide real-world applications
    4. Visual Elements: Include diagrams/charts where relevant
    5. Practice Problems: Add interactive elements
    
    Format each flashcard as:
    Front: [Clear, concise question or prompt]
    Back: [Detailed explanation with {learningStyle}-focused elements]
    
    Additional requirements:
    - For visual learners: Include diagrams and mind maps
    - For auditory learners: Add mnemonics and verbal patterns
    - For kinesthetic learners: Include hands-on exercises
    - For analytical learners: Include logical frameworks and patterns`
  )
]);

