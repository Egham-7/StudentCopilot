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
import AnimatedCircularProgressBar from '@/components/magicui/animated-circular-progress-bar';


const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB in bytes



const ACCEPTED_FILE_TYPES = [
  "audio/mpeg", // MP3 files
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "video/mp4",
  "video/webm",
  "video/ogg"
];

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  moduleId: z.string().min(1, 'Module ID is required'),
  file: z.instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 200MB.`)
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      "Only audio and video files are accepted."
    ),
});

interface UploadLectureFormProps {
  moduleId: Id<"modules">
}

const UploadLectureForm: React.FC<UploadLectureFormProps> = ({ moduleId }) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const transcribeAudio = useAction(api.lectures.transcribeAudio);
  const extractAudio = useAction(api.lectures.extractAudio);

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0.0);
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



  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setUploadProgress(0);


    try {
      const file = values.file;
      const chunkSize = 2 * 1024 * 1024; // 2MB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);

      let combinedEmbedding = new Array(1536).fill(0);
      let uploadedChunks = 0;

      const allStorageIds: Id<"_storage">[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        let arrayBuffer = await chunk.arrayBuffer();


        if (file.type.startsWith("video/")) {

          console.log("Got a video");

          arrayBuffer = await extractAudio({
            videoChunk: arrayBuffer
          });

        }


        const { storageId, embedding } = await transcribeAudio({
          audioChunk: arrayBuffer,
          chunkIndex: i,
        });

        allStorageIds.push(storageId);
        combinedEmbedding = combinedEmbedding.map((val, index) => val + embedding[index]);

        uploadedChunks++;
        setUploadProgress(Math.round((uploadedChunks / totalChunks) * 100));




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
          name="file"
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
      {!isLoading && formContent}

      {isLoading && (
        <div className="mt-4 flex flex-col items-center">
          <AnimatedCircularProgressBar
            max={100}
            min={0}
            value={uploadProgress}
            gaugePrimaryColor="rgb(79 70 229)"
            gaugeSecondaryColor="rgba(0, 0, 0, 0.1)"
          />
          <p className="mt-2 text-sm text-gray-500">
            Uploading: {uploadProgress}%
          </p>
        </div>
      )}
    </>
  )
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

