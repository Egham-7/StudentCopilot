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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Flashcard
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Flashcard</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="ai">AI Generated</TabsTrigger>
          </TabsList>
          <TabsContent value="manual">
            <ManualFlashcardForm flashCardSetId={flashCardSetId} />
          </TabsContent>
          <TabsContent value="ai">
            <AIFlashcardForm
              moduleId={moduleId}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

