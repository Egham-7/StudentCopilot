import LoadingPage from "@/components/custom/loading";
import { Id } from "convex/_generated/dataModel";
import { useAction } from "convex/react";
import "katex/dist/katex.min.css";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import Editor from "@/components/note/editor";
import ReactMarkdown from "react-markdown";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  // New state for chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(500);
  const [isDragging, setIsDragging] = useState(false);

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
    // call function fetchNote()
    fetchNote();
  }, [noteId, getNoteById]); // Handle side effect - Dependency array to break down, clean up and rerun fetchNote()

  // New resize handlers
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newWidth = window.innerWidth - e.clientX;
      setChatWidth(newWidth);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (isLoading) {
    return <LoadingPage />;
  }
  // To handle empty note
  if (!currentNote) {
    return <div>Note not found</div>;
  }

  return (
    <div className="flex h-screen">
      <main
        style={{ width: isChatOpen ? `calc(100% - ${chatWidth}px)` : "100%" }}
        className="transition-all duration-300 overflow-hidden flex flex-col"
      >
        <header className="flex items-center justify-between p-4 border-b"></header>

        {/* Editor with flex-grow to take available space */}
        <div className="p-4 flex-grow overflow-auto">
          <Editor />
        </div>

        {/* Markdown Display with specific height */}
        <div className="p-4 h-1/3 overflow-auto prose prose-invert max-w-none">
          <ReactMarkdown>{currentNote.content}</ReactMarkdown>
        </div>
      </main>

      {/* Chat Panel */}
      <div
        style={{ width: isChatOpen ? `${chatWidth}px` : "0" }}
        className="relative h-full bg-gray-800 transition-all duration-300"
      >
        <div
          style={{ width: isChatOpen ? `${chatWidth}px` : "0" }}
          className="relative h-full bg-gray-800 transition-all duration-300"
        >
          {/* Drag Handle for resizing */}
          <div
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize bg-gray-600 hover:bg-blue-500"
            onMouseDown={handleMouseDown}
          />

          {/* Toggle Button */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="absolute left-0 top-1/2 transform -translate-x-full bg-gray-800 p-2 rounded-l"
          >
            {isChatOpen ? <ChevronRight /> : <ChevronLeft />}
          </button>

          {/* Chat Content Area */}
          <div className="p-4 text-white">
            {isChatOpen && <div>Chat Content Here</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
