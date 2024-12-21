import LoadingPage from "@/components/custom/loading";
import { Id } from "convex/_generated/dataModel";
import { useAction } from "convex/react";
import "katex/dist/katex.min.css";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import Editor from "@/components/note/editor";
import ReactMarkdown from "react-markdown";

interface Note {
  _id: Id<"notes">;
  moduleId: Id<"modules">;
  lectureIds: Id<"lectures">[];
  textChunks: Id<"_storage">[];
  content: string;
}

export default function NotePage() {
  const getNoteById = useAction(api.noteAction.getNoteById); // gets the note id from this api
  const { noteId } = useParams<{ noteId: string }>(); // stores the note id
  // To update notes
  const [currentNote, setCurrentNote] = useState<Note | null>(null);

  const [isLoading, setIsLoading] = useState(true);

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
    // call function fetchNote()
    fetchNote();
  }, [noteId, getNoteById]); // Handle side effect - Dependency array to break down, clean up and rerun fetchNote()

  if (isLoading) {
    return <LoadingPage />;
  }
  // To handle empty note
  if (!currentNote) {
    return <div>Note not found</div>;
  }

  return (
    <main className="flex-1 overflow-hidden flex flex-col">
      <header className="flex items-center justify-between p-4 border-b"></header>

      {/* Markdown Display */}
      <div className="p-4 prose prose-invert max-w-none">
        <ReactMarkdown>{currentNote.content}</ReactMarkdown>
      </div>

      <div className="p-4 flex-grow overflow-auto h-screen">
        <Editor
          content={currentNote.content}
          onChange={(newContent) =>
            setCurrentNote({ ...currentNote, content: newContent })
          }
        />
      </div>
    </main>
  );
}
