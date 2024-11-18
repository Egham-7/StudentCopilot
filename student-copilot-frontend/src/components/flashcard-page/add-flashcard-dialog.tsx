import { Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Id } from 'convex/_generated/dataModel';
import { AIFlashcardForm } from './ai-flashcard-form';
import { ManualFlashcardForm } from './manual-flashcard-form';

interface AddFlashcardDialogProps {
  flashCardSetId: Id<"flashCardSets">
  moduleId: Id<"modules">
}

export function AddFlashcardDialog({ moduleId, flashCardSetId }: AddFlashcardDialogProps) {
  return (
    <Dialog>
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
          <TabsList className="grid w-full grid-cols-2" aria-label="Flashcard creation methods">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="ai">AI Generated</TabsTrigger>
          </TabsList>
          <TabsContent value="manual" role="tabpanel" aria-label="Manual flashcard creation form">
            <ManualFlashcardForm flashCardSetId={flashCardSetId} />
          </TabsContent>
          <TabsContent value="ai" role="tabpanel" aria-label="AI-generated flashcard creation form">
            <AIFlashcardForm
              moduleId={moduleId}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

