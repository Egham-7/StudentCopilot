import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "@/components/ui/use-toast";
import { Doc } from "convex/_generated/dataModel";

interface FlashcardReviewButtonsProps {
  currentCard: Doc<"flashcards">;
  onReview: () => void;
}

export function FlashcardReviewButtons({
  currentCard,
  onReview,
}: FlashcardReviewButtonsProps) {
  const updateCardReview = useMutation(api.flashcards.updateCardReview);

  const handleReview = async (difficulty: "easy" | "medium" | "hard") => {
    try {
      await updateCardReview({
        cardId: currentCard._id,
        difficulty,
      });
      onReview();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Review Failed",
          description: error.message,
        });
      }
    }
  };

  return (
    <div className="flex space-x-2">
      <Button
        onClick={() => handleReview("easy")}
        variant="outline"
        className="bg-primary/10 hover:bg-primary/20 text-primary-foreground"
      >
        Easy (1)
      </Button>
      <Button
        onClick={() => handleReview("medium")}
        variant="outline"
        className="bg-secondary hover:bg-secondary/80"
      >
        Medium (2)
      </Button>
      <Button
        onClick={() => handleReview("hard")}
        variant="outline"
        className="bg-destructive/10 hover:bg-destructive/20 text-destructive-foreground"
      >
        Hard (3)
      </Button>
    </div>
  );
}
