
import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, Loader2 } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { useParams } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { Id } from 'convex/_generated/dataModel'
import LoadingPage from '@/components/custom/loading'
import { LecturesData } from '@/lib/ui_utils'

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}



export default function LectureChat() {
  const { lectureIds: lectureIdsString } = useParams();
  const lectureIds = lectureIdsString?.split(",") as Id<"lectures">[] | undefined;

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lectures = useQuery(api.lectures.getLecturesByIds, lectureIds ? { lectureIds: lectureIds } : "skip")

  const isPageLoading = !lectureIdsString || !lectures

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !lectures) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
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
          message: input.trim(),
          lectureIds: lectures.map(lecture => lecture?._id),
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
  }, [input, lectures])

  useEffect(() => {
    const messageList = document.getElementById('message-list')
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight
    }
  }, [messages])

  if (isPageLoading) return <LoadingPage />

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
          <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
            {lectures && lectures.map((lecture: LecturesData) => (
              <div
                key={lecture._id}
                className="relative cursor-pointer transition-all duration-300 ring-2 ring-primary"
              >
                <img
                  src={lecture.image}
                  alt={lecture.title}
                  className="rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                  <span className="text-white text-center text-sm px-2">{lecture.title}</span>
                </div>
              </div>
            ))}
          </div>
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
              disabled={isLoading || !input.trim()}
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

