import {
  internalQuery,
  internalMutation,
  mutation,
  query,
  QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { getUserByClerkId } from "./users";

// Shared validation schemas

const planSchema = v.union(
  v.literal("free"),
  v.literal("premium"),
  v.literal("enterprise"),
);

const planPeriodSchema = v.union(v.literal("monthly"), v.literal("annual"));

// Helper functions
const getUserSubscription = async (ctx: QueryCtx, userId: Id<"users">) => {
  return await ctx.db
    .query("subscriptions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
};

const getUserByStripeCustomerId = async (ctx: QueryCtx, customerId: string) => {
  return await ctx.db
    .query("users")
    .withIndex("by_stripeCustomerId", (q) =>
      q.eq("stripeCustomerId", customerId),
    )
    .first();
};

// Plan limits configuration
const PLAN_LIMITS = {
  free: { maxModules: 3, maxLectures: 10, maxStorage: 100 * 1024 * 1024 },
  premium: { maxModules: 10, maxLectures: 50, maxStorage: 1024 * 1024 * 1024 },
  enterprise: {
    maxModules: Infinity,
    maxLectures: Infinity,
    maxStorage: Infinity,
  },
} as const;

export const getSubscription = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await getUserSubscription(ctx, args.userId);
  },
});

export const getSubscriptionClient = query({
  handler: async (ctx): Promise<Doc<"subscriptions"> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user) {
      throw new Error("User not found");
    }

    return await getUserSubscription(ctx, user._id);
  },
});

export const updateSubscription = internalMutation({
  args: {
    subscriptionId: v.optional(v.string()),
    customerId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.number(),
    plan: planSchema,
    planPeriod: v.optional(planPeriodSchema),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByStripeCustomerId(ctx, args.customerId);
    if (!user) {
      throw new Error(`User not found for customerId: ${args.customerId}`);
    }

    const existingSubscription = await getUserSubscription(ctx, user._id);
    const usageLimits = PLAN_LIMITS[args.plan];

    const subscriptionData = {
      userId: user._id,
      stripeCustomerId: args.customerId,
      stripeSubscriptionId: args.subscriptionId,
      plan: args.plan,
      status: args.status,
      currentPeriodEnd: args.currentPeriodEnd,
      planPeriod: args.planPeriod,
      usageLimits,
      currentUsage: { modules: 0, lectures: 0, storage: 0 },
    };

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, subscriptionData);
    } else {
      await ctx.db.insert("subscriptions", subscriptionData);
    }

    await ctx.runMutation(internal.notifications.store, {
      userId: user._id,
      message: `Your subscription has been updated to ${args.plan} ${args.planPeriod}`,
      type: "subscription",
      relatedId: args.subscriptionId,
    });
  },
});

export const deleteSubscription = mutation({
  args: { subscriptionId: v.string() },
  handler: async (ctx, { subscriptionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", subscriptionId),
      )
      .first();

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user || user._id !== subscription.userId) {
      throw new Error("Unauthorized");
    }

    const periodEnd = new Date(subscription.currentPeriodEnd ?? 0 * 1000);

    // Schedule subscription updates
    await ctx.scheduler.runAt(
      periodEnd,
      internal.stripeSubscriptions.updateSubscription,
      {
        subscriptionId,
        plan: "free",
        customerId: subscription.stripeCustomerId ?? "",
        currentPeriodEnd: subscription.currentPeriodEnd ?? 0,
        status: "active",
      },
    );

    await ctx.scheduler.runAt(periodEnd, internal.stripe.cancelSubscription, {
      subscriptionId,
      userId: user._id,
    });

    return { success: true, message: "Subscription canceled successfully" };
  },
});

export const deleteSubscriptionData = internalMutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", stripeCustomerId),
      )
      .first();

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    await ctx.db.delete(subscription._id);
  },
});
