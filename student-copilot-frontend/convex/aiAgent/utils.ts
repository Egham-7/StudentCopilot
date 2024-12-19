"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { fetchImageLink } from "./noteAgent";

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
