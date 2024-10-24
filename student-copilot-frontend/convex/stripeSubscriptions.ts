import {
  internalQuery,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

export const getSubscription = internalQuery({
  args: {
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const subscriptionData = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return subscriptionData;
  },
});

export const getSubscriptionClient = query({
  handler: async (ctx): Promise<Doc<"subscriptions"> | null> => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error(
        "Called getSubscriptionClient without authentication present",
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const subscriptionData = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!subscriptionData) {
      return null;
    }

    return subscriptionData;
  },
});

export const updateSubscription = internalMutation({
  args: {
    subscriptionId: v.optional(v.string()),
    customerId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.number(),
    plan: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("premium"),
      v.literal("enterprise"),
    ),
    planPeriod: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the user by Stripe customer ID
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("stripeCustomerId"), args.customerId))
      .first();

    if (!user) {
      throw new Error(`User not found for customerId: ${args.customerId}`);
    }

    // Update or insert the subscription
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    const usageLimits = getPlanLimits(args.plan);

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
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, { subscriptionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Fetch the user's subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("stripeSubscriptionId"), subscriptionId))
      .first();

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Ensure the subscription belongs to the current user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), identity.subject))
      .first();

    if (!user || user._id !== subscription.userId) {
      throw new Error("Unauthorized");
    }

    // Downgrade the user's plan at the end of the billing period

    const customerId = subscription.stripeCustomerId;

    const currentPeriodEnd = subscription.currentPeriodEnd;

    if (!customerId || !currentPeriodEnd) {
      throw new Error("customerId or currentPeriodEnd is missing");
    }

    const periodEnd = new Date(currentPeriodEnd * 1000);

    await ctx.scheduler.runAt(
      periodEnd,
      internal.stripeSubscriptions.updateSubscription,
      {
        subscriptionId,
        plan: "free",
        customerId,
        currentPeriodEnd,
        status: "active",
      },
    );
    // Call the internal action to cancel the subscription with Stripe
    await ctx.scheduler.runAt(periodEnd, internal.stripe.cancelSubscription, {
      subscriptionId,
      userId: user._id,
    });

    return { success: true, message: "Subscription canceled successfully" };
  },
});

export const deleteSubscriptionData = internalMutation({
  args: {
    stripeCustomerId: v.string(),
  },

  handler: async (ctx, { stripeCustomerId }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", stripeCustomerId),
      )
      .first();

    if (!subscription) {
      throw new Error("Subscription must be present.");
    }

    await ctx.db.delete(subscription._id);
  },
});

function getPlanLimits(plan: string) {
  switch (plan) {
    case "free":
      return { maxModules: 3, maxLectures: 10, maxStorage: 100 * 1024 * 1024 }; // 100 MB
    case "premium":
      return {
        maxModules: 10,
        maxLectures: 50,
        maxStorage: 1024 * 1024 * 1024,
      }; // 1 GB
    case "enterprise":
    case "pro":
      return {
        maxModules: Infinity,
        maxLectures: Infinity,
        maxStorage: Infinity,
      };
    default:
      throw new Error("Invalid plan");
  }
}
