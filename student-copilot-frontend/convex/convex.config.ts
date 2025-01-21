import { defineApp } from "convex/server";
import actionRetrier from "@convex-dev/action-retrier/convex.config";
import cache from "@convex-dev/action-cache/convex.config";

const app = defineApp();

app.use(actionRetrier);
app.use(cache);

export default app;
