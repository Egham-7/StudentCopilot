
import { mutation } from "./_generated/server";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});




type VideoMetaData = {
  video_id: string,
  output_format: string
}

type AudioMetaData = {

  "transcription_ids": string[],
  "transcription_embedding": number[]

}

export async function processVideoDetails(
  videoId: string,
  outputFormat: string = 'mp3',
): Promise<AudioMetaData> {
  const apiUrl = 'https://victorious-happiness-production.up.railway.app/process-video';
  if (videoId.length <= 0) {
    throw new Error('Video id cannot be empty.');
  }


  const data: VideoMetaData = {
    "output_format": outputFormat,
    "video_id": videoId

  }


  try {
    const response = await fetch(`${apiUrl}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    return response.json();


  } catch (error) {
    console.error('Error in extractAudioFromVideo:', error);
    throw error;
  }
}

export const processVideo = action({
  args: {
    videoId: v.string(),
    outputFormat: v.optional(v.string()),
    options: v.optional(v.object({
      startTime: v.optional(v.number()),
      duration: v.optional(v.number()),
    }))
  },
  handler: async (_ctx, args): Promise<AudioMetaData> => {

    const audioMetaData: AudioMetaData = await processVideoDetails(
      args.videoId,
      args.outputFormat,
    );

    return audioMetaData
  }
});

