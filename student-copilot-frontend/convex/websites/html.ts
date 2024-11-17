"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import * as cheerio from "cheerio";
import { z } from "zod";


const validateUrl = async (url: string) => {
  const result = await urlSchema.safeParseAsync(url);
  if (!result.success) {
    throw new Error("Invalid URL format");
  }
  return true;
}

const urlSchema = z.string().url().refine(
  (url) => {
    const protocols = ['https:'];
    try {
      const urlObj = new URL(url);
      return protocols.includes(urlObj.protocol);
    } catch {
      return false;
    }
  },
  {
    message: 'URL must use HTTPS protocol'
  }
);

export const getWebsiteTranscription = action({
  args: {
    link: v.string(),
  },
  handler: async (_ctx, args) => {

    try {
      const { link } = args;

      const urlValidationResult = await validateUrl(link);

      if (!urlValidationResult) {
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
