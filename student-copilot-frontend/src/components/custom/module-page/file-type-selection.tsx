import React from 'react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, FileAudio, FileVideo } from 'lucide-react';
import { FaGlobe } from "react-icons/fa";

interface FileTypeSelectionProps {
  onSelect: (type: 'pdf' | 'audio' | 'video' | 'website') => void;
}

const FileTypeSelection: React.FC<FileTypeSelectionProps> = ({ onSelect }) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Choose Upload Type</DialogTitle>
        <DialogDescription>
          Select the type of lecture you want to upload.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-4">
        <Button
          variant="outline"
          className="h-32 flex flex-col items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
          onClick={() => onSelect('pdf')}
        >
          <FileText className="w-8 h-8" />
          <span>PDF</span>
        </Button>
        <Button
          variant="outline"
          className="h-32 flex flex-col items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
          onClick={() => onSelect('audio')}
        >
          <FileAudio className="w-8 h-8" />
          <span>Audio</span>
        </Button>

        <Button
          variant="outline"
          className="h-32 flex flex-col items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
          onClick={() => onSelect('video')}
        >
          <FileVideo className="w-8 h-8" />
          <span>Video</span>
        </Button>


        <Button
          variant="outline"
          className="h-32 flex flex-col items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
          onClick={() => onSelect('website')}
        >

          <FaGlobe className='w-8 h-8' />

          <span>Website</span>
        </Button>




      </div>
    </>
  );
};

export default FileTypeSelection;

