"use node";

import { action } from '../_generated/server';
import { v } from 'convex/values';



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

