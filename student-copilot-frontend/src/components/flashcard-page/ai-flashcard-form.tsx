import { useState } from 'react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Id } from 'convex/_generated/dataModel'
import { aiFormSchema } from './forms'
import { DialogTrigger } from '../ui/dialog';


interface AIFlashcardFormProps {
  moduleId: Id<"modules">
  flashCardSetId: Id<"flashCardSets">
  setOpen?: (state: boolean) => void
}

export function AIFlashcardForm({ moduleId, flashCardSetId, setOpen }: AIFlashcardFormProps) {
  const flashCardSet = useQuery(api.flashcards.getFlashCardSet, {
    flashCardSetId
  })

  const [selectedLectures, setSelectedLectures] = useState<Id<"lectures">[]>(flashCardSet?.lectureIds ?? [])
  const [selectedNotes, setSelectedNotes] = useState<Id<"notes">[]>(flashCardSet?.noteIds ?? [])

  const lectures = useQuery(api.lectures.getLecturesByModuleId, { moduleId })
  const notes = useQuery(api.notes.getNotesForModule, { moduleId })
  const generateFlashCard = useMutation(api.flashcards.generateFlashCardsClient)

  const form = useForm<z.infer<typeof aiFormSchema>>({
    resolver: zodResolver(aiFormSchema),
    defaultValues: {
      lectureIds: selectedLectures,
      noteIds: selectedNotes,
    },
  })

  async function onSubmit(values: z.infer<typeof aiFormSchema>) {
    const { lectureIds, noteIds } = values

    if (!flashCardSetId || (!lectureIds?.length && !noteIds?.length) || !flashCardSet) {
      return
    }



    await generateFlashCard({
      flashCardSetId,
      moduleId,
      title: flashCardSet.title,
      description: flashCardSet.description,
      lectureIds: lectureIds as Id<"lectures">[],
      noteIds: noteIds as Id<"notes">[]
    })

    form.reset()
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
                    <p className='truncate'>
                      {lecture.title}
                    </p>
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
                    <p className='truncate'>
                      {note._id}
                    </p>
                  </Button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex justify-end'>
          <DialogTrigger asChild>
            <Button
              type="submit"
              onClick={() => setOpen && setOpen(false)}
              disabled={selectedLectures.length === 0 && selectedNotes.length === 0}
            >
              Generate Flashcards
            </Button>
          </DialogTrigger>
        </div>
      </form>
    </Form>
  )
}

