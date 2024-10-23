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
    subscriptionId: v.string(),
    customerId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.number(),
    plan: v.union(v.literal("pro"), v.literal("enterprise")),
    planPeriod: v.union(v.literal("monthly"), v.literal("annual")),
  },
  handler: async (ctx, args) => {
    // Find the user by Stripe customer ID
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("stripeCustomerId"), args.customerId))
      .first();

    if (!user) {
      console.error(`User not found for customerId: ${args.customerId}`);
      return;
    }

    // Update or insert the subscription
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    const subscriptionData = {
      userId: user._id,
      stripeCustomerId: args.customerId,
      stripeSubscriptionId: args.subscriptionId,
      plan: args.plan ?? "monthly",
      status: args.status,
      currentPeriodEnd: args.currentPeriodEnd,
      planPeriod: args.planPeriod ?? "pro",
    };

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, { ...subscriptionData });
    } else {
      await ctx.db.insert("subscriptions", { ...subscriptionData });
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

    // Call the internal action to cancel the subscription with Stripe
    await ctx.scheduler.runAfter(0, internal.stripe.cancelSubscription, {
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
