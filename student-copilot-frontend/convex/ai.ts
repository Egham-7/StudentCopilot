import OpenAI from 'openai';
import { action } from './_generated/server';
import { v } from 'convex/values';



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

export const generateTextEmbeddingClient = action({
  args: {
    text: v.string()
  },

  handler: async (_ctx, args) => {

    return await generateEmbedding(args.text);

  }
})



type ChatModel = 'gpt-4' | 'gpt-4-0314' | 'gpt-4-0613' | 'gpt-4-32k' | 'gpt-4-32k-0314' | 'gpt-4-32k-0613' | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-16k' | 'gpt-3.5-turbo-0301' | 'gpt-3.5-turbo-0613' | 'gpt-3.5-turbo-16k-0613';

interface ChatCompletionOptions {
  model?: ChatModel;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
}

export async function callChatCompletionsAPI(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  try {
    const defaultOptions: ChatCompletionOptions = {
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 150,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: false,
    };

    const mergedOptions = { ...defaultOptions, ...options, messages };

    if (mergedOptions.stream) {
      const stream = await openai.chat.completions.create({
        ...mergedOptions,
        stream: true,
      } as OpenAI.Chat.ChatCompletionCreateParamsStreaming);

      let fullContent = '';
      for await (const chunk of stream) {
        fullContent += chunk.choices[0]?.delta?.content || '';
      }
      return fullContent;
    } else {
      const response = await openai.chat.completions.create({
        ...mergedOptions,
        stream: false,
      } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);

      if (response.choices && response.choices.length > 0 && response.choices[0].message) {
        return response.choices[0].message.content || '';
      } else {
        throw new Error('No response content received from the API');
      }
    }
  } catch (error) {
    console.error("Error calling Chat Completions API:", error);
    throw error;
  }
}
