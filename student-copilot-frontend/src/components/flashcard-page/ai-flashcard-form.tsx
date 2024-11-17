import { useState } from 'react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from '@/components/ui/label'
import { Id } from 'convex/_generated/dataModel'
import { aiFormSchema } from './forms';

interface AIFlashcardFormProps {
  moduleId: Id<"modules">
  onSubmit: (values: z.infer<typeof aiFormSchema>) => Promise<void>
}

export function AIFlashcardForm({ moduleId, onSubmit }: AIFlashcardFormProps) {
  const [selectedLectures, setSelectedLectures] = useState<Id<"lectures">[]>([])
  const [selectedNotes, setSelectedNotes] = useState<Id<"notes">[]>([])

  const lectures = useQuery(api.lectures.getLecturesByModuleId, { moduleId })
  const notes = useQuery(api.notes.getNotesForModule, { moduleId })

  const form = useForm<z.infer<typeof aiFormSchema>>({
    resolver: zodResolver(aiFormSchema),
    defaultValues: {
      title: "",
      description: "",
      lectureIds: [],
      noteIds: [],
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter flashcard set title" />
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
                <Textarea {...field} placeholder="Enter description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>Select Lectures</Label>
          <div className="grid grid-cols-2 gap-2">
            {lectures?.map((lecture) => (
              <Button
                key={lecture._id}
                type="button"
                variant={selectedLectures.includes(lecture._id) ? "default" : "outline"}
                onClick={() => {
                  setSelectedLectures(prev =>
                    prev.includes(lecture._id)
                      ? prev.filter(id => id !== lecture._id)
                      : [...prev, lecture._id]
                  )
                }}
              >
                {lecture.title}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Select Notes</Label>
          <div className="grid grid-cols-2 gap-2">
            {notes?.map((note) => (
              <Button
                key={note._id}
                type="button"
                variant={selectedNotes.includes(note._id) ? "default" : "outline"}
                onClick={() => {
                  setSelectedNotes(prev =>
                    prev.includes(note._id)
                      ? prev.filter(id => id !== note._id)
                      : [...prev, note._id]
                  )
                }}
              >
                {note._id}
              </Button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          disabled={selectedLectures.length === 0 && selectedNotes.length === 0}
        >
          Generate Flashcards
        </Button>
      </form>
    </Form>
  )
}

