import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";


export default defineSchema({
  users: defineTable({
    name: v.string(),
    clerkId: v.string(),
    noteTakingStyle: v.string(),
    learningStyle: v.union(
      v.literal("auditory"),
      v.literal("visual"),
      v.literal("kinesthetic"),
      v.literal("analytical")
    ),
    course: v.string(),
    levelOfStudy: v.union(
      v.literal("Bachelors"),
      v.literal("Associate"),
      v.literal("Masters"),
      v.literal("PhD")
    )

  }).index("by_clerkId", ["clerkId"]),

  modules: defineTable({
    name: v.string(),
    department: v.string(),
    credits: v.number(),
    image: v.optional(v.string()), // Store image URL instead of bytes
    userId: v.string(),
    semester: v.union(
      v.literal("Fall"),
      v.literal("Spring"),
      v.literal("Summer")
    ),
    year: v.string(),
    description: v.optional(v.string()),
    prerequisites: v.optional(v.array(v.string())),
    instructors: v.array(v.string()),


  })
    .index("by_userId", ["userId"]),

  lectures: defineTable({

    title: v.string(),
    userId: v.string(),
    description: v.optional(v.string()),
    videoUrl: v.id("_storage"),
    moduleId: v.id("modules"),
    completed: v.boolean(),
    lectureTranscription: v.array(v.id("_storage")),
    lectureTranscriptionEmbedding: v.array(v.float64())
  })
    .index("by_moduleId", ["moduleId"])
    .vectorIndex("by_lectureTranscriptionEmbedding", {

      vectorField: "lectureTranscriptionEmbedding",
      dimensions: 1536,
      filterFields: ["moduleId"]

    }),

  notifications: defineTable({
    userId: v.string(),
    message: v.string(),
    type: v.string(),
    relatedId: v.optional(v.string()),
    createdAt: v.string(),
    isRead: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),


  notes: defineTable({
    lectureIds: v.array(v.id("lectures")),
    textChunks: v.array(v.id("_storage"))
  })

});
