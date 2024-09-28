import { query } from "./_generated/server"
import { v } from "convex/values"
import { Id } from "./_generated/dataModel";

export const getStorageUrl = query({
  args: {
    storageId: v.string()
  },

  handler: async (ctx, args) => {

    return ctx.storage.getUrl(args.storageId as Id<"_storage">);
  }
})
