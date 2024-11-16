import { action } from "./_generated/server";
import { v } from "convex/values";

export const fetchStorageContent = action({
  args: {
    storageId: v.id("_storage")
  },

  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);

    if (!url) {
      throw new Error(`Storage URL not found for ID ${args.storageId}`);
    }

    const response = await fetch(url);


    return response.json();
  }
});



