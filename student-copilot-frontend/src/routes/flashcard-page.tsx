import { useState, useEffect, KeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Id } from 'convex/_generated/dataModel'
import { AddFlashcardDialog } from '@/components/flashcard-page/add-flashcard-dialog'

export default function FlashcardPage() {
  const { moduleId, flashCardSetId } = useParams<{ flashCardSetId: Id<"flashCardSets">, moduleId: Id<"modules"> }>()
  const cards = useQuery(api.flashcards.getFlashCards,
    flashCardSetId ? { flashCardSetId } : "skip"
  )
  const updateCardReview = useMutation(api.flashcards.updateCardReview)
  const [currentCard, setCurrentCard] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [filter, setFilter] = useState<"all" | "new" | "learning" | "review" | "mastered">("all")

  const filteredCards = cards?.filter(card =>
    filter === "all" ? true : card.status === filter
  ) || []

  // Reset current card index when filter changes or cards update
  useEffect(() => {
    setCurrentCard(0)
    setIsFlipped(false)
  }, [filter, cards])

  const handleCardReview = async (difficulty: "easy" | "medium" | "hard") => {
    if (!filteredCards[currentCard]) return
    await updateCardReview({
      cardId: filteredCards[currentCard]._id,
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

  // Keyboard navigation handlers
  const handleKeyPress = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case ' ':
      case 'Enter':
        setIsFlipped(!isFlipped)
        break
      case 'ArrowLeft':
        prevCard()
        break
      case 'ArrowRight':
        nextCard()
        break
      case '1':
        handleCardReview('easy')
        break
      case '2':
        handleCardReview('medium')
        break
      case '3':
        handleCardReview('hard')
        break
    }
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col p-4"
      tabIndex={0}
      onKeyDown={handleKeyPress}
      role="application"
      aria-label="Flashcard Review"
    >
      <main className="flex-grow flex flex-col items-center justify-center space-y-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">Advanced AI Flashcards</h1>

        <Select value={filter} onValueChange={(value: typeof filter) => setFilter(value)}>
          <SelectTrigger className="w-[180px] bg-card text-card-foreground">
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

        {filteredCards.length > 0 && (
          <div
            className="w-full max-w-2xl aspect-video bg-card text-card-foreground rounded-[var(--radius)] shadow-lg flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-muted"
            onClick={() => setIsFlipped(!isFlipped)}
            onKeyPress={(e) => e.key === 'Enter' && setIsFlipped(!isFlipped)}
            role="button"
            tabIndex={0}
            aria-label={`Flashcard ${currentCard + 1} of ${filteredCards.length}. Press Enter to flip.`}
          >
            <div className="text-center p-8">
              <h2 className="text-2xl font-heading font-bold mb-4">
                {isFlipped ? filteredCards[currentCard].back : filteredCards[currentCard].front}
              </h2>
              {filteredCards[currentCard].tags?.map((tag, index) => (
                <Badge key={index} variant="secondary" className="mr-2 bg-secondary text-secondary-foreground">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {filteredCards.length > 0 && (
          <>
            <div className="flex items-center space-x-4">
              <Button
                onClick={prevCard}
                size="icon"
                variant="outline"
                className="border-border hover:bg-accent"
                aria-label="Previous card"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Card {currentCard + 1} of {filteredCards.length}
              </span>
              <Button
                onClick={nextCard}
                size="icon"
                variant="outline"
                className="border-border hover:bg-accent"
                aria-label="Next card"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => handleCardReview("easy")}
                variant="outline"
                className="bg-primary/10 hover:bg-primary/20 text-primary-foreground"
              >
                Easy (1)
              </Button>
              <Button
                onClick={() => handleCardReview("medium")}
                variant="outline"
                className="bg-secondary hover:bg-secondary/80"
              >
                Medium (2)
              </Button>
              <Button
                onClick={() => handleCardReview("hard")}
                variant="outline"
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive-foreground"
              >
                Hard (3)
              </Button>
            </div>
          </>
        )}

        {(moduleId && flashCardSetId) && (
          <AddFlashcardDialog flashCardSetId={flashCardSetId} moduleId={moduleId} />
        )}
      </main>
    </div>
  )
}

