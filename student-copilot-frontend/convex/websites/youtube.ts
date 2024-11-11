"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

export const getYoutubeTranscript = action({
  args: {
    videoUrl: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated to access this endpoint.");
    }

    try {

      const videoId = extractVideoId(args.videoUrl);

      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }


      console.log("Video Id: ", videoId);

      const url = `${process.env.API_URL}/youtube/Transcription/${videoId}?userId=${identity.subject}`

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${identity.tokenIdentifier}`
        },
        method: 'GET'
      })

      if (!response.ok) {

        const errorResponse = await response.json();

        throw new Error(`Failed to fetch transcription ${errorResponse.message}`)
      }


      const data = await response.json();

      return data.text;

    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log("Caught Error:", error);
        throw new Error(`Failed to upload youtube video: ${error.message}`);
      }
      throw error;
    }

  }
});


function extractVideoId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:v=|\/)([\w-]{11})(?:\?|&|$)/,  // Standard YouTube URL
    /(?:youtu\.be\/)([\w-]{11})(?:\?|&|$)/, // Short YouTube URL
    /(?:embed\/)([\w-]{11})(?:\?|&|$)/, // Embed URL
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

