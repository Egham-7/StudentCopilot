import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { useToast } from '@/components/ui/use-toast';
import { MultiStepLoader } from '../multi-step-loader';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 20 MB in bytes

const ACCEPTED_VIDEO_TYPES = [
  "audio/mpeg", // MP3 files
  "audio/mp3"
];

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  moduleId: z.string().min(1, 'Module ID is required'),
  video: z.instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 200MB.`)
    .refine(
      (file) => ACCEPTED_VIDEO_TYPES.includes(file.type),
      "Only video files are accepted."
    ),
});

interface UploadLectureFormProps {
  moduleId: Id<"modules">
}

const UploadLectureForm: React.FC<UploadLectureFormProps> = ({ moduleId }) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const extractAudioAndTranscribe = useAction(api.lectures.extractAudioAndTranscribe);

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const storeLecture = useMutation(api.lectures.store);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      moduleId: moduleId,
    }
  });


  const loadingStates = [
    { text: "Extracting audio..." },
    { text: "Transcribing..." },
    { text: "Generating embeddings..." },
    { text: "Uploading video..." },
    { text: "Storing lecture..." },
  ];

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const file = values.video;
      const chunkSize = 2 * 1024 * 1024; // 2MB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);

      let combinedEmbedding = new Array(1536).fill(0);
      const allStorageIds: Id<"_storage">[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        // Convert chunk to ArrayBuffer
        const arrayBuffer = await chunk.arrayBuffer();

        const { storageId, paddedEmbedding } = await extractAudioAndTranscribe({
          videoChunk: arrayBuffer,
          chunkIndex: i,
        });

        allStorageIds.push(storageId);
        combinedEmbedding = combinedEmbedding.map((val, index) => val + paddedEmbedding[index]);


      }

      const magnitude = Math.sqrt(combinedEmbedding.reduce((sum, val) => sum + val * val, 0));
      const normalizedEmbedding = combinedEmbedding.map(val => val / magnitude);


      // Upload the full video file
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (!uploadResult.ok) {
        throw new Error('Failed to upload file');
      }

      const { storageId } = await uploadResult.json();

      await storeLecture({
        title: values.title,
        description: values.description,
        completed: false,
        lectureTranscriptionEmbedding: normalizedEmbedding,
        lectureTranscription: allStorageIds,
        videoStorageId: storageId,
        moduleId: moduleId
      });

      toast({
        title: "Lecture uploaded successfully.",
        description: "Your lecture has been added to the module.",
      });

      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed.",
        description: "Hang tight and try again later!",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Lecture title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Lecture description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="video"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video File</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="video/*, audio/*"
                  onChange={(e) => field.onChange(e.target.files?.[0])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Upload Lecture</Button>
      </form>
    </Form>
  );

  const content = (
    <>
      {formContent}
      <MultiStepLoader
        loadingStates={loadingStates}
        loading={isLoading}
        duration={60000}
        loop={true}
      />
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Upload Lecture</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Lecture</DialogTitle>
          </DialogHeader>
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

export default UploadLectureForm;

