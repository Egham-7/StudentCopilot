import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../.../../../../convex/_generated/api";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LecturesData } from "@/lib/ui_utils";
import { Form, FormItem, FormField, FormControl } from "@/components/ui/form";
import { Id } from "convex/_generated/dataModel";

const formSchema = z.object({
  message: z.string().min(1, {
    message: "Message must not be empty.",
  }),
});

interface ChatDialogProps {
  lectures: LecturesData[] | undefined | null;
  sessionId: string;
  moduleId: string;
}

const ChatDialog = ({ lectures, sessionId, moduleId }: ChatDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = useQuery(
    api.aiChats.list,
    moduleId && sessionId
      ? { moduleId: moduleId as Id<"modules">, sessionId }
      : "skip",
  );
  const createMessage = useMutation(api.aiChats.send);
  const clearMessages = useMutation(api.aiChats.clear);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!lectures) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!moduleId || !sessionId) {
        toast({
          title: "Module or session id not found.",
          description: "Please refresh the page.",
        });

        return;
      }

      await createMessage({
        message: values.message,
        moduleId: moduleId as string,
        sessionId: sessionId,
      });
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const messageList = document.getElementById("message-list");
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="w-full md:min-w-[500px] bg-card text-card-foreground border-border shadow-lg">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-2xl font-bold flex items-center justify-between">
          <Sparkles className="w-6 h-6 mr-2 text-primary" />
          <span className="hidden md:inline">AI Lecture Assistant</span>
          <Button
            variant={"ghost"}
            className="text-red-500 justify-end items-center gap-2"
            onClick={() =>
              clearMessages({ moduleId: moduleId as Id<"modules">, sessionId })
            }
          >
            Clear
            <TrashIcon className="mr-2 w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea
          className=" min-h-[250px] md:min-h-[400px] w-full rounded-md border border-border p-4 bg-muted"
          id="message-list"
        >
          <div className="max-h-96">
            <AnimatePresence>
              {messages?.map((message) => (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`mb-4 p-3 rounded-lg ${message.isViewer === true
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-secondary text-secondary-foreground mr-auto"
                    } max-w-[80%]`}
                >
                  <strong className="block mb-1">
                    {message.isViewer === true ? "You" : "AI"}
                  </strong>

                  {message.body === "" && <p> Lecture Assistant is thinking. </p>}
                  {message.body}
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI is thinking...
              </div>
            )}
            {error && <div className="text-destructive">Error: {error}</div>}

          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex w-full space-x-2"
          >
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Type your message here..."
                      disabled={isLoading}
                      className="bg-input border-input text-input-foreground placeholder-muted-foreground"
                      aria-label="Chat input"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </Form>
      </CardFooter>
    </Card>
  );
};

export default ChatDialog;
