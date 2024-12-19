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
import { QuickAddFlashCardSet } from "./quick-add-flashcards";

interface NotesQuickActionsProps {
  moduleId: Id<"modules">;
  selectedNotes: Id<"notes">[];
  onActionComplete: () => void;
}

export function NotesQuickActions({
  moduleId,
  selectedNotes,
  onActionComplete,
}: NotesQuickActionsProps) {
  const generateNotes = useMutation(api.notes.storeClient);

  const handleGenerateNotes = async () => {
    try {
      await generateNotes({
        noteIds: selectedNotes,
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
          <Button variant="outline">Note Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleGenerateNotes}>
            <FileText className="w-4 h-4 mr-2" />
            Generate Notes
          </DropdownMenuItem>
          <QuickAddFlashCardSet moduleId={moduleId} noteIds={selectedNotes} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
