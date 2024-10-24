/* prettier-ignore-start */

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
import type * as ai from "../ai.js";
import type * as aiChats from "../aiChats.js";
import type * as http from "../http.js";
import type * as lectures from "../lectures.js";
import type * as modules from "../modules.js";
import type * as notes from "../notes.js";
import type * as notifications from "../notifications.js";
import type * as stripe from "../stripe.js";
import type * as stripeSubscriptions from "../stripeSubscriptions.js";
import type * as uploads from "../uploads.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";
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
  ai: typeof ai;
  aiChats: typeof aiChats;
  http: typeof http;
  lectures: typeof lectures;
  modules: typeof modules;
  notes: typeof notes;
  notifications: typeof notifications;
  stripe: typeof stripe;
  stripeSubscriptions: typeof stripeSubscriptions;
  uploads: typeof uploads;
  users: typeof users;
  utils: typeof utils;
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

/* prettier-ignore-end */
