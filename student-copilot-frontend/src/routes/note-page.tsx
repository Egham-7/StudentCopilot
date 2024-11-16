import LoadingPage from "@/components/custom/loading";
import { Doc, Id } from "convex/_generated/dataModel";
import { useAction } from "convex/react";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useRef } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import Paragraph from "@editorjs/paragraph";
import ImageTool from "@editorjs/image";
interface EditorProps {
  data: any;
  onChange: (data: OutputData) => void;
}
const Editor = ({ data, onChange }: EditorProps) => {
  const editorRef = useRef<EditorJS>();

  console.log("Data Content: ", data.blocks);
  useEffect(() => {
    const initEditor = async () => {
      if (!editorRef.current) {
        const editor = new EditorJS({
          holder: "editorjs",
          tools: {
            header: Header,
            paragraph: {
              class: Paragraph,
              inlineToolbar: true,
            },
            image: {
              class: ImageTool,
              config: {
                endpoints: {
                  byFile: "http://localhost:8008/uploadFile", // Your backend file uploader endpoint
                  byUrl: "http://localhost:8008/fetchUrl", // Your endpoint that provides uploading by Url
                },
              },
            },
          },
          data,
          onChange: async () => {
            const savedData = await editor.save();
            onChange(savedData);
          },
        });
        await editor.isReady;
        editorRef.current = editor;
      }
    };

    initEditor();

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
      }
    };
  }, []);

  return <div id="editorjs" />;
};

interface Note {
  _id: Id<"notes">;
  moduleId: Id<"modules">;
  lectureIds: Id<"lectures">[];
  content: any;
}

export default function NotePage() {
  const { noteId } = useParams<{ noteId: string }>();
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const getNoteById = useAction(api.noteAction.getNoteById);

  const handleEditorChange = async (content: any) => {
    if (currentNote) {
      setCurrentNote({ ...currentNote, content });

    }
  };

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

  if (isLoading) return <LoadingPage />;
  if (!currentNote) return <div>Note not found</div>;

  console.log(currentNote.content);
  return (
    <main className="flex-1 overflow-hidden flex flex-col">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center text-sm text-muted-foreground">
          <ChevronRight className="h-4 w-4" />
          <span>Note for Module {currentNote.moduleId}</span>
        </div>
      </header>
      <div className="p-4 flex-grow overflow-auto">
        <Editor data={currentNote.content} onChange={handleEditorChange} />

      </div>
    </main>
  );
}
