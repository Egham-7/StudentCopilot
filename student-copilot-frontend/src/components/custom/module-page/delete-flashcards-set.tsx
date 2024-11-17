import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

type DeleteFlashcardSetDialogProps = {
  setId: Id<"flashCardSets">;
};

export default function DeleteFlashcardSetDialog({ setId }: DeleteFlashcardSetDialogProps) {
  const deleteFlashcardSet = useMutation(api.flashcards.deleteFlashcardSet);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteFlashcardSet({ id: setId });
      toast({
        title: "Success",
        description: "Flashcard set deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete flashcard set",
        variant: "destructive",
      });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Flashcard Set</DialogTitle>
          <DialogDescription>
            This will permanently delete this flashcard set and all its cards.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

