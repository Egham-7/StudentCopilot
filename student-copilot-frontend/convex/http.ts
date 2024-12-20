import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe signature", { status: 400 });
    }

    const payload = await request.text();
    if (!payload) {
      return new Response("Missing payload", { status: 400 });
    }

    try {
      const result = await ctx.runAction(
        internal.stripe.handleSubscriptionWebhook,
        {
          signature,
          payload,
        },
      );
      console.log("Webhook processed successfully");
      return new Response(null, { status: result.status });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
});

http.route({
  path: "/getUserData",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.json();

    if (!payload) {
      return new Response("Missing payload", { status: 400 });
    }

    const moduleId = payload.moduleId;

    if (!moduleId) {
      return new Response("Payload missing moduleId", { status: 400 });
    }

    try {
      const lectures = await ctx.runQuery(
        internal.lectures.getLecturesByModuleIdInternal,
        {
          moduleId,
        },
      );

      const notes = await ctx.runQuery(
        internal.notes.getNotesForModuleInternal,
        {
          moduleId,
        },
      );

      // Create a response body object and stringify it
      const responseBody = {
        lectures,
        notes,
      };

      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to retrieve lectures:", error);
      return new Response("Lecture retrieval failed", { status: 500 });
    }
  }),
});

export default http;
