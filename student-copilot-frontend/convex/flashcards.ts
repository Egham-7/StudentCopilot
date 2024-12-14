import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const createFlashCardSet = mutation({
  args: {
    moduleId: v.id("modules"),
    title: v.string(),
    description: v.optional(v.string()),
    noteIds: v.optional(v.array(v.id("notes"))),
    lectureIds: v.optional(v.array(v.id("lectures"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Must be authenticated to use this function.");
    }

    const moduleUser = await ctx.db.get(args.moduleId);

    if (!moduleUser) {
      throw new Error("Flashcard set must be associated with a module.");
    }

    const userId = moduleUser.userId;

    if (userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const flashCardSetId = await ctx.db.insert("flashCardSets", {
      moduleId: args.moduleId,
      userId,
      title: args.title,
      description: args.description,
      lectureIds: args.lectureIds,
      noteIds: args.noteIds,
      totalCards: 0,
      masteredCards: 0,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId,
      message: `New flashcard set "${args.title}" has been created`,
      type: "flashcard_set_created",
      relatedId: flashCardSetId,
    });

    // Track activity
    await ctx.scheduler.runAfter(0, internal.activities.store, {
      userId,
      type: "flashcard_set_created",
      flashCardSetId,
    });
  },
});

export const createFlashCardSetInternal = internalMutation({
  args: {
    moduleId: v.id("modules"),
    title: v.string(),
    description: v.optional(v.string()),
    noteIds: v.optional(v.array(v.id("notes"))),
    lectureIds: v.optional(v.array(v.id("lectures"))),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const moduleUser = await ctx.db.get(args.moduleId);

    if (!moduleUser) {
      throw new Error("Flashcard set must be associated with a module.");
    }

    const userId = moduleUser.userId;

    if (userId !== args.userId) {
      throw new Error("Forbidden");
    }

    const flashCardSetId = await ctx.db.insert("flashCardSets", {
      moduleId: args.moduleId,
      userId: args.userId,
      title: args.title,
      description: args.description,
      lectureIds: args.lectureIds,
      noteIds: args.noteIds,
      totalCards: 0,
      masteredCards: 0,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId,
      message: `New flashcard set "${args.title}" has been created`,
      type: "flashcard_set_created",
      relatedId: flashCardSetId,
    });

    // Track activity
    await ctx.scheduler.runAfter(0, internal.activities.store, {
      userId,
      type: "flashcard_set_created",
      flashCardSetId,
    });

    return flashCardSetId;
  },
});

export const updateFlashCardSet = internalMutation({
  args: {
    flashCardSetId: v.id("flashCardSets"),
    title: v.string(),
    description: v.optional(v.string()),
    noteIds: v.optional(v.array(v.id("notes"))),
    lectureIds: v.optional(v.array(v.id("lectures"))),
  },
  handler: async (ctx, args) => {
    const { flashCardSetId, title, description, noteIds, lectureIds } = args;

    await ctx.db.patch(flashCardSetId, {
      title,
      description,
      noteIds,
      lectureIds,
    });

    return flashCardSetId;
  },
});

export const getFlashCardSet = query({
  args: {
    flashCardSetId: v.id("flashCardSets"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Must be authenticated to use this function.");
    }

    const flashcardSet = await ctx.db.get(args.flashCardSetId);

    if (!flashcardSet) {
      throw new Error("Flashcard set cannot be null.");
    }

    const moduleUser = await ctx.db.get(flashcardSet.moduleId);

    if (!moduleUser) {
      throw new Error("Flashcard set must be associated with a module.");
    }

    const userId = moduleUser.userId;

    if (userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    return ctx.db.get(args.flashCardSetId);
  },
});

export const addFlashCardInternal = internalMutation({
  args: {
    flashCardSetId: v.id("flashCardSets"),
    userId: v.string(),
    front: v.string(),
    back: v.string(),
    tags: v.optional(v.array(v.string())),
    sourceContentId: v.optional(v.union(v.id("lectures"), v.id("notes"))),
  },

  handler: async (ctx, args) => {
    const cardId = await ctx.db.insert("flashcards", {
      flashCardSetId: args.flashCardSetId,
      front: args.front,
      back: args.back,
      difficulty: "medium",
      status: "new",
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      tags: args.tags,
      sourceContentId: args.sourceContentId,
    });

    // Update total cards count
    const flashCardSet = await ctx.db.get(args.flashCardSetId);

    if (!flashCardSet) {
      throw new Error("Flashcards must be added to a flashcard set.");
    }
    await ctx.db.patch(args.flashCardSetId, {
      totalCards: (flashCardSet.totalCards || 0) + 1,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId: args.userId,
      message: `New flashcard added "${args.front}"`,
      type: "flashcard_created",
      relatedId: flashCardSet._id,
    });

    // Track activity
    await ctx.scheduler.runAfter(0, internal.activities.store, {
      userId: args.userId,
      type: "flashcard_created",
      flashCardSetId: flashCardSet._id,
    });

    return cardId;
  },
});

export const getFlashCardSetInternal = internalQuery({
  args: {
    flashCardSetId: v.id("flashCardSets"),
  },

  handler: async (ctx, args) => {
    return await ctx.db.get(args.flashCardSetId);
  },
});

export const addFlashCard = mutation({
  args: {
    flashCardSetId: v.id("flashCardSets"),
    front: v.string(),
    back: v.string(),
    tags: v.optional(v.array(v.string())),
    sourceContentId: v.optional(v.union(v.id("lectures"), v.id("notes"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Must be authenticated to use this function.");
    }

    const flashcardSet = await ctx.db.get(args.flashCardSetId);

    if (!flashcardSet) {
      throw new Error("Flashcard set cannot be null.");
    }

    const moduleUser = await ctx.db.get(flashcardSet.moduleId);

    if (!moduleUser) {
      throw new Error("Flashcard set must be associated with a module.");
    }

    const userId = moduleUser.userId;

    if (userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const cardId = await ctx.db.insert("flashcards", {
      flashCardSetId: args.flashCardSetId,
      front: args.front,
      back: args.back,
      difficulty: "medium",
      status: "new",
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      tags: args.tags,
      sourceContentId: args.sourceContentId,
    });

    // Update total cards count
    const flashCardSet = await ctx.db.get(args.flashCardSetId);

    if (!flashCardSet) {
      throw new Error("Flashcards must be added to a flashcard set.");
    }
    await ctx.db.patch(args.flashCardSetId, {
      totalCards: (flashCardSet.totalCards || 0) + 1,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId,
      message: `New flashcard added "${args.front}"`,
      type: "flashcard_created",
      relatedId: flashCardSet._id,
    });

    // Track activity
    await ctx.scheduler.runAfter(0, internal.activities.store, {
      userId,
      type: "flashcard_created",
      flashCardSetId: flashCardSet._id,
    });

    return cardId;
  },
});

export const getFlashCardsInternal = internalQuery({
  args: {
    flashCardSetId: v.id("flashCardSets"),
  },
  handler: async (ctx, args) => {
    const flashcardSet = await ctx.db.get(args.flashCardSetId);

    if (!flashcardSet) {
      throw new Error("Flashcard set cannot be null.");
    }

    return await ctx.db
      .query("flashcards")
      .withIndex("by_flashCardSetId", (q) =>
        q.eq("flashCardSetId", args.flashCardSetId),
      )
      .collect();
  },
});

export const getFlashCards = query({
  args: {
    flashCardSetId: v.id("flashCardSets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated.");
    }

    const flashcardSet = await ctx.db.get(args.flashCardSetId);

    if (!flashcardSet) {
      throw new Error("Flashcard set cannot be null.");
    }

    const moduleUser = await ctx.db.get(flashcardSet.moduleId);

    if (!moduleUser) {
      throw new Error("Flashcard set must be associated with a module.");
    }

    const userId = moduleUser.userId;

    if (userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    return await ctx.db
      .query("flashcards")
      .withIndex("by_flashCardSetId", (q) =>
        q.eq("flashCardSetId", args.flashCardSetId),
      )
      .collect();
  },
});

export const getDueCards = query({
  args: {
    flashCardSetId: v.id("flashCardSets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not auhtenticated.");
    }

    const flashcardSet = await ctx.db.get(args.flashCardSetId);

    if (!flashcardSet) {
      throw new Error("Flashcard set cannot be null.");
    }

    const moduleUser = await ctx.db.get(flashcardSet.moduleId);

    if (!moduleUser) {
      throw new Error("Flashcard set must be associated with a module.");
    }

    const userId = moduleUser.userId;

    if (userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const now = new Date().toISOString();
    return await ctx.db
      .query("flashcards")
      .withIndex("by_nextReviewDate")
      .filter((q) =>
        q.and(
          q.eq(q.field("flashCardSetId"), args.flashCardSetId),
          q.lte(q.field("nextReviewDate"), now),
        ),
      )
      .collect();
  },
});

export const updateCardReview = mutation({
  args: {
    cardId: v.id("flashcards"),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Must be authenticated to use this function.");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card must be present.");
    }

    const flashCardSet = await ctx.db.get(card.flashCardSetId);

    if (!flashCardSet) {
      throw new Error("Flashcards must belong to a flashcard set.");
    }

    const moduleId = flashCardSet.moduleId;

    const module = await ctx.db.get(moduleId);

    if (!module) {
      throw new Error("FLashcard sets must be associated with a module.");
    }

    if (module.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const nextReview = calculateNextReview(card.status, args.difficulty);

    const newStatus = determineNewStatus(
      card.status,
      args.difficulty,
      card.reviewCount || 0,
    );

    await ctx.db.patch(args.cardId, {
      status: newStatus,
      difficulty: args.difficulty,
      nextReviewDate: nextReview.toISOString(),
      lastReviewDate: new Date().toISOString(),
      reviewCount: (card.reviewCount || 0) + 1,
      // Track success based on difficulty
      correctCount: ["easy", "medium"].includes(args.difficulty)
        ? (card.correctCount || 0) + 1
        : card.correctCount,
      incorrectCount:
        args.difficulty === "hard"
          ? (card.incorrectCount || 0) + 1
          : card.incorrectCount,
    });

    // Update mastered cards count if status changed to mastered
    if (newStatus === "mastered" && card.status !== "mastered") {
      const flashCardSet = await ctx.db.get(card.flashCardSetId);
      if (!flashCardSet) {
        throw new Error("Flashcard set must be present.");
      }
      await ctx.db.patch(card.flashCardSetId, {
        masteredCards: (flashCardSet.masteredCards || 0) + 1,
      });
    }
  },
});

function calculateNextReview(currentStatus: string, difficulty: string): Date {
  const now = new Date();
  let intervalDays = 1;

  // Base interval based on status
  switch (currentStatus) {
    case "new":
      intervalDays = 1;
      break;
    case "learning":
      intervalDays = 3;
      break;
    case "review":
      intervalDays = 7;
      break;
    case "mastered":
      intervalDays = 14;
      break;
  }

  // Adjust interval based on difficulty
  switch (difficulty) {
    case "easy":
      intervalDays *= 2.0;
      break;
    case "medium":
      intervalDays *= 1.0;
      break;
    case "hard":
      intervalDays *= 0.5;
      break;
  }

  return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
}

enum FlashCardStatus {
  LEARNING = "learning",
  REVIEW = "review",
  NEW = "new",
  MASTERED = "mastered",
}

function determineNewStatus(
  currentStatus: string,
  difficulty: string,
  reviewCount: number,
): FlashCardStatus {
  // Hard responses always keep card in learning
  if (difficulty === "hard") {
    return FlashCardStatus.LEARNING;
  }

  switch (currentStatus) {
    case FlashCardStatus.NEW:
      return FlashCardStatus.LEARNING;

    case FlashCardStatus.LEARNING:
      // Progress to review after 2 medium/easy reviews
      return reviewCount >= 2 && difficulty !== "hard"
        ? FlashCardStatus.REVIEW
        : FlashCardStatus.LEARNING;

    case FlashCardStatus.REVIEW:
      // Progress to mastered after 5 medium/easy reviews
      return reviewCount >= 5 && difficulty === "easy"
        ? FlashCardStatus.MASTERED
        : FlashCardStatus.REVIEW;

    case FlashCardStatus.MASTERED:
      // Stay mastered unless hard response
      return difficulty === "hard"
        ? FlashCardStatus.REVIEW
        : FlashCardStatus.MASTERED;

    default:
      return FlashCardStatus.LEARNING;
  }
}

export const generateFlashCardsClient = mutation({
  args: {
    moduleId: v.id("modules"),
    title: v.string(),
    description: v.optional(v.string()),
    lectureIds: v.array(v.id("lectures")),
    noteIds: v.array(v.id("notes")),
    flashCardSetId: v.optional(v.id("flashCardSets")),
  },
  handler: async (ctx, args) => {
    const {
      moduleId,
      title,
      description,
      lectureIds,
      noteIds,
      flashCardSetId,
    } = args;

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to use this function.");
    }

    const userId = identity.subject;

    const moduleUser = await ctx.db.get(moduleId);

    if (!moduleUser) {
      throw new Error("Flashcard set must be associated with a module.");
    }

    if (moduleUser.userId !== userId) {
      throw new Error("Forbidden.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", userId))
      .first();

    if (!user) {
      throw new Error("User not found.");
    }
    // Schedule the generation task
    await ctx.scheduler.runAfter(
      0,
      internal.flashCardActions.generateFlashCards,
      {
        flashCardSetId,
        userId,
        lectureIds,
        noteIds,
        title,
        description,
        learningStyle: user.learningStyle,
        course: user.course,
        levelOfStudy: user.levelOfStudy,
        moduleId,
      },
    );
  },
});

export const deleteFlashcardSet = mutation({
  args: { id: v.id("flashCardSets") },
  handler: async (ctx, args) => {
    const flashCardSet = await ctx.db.get(args.id);
    if (!flashCardSet) {
      throw new Error("Flashcard set not found");
    }

    const flashcards = await ctx.db
      .query("flashcards")
      .withIndex("by_flashCardSetId", (q) => q.eq("flashCardSetId", args.id))
      .collect();

    await Promise.all(
      flashcards.map((flashcard) => ctx.db.delete(flashcard._id)),
    );

    await ctx.db.delete(args.id);

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId: flashCardSet.userId,
      message: `Flashcard set "${flashCardSet.title}" has been deleted`,
      type: "flashcard_set_deleted",
      relatedId: args.id,
    });

    // Track activity
    await ctx.scheduler.runAfter(0, internal.activities.store, {
      userId: flashCardSet.userId,
      type: "flashcard_set_deleted",
      flashCardSetId: args.id,
    });

    return { success: true };
  },
});

export const getFlashcardsByModuleId = query({
  args: {
    moduleId: v.id("modules"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to use this function.");
    }

    const module = await ctx.db.get(args.moduleId);
    if (!module || module.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const flashcardSets = await ctx.db
      .query("flashCardSets")
      .withIndex("by_moduleId", (q) => q.eq("moduleId", args.moduleId))
      .collect();

    return flashcardSets;
  },
});

export const getFlashcardContent = internalQuery({
  args: {
    flashCardSetId: v.id("flashCardSets"),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const flashcards = await ctx.runQuery(
      internal.flashcards.getFlashCardsInternal,
      {
        flashCardSetId: args.flashCardSetId,
      },
    );

    const contentChunks = flashcards.map(
      (card) => `Question: ${card.front}\nAnswer: ${card.back}`,
    );

    return contentChunks;
  },
});
