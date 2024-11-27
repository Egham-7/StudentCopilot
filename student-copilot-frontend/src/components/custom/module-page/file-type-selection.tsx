import React from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileText, FileAudio, FileVideo } from "lucide-react";
import { FaGlobe } from "react-icons/fa";
import ChoiceSelection from "../choice-selection";

const SelectionHeader: React.FC = () => {
  return (
    <DialogHeader>
      <DialogTitle>Choose Upload Type</DialogTitle>
      <DialogDescription>
        Select the type of lecture you want to upload.
      </DialogDescription>
    </DialogHeader>
  );
};

interface FileTypeSelectionProps {
  onSelect: (type: "pdf" | "audio" | "video" | "website") => void;
}

const FileTypeSelection: React.FC<FileTypeSelectionProps> = ({ onSelect }) => {
  const selectionOptions = [
    { icon: FileText, label: "PDF", type: "pdf" as const },
    { icon: FileAudio, label: "Audio", type: "audio" as const },
    { icon: FileVideo, label: "Video", type: "video" as const },
    { icon: FaGlobe, label: "Website", type: "website" as const },
  ];

  return (
    <>
      <SelectionHeader />
      <ChoiceSelection
        selectionOptions={selectionOptions}
        onSelect={onSelect}
      />
    </>
  );
};

export default FileTypeSelection;
