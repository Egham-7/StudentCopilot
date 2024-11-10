"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { createClerkClient } from '@clerk/backend';

interface CaptionItem {
  id: string;
  snippet: {
    language?: string;
    trackKind?: string;
  };
}


export const getYoutubeTranscript = action({
  args: {
    videoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated to access this endpoint.");
    }

    const videoId = extractVideoId(args.videoUrl);

    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    try {


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
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

