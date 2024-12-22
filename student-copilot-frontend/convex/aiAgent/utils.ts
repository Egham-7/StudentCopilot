"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import axios, { AxiosError } from "axios";

interface GoogleImageSearchResponse {
  items?: Array<{
    link?: string;
  }>;
}

export class ImageSearchError extends Error {
  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "ImageSearchError";
  }
}

export async function fetchImageLink(query: string): Promise<string> {
  // Validate input
  if (!query || query.trim() === "") {
    throw new ImageSearchError("Search query cannot be empty");
  }

  // Ensure environment variables are set
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const CX = process.env.CX;

  if (!GOOGLE_API_KEY || !CX) {
    throw new ImageSearchError("Missing Google API credentials");
  }

  try {
    // Encode the query to handle special characters
    const encodedQuery = encodeURIComponent(query);

    const searchUrl = `https://www.googleapis.com/customsearch/v1?q=${encodedQuery}&cx=${CX}&key=${GOOGLE_API_KEY}&searchType=image&num=1`;

    const response = await axios.get<GoogleImageSearchResponse>(searchUrl, {
      timeout: 5000, // Add a timeout to prevent hanging
    });

    const imageLink = response.data.items?.[0]?.link;

    if (!imageLink) {
      throw new ImageSearchError("No image found for the given query");
    }

    return imageLink;
  } catch (error) {
    // Detailed error handling
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // The request was made and the server responded with a status code
        const errorDetails = {
          status: axiosError.response.status,
          data: axiosError.response.data,
        };

        throw new ImageSearchError(
          `Google Image Search API request failed: ${axiosError.message}`,
          new Error(JSON.stringify(errorDetails)),
        );
      } else if (axiosError.request) {
        // The request was made but no response was received
        throw new ImageSearchError(
          "No response received from Google Image Search API",
          axiosError,
        );
      }
    }

    throw new ImageSearchError(
      "Unexpected error during image search",
      error instanceof Error ? error : undefined,
    );
  }
}

export const imageSearchTool = tool(
  async ({ query }) => {
    try {
      const imageUrl = await fetchImageLink(query);
      return imageUrl;
    } catch (error) {
      console.log("Error: ", error);
      return null;
    }
  },
  {
    name: "image_search",
    description: "Search for an educational image based on a query",
    schema: z.object({
      query: z.string().describe("The image search query"),
    }),
  },
);
