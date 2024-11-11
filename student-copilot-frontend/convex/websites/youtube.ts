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
        console.log("Caught Error:", error.message);
        throw new Error(`Failed to upload youtube video: ${error.message}`);
      }
      throw error;
    }

  }
});




function extractVideoId(url: string): string | null {
  const videoIdRegex = /v=([\w-]+&\w+_)/;
  const match = url.match(videoIdRegex);
  return match ? match[1] : null;
}
