export function splitBySentence(text: string): string[] {
    // Simple regex-based sentence splitter
    return text.match(/[^.!?]+[.!?]+/g) || [];
  }

  
import { OpenAIEmbeddings } from "@langchain/openai";
export async function getEmbeddings(sentences: string[]): Promise<number[][]> {
  const embedder = new OpenAIEmbeddings();
  return await Promise.all(sentences.map(sentence => embedder.embedQuery(sentence)));
}

import cosineSimilarity from "compute-cosine-similarity";
// Utility: Semantic splitter based on embeddings
export function semanticSplitter(
    sentences: string[], 
    embeddings: number[][], 
    minChunkSize: number, 
    maxChunkSize: number, 
    overlapSize: number
  ): string[][] {
    const chunks: string[][] = [];
    let currentChunk: string[] = [];
    let overlap: string[] = [];
  
    let currentChunkSize = minChunkSize; // Start with the minimum chunk size
    
    for (let i = 0; i < sentences.length; i++) {
      currentChunk.push(sentences[i]);
  
      // Get similarity between current sentence and previous sentence
      if (i > 0) {
        const similarity = cosineSimilarity(embeddings[i], embeddings[i - 1]);
        
        if(similarity!= null){
            // Adjust chunk size dynamically based on semantic similarity
            if (similarity > 0.7) { // If the sentences are closely related (high similarity), increase chunk size
            currentChunkSize = Math.min(maxChunkSize, currentChunkSize + 1);
            } else { // If sentences are not very similar, reduce chunk size (or reset)
            currentChunkSize = Math.max(minChunkSize, currentChunkSize - 1);
            }
        }
      }
  
      // When current chunk reaches the desired size, process it
      if (currentChunk.length >= currentChunkSize) {
        chunks.push([...overlap, ...currentChunk]); // Add overlap from previous chunk
        overlap = currentChunk.slice(-overlapSize); // Take the last `overlapSize` sentences as overlap
        currentChunk = currentChunk.slice(0, currentChunkSize - overlapSize); // Trim the current chunk to keep within the size
      }
    }
  
    // Add the final chunk, ensuring overlap is maintained
    if (currentChunk.length) {
      chunks.push([...overlap, ...currentChunk]);
    }
  
    return chunks;
  }
  


  