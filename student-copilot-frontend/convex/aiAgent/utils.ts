"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import axios from "axios";

export async function fetchImageLink(query: string): Promise<string> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const CX = process.env.CX;
  const searchUrl = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${CX}&key=${GOOGLE_API_KEY}&searchType=image&num=1`;

  try {
    const response = await axios.get(searchUrl);
    const imageLink = response?.data?.items?.[0]?.link;
    if (imageLink) {
      return imageLink;
    }
    throw new Error("No image found");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error with Axios:", error.message);
      if (error.response) {
        console.error("Server response error:", error.response.data);
      }
    }
    throw new Error("Image link retrieval failed");
  }
}

export const imageSearchTool = tool(
  async ({ query }) => {
    try {
      const imageUrl = await fetchImageLink(query);
      return imageUrl;
    } catch (error) {
      console.log("Error: ", error);
      return "No image found";
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
