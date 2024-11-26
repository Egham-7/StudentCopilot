import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Id } from "convex/_generated/dataModel";
import { ManualFlashcardForm } from "./manual-flashcard-form";
import { GenerateFlashCardsForm } from "./generate-flashcards-form";
import { useState } from "react";

interface AddFlashcardDialogProps {
  flashCardSetId: Id<"flashCardSets">;
  moduleId: Id<"modules">;
}

export function AddFlashcardDialog({
  moduleId,
  flashCardSetId,
}: AddFlashcardDialogProps) {
  const [open, setOpen] = useState(false);

  const onComplete = () => {
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button aria-label="Open flashcard creation dialog">
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Add Flashcard
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="dialog-description">
        <DialogHeader>
          <DialogTitle>Add New Flashcard</DialogTitle>
        </DialogHeader>
        <div id="dialog-description" className="sr-only">
          Create a new flashcard either manually or using AI generation
        </div>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList
            className="grid w-full grid-cols-2"
            aria-label="Flashcard creation methods"
          >
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="ai">AI Generated</TabsTrigger>
          </TabsList>
          <TabsContent
            value="manual"
            role="tabpanel"
            aria-label="Manual flashcard creation form"
          >
            <ManualFlashcardForm
              flashCardSetId={flashCardSetId}
              onComplete={onComplete}
            />
          </TabsContent>
          <TabsContent
            value="ai"
            role="tabpanel"
            aria-label="AI-generated flashcard creation form"
          >
            <GenerateFlashCardsForm
              moduleId={moduleId}
              flashCardSetId={flashCardSetId}
              onComplete={onComplete}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
