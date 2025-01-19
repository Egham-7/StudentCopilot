import { v } from "convex/values";

const learningStyleSchema = v.union(
  v.literal("auditory"),
  v.literal("visual"),
  v.literal("kinesthetic"),
  v.literal("analytical"),
);

const levelOfStudySchema = v.union(
  v.literal("Bachelors"),
  v.literal("Associate"),
  v.literal("Masters"),
  v.literal("PhD"),
);

export { levelOfStudySchema, learningStyleSchema };
