"use node";

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { AssemblyAI } from 'assemblyai';
import ytdl from "ytdl-core";

const aaiClient = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

export const getYoutubeVideoTranscription = action({
  args: {
    link: v.string()
  },
  handler: async (_ctx, args) => {
    const { link } = args;

    try {
      const info = await ytdl.getInfo(link, {
        requestOptions: {
          headers: {
            cookie: process.env.YT_COOKIE,
            "x-youtube-identity-token": process.env.YT_TOKEN
          }
        }
      });

      const audioFormat = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });

      if (!audioFormat) {
        throw new Error("No suitable audio format found");
      }

      const audioUrl = audioFormat.url;

      const transcript = await aaiClient.transcripts.transcribe({
        // can also accept videos and local files
        audio: audioUrl,
      });

      if (transcript.status === "error") {
        throw new Error("Transcription failed: " + transcript.error);
      }

      const text = transcript.text;

      if (!text || text.length <= 0) {
        throw new Error("Empty Video");
      }

      return text;

    } catch (error) {
      console.error('Error processing YouTube video:', error);
      throw new Error('Failed to process YouTube video');
    }
  }
});

export const getWebsiteTranscription = action({
  args: {
    link: v.string()
  },
  handler: async (_ctx, args) => {
    const { link } = args;

    try {
      const response = await fetch(link);
      const html = await response.text();

      // Simple HTML tag stripping regex
      const text = html.replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return text;
    } catch (error) {
      console.error('Error fetching website:', error);
      throw new Error('Failed to fetch website content');
    }
  }
});

