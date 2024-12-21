import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect } from "react";

const sampleMarkdown = `# Welcome to My Notes

## Key Points
- First important point
- Second key insight
- Third major takeaway

## Code Example
\`\`\`javascript
console.log("Hello World!");
\`\`\`

> Important quote or reminder here
`;

export default function Editor() {
  const editor = useCreateBlockNote();

  useEffect(() => {
    async function loadSampleMarkdown() {
      const blocks = await editor.tryParseMarkdownToBlocks(sampleMarkdown);
      // replace current blocks with the converted markdown blocks - editor.replaceBlocks(blocksToRemove, blocksToInsert)
      editor.replaceBlocks(editor.document, blocks); // editor.document - everything in current document
    }
    loadSampleMarkdown();
  }, [editor]);

  return (
    <div className="p-4">
      <BlockNoteView editor={editor} />{" "}
      {/*BlockNoteView is a (react?) component - it has many other props - check documentation.*/}
    </div>
  );
}
