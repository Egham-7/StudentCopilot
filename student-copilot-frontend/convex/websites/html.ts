"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import * as cheerio from "cheerio";
import { z } from "zod";


const validateUrl = (url: string) => {
  const result = z.string().url().safeParse(url);
  if (!result.success) {
    throw new Error("Invalid URL format");
  }
  return true;
}

export const getWebsiteTranscription = action({
  args: {
    link: v.string(),
  },
  handler: async (_ctx, args) => {

    try {
      const { link } = args;

      if (!validateUrl(link)) {
        throw new Error("Passed malformed url.");
      }

      const response = await fetch(link);

      if (!response.ok) {
        throw new Error("Failed to fetch html.");
      }

      const html = await response.text();

      // Load HTML into cheerio
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $("script").remove();
      $("style").remove();
      $("noscript").remove();
      $("iframe").remove();
      $("header").remove();
      $("footer").remove();
      $("nav").remove();

      // Get main content (prioritize main content areas)
      const mainContent =
        $("main, article, .content, #content, .main-content").first().text() ||
        $("body").text();

      // Clean up the text
      const cleanText = mainContent
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .replace(/\n+/g, "\n") // Replace multiple newlines with single newline
        .trim();

      return cleanText;
    } catch (error: unknown) {

      if (error instanceof Error) {
        throw new Error(`Failed to get website transcription: ${error.message}`);
      }

      throw error;
    }
  }
});
