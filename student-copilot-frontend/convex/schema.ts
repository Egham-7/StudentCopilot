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
      v.literal("analytical"),
    ),
    course: v.string(),
    levelOfStudy: v.union(
      v.literal("Bachelors"),
      v.literal("Associate"),
      v.literal("Masters"),
      v.literal("PhD"),
    ),
    stripeCustomerId: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"]),

  modules: defineTable({
    name: v.string(),
    department: v.string(),
    credits: v.number(),
    image: v.optional(v.id("_storage")),
    userId: v.string(),
    semester: v.union(
      v.literal("Fall"),
      v.literal("Spring"),
      v.literal("Summer"),
    ),
    year: v.string(),
    description: v.optional(v.string()),
    prerequisites: v.optional(v.array(v.string())),
    instructors: v.array(v.string()),
  }).index("by_userId", ["userId"]),

  lectures: defineTable({
    title: v.string(),
    userId: v.string(),
    description: v.optional(v.string()),
    contentUrl: v.id("_storage"),
    moduleId: v.id("modules"),
    completed: v.boolean(),
    lectureTranscription: v.array(v.id("_storage")),
    lectureTranscriptionEmbedding: v.array(v.float64()),
    fileType: v.union(
      v.literal("pdf"),
      v.literal("audio"),
      v.literal("video"),
      v.literal("website"),
    ),
    image: v.optional(v.id("_storage")),
  })
    .index("by_moduleId", ["moduleId"])
    .vectorIndex("by_lectureTranscriptionEmbedding", {
      vectorField: "lectureTranscriptionEmbedding",
      dimensions: 1536,
      filterFields: ["moduleId"],
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
    moduleId: v.id("modules"),
    lectureIds: v.array(v.id("lectures")),
    textChunks: v.array(v.id("_storage")),
    noteEmbedding: v.array(v.float64()),
  })
    .index("by_moduleId", ["moduleId"])
    .vectorIndex("by_noteEmbedding", {
      vectorField: "noteEmbedding",
      dimensions: 1536,
      filterFields: ["moduleId"],
    }),

  messages: defineTable({
    moduleId: v.id("modules"),
    sessionId: v.string(),
    body: v.string(),
    isViewer: v.boolean(),
    isPartial: v.boolean(),
  })
    .index("byModuleId", ["moduleId"])
    .index("bySessionAndModule", ["sessionId", "moduleId"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    plan: v.union(
      v.literal("enterprise"),
      v.literal("premium"),
      v.literal("basic"),
      v.literal("free"),
    ),
    planPeriod: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
    status: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    usageLimits: v.object({
      maxModules: v.number(),
      maxLectures: v.number(),
      maxStorage: v.number(), // in bytes
    }),
    currentUsage: v.object({
      modules: v.number(),
      lectures: v.number(),
      storage: v.number(), // in bytes
    }),
  })
    .index("by_userId", ["userId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"]),

  plans: defineTable({
    stripeId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    prices: v.object({
      monthly: v.optional(
        v.object({
          priceId: v.string(),
          amount: v.number(),
        }),
      ),
      annual: v.optional(
        v.object({
          priceId: v.string(),
          amount: v.number(),
        }),
      ),
    }),
    features: v.optional(v.array(v.string())),
    buttonText: v.string(),
  }).index("byStripeProductId", ["stripeId"]),

  activities: defineTable({
    userId: v.string(),
    date: v.string(), // Store date as ISO string
    type: v.union(
      v.literal("lecture_created"),
      v.literal("note_created"),
      v.literal("module_created"),
      v.literal("lecture_completed"),
    ),
    count: v.number(),
    moduleId: v.optional(v.id("modules")),
    lectureId: v.optional(v.id("lectures")),
    metadata: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_date", ["date"])
    .index("by_userId_and_date", ["userId", "date"]),
});
