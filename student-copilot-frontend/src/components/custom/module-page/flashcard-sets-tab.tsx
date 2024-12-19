import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Doc, Id } from "convex/_generated/dataModel";
import { Progress } from "@/components/ui/progress";
import { Calendar, Brain } from "lucide-react";
import StudyFlashcardsButton from "./study-flashcards-button";
import DeleteFlashcardSetDialog from "./delete-flashcards-set";
import CreateFlashCardsForm from "./create-flashcards-form";
import { SelectionCheckbox } from "@/components/ui/selection-checkbox";

type FlashcardSetsTabProps = {
  moduleId: Id<"modules">;
  flashcardSets: Doc<"flashCardSets">[] | undefined;
  selectedFlashcards: Id<"flashCardSets">[];
  handleSelectFlashcards: (id: Id<"flashCardSets">) => void;
};

export default function FlashcardSetsTab({
  moduleId,
  flashcardSets,
  selectedFlashcards,
  handleSelectFlashcards,
}: FlashcardSetsTabProps) {
  const visibleSets = flashcardSets?.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleSets?.map((set) => {
          const masteryPercentage = (set.masteredCards / set.totalCards) * 100;
          const daysAgo = set.lastStudied
            ? Math.floor(
                (new Date().getTime() - new Date(set.lastStudied).getTime()) /
                  (1000 * 3600 * 24),
              )
            : null;

          return (
            <Card
              key={set._id}
              className={`relative ${selectedFlashcards.includes(set._id) ? "border-primary border-2" : ""}`}
            >
              <SelectionCheckbox
                itemId={set._id}
                selectedItems={selectedFlashcards}
                onSelect={handleSelectFlashcards}
              />
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold">
                    {set.title}
                  </CardTitle>
                  <DeleteFlashcardSetDialog setId={set._id} />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {set.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Mastery Progress</span>
                    <span>{Math.round(masteryPercentage)}%</span>
                  </div>
                  <Progress value={masteryPercentage} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-sm">{set.totalCards} cards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      {daysAgo === null
                        ? "Never studied"
                        : daysAgo === 0
                          ? "Studied today"
                          : `${daysAgo}d ago`}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <StudyFlashcardsButton setId={set._id} moduleId={moduleId} />
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card className="flex flex-col items-center justify-center p-6 border-dashed hover:border-primary transition-colors duration-300">
          <CreateFlashCardsForm moduleId={moduleId} />
        </Card>
      </div>
    </div>
  );
}
