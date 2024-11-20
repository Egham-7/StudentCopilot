

import { useState } from 'react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Id } from 'convex/_generated/dataModel'
import { toast } from '../ui/use-toast';

const formSchema = z.object({
  lectureIds: z.array(z.string()),
  noteIds: z.array(z.string())
});

interface AIFlashcardUpdateFormProps {
  moduleId: Id<"modules">
  flashCardSetId: Id<"flashCardSets">
}

export function AIFlashcardUpdateForm({ moduleId, flashCardSetId }: AIFlashcardUpdateFormProps) {
  const [selectedLectures, setSelectedLectures] = useState<Id<"lectures">[]>([])
  const [selectedNotes, setSelectedNotes] = useState<Id<"notes">[]>([])

  const lectures = useQuery(api.lectures.getLecturesByModuleId, { moduleId })
  const notes = useQuery(api.notes.getNotesForModule, { moduleId })
  const generateFlashCard = useMutation(api.flashcards.generateFlashCardsClient)
  const flashCardSet = useQuery(api.flashcards.getFlashCardSet, {
    flashCardSetId
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lectureIds: [],
      noteIds: [],
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { lectureIds, noteIds } = values

      if (!lectureIds?.length && !noteIds?.length) {
        return
      }

      if (!flashCardSet) {
        throw new Error("Flashcard set must be available.");
      }

      await generateFlashCard({
        moduleId,
        title: flashCardSet.title,
        description: flashCardSet.description,
        lectureIds: lectureIds as Id<"lectures">[],
        noteIds: noteIds as Id<"notes">[]
      })

      form.reset()

    } catch (error: unknown) {

      if (error instanceof Error) {
        toast({
          title: "Failed to generate flashcards.",
          description: error.message
        });
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="lectureIds"
          render={() => (
            <FormItem>
              <FormLabel>Select Lectures</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {lectures?.map((lecture) => (
                  <Button
                    key={lecture._id}
                    type="button"
                    variant={selectedLectures.includes(lecture._id) ? "default" : "outline"}
                    onClick={() => {
                      const newSelection = selectedLectures.includes(lecture._id)
                        ? selectedLectures.filter(id => id !== lecture._id)
                        : [...selectedLectures, lecture._id]
                      setSelectedLectures(newSelection)
                      form.setValue('lectureIds', newSelection)
                    }}
                  >
                    <p className='truncate'>{lecture.title}</p>
                  </Button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="noteIds"
          render={() => (
            <FormItem>
              <FormLabel>Select Notes</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {notes?.map((note) => (
                  <Button
                    key={note._id}
                    type="button"
                    variant={selectedNotes.includes(note._id) ? "default" : "outline"}
                    onClick={() => {
                      const newSelection = selectedNotes.includes(note._id)
                        ? selectedNotes.filter(id => id !== note._id)
                        : [...selectedNotes, note._id]
                      setSelectedNotes(newSelection)
                      form.setValue('noteIds', newSelection)
                    }}
                  >
                    <p className='truncate'>{note._id}</p>
                  </Button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex justify-end'>
          <Button
            type="submit"
            disabled={selectedLectures.length === 0 && selectedNotes.length === 0}
          >
            Generate Flashcards
          </Button>
        </div>
      </form>
    </Form>
  )
}

