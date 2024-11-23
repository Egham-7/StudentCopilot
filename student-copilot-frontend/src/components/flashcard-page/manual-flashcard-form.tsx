import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { manualFormSchema } from "./forms";
import { Id } from "convex/_generated/dataModel"
import { api } from '../../../convex/_generated/api'
import { useMutation } from "convex/react";
interface ManualFlashcardFormProps {
  flashCardSetId: Id<"flashCardSets">
}

export function ManualFlashcardForm({ flashCardSetId }: ManualFlashcardFormProps) {


  const form = useForm<z.infer<typeof manualFormSchema>>({
    resolver: zodResolver(manualFormSchema),
    defaultValues: {
      front: "",
      back: "",
      difficulty: "medium",
      tags: "",
    },
  })

  const addFlashCard = useMutation(api.flashcards.addFlashCard)


  async function onManualSubmit(values: z.infer<typeof manualFormSchema>) {
    if (!flashCardSetId) return
    await addFlashCard({
      flashCardSetId,
      front: values.front,
      back: values.back,
      tags: values.tags ? values.tags.split(',').map(t => t.trim()) : undefined,
    })
    form.reset()
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
                <Input {...field} placeholder="Front of card" />
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
                <Input {...field} placeholder="Back of card" />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Input {...field} placeholder="tag1, tag2, tag3" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Add Card</Button>
      </form>
    </Form>
  )
}

