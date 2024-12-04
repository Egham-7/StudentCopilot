import { z } from "zod";

export const manualFormSchema = z
  .object({
    front: z
      .string()
      .min(2, "Front content must be at least 2 characters")
      .max(500, "Front content cannot exceed 500 characters")
      .trim(),
    back: z
      .string()
      .min(2, "Back content must be at least 2 characters")
      .max(1000, "Back content cannot exceed 1000 characters")
      .trim(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    tags: z
      .string()
      .transform((str) => str.trim())
      .refine(
        (str) => !str || str.split(",").every((tag) => tag.trim().length > 0),
        {
          message: "Each tag must not be empty",
        },
      )
      .optional(),
  })
  .transform((data) => ({
    ...data,
    tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [],
  }));

export const aiFormSchema = z
  .object({
    lectureIds: z.array(z.string()).default([]),
    noteIds: z.array(z.string()).default([]),
  })
  .refine(
    (data) => {
      const hasLectures = data.lectureIds.length > 0;
      const hasNotes = data.noteIds.length > 0;
      return hasLectures || hasNotes;
    },
    {
      message: "At least one lecture or note must be selected",
      path: ["lectureIds"],
    },
  );

export const flashCardGenerateFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  lectureIds: z.array(z.string()),
  noteIds: z.array(z.string()),
});
