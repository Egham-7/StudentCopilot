/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as activities from "../activities.js";
import type * as ai from "../ai.js";
import type * as aiAgent_flashCardAgent from "../aiAgent/flashCardAgent.js";
import type * as aiAgent_noteAgent from "../aiAgent/noteAgent.js";
import type * as aiAgent_prompts_flashCardAgent from "../aiAgent/prompts/flashCardAgent.js";
import type * as aiAgent_types_flashCardAgent from "../aiAgent/types/flashCardAgent.js";
import type * as aiChats from "../aiChats.js";
import type * as flashCardActions from "../flashCardActions.js";
import type * as flashcards from "../flashcards.js";
import type * as http from "../http.js";
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
import type * as websites_html from "../websites/html.js";
import type * as websites_youtube from "../websites/youtube.js";

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
  "aiAgent/types/flashCardAgent": typeof aiAgent_types_flashCardAgent;
  aiChats: typeof aiChats;
  flashCardActions: typeof flashCardActions;
  flashcards: typeof flashcards;
  http: typeof http;
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
  "websites/html": typeof websites_html;
  "websites/youtube": typeof websites_youtube;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
