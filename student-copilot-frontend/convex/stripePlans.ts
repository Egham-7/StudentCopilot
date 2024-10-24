import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
export const getPlans = internalQuery({
  handler: async (ctx) => {
    const plans = await ctx.db.query("plans").collect();
    return plans;
  },
});

export const storePlan = internalMutation({
  args: {
    plan: v.object({
      id: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      prices: v.object({
        monthly: v.optional(
          v.object({
            priceId: v.string(),
            amount: v.number(),
          }),
        ),
        annual: v.optional(
          v.object({
            priceId: v.string(),
            amount: v.number(),
          }),
        ),
      }),
      features: v.optional(v.array(v.string())),
      buttonText: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Check if plan already exists
    const existingPlan = await ctx.db
      .query("plans")
      .withIndex("byStripeProductId", (q) => q.eq("stripeId", args.plan.id))
      .first();

    if (existingPlan) {
      // Update existing plan instead of creating new one
      return await ctx.db.patch(existingPlan._id, {
        title: args.plan.title,
        description: args.plan.description,
        prices: args.plan.prices,
        features: args.plan.features,
        buttonText: args.plan.buttonText,
      });
    }

    // Insert new plan if it doesn't exist
    return await ctx.db.insert("plans", {
      stripeId: args.plan.id,
      title: args.plan.title,
      description: args.plan.description,
      prices: args.plan.prices,
      features: args.plan.features,
      buttonText: args.plan.buttonText,
    });
  },
});

export const clearPlans = internalMutation({
  handler: async (ctx) => {
    const plans = await ctx.db.query("plans").collect();

    await Promise.all(
      plans.map(async (plan) => {
        await ctx.db.delete(plan._id);
      }),
    );
  },
});
