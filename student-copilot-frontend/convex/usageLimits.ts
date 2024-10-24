import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Define a type for the limit keys
type LimitType = "modules" | "lectures" | "storage";
type LimitKeys = `max${Capitalize<LimitType>}`;

export const checkUsageLimit = internalQuery({
  args: {
    userId: v.id("users"),
    limitType: v.union(
      v.literal("modules"),
      v.literal("lectures"),
      v.literal("storage"),
    ),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const currentUsage = subscription.currentUsage[args.limitType];
    const limitKey =
      `max${args.limitType.charAt(0).toUpperCase() + args.limitType.slice(1)}` as LimitKeys;
    const limit = subscription.usageLimits[limitKey];

    return currentUsage + args.amount <= limit;
  },
});

export const updateUsage = internalMutation({
  args: {
    userId: v.id("users"),
    limitType: v.union(
      v.literal("modules"),
      v.literal("lectures"),
      v.literal("storage"),
    ),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const newUsage = {
      ...subscription.currentUsage,
      [args.limitType]: subscription.currentUsage[args.limitType] + args.amount,
    };

    await ctx.db.patch(subscription._id, { currentUsage: newUsage });
  },
});
