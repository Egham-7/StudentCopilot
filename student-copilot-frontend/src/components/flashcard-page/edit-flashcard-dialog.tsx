import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "convex/_generated/dataModel";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";
import { Pencil, RefreshCw } from "lucide-react";

const formSchema = z.object({
  front: z.string().min(1, "Front content is required"),
  back: z.string().min(1, "Back content is required"),
  tags: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL").optional(),
});

type FormValues = z.infer<typeof formSchema>;

function EditFlashcardForm({
  card,
  onSuccess,
}: {
  card: Doc<"flashcards">;
  onSuccess: () => void;
}) {
  const updateFlashCard = useMutation(api.flashcards.updateFlashCard);
  const regenerateImage = useAction(
    api.flashCardActions.generateFlashcardImage,
  );
  const [isRegenerating, setIsRegenerating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      front: card.front,
      back: card.back,
      tags: card.tags?.join(", "),
      imageUrl: card.image || "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await updateFlashCard({
        cardId: card._id,
        front: values.front,
        back: values.back,
        tags: values.tags
          ? values.tags.split(",").map((tag) => tag.trim())
          : undefined,
        image: values.imageUrl || undefined,
      });

      toast({
        title: "Success",
        description: "Flashcard updated successfully",
      });

      onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  async function handleRegenerateImage() {
    try {
      setIsRegenerating(true);
      const newImageUrl = await regenerateImage({
        cardId: card._id,
        front: form.getValues("front"),
      });

      form.setValue("imageUrl", newImageUrl);

      toast({
        title: "Image Regenerated",
        description: "A new AI-generated image has been created",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to regenerate image. Please try again later.",
      });
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="front"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Front</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the front content"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="back"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Back</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the back content"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags (comma separated)</FormLabel>
              <FormControl>
                <Input placeholder="tag1, tag2, tag3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Image URL
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleRegenerateImage}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Paste image URL or regenerate"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />

              {field.value && (
                <div className="mt-2 flex justify-center">
                  <img
                    src={field.value}
                    alt="Flashcard Image"
                    className="rounded-lg object-cover"
                  />
                </div>
              )}
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Update Flashcard
        </Button>
      </form>
    </Form>
  );
}

export function EditFlashcardDialog({ card }: { card: Doc<"flashcards"> }) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-accent"
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Flashcard</DialogTitle>
          </DialogHeader>
          <EditFlashcardForm card={card} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Flashcard</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <EditFlashcardForm card={card} onSuccess={() => setOpen(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
