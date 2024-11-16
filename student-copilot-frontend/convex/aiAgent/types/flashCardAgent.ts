
import { z } from "zod";

export const flashCardSetSchema = z.object({
  moduleId: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  contentIds: z.array(z.string()),
  lastStudied: z.string().optional(),
  totalCards: z.number().min(0),
  masteredCards: z.number().min(0)
});

export const flashcardSchema = z.object({
  flashCardSetId: z.string(),
  front: z.string(),
  back: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  status: z.enum(["new", "learning", "review", "mastered"]),
  nextReviewDate: z.string().optional(),
  lastReviewDate: z.string().optional(),
  reviewCount: z.number().min(0),
  correctCount: z.number().min(0),
  incorrectCount: z.number().min(0),
  tags: z.array(z.string()).optional(),
  sourceContentId: z.string().optional()
});

