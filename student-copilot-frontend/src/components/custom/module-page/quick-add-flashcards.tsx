import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useMediaQuery } from "@/hooks/use-media-query";
import { PiStackFill } from "react-icons/pi";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";

interface QuickAddFlashCardSetProps {
  moduleId: Id<"modules">;
  lectureIds?: Id<"lectures">[];
  noteIds?: Id<"notes">[];
}

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Flashcard set name must be at least 2 characters.",
  }),
  description: z.string().optional(),
});

function FlashcardQuickAddForm({
  onSubmit,
}: {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Flashcard Set Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter set title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Generate
        </Button>
      </form>
    </Form>
  );
}

export function QuickAddFlashCardSet({
  moduleId,
  lectureIds = [],
  noteIds = [],
}: QuickAddFlashCardSetProps) {
  const [open, setOpen] = useState(false);
  const generateFlashCards = useMutation(
    api.flashcards.generateFlashCardsClient,
  );
  const isDesktop = useMediaQuery("(min-width: 768px)");

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    try {
      await generateFlashCards({
        moduleId,
        title: values.title,
        description: values.description,
        lectureIds,
        noteIds,
      });
      toast({
        title: "Success!",
        description: "Your flashcard set has been generated successfully.",
        variant: "default",
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    }
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <DropdownMenuItem
            className="flex items-center"
            onSelect={(e) => e.preventDefault()}
          >
            <PiStackFill className="w-4 h-4 mr-2" />
            Generate Flashcards
          </DropdownMenuItem>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Generate Flashcards</DialogTitle>
          </DialogHeader>
          <FlashcardQuickAddForm onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <DropdownMenuItem>
          <PiStackFill className="w-4 h-4 mr-2" />
          Generate Flashcards
        </DropdownMenuItem>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Generate Flashcards</DrawerTitle>
          </DrawerHeader>
          <FlashcardQuickAddForm onSubmit={handleSubmit} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
