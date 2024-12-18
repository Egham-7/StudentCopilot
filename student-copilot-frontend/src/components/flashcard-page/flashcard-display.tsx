import { motion } from "framer-motion";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Doc } from "convex/_generated/dataModel";

import DeleteFlashcardDialog from "./flashcard-delete-dialog";
import { EditFlashcardDialog } from "./edit-flashcard-dialog";

interface FlashcardDisplayProps {
  card: Doc<"flashcards">;
  isFlipped: boolean;
  onFlip: () => void;
}

export function FlashcardDisplay({
  card,
  isFlipped,
  onFlip,
}: FlashcardDisplayProps) {
  return (
    <motion.div
      className="perspective-1000 w-full max-w-2xl aspect-video relative"
      onClick={onFlip}
    >
      {/* Front of card */}
      <motion.div
        className={cn(
          "w-full h-full absolute backface-hidden cursor-pointer",
          "bg-card text-card-foreground rounded-lg shadow-lg",
          "flex flex-col items-center justify-center p-8 relative",
        )}
        initial={false}
        animate={{
          rotateY: isFlipped ? "180deg" : "0deg",
          transition: { duration: 0.6 },
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Action buttons */}
        <div
          className="absolute top-4 right-4 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <EditFlashcardDialog card={card} />

          <DeleteFlashcardDialog flashCardId={card._id} />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold mb-4">{card.front}</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {card.tags?.map((tag: string, index: number) => (
              <Badge key={index} variant="secondary">
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Back of card */}
      <motion.div
        className={cn(
          "w-full h-full absolute backface-hidden cursor-pointer",
          "bg-card text-card-foreground rounded-lg shadow-lg",
          "flex flex-col items-center justify-center p-8",
        )}
        initial={{ rotateY: "180deg" }}
        animate={{
          rotateY: isFlipped ? "360deg" : "180deg",
          transition: { duration: 0.6 },
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold">{card.back}</h2>
        </div>
      </motion.div>
    </motion.div>
  );
}
