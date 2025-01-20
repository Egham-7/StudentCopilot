import {
  internalQuery,
  internalMutation,
  query,
  DatabaseReader,
} from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// Validation schemas
const priceInfoSchema = v.object({
  priceId: v.string(),
  amount: v.number(),
});

const planSchema = v.object({
  id: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  prices: v.object({
    monthly: v.optional(priceInfoSchema),
    annual: v.optional(priceInfoSchema),
  }),
  features: v.optional(v.array(v.string())),
  buttonText: v.string(),
});

// Helper function to get plan by Stripe ID
const getPlanByStripeId = async (
  ctx: { db: DatabaseReader },
  stripeId: string,
): Promise<Doc<"plans"> | null> => {
  return await ctx.db
    .query("plans")
    .withIndex("byStripeProductId", (q) => q.eq("stripeId", stripeId))
    .first();
};

export const getPlans = internalQuery({
  handler: async (ctx): Promise<Doc<"plans">[]> => {
    return await ctx.db.query("plans").order("desc").collect();
  },
});

export const getAvailablePlans = query({
  handler: async (ctx): Promise<Doc<"plans">[]> => {
    return await ctx.db.query("plans").order("desc").collect();
  },
});

export const storePlan = internalMutation({
  args: {
    plan: planSchema,
  },
  handler: async (ctx, args) => {
    const existingPlan = await getPlanByStripeId(ctx, args.plan.id);

    const planData = {
      title: args.plan.title,
      description: args.plan.description,
      prices: args.plan.prices,
      features: args.plan.features,
      buttonText: args.plan.buttonText,
    };

    if (existingPlan) {
      return await ctx.db.patch(existingPlan._id, planData);
    }

    return await ctx.db.insert("plans", {
      stripeId: args.plan.id,
      ...planData,
    });
  },
});

export const clearPlans = internalMutation({
  handler: async (ctx) => {
    const plans = await ctx.db.query("plans").collect();

    await Promise.all(
      plans.map((plan: Doc<"plans">) => ctx.db.delete(plan._id)),
    );
  },
});
