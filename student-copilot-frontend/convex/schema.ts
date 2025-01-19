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
    flashCardSetIds: v.optional(v.array(v.id("flashCardSets"))),
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

  flashCardSets: defineTable({
    moduleId: v.id("modules"),
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    lectureIds: v.optional(v.array(v.id("lectures"))),
    noteIds: v.optional(v.array(v.id("notes"))),
    lastStudied: v.optional(v.string()),
    totalCards: v.number(),
    masteredCards: v.number(),
  })
    .index("by_moduleId", ["moduleId"])
    .index("by_userId", ["userId"]),

  flashcards: defineTable({
    flashCardSetId: v.id("flashCardSets"),
    front: v.string(),
    back: v.string(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
    status: v.union(
      v.literal("new"),
      v.literal("learning"),
      v.literal("review"),
      v.literal("mastered"),
    ),
    image: v.optional(v.union(v.id("_storage"), v.string(), v.null())),
    nextReviewDate: v.optional(v.string()),
    lastReviewDate: v.optional(v.string()),
    reviewCount: v.number(),
    correctCount: v.number(),
    incorrectCount: v.number(),
    tags: v.optional(v.array(v.string())),
    sourceContentId: v.optional(v.union(v.id("lectures"), v.id("notes"))),
  })
    .index("by_flashCardSetId", ["flashCardSetId"])
    .index("by_status", ["status"])
    .index("by_nextReviewDate", ["nextReviewDate"])
    .index("by_tags", ["tags"]),

  activities: defineTable({
    userId: v.string(),
    date: v.string(), // Store date as ISO string
    type: v.string(),
    count: v.number(),
    moduleId: v.optional(v.id("modules")),
    lectureId: v.optional(v.id("lectures")),
    flashCardSetId: v.optional(v.id("flashCardSets")),
    noteId: v.optional(v.id("notes")),
    metadata: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_date", ["date"])
    .index("by_userId_and_date", ["userId", "date"]),

  quizzes: defineTable({
    moduleId: v.id("modules"),
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    sourceContentIds: v.array(
      v.union(v.id("lectures"), v.id("notes"), v.id("flashCardSets")),
    ),
    questions: v.array(
      v.object({
        questionText: v.string(),
        questionType: v.union(
          v.literal("multiple_choice"),
          v.literal("short_answer"),
          v.literal("essay"),
          v.literal("true_false"),
        ),
        content: v.union(
          // Multiple Choice
          v.object({
            options: v.array(v.string()),
            correctOptionIndex: v.number(),
          }),
          // Short Answer
          v.object({
            correctAnswer: v.boolean(), //  The idea is an LLM can grade whether it is correct or not,
          }),
          // Essay
          v.object({
            modelAnswer: v.string(),
            keyPoints: v.array(v.string()),
            gradingRubric: v.array(
              v.object({
                criterion: v.string(),
                maxPoints: v.number(),
              }),
            ),
          }),
          // True False
          v.object({
            correctAnswer: v.boolean(), // This can be graded ahead of time,
          }),
        ),
        explanation: v.string(),
        points: v.number(),
        sourceReference: v.object({
          contentId: v.union(v.id("lectures"), v.id("notes")),
          context: v.string(),
        }),
      }),
    ),
    difficultyLevel: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced"),
    ),
    timeLimit: v.optional(v.number()), // in minutes
    createdAt: v.string(),
    lastUpdated: v.string(),
  })
    .index("by_moduleId", ["moduleId"])
    .index("by_userId", ["userId"]),

  quizAttempts: defineTable({
    quizId: v.id("quizzes"),
    userId: v.string(),
    answers: v.array(
      v.object({
        questionIndex: v.number(),
        userAnswer: v.union(
          v.number(), // multiple choice index
          v.string(), // short answer/essay
          v.boolean(), // true/false
        ),
        score: v.number(),
        aiFeedback: v.object({
          generalFeedback: v.string(),
          strengthPoints: v.array(v.string()),
          improvementAreas: v.array(v.string()),
        }),
      }),
    ),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
    totalScore: v.optional(v.number()),
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("reviewed"),
    ),
    timeSpent: v.optional(v.number()), // in seconds
  })
    .index("by_quizId", ["quizId"])
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),
});
