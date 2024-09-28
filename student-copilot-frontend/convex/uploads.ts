
import { mutation } from "./_generated/server";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});


export interface ExtractAudioOptions {
  startTime?: number;
  duration?: number;
  outputFormat?: string;
}
export async function extractAudioFromVideo(
  videoId: string,
  outputFormat: string = 'mp3',
  options: ExtractAudioOptions = {}
): Promise<ArrayBuffer> {
  const apiUrl = 'https://victorious-happiness-production.up.railway.app/extract-audio/';
  if (videoId.length === 0) {
    throw new Error('Video id cannot be empty.');
  }


  // Construct query parameters
  const queryParams = new URLSearchParams();
  queryParams.append('video_id', videoId);
  queryParams.append('output_format', outputFormat);

  // Add optional parameters if they exist
  if (options.startTime !== undefined) {
    queryParams.append('start_time', options.startTime.toString());
  }
  if (options.duration !== undefined) {
    queryParams.append('duration', options.duration.toString());
  }

  try {
    const response = await fetch(`${apiUrl}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'audio/*',
      },
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
    videoId: v.string(),
    outputFormat: v.optional(v.string()),
    options: v.optional(v.object({
      startTime: v.optional(v.number()),
      duration: v.optional(v.number()),
    }))
  },
  handler: async (_ctx, args) => {
    const audioBuffer = await extractAudioFromVideo(
      args.videoId,
      args.outputFormat,
      args.options
    );
    return audioBuffer;
  }
});

