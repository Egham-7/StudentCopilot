import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "./_generated/server";
import { learningStyleSchema, levelOfStudySchema } from "./validationSchemas";

const userArgsSchema = {
  noteTakingStyle: v.string(),
  learningStyle: learningStyleSchema,
  course: v.string(),
  levelOfStudy: levelOfStudySchema,
};

// Helper function to get user by clerkId
export const getUserByClerkId = async (ctx: QueryCtx, clerkId: string) => {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .first();
};

export const store = mutation({
  args: userArgsSchema,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const existingUser = await getUserByClerkId(ctx, identity.subject);

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        ...args,
        name: identity.name,
      });
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "Unknown",
      ...args,
    });

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Failed to create user");
    }

    // Schedule free subscription handling
    await ctx.scheduler.runAfter(0, internal.stripe.handleFreeSubscription, {
      clerkId: identity.subject,
      userId: user._id,
      email: identity.email ?? "N/A",
      name: user.name ?? "Unknown",
      ...args,
    });

    return userId;
  },
});

export const getUserInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },
});

export const storeInternal = internalMutation({
  args: {
    ...userArgsSchema,
    stripeCustomerId: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser =
      (await ctx.db
        .query("users")
        .withIndex("by_stripeCustomerId", (q) =>
          q.eq("stripeCustomerId", args.stripeCustomerId),
        )
        .first()) ??
      (args.clerkId ? await getUserByClerkId(ctx, args.clerkId) : null);

    if (!existingUser) {
      throw new Error("User not found");
    }

    await ctx.db.patch(existingUser._id, {
      ...args,
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

export const getUserInfoInternal = internalQuery({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, { clerkId }) => {
    return await getUserByClerkId(ctx, clerkId);
  },
});
