import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FlashcardNavigationProps {
  currentCard: number;
  totalCards: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function FlashcardNavigation({
  currentCard,
  totalCards,
  onPrevious,
  onNext,
}: FlashcardNavigationProps) {
  return (
    <div className="flex items-center space-x-4">
      <Button
        onClick={onPrevious}
        size="icon"
        variant="outline"
        className="border-border hover:bg-accent"
        aria-label="Previous card"
        disabled={currentCard === 0}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        Card {currentCard + 1} of {totalCards}
      </span>
      <Button
        onClick={onNext}
        size="icon"
        variant="outline"
        className="border-border hover:bg-accent"
        aria-label="Next card"
        disabled={currentCard === totalCards - 1}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
