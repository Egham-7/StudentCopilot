import React, { useState } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Id } from 'convex/_generated/dataModel';
import FileTypeSelection from './file-type-selection';
import LectureUploadForm from './lecture-upload-form';
interface UploadLectureDialogProps {
  moduleId: Id<"modules">
}

const UploadLectureDialog: React.FC<UploadLectureDialogProps> = ({ moduleId }) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isOpen, setIsOpen] = useState(false);
  const [fileType, setFileType] = useState<'pdf' | 'audio' | 'video' | 'website' | null>(null);

  const content = (
    fileType === null
      ? <FileTypeSelection onSelect={setFileType} />
      : <LectureUploadForm moduleId={moduleId} fileType={fileType} onBack={() => setFileType(null)} onComplete={() => setIsOpen(false)} />
  );

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Upload Lecture</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">Upload Lecture</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Upload Lecture</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default UploadLectureDialog;
