import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { Id } from "convex/_generated/dataModel";
import { AddFlashcardDialog } from "@/components/flashcard-page/add-flashcard-dialog";
import { FlashcardFilter } from "@/components/flashcard-page/flashcard-filter";
import { FlashcardDisplay } from "@/components/flashcard-page/flashcard-display";
import { FlashcardNavigation } from "@/components/flashcard-page/flashcard-navigation";
import { FlashcardReviewButtons } from "@/components/flashcard-page/flashcard-review-buttons";

export default function FlashcardPage() {
  const { moduleId, flashCardSetId } = useParams<{
    flashCardSetId: Id<"flashCardSets">;
    moduleId: Id<"modules">;
  }>();

  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "new" | "learning" | "review" | "mastered"
  >("all");

  const cards = useQuery(
    api.flashcards.getFlashCards,
    flashCardSetId ? { flashCardSetId } : "skip",
  );

  const filteredCards =
    cards?.filter((card) =>
      filter === "all" ? true : card.status === filter,
    ) || [];

  useEffect(() => {
    setCurrentCard(0);
    setIsFlipped(false);
  }, [filter]);

  if (!cards) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4">
      <main className="flex-grow flex flex-col items-center justify-center space-y-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">
          Advanced AI Flashcards
        </h1>

        <FlashcardFilter filter={filter} onFilterChange={setFilter} />

        {filteredCards.length > 0 ? (
          <>
            <FlashcardDisplay
              card={filteredCards[currentCard]}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
            />

            <FlashcardNavigation
              currentCard={currentCard}
              totalCards={filteredCards.length}
              onPrevious={() => setCurrentCard((prev) => Math.max(prev - 1, 0))}
              onNext={() =>
                setCurrentCard((prev) =>
                  Math.min(prev + 1, filteredCards.length - 1),
                )
              }
            />

            <FlashcardReviewButtons
              currentCard={filteredCards[currentCard]}
              onReview={() => {
                setIsFlipped(false);
                setCurrentCard((prev) =>
                  Math.min(prev + 1, filteredCards.length - 1),
                );
              }}
            />
          </>
        ) : (
          <div className="text-center text-muted-foreground">
            No cards match the selected filter
          </div>
        )}

        {moduleId && flashCardSetId && (
          <AddFlashcardDialog
            flashCardSetId={flashCardSetId}
            moduleId={moduleId}
          />
        )}
      </main>
    </div>
  );
}
