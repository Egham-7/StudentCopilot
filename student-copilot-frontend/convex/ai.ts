import OpenAI from 'openai';



const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHUNK_SIZE = 25 * 1024 * 1024; // 25 MB in bytes

export const generateEmbedding = async (text: string) => {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function transcribeAudioChunk(audioChunk: ArrayBuffer) {
  try {

    const file = new File([audioChunk], 'audio.wav', { type: 'audio/wav' });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });
    return transcription.text;
  } catch (error) {
    console.error("Error transcribing audio chunk:", error);
    throw error;
  }
}

export function splitAudioIntoChunks(audioBuffer: ArrayBuffer): ArrayBuffer[] {
  const chunks: ArrayBuffer[] = [];
  let offset = 0;

  while (offset < audioBuffer.byteLength) {
    const end = Math.min(offset + CHUNK_SIZE, audioBuffer.byteLength);
    chunks.push(audioBuffer.slice(offset, end));
    offset = end;
  }

  return chunks;
}


interface ExtractAudioOptions {
  startTime?: string;
  duration?: string;
  outputFormat?: 'mp3' | 'wav' | 'aac' | 'ogg' | 'flac' | 'wma' | 'ac3' | 'amr';
}



export async function extractAudioFromVideo(
  videoBuffer: ArrayBuffer,
  outputFileName: string = 'test-sample',
  options: ExtractAudioOptions = {}
): Promise<ArrayBuffer> {
  const apiUrl = 'https://api.apyhub.com/extract/video/audio/file';
  const token = process.env.APY_TOKEN;

  if (!token) {
    throw new Error('APY_TOKEN environment variable is not set');
  }

  const params = new URLSearchParams();
  params.append('output', outputFileName);
  if (options.startTime) params.append('start_time', options.startTime);
  if (options.duration) params.append('duration', options.duration);
  if (options.outputFormat) params.append('output_format', options.outputFormat);

  const response = await fetch(`${apiUrl}?${params.toString()}`, {
    method: 'POST',
    headers: {
      'apy-token': token,
      'Content-Type': 'application/octet-stream',
    },
    body: videoBuffer
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.arrayBuffer();
}

