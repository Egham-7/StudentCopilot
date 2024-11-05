"use node";

import { v } from "convex/values";
import Stripe from "stripe";
import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getPriceId } from "./utils";
import { Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";
const SECONDS_TO_MILLISECONDS = 1000;

const FLOAT_TO_INT = 100;

export const createSubscriptionSession = action({
  args: {
    plan: v.string(),
    planPeriod: v.union(v.literal("annual"), v.literal("monthly")),
  },
  handler: async (ctx, { plan, planPeriod }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated");
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-10-28.acacia",
    });

    const user = await ctx.runQuery(internal.users.getUserInfoInternal, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new Error("User not found");
    }

    const customerId = user.stripeCustomerId;

    const priceId = getPriceId(plan, planPeriod);

    const domain = process.env.HOSTING_URL ?? "http://localhost:5173";
    const session: Stripe.Checkout.Session =
      await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer: customerId,

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_settings: {
            end_behavior: {
              missing_payment_method: "cancel",
            },
          },
          trial_period_days: 14,
        },
        payment_method_collection: "always",
        success_url: `${domain}/dashboard/home`,
        cancel_url: `${domain}/dashboard/home`,
      });

    return session.url;
  },
});

export const cancelSubscription = internalAction({
  args: {
    subscriptionId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { subscriptionId, userId }) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-09-30.acacia",
    });

    try {
      await stripe.subscriptions.cancel(subscriptionId);

      await ctx.runMutation(internal.notifications.store, {
        userId: userId,
        message: "Subscription canceled",
        relatedId: subscriptionId,
        type: "subscription",
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
    }
  },
});

export const handleSubscriptionWebhook = internalAction({
  args: {
    signature: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, { signature, payload }) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-09-30.acacia",
    });

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Webhook signature verification failed.`, err.message);
      }
      return { status: 400 };
    }

    const subscription = event.data.object as Stripe.Subscription;

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await ctx.runMutation(internal.stripeSubscriptions.updateSubscription, {
          subscriptionId: subscription.id,
          customerId: subscription.customer as string,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          plan: subscription.items.data[0].price.nickname?.toLowerCase() as
            | "basic"
            | "premium"
            | "enterprise",
          planPeriod:
            subscription.items.data[0].price.recurring?.interval === "year"
              ? "annual"
              : "monthly",
        });
        break;

      case "customer.subscription.deleted":
        await ctx.scheduler.runAt(
          subscription.current_period_end * SECONDS_TO_MILLISECONDS, // Convert to milliseconds
          internal.stripeSubscriptions.deleteSubscriptionData,
          {
            stripeCustomerId: subscription.customer as string,
          },
        );
        break;

      case "product.updated":
      case "product.deleted": {
        // Clear all plans and repopulate
        await ctx.runMutation(internal.stripePlans.clearPlans, {});
        await ctx.runAction(api.stripe.getPlans, {});
        break;
      }

      default:
        console.warn(`Unhandled event type ${event.type}`);
    }

    return { status: 200 };
  },
});

export const handleFreeSubscription = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    userId: v.id("users"),
    clerkId: v.string(),
    noteTakingStyle: v.string(),
    learningStyle: v.union(
      v.literal("auditory"),
      v.literal("visual"),
      v.literal("kinesthetic"),
      v.literal("analytical"),
    ),
    course: v.string(),
    levelOfStudy: v.union(
      v.literal("Bachelors"),
      v.literal("Associate"),
      v.literal("Masters"),
      v.literal("PhD"),
    ),
  },
  handler: async (
    ctx,
    {
      email,
      name,
      userId,
      clerkId,
      noteTakingStyle,
      learningStyle,
      course,
      levelOfStudy,
    },
  ) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-09-30.acacia",
    });

    const customer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: { convexUserId: userId },
    });

    const stripeCustomerId = customer.id;

    await ctx.runMutation(internal.users.storeInternal, {
      noteTakingStyle,
      learningStyle,
      course,
      levelOfStudy,
      stripeCustomerId,
      clerkId,
    });

    await ctx.runMutation(internal.stripeSubscriptions.updateSubscription, {
      customerId: stripeCustomerId,
      plan: "free",
      status: "active",
      clerkId,
      currentPeriodEnd: Date.now() / 1000 + 60 * 60 * 24 * 365,
    });
  },
});

export const getPlans = action({
  handler: async (ctx) => {
    const existingPlans: Doc<"plans">[] = await ctx.runQuery(
      internal.stripePlans.getPlans,
      {},
    );

    if (existingPlans.length > 0) {
      return existingPlans;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-09-30.acacia",
    });

    const prices = await stripe.prices.list({
      expand: ["data.product"],
      active: true,
    });

    // Group prices by product
    const productPrices = prices.data.reduce(
      (acc, price) => {
        const productId = (price.product as Stripe.Product).id;
        if (!acc[productId]) {
          acc[productId] = [];
        }
        acc[productId].push(price);
        return acc;
      },
      {} as Record<string, Stripe.Price[]>,
    );

    const plans = Object.values(productPrices).map((prices) => {
      const product = prices[0].product as Stripe.Product;
      const monthlyPrice = prices.find(
        (p) => p.recurring?.interval === "month",
      );
      const annualPrice = prices.find((p) => p.recurring?.interval === "year");

      const features = (product.marketing_features || []).map(
        (feature: Stripe.Product.MarketingFeature) => feature.name ?? "",
      );

      return {
        id: product.id,
        title: product.name,
        description: product.description ?? undefined,
        prices: {
          monthly: monthlyPrice
            ? {
              priceId: monthlyPrice.id,
              amount: monthlyPrice.unit_amount! / FLOAT_TO_INT,
            }
            : undefined,
          annual: annualPrice
            ? {
              priceId: annualPrice.id,
              amount: annualPrice.unit_amount! / FLOAT_TO_INT,
            }
            : undefined,
        },
        features: features,
        buttonText: product.metadata.buttonText || "Choose Plan",
      };
    });

    await Promise.all(
      plans.map(async (plan) => {
        await ctx.runMutation(internal.stripePlans.storePlan, {
          plan,
        });
      }),
    );
    return plans;
  },
});
