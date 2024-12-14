import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText } from "lucide-react";
import { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "@/components/ui/use-toast";

interface FlashcardQuickActionsProps {
  moduleId: Id<"modules">;
  selectedFlashcards: Id<"flashCardSets">[];
  onActionComplete: () => void;
}

export function FlashcardQuickActions({
  moduleId,
  selectedFlashcards,
  onActionComplete,
}: FlashcardQuickActionsProps) {
  const generateNotes = useMutation(api.notes.storeClient);

  const handleGenerateNotes = async () => {
    try {
      await generateNotes({
        flashCardSetIds: selectedFlashcards,
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
          error instanceof Error ? error.message : "An unkown error occured",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Flashcard Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleGenerateNotes}>
            <FileText className="w-4 h-4 mr-2" />
            Generate Notes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
