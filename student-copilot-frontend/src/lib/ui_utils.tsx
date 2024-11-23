import { CardContent, Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Id } from "convex/_generated/dataModel";
import { z } from "zod";

const ACCEPTED_FILE_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/mp4", // For m4a files
  "audio/x-m4a", // Alternative MIME type for m4a
  "application/pdf",
  "video/mp4",
  "video/quicktime",
];

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB in bytes

export const renderTriggerCard = (title: string, description: string) => (
  <Card className="cursor-pointer hover:bg-accent transition-colors duration-200 flex items-center justify-center h-full">
    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
      <Plus className="w-12 h-12 mb-2 text-muted-foreground" />
      <h3 className="text-lg font-semibold text-foreground"> {title} </h3>
      <p className="text-sm text-muted-foreground mt-1"> {description} </p>
    </CardContent>
  </Card>
);

export type SearchResults = {
  lectures: Id<"lectures">[];
  notes: Id<"notes">[];
};

export type LecturesData = {
  contentUrl: string | null;
  _id: Id<"lectures">;
  _creationTime: number;
  description?: string;
  title: string;
  userId: string;
  moduleId: Id<"modules">;
  completed: boolean;
  lectureTranscription: Id<"_storage">[];
  lectureTranscriptionEmbedding: number[];
  fileType: "audio" | "video" | "pdf" | "website";
  image: string | undefined | null;
};

export const isYoutubeUrl = (url: string) => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
};

// Base schema for all lecture types
const baseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  moduleId: z.string(),
});

// File upload schema
const fileSchema = baseSchema.extend({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 200MB.`)
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      "Only audio, video, and PDF files are accepted.",
    ),
});

// Website link schema

export const createWebsiteSchema = () =>
  baseSchema.extend({
    link: z.string().url("Invalid URL"),
  });

export const createFormSchema = () =>
  z.discriminatedUnion("type", [
    fileSchema.extend({ type: z.literal("file") }),
    createWebsiteSchema().extend({ type: z.literal("website") }),
  ]);
