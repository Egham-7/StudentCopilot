import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Id } from "convex/_generated/dataModel";

type StudyFlashcardsButtonProps = {
  setId: Id<"flashCardSets">;
  moduleId: Id<"modules">;
};

export default function StudyFlashcardsButton({ moduleId, setId }: StudyFlashcardsButtonProps) {

  const navigate = useNavigate();

  return (
    <Button
      className="flex-1 gap-2"
      onClick={() => navigate(`/dashboard/flashcards/${moduleId}/${setId}`)}
    >
      <PlayCircle className="w-4 h-4" />
      Study Now
    </Button>
  );
}

