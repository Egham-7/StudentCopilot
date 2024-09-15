import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Save, Edit } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useParams } from "react-router-dom";
import LoadingPage from "@/components/custom/loading";
import { Id } from "convex/_generated/dataModel";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Components } from "react-markdown";

interface Note {
  _id: Id<"notes">;
  moduleId: Id<"modules">;
  lectureIds: Id<"lectures">[];
  textChunks: Id<"_storage">[];
  content: string;
}

export default function NotePage() {
  const { noteId } = useParams<{ noteId: string }>();
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const debouncedNote = useDebounce<string>(currentNote?.content ?? "", 500);
  const getNoteById = useAction(api.notes.getNoteById);

  useEffect(() => {
    const fetchNote = async () => {
      if (noteId) {
        setIsLoading(true);
        try {
          const note = await getNoteById({ noteId: noteId as Id<"notes"> });
          setCurrentNote(note as Note);
        } catch (error) {
          console.error("Failed to fetch note:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchNote();
  }, [noteId, getNoteById]);




  const handleSave = useCallback(async () => {
    if (currentNote) {
      // Implement save logic here
    }
    setIsEditing(false);
  }, [currentNote]);

  useEffect(() => {
    if (debouncedNote && currentNote) {
      handleSave();
    }
  }, [debouncedNote, handleSave, currentNote]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (currentNote) {
      setCurrentNote({ ...currentNote, content: e.target.value });
    }
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!currentNote) {
    return <div>Note not found</div>;
  }

  const components: Components = {
    code({ className, children, ...props }: { className?: string, children?: React.ReactNode }) {
      const match = /language-(\w+)/.exec(className || '');
      return match ? (
        <SyntaxHighlighter
          {...props}
          language={match[1]}
          style={vscDarkPlus}
          PreTag="div"
          customStyle={{
            margin: '1em 0',
            borderRadius: '5px',
            padding: '1em',
          }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  };


  return (
    <main className="flex-1 overflow-hidden flex flex-col">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center text-sm text-muted-foreground">
          <ChevronRight className="h-4 w-4" />
          <span>Note for Module {currentNote.moduleId}</span>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={toggleEditMode} className="mr-2">
            {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
            {isEditing ? "Save" : "Edit"}
          </Button>
        </div>
      </header>
      <div className="p-4 flex-grow overflow-auto h-screen">
        {isEditing ? (
          <Textarea
            value={currentNote.content}
            onChange={handleNoteChange}
            className="w-full h-full resize-none border-none p-0 focus-visible:ring-0"
            placeholder="Start writing here..."
          />
        ) : (
          <div className="prose max-w-none h-screen dark:prose-invert">
            <ReactMarkdown components={components}>
              {currentNote.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </main>
  );
}

