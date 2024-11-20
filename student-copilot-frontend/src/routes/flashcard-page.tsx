import { useState, useEffect, KeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ChevronLeft, ChevronRight, Tag, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Id } from 'convex/_generated/dataModel'
import { AddFlashcardDialog } from '@/components/flashcard-page/add-flashcard-dialog'
import { toast } from '@/components/ui/use-toast'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function FlashcardPage() {
  const { moduleId, flashCardSetId } = useParams<{ flashCardSetId: Id<"flashCardSets">, moduleId: Id<"modules"> }>()
  const cards = useQuery(api.flashcards.getFlashCards, flashCardSetId ? { flashCardSetId } : "skip")
  const updateCardReview = useMutation(api.flashcards.updateCardReview)

  const [currentCard, setCurrentCard] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [filter, setFilter] = useState<"all" | "new" | "learning" | "review" | "mastered">("all")

  const filteredCards = cards?.filter(card => filter === "all" ? true : card.status === filter) || []

  useEffect(() => {
    setCurrentCard(0)
    setIsFlipped(false)
  }, [filter, cards])

  const handleCardReview = async (difficulty: "easy" | "medium" | "hard") => {
    if (!filteredCards[currentCard]) return

    try {
      await updateCardReview({
        cardId: filteredCards[currentCard]._id,
        difficulty,
      })
      nextCard()
    } catch (error: unknown) {

      if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Review Failed",
          description: error.message
        })
      }
    }
  }

  const nextCard = () => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentCard((prev) => (prev + 1) % filteredCards.length)
    }, 200)
  }

  const prevCard = () => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentCard((prev) => (prev - 1 + filteredCards.length) % filteredCards.length)
    }, 200)
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLButtonElement) return

    e.preventDefault()
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

  if (!cards) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
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
            <SelectItem value="all">All Cards</SelectItem>
            <SelectItem value="new">New Cards</SelectItem>
            <SelectItem value="learning">Learning</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="mastered">Mastered</SelectItem>
          </SelectContent>
        </Select>

        {filteredCards.length > 0 ? (

          <motion.div
            className="perspective-1000 w-full max-w-2xl aspect-video relative"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <motion.div
              className={cn(
                "w-full h-full absolute backface-hidden cursor-pointer",
                "bg-card text-card-foreground rounded-lg shadow-lg",
                "flex flex-col items-center justify-center p-8"
              )}
              initial={false}
              animate={{
                rotateY: isFlipped ? '180deg' : '0deg',
                transition: { duration: 0.6 }
              }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="text-center">
                <h2 className="text-2xl font-heading font-bold mb-4">
                  {filteredCards[currentCard].front}
                </h2>
                <div className="flex flex-wrap gap-2 justify-center">
                  {filteredCards[currentCard].tags?.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              className={cn(
                "w-full h-full absolute backface-hidden cursor-pointer",
                "bg-card text-card-foreground rounded-lg shadow-lg",
                "flex flex-col items-center justify-center p-8"
              )}
              initial={{ rotateY: '180deg' }}
              animate={{
                rotateY: isFlipped ? '360deg' : '180deg',
                transition: { duration: 0.6 }
              }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="text-center">
                <h2 className="text-2xl font-heading font-bold">
                  {filteredCards[currentCard].back}
                </h2>
              </div>
            </motion.div>
          </motion.div>



        ) : (
          <div className="text-center text-muted-foreground">
            No cards match the selected filter
          </div>
        )
        }

        {
          filteredCards.length > 0 && (
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
          )
        }

        {
          (moduleId && flashCardSetId) && (
            <AddFlashcardDialog flashCardSetId={flashCardSetId} moduleId={moduleId} />
          )
        }
      </main >
    </div >
  )
}

