
import { useState, useEffect, useCallback } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, Loader2 } from 'lucide-react'

const lectures = [
  { id: '1', title: 'Introduction to React', color: 'hsl(210, 100%, 50%)' },
  { id: '2', title: 'State Management in React', color: 'hsl(210, 100%, 84%)' },
  { id: '3', title: 'React Hooks Deep Dive', color: 'hsl(210, 50%, 90%)' },
  { id: '4', title: 'Building Scalable React Applications', color: 'hsl(210, 100%, 94%)' },
]

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function LectureChat() {
  const [selectedLecture, setSelectedLecture] = useState(lectures[0].id)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          lectureId: selectedLecture,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from AI')
      }

      const data = await response.json()
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [input, selectedLecture])

  useEffect(() => {
    // Scroll to bottom of message list when new message is added
    const messageList = document.getElementById('message-list')
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight
    }
  }, [messages])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-card text-card-foreground border-border shadow-lg">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-primary" />
            AI Lecture Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Select
            value={selectedLecture}
            onValueChange={setSelectedLecture}
          >
            <SelectTrigger className="w-full mb-6 bg-input text-input-foreground border-input">
              <SelectValue placeholder="Select a lecture" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border-border">
              {lectures.map((lecture) => (
                <SelectItem key={lecture.id} value={lecture.id}>
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: lecture.color }}
                    />
                    {lecture.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ScrollArea className="h-[400px] w-full rounded-md border border-border p-4 bg-muted" id="message-list">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`mb-4 p-3 rounded-lg ${message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-secondary text-secondary-foreground mr-auto'
                    } max-w-[80%]`}
                >
                  <strong className="block mb-1">
                    {message.role === 'user' ? 'You' : 'AI'}
                  </strong>
                  {message.content}
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="flex items-center text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI is thinking...
              </div>
            )}
            {error && (
              <div className="text-destructive">
                Error: {error}
              </div>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <form onSubmit={sendMessage} className="flex w-full space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message here..."
              disabled={isLoading}
              className="flex-grow bg-input border-input text-input-foreground placeholder-muted-foreground"
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
