import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store a new notification
export const store = internalMutation({
  args: {
    userId: v.optional(v.string()),
    message: v.string(),
    type: v.string(),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.userId == null) {
      throw new Error("User ID is null.");
    }

    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      message: args.message,
      type: args.type,
      relatedId: args.relatedId,
      createdAt: new Date().toISOString(),
      isRead: false,
    });
    return notificationId;
  },
});

export const destroy = mutation({
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!existingUser) {
      throw new Error("User cannot be null.");
    }

    const userNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", existingUser.clerkId))
      .collect();

    for (const notification of userNotifications) {
      await ctx.db.delete(notification._id);
    }
  },
});

export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notificationId);
  },
});

// Get notifications for a specific user
export const getUserNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(args.limit ?? 20);

    return notifications;
  },
});

export const getGlobalNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("_creationTime"), null))
      .order("asc")
      .take(args.limit ?? 50);

    return notifications;
  },
});

export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});
