import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText } from "lucide-react";
import { PiStackFill } from "react-icons/pi";
import { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "@/components/ui/use-toast";

interface LectureQuickActionsProps {
  moduleId: Id<"modules">;
  selectedLectures: Id<"lectures">[];
  onActionComplete: () => void;
}

export function LectureQuickActions({
  moduleId,
  selectedLectures,
  onActionComplete,
}: LectureQuickActionsProps) {
  const generateNotes = useMutation(api.notes.storeClient);

  const handleGenerateNotes = async () => {
    try {
      await generateNotes({
        lectureIds: selectedLectures,
        moduleId,
      });

      toast({
        title: "Notes generation started",
        description: "We will notify you when your notes are ready.",
      });

      onActionComplete();
    } catch (error) {
      toast({
        title: "Failed to generate notes",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Lecture Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleGenerateNotes}>
            <FileText className="w-4 h-4 mr-2" />
            Generate Notes
          </DropdownMenuItem>
          <DropdownMenuItem>
            <PiStackFill className="w-4 h-4 mr-2" />
            Generate Flashcards
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
