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

    const clerkId = identity.subject;
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    const oAuthTokenResponse = await clerkClient.users.getUserOauthAccessToken(clerkId, 'oauth_google');

    if (!oAuthTokenResponse?.data?.length) {
      throw new Error("Please connect your Google account to get access to this feature.");
    }

    const oAuthToken = oAuthTokenResponse.data[0].token;
    const videoId = extractVideoId(args.videoUrl);

    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    try {
      // Check if video exists and is accessible
      const videoResponse = await fetch(
        `https://youtube.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${oAuthToken}`,
            'Accept': 'application/json',
          }
        }
      );

      const videoData = await videoResponse.json();
      if (!videoData.items?.length) {
        throw new Error('Video not found or inaccessible');
      }

      // Get captions list
      const captionsResponse = await fetch(
        `https://youtube.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${oAuthToken}`,
            'Accept': 'application/json',
          }
        }
      );

      const captionsData = await captionsResponse.json();
      if (!captionsData.items?.length) {
        throw new Error('No captions available for this video');
      }

      // Find English captions
      const caption = captionsData.items.find((item: CaptionItem) =>
        (item.snippet?.language === 'en' || item.snippet?.language === 'en-us') &&
        (item.snippet?.trackKind === 'standard' || item.snippet?.trackKind === 'asr')
      );

      if (!caption?.id) {
        throw new Error("No English captions available for this video");
      }

      // Download the transcript
      const transcriptResponse = await fetch(
        `https://youtube.googleapis.com/youtube/v3/captions/${caption.id}?tfmt=srt`,
        {
          headers: {
            'Authorization': `Bearer ${oAuthToken}`,
            'Accept': 'application/json',
          }
        }
      );

      return await transcriptResponse.text();

    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message?.includes('forbidden') || error?.message?.includes('permissions')) {
          console.log("Caught Error:", error.message);
          throw new Error('This video has restricted caption access. Try a different video or contact the video owner.');
        }
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

