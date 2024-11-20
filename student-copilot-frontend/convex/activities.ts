import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const getYearlyActivity = query({
  args: {
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error(
        "Called getYearlyActivity without authentication present",
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const startDate = new Date(args.year, 0, 1).toISOString();
    const endDate = new Date(args.year, 11, 31).toISOString();

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_userId_and_date", (q) =>
        q
          .eq("userId", user.clerkId)
          .gte("date", startDate)
          .lte("date", endDate),
      )
      .collect();

    return activities;
  },
});

export const store = internalAction({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("lecture_created"),
      v.literal("note_created"),
      v.literal("module_created"),
      v.literal("lecture_completed"),
      v.literal("flashcard_set_created"),
      v.literal("flashcard_set_deleted"),
    ),
    moduleId: v.optional(v.id("modules")),
    lectureId: v.optional(v.id("lectures")),
    flashCardSetId: v.optional(v.id("flashCardSets")),
    noteId: v.optional(v.id("notes")),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.activities.add, {
      ...args,
    });
  },
});

export const add = internalMutation({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("lecture_created"),
      v.literal("note_created"),
      v.literal("module_created"),
      v.literal("lecture_completed"),
      v.literal("flashcard_set_created"),
      v.literal("flashcard_set_deleted")
    ),
    moduleId: v.optional(v.id("modules")),
    lectureId: v.optional(v.id("lectures")),
    noteId: v.optional(v.id("notes")),
    flashCardSetId: v.optional(v.id("flashCardSets")),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];

    // Check if there's already an entry for this date and type

    const existingActivity = await ctx.db
      .query("activities")
      .withIndex("by_userId_and_date")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("date"), date),
        ),
      )
      .first();

    if (existingActivity) {
      // Update existing activity count
      await ctx.db.patch(existingActivity._id, {
        count: existingActivity.count + 1,
      });
    } else {
      // Create new activity entry
      await ctx.db.insert("activities", {
        userId: args.userId,
        date,
        type: args.type,
        count: 1,
        moduleId: args.moduleId,
        lectureId: args.lectureId,
        metadata: args.metadata,
        flashCardSetId: args.flashCardSetId
      });
    }
  },
});
