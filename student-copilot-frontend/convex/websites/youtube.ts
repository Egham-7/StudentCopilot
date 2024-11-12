"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { createClerkClient } from '@clerk/backend'

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export const getYoutubeTranscript = action({
  args: {
    videoUrl: v.string()
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

      console.log("Subject: ", identity.subject);

      // Get user's active sessions
      const sessions = await clerkClient.sessions.getSessionList({
        userId: identity.subject,
        status: 'active'
      });

      if (!sessions.data.length) {
        throw new Error('No active session found');
      }

      const sessionToken = await clerkClient.sessions.getToken(sessions.data[0].id, "convex");

      console.log("Session Token: ", sessionToken);

      const url = `${process.env.API_URL}/api/youtube/Transcript/${videoId}`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken.jwt}`
        },
        method: 'GET',
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        console.log("Error Response: ", errorResponse);
        throw new Error(`Failed to fetch transcription ${errorResponse.error}`);
      }

      const data = await response.text();

      return data;


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

