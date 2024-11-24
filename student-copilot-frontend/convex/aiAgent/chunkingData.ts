
/*
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
export async function chunker(text: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 50,
        chunkOverlap: 0,
      });
    const output = await splitter.createDocuments([text]);
    let arr:string[] = []; 
    output.forEach((doc) => {
      arr.push(doc.pageContent);
  });
    return arr;
}
*/

import {splitBySentence, getEmbeddings, semanticSplitter} from "./textSplitter";

// Main Function: SemanticTextSplitter
// Main Function: SemanticTextSplitter
export async function chunker(
  text: string, 
  minChunkSize: number = 2, 
  maxChunkSize: number = 50, 
  overlapSize: number = 5
): Promise<string[]> {
  const sentences = await splitBySentence(text); // Step 1: Split text into sentences
  const embeddings = await getEmbeddings(sentences); // Step 2: Get embeddings for each sentence
  const chunks = semanticSplitter(sentences, embeddings, minChunkSize, maxChunkSize, overlapSize); // Step 3: Split sentences into semantic chunks with overlap
  return chunks.map(chunk => chunk.join(" ")); // Step 4: Combine sentences into paragraph chunks
}