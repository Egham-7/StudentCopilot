import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { manualFormSchema } from "./forms";
import { Id } from "convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "../ui/use-toast";

interface ManualFlashcardFormProps {
  flashCardSetId: Id<"flashCardSets">;
  onComplete: () => void;
}

type FormData = z.infer<typeof manualFormSchema>;

export function ManualFlashcardForm({
  flashCardSetId,
  onComplete,
}: ManualFlashcardFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(manualFormSchema),
    defaultValues: {
      front: "",
      back: "",
      difficulty: "medium",
      tags: [],
    },
  });

  const addFlashCard = useMutation(api.flashcards.addFlashCard);

  async function onManualSubmit(values: FormData) {
    if (!flashCardSetId) return;

    await addFlashCard({
      flashCardSetId,
      front: values.front,
      back: values.back,
      tags: values.tags,
    });

    form.reset();
    onComplete();

    toast({
      title: "Flashcard Created Successfully",
      description: `Front: "${values.front}"${values.tags?.length ? ` • Tags: ${values.tags.join(", ")}` : ""}`,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onManualSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="front"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Front</FormLabel>
              <FormControl>
                <Input
                  placeholder="Front of card"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
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
                <Input
                  placeholder="Back of card"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="difficulty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Difficulty</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
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
                <Input
                  placeholder="tag1, tag2, tag3"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Add Card</Button>
      </form>
    </Form>
  );
}
