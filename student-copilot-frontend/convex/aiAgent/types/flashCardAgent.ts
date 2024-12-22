import { z } from "zod";

export const flashCardSetSchema = z.object({
  moduleId: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  contentIds: z.array(z.string()),
  lastStudied: z.string().optional(),
  totalCards: z.number().min(0),
  masteredCards: z.number().min(0),
});

export const flashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  status: z.enum(["new", "learning", "review", "mastered"]),
  tags: z.array(z.string()).optional(),
  image: z.string().optional(),
});

export const flashcardArraySchema = z.object({
  flashCards: z.array(flashcardSchema),
});

export type FlashCard = z.infer<typeof flashcardSchema>;
export type FlashCardArray = z.infer<typeof flashcardArraySchema>;

export const imageDecisionSchema = z.object({
  needsImage: z.boolean(),
  imageQuery: z.string().optional(),
});
