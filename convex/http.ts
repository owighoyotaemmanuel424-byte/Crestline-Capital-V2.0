import { httpRouter, httpAction } from "convex/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/paystack/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("x-paystack-signature");
    const rawBody = await request.text();
    if (!signature) return new Response(JSON.stringify({ message: "Invalid webhook signature" }), { status: 401, headers: { "content-type": "application/json" } });
    try {
      const result = await ctx.runAction(internal.paystack.processWebhook, { rawBody, signature });
      return new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } });
    } catch {
      return new Response(JSON.stringify({ message: "Invalid webhook request" }), { status: 401, headers: { "content-type": "application/json" } });
    }
  }),
});

export default http;
