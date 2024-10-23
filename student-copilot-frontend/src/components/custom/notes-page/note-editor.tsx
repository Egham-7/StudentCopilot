import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import React, { useEffect, useRef } from "react";

const NoteEditor: React.FC = () => {
  const editorInstance = useRef<EditorJS | null>(null);

  useEffect(() => {
    // Initialize Editor.js instance
    const initializeEditor = async () => {
      editorInstance.current = new EditorJS({
        holder: "editorjs",
        tools: {
          header: Header,
        },
      });
    };

    initializeEditor();

    // Cleanup: destroy editor instance asynchronously when component unmounts
    return () => {
      if (editorInstance.current) {
        editorInstance.current.isReady // ensure editor is ready before calling destroy
          .then(() => {
            return editorInstance.current?.destroy();
          })
          .catch((error) => {
            console.error("Error during editor destroy:", error);
          });
      }
    };
  }, []);

  return <div id="editorjs"></div>;
};

export default NoteEditor;
