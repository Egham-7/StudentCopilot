import { z } from "zod";

export const manualFormSchema = z.object({
  front: z.string().min(2, "Front content is required"),
  back: z.string().min(2, "Back content is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.string().optional(),
})

export const aiFormSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  lectureIds: z.array(z.string()).optional(),
  noteIds: z.array(z.string()).optional(),
})
