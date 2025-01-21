/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as ai from "../ai.js";
import type * as aiAgent_flashCardAgent from "../aiAgent/flashCardAgent.js";
import type * as aiAgent_noteAgent from "../aiAgent/noteAgent.js";
import type * as aiAgent_prompts_flashCardAgent from "../aiAgent/prompts/flashCardAgent.js";
import type * as aiAgent_prompts_noteAgent from "../aiAgent/prompts/noteAgent.js";
import type * as aiAgent_types_flashCardAgent from "../aiAgent/types/flashCardAgent.js";
import type * as aiAgent_utils from "../aiAgent/utils.js";
import type * as aiChats from "../aiChats.js";
import type * as flashCardActions from "../flashCardActions.js";
import type * as flashcards from "../flashcards.js";
import type * as http from "../http.js";
import type * as index from "../index.js";
import type * as lectures from "../lectures.js";
import type * as modules from "../modules.js";
import type * as noteAction from "../noteAction.js";
import type * as notes from "../notes.js";
import type * as notifications from "../notifications.js";
import type * as stripe from "../stripe.js";
import type * as stripePlans from "../stripePlans.js";
import type * as stripeSubscriptions from "../stripeSubscriptions.js";
import type * as uploads from "../uploads.js";
import type * as usageLimits from "../usageLimits.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";
import type * as validationSchemas from "../validationSchemas.js";
import type * as websites_html from "../websites/html.js";
import type * as websites_youtube from "../websites/youtube.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  ai: typeof ai;
  "aiAgent/flashCardAgent": typeof aiAgent_flashCardAgent;
  "aiAgent/noteAgent": typeof aiAgent_noteAgent;
  "aiAgent/prompts/flashCardAgent": typeof aiAgent_prompts_flashCardAgent;
  "aiAgent/prompts/noteAgent": typeof aiAgent_prompts_noteAgent;
  "aiAgent/types/flashCardAgent": typeof aiAgent_types_flashCardAgent;
  "aiAgent/utils": typeof aiAgent_utils;
  aiChats: typeof aiChats;
  flashCardActions: typeof flashCardActions;
  flashcards: typeof flashcards;
  http: typeof http;
  index: typeof index;
  lectures: typeof lectures;
  modules: typeof modules;
  noteAction: typeof noteAction;
  notes: typeof notes;
  notifications: typeof notifications;
  stripe: typeof stripe;
  stripePlans: typeof stripePlans;
  stripeSubscriptions: typeof stripeSubscriptions;
  uploads: typeof uploads;
  usageLimits: typeof usageLimits;
  users: typeof users;
  utils: typeof utils;
  validationSchemas: typeof validationSchemas;
  "websites/html": typeof websites_html;
  "websites/youtube": typeof websites_youtube;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  actionRetrier: {
    public: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { runId: string },
        boolean
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { runId: string },
        any
      >;
      start: FunctionReference<
        "mutation",
        "internal",
        {
          functionArgs: any;
          functionHandle: string;
          options: {
            base: number;
            initialBackoffMs: number;
            logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
            maxFailures: number;
            onComplete?: string;
          };
        },
        string
      >;
      status: FunctionReference<
        "query",
        "internal",
        { runId: string },
        | { type: "inProgress" }
        | {
            result:
              | { returnValue: any; type: "success" }
              | { error: string; type: "failed" }
              | { type: "canceled" };
            type: "completed";
          }
      >;
    };
  };
  actionCache: {
    crons: {
      purge: FunctionReference<
        "mutation",
        "internal",
        { expiresAt?: number },
        null
      >;
    };
    lib: {
      get: FunctionReference<
        "query",
        "internal",
        { args: any; name: string; ttl: number | null },
        { kind: "hit"; value: any } | { expiredEntry?: string; kind: "miss" }
      >;
      put: FunctionReference<
        "mutation",
        "internal",
        {
          args: any;
          expiredEntry?: string;
          name: string;
          ttl: number | null;
          value: any;
        },
        null
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { args: any; name: string },
        null
      >;
      removeAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number; name?: string },
        null
      >;
    };
    public: {
      fetch: FunctionReference<
        "action",
        "internal",
        { args: any; expiration: number | null; fn: string; name: string },
        any
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { args: any; name: string },
        null
      >;
      removeAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number; name?: string },
        null
      >;
    };
  };
};
