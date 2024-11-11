export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL ?? "https://your-dev-clerk-url.clerk.accounts.dev",
      applicationID: process.env.CLERK_APPLICATION_ID ?? "convex",
    },
  ],
};

