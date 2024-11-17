import { Id } from "convex/_generated/dataModel";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { forwardRef } from "react";
import { AIFlashcardForm } from "@/components/flashcard-page/ai-flashcard-form";
import { DialogTitle } from "@radix-ui/react-dialog";


const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(4).optional()
});

interface CreateFlashCardSetFormProps {
  onNext: (flashCardSetId: Id<"flashCardSets">) => void;
  moduleId: Id<"modules">;
}

function CreateFlashCardSetForm({ onNext, moduleId }: CreateFlashCardSetFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  const createFlashCardSet = useMutation(api.flashcards.createFlashCardSet);

  async function onSubmit(values: z.infer<typeof formSchema>) {

    const { title, description } = values;
    // Create flashcard set and get the ID
    const flashCardSetId = await createFlashCardSet({
      moduleId,
      title,
      description,
    });
    onNext(flashCardSetId);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Flashcard Set Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter flashcard set title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
          <Button type="submit">Next</Button>
        </div>
      </form>
    </Form>
  );
}

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

const FormContent = ({ moduleId, setOpen }: { moduleId: Id<"modules">, setOpen: (open: boolean) => void }) => {
  const [step, setStep] = useState<number>(1);
  const [flashCardSetId, setFlashCardSetId] = useState<Id<"flashCardSets"> | null>(null);

  const handleNext = (id: Id<"flashCardSets">) => {
    setFlashCardSetId(id);
    setStep(2);
  };

  return (
    <div className="space-y-6 p-4">
      {step === 1 && <CreateFlashCardSetForm onNext={handleNext} moduleId={moduleId} />}
      {step === 2 && flashCardSetId && (
        <AIFlashcardForm moduleId={moduleId} flashCardSetId={flashCardSetId} setOpen={setOpen} />
      )}
    </div>
  );
};

const DesktopDialog = ({ moduleId }: CreateFlashCardsFormProps) => {
  const [open, setOpen] = useState(false);

  return (

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerButton />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">

        <DialogTitle>
          Create Flashcards
        </DialogTitle>
        <FormContent moduleId={moduleId} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
};

const MobileDrawer = ({ moduleId }: CreateFlashCardsFormProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <TriggerButton />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerTitle>
          Create Flashcards
        </DrawerTitle>
        <FormContent moduleId={moduleId} setOpen={setOpen} />
      </DrawerContent>
    </Drawer>
  );
};

export default function CreateFlashCardsForm({ moduleId }: CreateFlashCardsFormProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  return isDesktop ? <DesktopDialog moduleId={moduleId} /> : <MobileDrawer moduleId={moduleId} />;
}

