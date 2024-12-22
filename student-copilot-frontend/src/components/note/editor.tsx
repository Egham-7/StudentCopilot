import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect } from "react";

interface EditorProps {
  noteContent: string;
}

export default function Editor({ noteContent }: EditorProps) {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // For initialization; on mount, convert the initial Markdown to blocks and replace the default editor's content
  useEffect(() => {
    async function loadInitialMarkdown() {
      console.log("Note Content: ", noteContent);
      const blocks = await editor.tryParseMarkdownToBlocks(noteContent);
      editor.replaceBlocks(editor.document, blocks);
    }
    loadInitialMarkdown();
  }, [editor, noteContent]);

  return (
    <div className="p-4">
      <BlockNoteView editor={editor} />
    </div>
  );
}
