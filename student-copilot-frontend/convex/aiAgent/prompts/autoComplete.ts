import {
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
  } from "@langchain/core/prompts";

  
export const autoCompletePrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
You are an expert in educational content design and note-generation strategies. Your task is to generate a concise, high-quality note (3–6 sentences) based on the provided query and a similar content chunk. The note must strictly follow the writing style, tone, and structure outlined in the mentioned_style variable.

Guidelines:
1. Maintain Consistency: Write in the exact same style, tone, and structure as described in mentioned_style.
2. Content Relevance: Focus on the most relevant and overlapping information between the query and the chunk.
3. No Redundancy: Do not reference or repeat previously mentioned content.
4. Concise & Informative: Limit the note to 3–6 sentences while covering key information.

INPUT PARAMETERS:
- Mentioned Style & Context: {mentioned_style}
- Query: {query}
- Similar Chunk: {similaire_chunk}

`)]);



export const analyserPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
  PROMPT:
  
    You are an expert in educational content design and note-generation strategies. Your task has two parts:  
      
    1.Content Analysis: Analyze the provided previous note and generate a concise summary (1-2 sentences) of its key points.  
    2.Style Instruction: Identify the writing style, tone, and structure used in the previous note. Then, provide a clear, actionable command to replicate this style for future note generation.

  INPUT PARAMETERS:
    
    *Previous Note:{prev_note}
  
  OUTPUT FORMAT:
  
    1.Brief Summary: A concise summary of the key content from the previous note.
    
    2.Writing Style Command: A specific instruction on how to write in the same style, tone, and structure.
   
  Example Output:

    Brief Summary:
        The note explains the core principles of object-oriented programming, focusing on encapsulation, inheritance, and polymorphism with real-world examples.
    
    Writing Style Command:
        Use clear, structured bullet points with brief explanations. Include relevant examples after each concept and use concise, formal language to maintain clarity.

  `)]);
  