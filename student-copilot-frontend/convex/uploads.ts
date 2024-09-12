import { mutation } from "./_generated/server";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});


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
  const apiUrl = 'https://victorious-happiness-production.up.railway.app/extract-audio/';

  if (videoBuffer.byteLength === 0) {
    throw new Error('Video buffer is empty');
  }

  const formData = new FormData();
  formData.append('video', new Blob([videoBuffer], { type: 'video/mp4' }), 'video.mp4');

  if (options.startTime) formData.append('start_time', options.startTime);
  if (options.duration) formData.append('duration', options.duration);
  if (options.outputFormat) formData.append('output_format', options.outputFormat);

  const params = new URLSearchParams();
  params.append('output', outputFileName);

  try {
    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    return response.arrayBuffer();
  } catch (error) {
    console.error('Error in extractAudioFromVideo:', error);
    throw error;
  }
}

export const extractAudio = action({

  args: {
    videoChunk: v.bytes()
  },

  handler: async (_ctx, args) => {

    const audioBuffer = await extractAudioFromVideo(args.videoChunk);


    return audioBuffer;

  }
})

