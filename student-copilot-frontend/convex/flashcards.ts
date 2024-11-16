
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const createFlashCardSet = mutation({
  args: {
    moduleId: v.id("modules"),
    title: v.string(),
    description: v.optional(v.string()),
    contentIds: v.array(
      v.union(
        v.id("lectures"),
        v.id("notes")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Must be authenticated to use this function.")
    }

    const userId = identity.subject;

    return await ctx.db.insert("flashCardSets", {
      moduleId: args.moduleId,
      userId,
      title: args.title,
      description: args.description,
      contentIds: args.contentIds,
      totalCards: 0,
      masteredCards: 0,
    });
  },
});

export const addFlashCard = mutation({
  args: {
    flashCardSetId: v.id("flashCardSets"),
    front: v.string(),
    back: v.string(),
    tags: v.optional(v.array(v.string())),
    sourceContentId: v.optional(
      v.union(
        v.id("lectures"),
        v.id("notes")
      )
    ),
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

    return cardId;
  },
});

export const getFlashCardSets = query({
  args: {
    moduleId: v.optional(v.id("modules")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Must be authenticated to use this function.");
    }
    const userId = identity.subject;

    const moduleId = args.moduleId;

    if (moduleId) {
      return await ctx.db
        .query("flashCardSets")
        .withIndex("by_moduleId", (q) => q.eq("moduleId", moduleId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
    }

    return await ctx.db
      .query("flashCardSets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getFlashCards = query({
  args: {
    flashCardSetId: v.id("flashCardSets"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("flashcards")
      .withIndex("by_flashCardSetId", (q) =>
        q.eq("flashCardSetId", args.flashCardSetId)
      )
      .collect();
  },
});

export const getDueCards = query({
  args: {
    flashCardSetId: v.id("flashCardSets"),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return await ctx.db
      .query("flashcards")
      .withIndex("by_nextReviewDate")
      .filter((q) =>
        q.and(
          q.eq(q.field("flashCardSetId"), args.flashCardSetId),
          q.lte(q.field("nextReviewDate"), now)
        )
      )
      .collect();
  },
});

export const updateCardReview = mutation({
  args: {
    cardId: v.id("flashcards"),
    isCorrect: v.boolean(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard")
    ),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);

    if (!card) {
      throw new Error("Card must be present.");
    }

    // Calculate next review date based on spaced repetition algorithm
    const nextReview = calculateNextReview(
      card.status,
      args.isCorrect,
      args.difficulty
    );

    const newStatus = determineNewStatus(
      card.status,
      args.isCorrect,
      card.correctCount
    );

    await ctx.db.patch(args.cardId, {
      status: newStatus,
      difficulty: args.difficulty,
      nextReviewDate: nextReview.toISOString(),
      lastReviewDate: new Date().toISOString(),
      reviewCount: (card.reviewCount || 0) + 1,
      correctCount: args.isCorrect ? (card.correctCount || 0) + 1 : card.correctCount,
      incorrectCount: !args.isCorrect ? (card.incorrectCount || 0) + 1 : card.incorrectCount,
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


function calculateNextReview(
  currentStatus: string,
  isCorrect: boolean,
  difficulty: string
): Date {
  const now = new Date();
  let intervalDays = 1;

  if (isCorrect) {
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
    if (difficulty === "easy") intervalDays *= 1.5;
    if (difficulty === "hard") intervalDays *= 0.5;
  } else {
    // If incorrect, review again in 1 day
    intervalDays = 1;
  }

  return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
}


enum FlashCardStatus {
  LEARNING = "learning",
  REVIEW = "review",
  NEW = "new",
  MASTERED = "mastered"
}

function determineNewStatus(
  currentStatus: string,
  isCorrect: boolean,
  correctCount: number
): FlashCardStatus | undefined {
  if (!isCorrect) return FlashCardStatus.LEARNING;

  switch (currentStatus) {
    case FlashCardStatus.NEW:
      return FlashCardStatus.LEARNING;
    case FlashCardStatus.LEARNING:
      return correctCount >= 2 ? FlashCardStatus.REVIEW : FlashCardStatus.LEARNING;
    case FlashCardStatus.REVIEW:
      return correctCount >= 5 ? FlashCardStatus.MASTERED : FlashCardStatus.REVIEW;
    case FlashCardStatus.MASTERED:
      return FlashCardStatus.MASTERED;
  }
}


export const generateFlashCardsClient = mutation({
  args: {
    moduleId: v.id("modules"),
    title: v.string(),
    description: v.optional(v.string()),
    lectureIds: v.optional(v.array(v.id("lectures"))),
    noteIds: v.optional(v.array(v.id("notes"))),

  },
  handler: async (ctx, args) => {

    const { moduleId, title, description, lectureIds, noteIds } = args;


    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to use this function.");
    }

    const user = await ctx.db.query("users").withIndex("by_clerkId").first();
    if (!user) {
      throw new Error("User not found.");
    }

    const userId = identity.subject;


    const contentIds = [...(lectureIds ?? []), ...(noteIds ?? [])];



    // Create the flashcard set first
    const flashCardSetId = await ctx.db.insert("flashCardSets", {
      moduleId: moduleId,
      userId: identity.subject,
      title: title,
      description: description,
      contentIds: contentIds,
      totalCards: 0,
      masteredCards: 0,
    });

    // Schedule the generation task
    await ctx.scheduler.runAfter(0, internal.flashCardActions.generateFlashCards, {
      flashCardSetId,
      userId,
      lectureIds,
      noteIds,
      learningStyle: user.learningStyle,
      course: user.course,
      levelOfStudy: user.levelOfStudy,
    });

    return flashCardSetId;
  },
});

