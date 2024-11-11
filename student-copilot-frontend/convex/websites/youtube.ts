"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { YouTubeTranscriptExtractor } from 'youtube-transcript-fetcher';

export const getYoutubeTranscript = action({
  args: {
    videoUrl: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated to access this endpoint.");
    }

    const videoId = extractVideoId(args.videoUrl);

    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log("Video Id: ", videoId);

    try {

      const ytExtractor = new YouTubeTranscriptExtractor();


      const response = await ytExtractor.retrieveTranscript(videoId);


      if (!response) {
        throw new Error("Video not found.");
      }


      if (!response.transcript) {
        throw new Error("Transcript not found for this video.");
      }



      return response.transcript.reduce((acc, segment) => {
        return acc + segment.text;
      }, '');


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
