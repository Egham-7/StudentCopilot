import { z } from "zod";

export const quizeSetSchema = z.object({
  moduleId: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  contentIds: z.array(z.string()),
  lastStudied: z.string().optional(),
  totalQuizes: z.number().min(0),
  masteredQuizes: z.number().min(0),
});


export const shortAnswerSchema = z.object({
  question: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});


// Define the schema for a multiple-choice question
export const multipleChoiceQSchema = z.object({
  question: z.string(), // The text of the question
  difficulty: z.enum(["easy", "medium", "hard"]), // The difficulty level of the question
  options: z.array( // Array of answer options
    z.object({
      text: z.string(), // The text of the option
      isCorrect: z.boolean(), // Whether this option is the correct answer
    })
  ),
});


//True/False
export const trueFalseSchema = z.object({
  question: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  statement: z.string(),
  correctAnswer: z.boolean(),
  explanation: z.string()
});


export const quizeTypeSchema = z.object({
  types : z.enum(["Multiple Choice", "Short Answer", "True or False", "Short Essay"]),
  plan: z.string()
})


// Combine both schemas using z.union
export const combinedQuestionSchema = z.union([shortAnswerSchema, multipleChoiceQSchema]);



export const quizeArraySchema = z.object({
  quizes: z.array(shortAnswerSchema),
});

export type ShortAnswerQuiz = z.infer<typeof shortAnswerSchema>;
export type MultiChoiceQuiz = z.infer<typeof multipleChoiceQSchema>;
export type TrueFalseQuize = z.infer<typeof trueFalseSchema>;

export type Quiz = z.infer<typeof combinedQuestionSchema>;
export type QuizType = z.infer<typeof quizeTypeSchema>


