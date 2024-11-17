import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Id } from 'convex/_generated/dataModel';
import { AddFlashcardDialog } from '@/components/flashcard-page/add-flashcard-dialog'

const aiFormSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  lectureIds: z.array(z.string()).optional(),
  noteIds: z.array(z.string()).optional(),
})

export default function FlashcardPage() {

  const { moduleId, flashCardSetId } = useParams<{ flashCardSetId: Id<"flashCardSets">, moduleId: Id<"modules"> }>()

  const cards = useQuery(api.flashcards.getFlashCards,
    flashCardSetId ? { flashCardSetId } : "skip"
  )
  const updateCardReview = useMutation(api.flashcards.updateCardReview)
  const flashCardSet = useQuery(api.flashcards.getFlashCardSet, flashCardSetId ? { flashCardSetId } : "skip");
  const generateCards = useMutation(api.flashcards.generateFlashCardsClient);

  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filter, setFilter] = useState<"all" | "new" | "learning" | "review" | "mastered">("all");
  const [selectedLectures, setSelectedLectures] = useState<Id<"lectures">[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<Id<"notes">[]>([]);

  const aiForm = useForm<z.infer<typeof aiFormSchema>>({
    resolver: zodResolver(aiFormSchema),
    defaultValues: {
      title: flashCardSet?.title,
      description: flashCardSet?.description,
      lectureIds: flashCardSet?.lectureIds,
      noteIds: flashCardSet?.noteIds,
    },
  })

  const filteredCards = cards?.filter(card =>
    filter === "all" ? true : card.status === filter
  ) || []

  const handleCardReview = async (difficulty: "easy" | "medium" | "hard") => {
    if (!cards?.[currentCard]) return
    await updateCardReview({
      cardId: cards[currentCard]._id,
      difficulty,
    })
    nextCard()
  }

  const nextCard = () => {
    setCurrentCard((prev) => (prev + 1) % filteredCards.length)
    setIsFlipped(false)
  }

  const prevCard = () => {
    setCurrentCard((prev) => (prev - 1 + filteredCards.length) % filteredCards.length)
    setIsFlipped(false)
  }



  async function onAISubmit(values: z.infer<typeof aiFormSchema>) {
    if (!moduleId) return
    await generateCards({
      moduleId,
      title: values.title,
      description: values.description,
      lectureIds: selectedLectures,
      noteIds: selectedNotes,
      flashCardSetId: flashCardSetId!
    })
    aiForm.reset()
    setSelectedLectures([])
    setSelectedNotes([])
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col p-4">
      <main className="flex-grow flex flex-col items-center justify-center space-y-8">
        <h1 className="text-3xl font-bold">Advanced AI Flashcards</h1>

        {/* Filter Selection */}
        <Select value={filter} onValueChange={(value: typeof filter) => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="learning">Learning</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="mastered">Mastered</SelectItem>
          </SelectContent>
        </Select>

        {/* Flashcard Display */}
        {filteredCards.length > 0 && (
          <div
            className="w-full max-w-2xl aspect-video bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className="text-center p-8">
              <h2 className="text-2xl font-bold mb-4">
                {isFlipped ? filteredCards[currentCard].back : filteredCards[currentCard].front}
              </h2>

              {filteredCards[currentCard].tags?.map((tag, index) => (
                <Badge key={index} variant="secondary" className="mr-2">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Controls */}
        {filteredCards.length > 0 && (
          <>
            <div className="flex items-center space-x-4">
              <Button onClick={prevCard} size="icon" variant="outline">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Card {currentCard + 1} of {filteredCards.length}
              </span>
              <Button onClick={nextCard} size="icon" variant="outline">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Difficulty Buttons */}
            <div className="flex space-x-2">
              <Button onClick={() => handleCardReview("easy")} variant="outline">Easy</Button>
              <Button onClick={() => handleCardReview("medium")} variant="outline">Medium</Button>
              <Button onClick={() => handleCardReview("hard")} variant="outline">Hard</Button>
            </div>
          </>
        )}


        <AddFlashcardDialog />
      </main>
    </div>
  )
}

