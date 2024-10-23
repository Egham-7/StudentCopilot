"use node";

import { v } from "convex/values";
import Stripe from "stripe";
import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getPriceId } from "./utils";

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
      apiVersion: "2024-09-30.acacia",
    });

    const user = await ctx.runQuery(internal.users.getUserInfoInternal, {
      clerkId: identity.subject,
    });
    console.log(user);

    if (user === null) {
      throw new Error("User not found");
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: identity.email,
        name: identity.name,
        metadata: { convexUserId: user._id },
      });
      customerId = customer.id;
      await ctx.runMutation(internal.users.storeInternal, {
        stripeCustomerId: customerId,
        noteTakingStyle: user.noteTakingStyle,
        learningStyle: user.learningStyle,
        course: user.course,
        levelOfStudy: user.levelOfStudy,
        clerkId: user.clerkId,
      });
    }

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
        success_url: `${domain}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
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
            | "pro"
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

      default:
        console.warn(`Unhandled event type ${event.type}`);
    }

    return { status: 200 };
  },
});

export const getPlans = action({
  handler: async () => {
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

      const features = product.metadata.features
        ? JSON.parse(product.metadata.features)
        : [];

      return {
        id: product.id,
        title: product.name,
        description: product.description,
        prices: {
          monthly: monthlyPrice
            ? {
                id: monthlyPrice.id,
                amount: monthlyPrice.unit_amount! / FLOAT_TO_INT,
              }
            : null,
          annual: annualPrice
            ? {
                id: annualPrice.id,
                amount: annualPrice.unit_amount! / FLOAT_TO_INT,
              }
            : null,
        },
        features: features,
        buttonText: product.metadata.buttonText || "Choose Plan",
      };
    });

    return plans;
  },
});
