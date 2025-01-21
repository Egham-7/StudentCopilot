import { ActionRetrier } from "@convex-dev/action-retrier";
import { ActionCache } from "@convex-dev/action-cache";
import { internal, components } from "./_generated/api";
import { FunctionReference } from "convex/server";

export const retrier = new ActionRetrier(components.actionRetrier);

export const embeddingsCache: ActionCache<
  FunctionReference<"action", "internal", { text: string }, number[]>
> = new ActionCache(components.actionCache, {
  action: internal.ai.generateEmbeddingAction,
  name: "embeddings-v1",
});

export const transcriptionCache: ActionCache<
  FunctionReference<"action", "internal", { audioChunkBase64: string }, string>
> = new ActionCache(components.actionCache, {
  action: internal.ai.transcribeAudioAction,
  name: "transcriptions-v1",
});
