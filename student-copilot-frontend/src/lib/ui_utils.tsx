import { CardContent, Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Id } from "convex/_generated/dataModel";

export const renderTriggerCard = (title: string, description: string) => (
  <Card className="cursor-pointer hover:bg-accent transition-colors duration-200 flex items-center justify-center h-full" >
    <CardContent className="flex flex-col items-center justify-center p-6 text-center" >
      <Plus className="w-12 h-12 mb-2 text-muted-foreground" />
      <h3 className="text-lg font-semibold text-foreground" > {title} </h3>
      < p className="text-sm text-muted-foreground mt-1" > {description} </p>
    </CardContent>
  </Card>
);

export type SearchResults = {
  lectures: Id<"lectures">[];
  notes: Id<"notes">[];
}

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
  fileType: "audio" | "video" | "pdf";
}

