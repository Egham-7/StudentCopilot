import { Id } from "convex/_generated/dataModel";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { forwardRef } from "react";
import { AIFlashcardForm } from "@/components/flashcard-page/ai-flashcard-form";

interface CreateFlashCardsFormProps {
  moduleId: Id<"modules">;
}

const TriggerButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => (
  <Button variant='ghost' ref={ref} {...props}>
    <Plus className="h-4 w-4 mr-2" />
    Create Flashcard Set
  </Button>
));

TriggerButton.displayName = 'TriggerButton';

const DesktopDialog = ({ moduleId }: CreateFlashCardsFormProps) => {
  const [open, setOpen] = useState(false);

  const handleFormComplete = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerButton />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogTitle>Create Flashcards</DialogTitle>
        <AIFlashcardForm moduleId={moduleId} onComplete={handleFormComplete} />
      </DialogContent>
    </Dialog>
  );
};

const MobileDrawer = ({ moduleId }: CreateFlashCardsFormProps) => {
  const [open, setOpen] = useState(false);

  const handleFormComplete = () => {
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <TriggerButton />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerTitle>Create Flashcards</DrawerTitle>
        <AIFlashcardForm moduleId={moduleId} onComplete={handleFormComplete} />
      </DrawerContent>
    </Drawer>
  );
};

export default function CreateFlashCardsForm({ moduleId }: CreateFlashCardsFormProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  return isDesktop ? <DesktopDialog moduleId={moduleId} /> : <MobileDrawer moduleId={moduleId} />;
}

