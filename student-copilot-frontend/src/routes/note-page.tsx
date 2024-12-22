import LoadingPage from "@/components/custom/loading";
import { Doc, Id } from "convex/_generated/dataModel";
import { useAction } from "convex/react";
import "katex/dist/katex.min.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import Editor from "@/components/note/editor";

type Note = Doc<"notes"> & { content: string };

export default function NotePage() {
  const getNoteById = useAction(api.noteAction.getNoteById); // gets the note id from this api
  const { noteId } = useParams<{ noteId: string }>(); // stores the note id
  // To update notes
  const [currentNote, setCurrentNote] = useState<Note | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch ai generated notes
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

  if (isLoading) {
    return <LoadingPage />;
  }
  // To handle empty note
  if (!currentNote) {
    return <div>Note not found</div>;
  }

  return <Editor noteContent={currentNote.content} />;
}
