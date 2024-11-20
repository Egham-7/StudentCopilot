
import { chunk } from 'lodash-es';
export type UploadProgressSetter = (progress: number) => void;


export const CHUNK_SIZE = 200;


export const chunkAndProcess = async <T, R>(
  data: T,
  chunkSize: number,
  processChunk: (chunk: T, index: number, setProgress: UploadProgressSetter, totalChunks: number) => Promise<R>,
  setUploadProgress: UploadProgressSetter,
  maxConcurrent = 3
): Promise<R[]> => {
  let chunks: T[];

  // Create chunks based on data type
  if (data instanceof ArrayBuffer) {
    chunks = [];
    for (let i = 0; i < data.byteLength; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize) as T);
    }
  } else if (typeof data === 'string') {
    chunks = chunk(data.split(' '), chunkSize).map(chunk => chunk.join(' ') as T);
  } else if (data instanceof File) {
    chunks = [];
    for (let i = 0; i < data.size; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize) as T);
    }
  } else {
    throw new Error('Unsupported data type for chunking');
  }

  const totalChunks = chunks.length;
  const results: R[] = [];

  // Process chunks in parallel batches
  for (let i = 0; i < chunks.length; i += maxConcurrent) {
    const batch = chunks.slice(i, i + maxConcurrent);
    const batchPromises = batch.map((chunk, idx) =>
      processChunk(chunk, i + idx, setUploadProgress, totalChunks)
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Update progress after each batch
    const progress = Math.min(100, Math.floor(((i + batch.length) / totalChunks) * 100));
    setUploadProgress(progress);
  }

  return results;
};


export async function exponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: unknown) {
      console.log("Error: ", error);
      const delay = baseDelay * Math.pow(2, retries);
      console.log(`Rate limit reached. Retrying in ${delay}ms... (Attempt ${retries + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }
}


export function extractYouTubeId(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

