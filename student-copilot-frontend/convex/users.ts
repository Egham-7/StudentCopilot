import { mutation, query } from "./_generated/server";
import { v } from "convex/values";


export const store = mutation({
  args: {

    noteTakingStyle: v.string(),
    learningStyle: v.union(
      v.literal("auditory"),
      v.literal("visual"),
      v.literal("kinesthetic"),
      v.literal("analytical")
    ),
    course: v.string(),
    levelOfStudy: v.union(
      v.literal("Bachelors"),
      v.literal("Associate"),
      v.literal("Masters"),
      v.literal("PhD")
    ),
  },
  handler: async (ctx, args) => {

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        ...args,
        name: identity.name,
      });
      return existingUser._id;
    }

    // If not, create a new user
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "Unknown",
      ...args,
    });

    return userId;
  }

})


export const getUserInfo = query({
  args: {
  },
  handler: async (ctx) => {

    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Called getUser without authentication present.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", q => q.eq("clerkId", identity.subject))
      .first()



    if (!user) {
      throw new Error("User not found!")
    }

    return user;

  }
})