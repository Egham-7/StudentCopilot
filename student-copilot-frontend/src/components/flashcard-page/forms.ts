import { z } from "zod";

export const manualFormSchema = z.object({
  front: z.string().min(2, "Front content is required"),
  back: z.string().min(2, "Back content is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.string().optional(),
})

export const aiFormSchema = z.object({
  lectureIds: z.array(z.string()).min(1).max(5).optional(),
  noteIds: z.array(z.string()).min(1).max(5).optional()
}).refine(
  (data) => {
    const hasLectures = Array.isArray(data.lectureIds) && data.lectureIds.length > 0;
    const hasNotes = Array.isArray(data.noteIds) && data.noteIds.length > 0;
    return hasLectures || hasNotes;
  },
  {
    message: "At least one lecture or note must be selected",
    path: ["lectureIds", "noteIds"]
  }
)
