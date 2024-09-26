import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { useToast } from '@/components/ui/use-toast';
import AnimatedCircularProgressBar from '@/components/magicui/animated-circular-progress-bar';
import pdfToText from 'react-pdftotext'
import { chunk } from 'lodash-es';


import * as z from 'zod';

interface UploadProgressSetter {
  (progress: number): void;
}


const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB in bytes

const PDF_CHUNK_SIZE = 500 // 500 words

const ACCEPTED_FILE_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "application/pdf"
];

export const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  moduleId: z.string().min(1, 'Module ID is required'),
  file: z.instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 200MB.`)
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      "Only audio, video, and PDF files are accepted."
    ),
});
interface LectureUploadFormProps {
  moduleId: Id<"modules">;
  fileType: 'pdf' | 'audio' | 'video';
  onBack: () => void;
  onComplete: () => void;
}

const LectureUploadForm: React.FC<LectureUploadFormProps> = ({ moduleId, fileType, onBack, onComplete }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0.0);
  const transcribeAudio = useAction(api.lectures.transcribeAudio);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const storeLecture = useMutation(api.lectures.store);
  const getEmbedding = useAction(api.ai.generateTextEmbeddingClient);
  const extractAudio = useAction(api.uploads.extractAudio);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      moduleId: moduleId,
    }
  });

  const parsePdf = async (file: File) => {

    const text = await pdfToText(file);

    return text;

  }

  async function uploadFile(file: File, contentType: string): Promise<Id<"_storage">> {
    const uploadUrl = await generateUploadUrl();
    const uploadResult = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: file
    });

    if (!uploadResult.ok) {
      throw new Error(`Failed to upload ${contentType}`);
    }

    const { storageId } = await uploadResult.json();
    return storageId;
  }

  async function chunkAndProcess<T, R>(
    data: T,
    chunkSize: number,
    processChunk: (chunk: T, index: number, setProgress: UploadProgressSetter, totalChunks: number) => Promise<R>,
    setUploadProgress: UploadProgressSetter
  ): Promise<R[]> {
    let chunks: T[];
    if (data instanceof ArrayBuffer) {
      chunks = [];
      for (let i = 0; i < data.byteLength; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize) as T);
      }
    } else if (typeof data === 'string') {
      chunks = chunk(data.split(' '), chunkSize).map(chunk => chunk.join(' ') as T);
    } else if (data instanceof File) {
      chunks = [];
      for (let i = 0; i < data.size; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize) as T);
      }
    } else {
      throw new Error('Unsupported data type for chunking');
    }

    const totalChunks = chunks.length;
    const results = await Promise.all(chunks.map((chunk, index) =>
      processChunk(chunk, index, setUploadProgress, totalChunks)
    ));

    return results;
  }

  async function processPdfChunk(chunkText: string, index: number, setUploadProgress: UploadProgressSetter, totalChunks: number): Promise<{ storageId: Id<"_storage">; embedding: number[] }> {
    const uploadChunkUrl = await generateUploadUrl();
    const uploadChunkResult = await fetch(uploadChunkUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: chunkText
    });

    if (!uploadChunkResult.ok) {
      throw new Error(`Failed to upload text chunk ${index}.`);
    }

    const { storageId } = await uploadChunkResult.json();
    const chunkEmbedding = await getEmbedding({ text: chunkText });

    setUploadProgress(Math.min(100, Math.floor(((index + 1) / totalChunks) * 100)));

    return { storageId, embedding: chunkEmbedding };
  }

  async function handlePdfUpload(file: File, values: z.infer<typeof formSchema>, moduleId: string, setUploadProgress: UploadProgressSetter): Promise<void> {
    const storageId = await uploadFile(file, file.type);
    const rawText = await parsePdf(file);

    const results = await chunkAndProcess(
      rawText,
      PDF_CHUNK_SIZE,
      processPdfChunk,
      setUploadProgress
    );

    const textChunkStorageIds: Id<"_storage">[] = results.map(result => result.storageId);
    const allEmbeddings: number[][] = results.map(result => result.embedding);

    const concatenatedEmbedding: number[] = [];
    for (let i = 0; i < 1536; i++) {
      const sum = allEmbeddings.reduce((acc, embedding) => acc + (embedding[i] || 0), 0);
      concatenatedEmbedding.push(sum / allEmbeddings.length);
    }

    const magnitude = Math.sqrt(concatenatedEmbedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = concatenatedEmbedding.map(val => val / magnitude);

    await storeLecture({
      title: values.title,
      description: values.description,
      completed: false,
      lectureTranscriptionEmbedding: normalizedEmbedding,
      lectureTranscription: textChunkStorageIds,
      contentStorageId: storageId,
      moduleId: moduleId as Id<"modules">,
      fileType: "pdf"
    });
  }

  async function handleAudioUpload(file: File, values: z.infer<typeof formSchema>, moduleId: string, setUploadProgress: UploadProgressSetter): Promise<void> {
    const audioBuffer = await file.arrayBuffer();

    const results = await chunkAndProcess(
      audioBuffer,
      5 * 1024 * 1024, // 5MB chunks
      async (chunk, index, setProgress, totalChunks) => {
        const { storageId, embedding } = await transcribeAudio({
          audioChunk: chunk,
          chunkIndex: index,
        });
        setProgress(Math.min(100, Math.floor(((index + 1) / totalChunks) * 100)));
        return { storageId, embedding };
      },
      setUploadProgress
    );

    const allStorageIds: Id<"_storage">[] = results.map(r => r.storageId);
    const combinedEmbedding = results.reduce((acc, { embedding }) =>
      acc.map((val, i) => val + embedding[i]),
      new Array(1536).fill(0)
    );

    const magnitude = Math.sqrt(combinedEmbedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = combinedEmbedding.map(val => val / magnitude);

    const storageId = await uploadFile(file, file.type);

    await storeLecture({
      title: values.title,
      description: values.description,
      completed: false,
      lectureTranscriptionEmbedding: normalizedEmbedding,
      lectureTranscription: allStorageIds,
      contentStorageId: storageId,
      moduleId: moduleId as Id<"modules">,
      fileType: "audio"
    });
  }



  const handleVideoUpload = async (file: File, values: z.infer<typeof formSchema>, moduleId: string, setUploadProgress: UploadProgressSetter) => {



    const videoChunkIds = await chunkAndProcess(
      file,
      50 * 1024 * 1024, // 50MB chunks
      async (chunk, index, setProgress, totalChunks) => {
        const storageId = await uploadFile(new File([chunk], `chunk_${index}`), chunk.type);
        setProgress(Math.min(100, Math.floor(((index + 1) / totalChunks) * 50))); // First 50% for upload
        return storageId;
      },
      setUploadProgress
    );


    const audioBuffer = await extractAudio({ videoChunkIds: videoChunkIds })


    const results = await chunkAndProcess(
      audioBuffer,
      5 * 1024 * 1024, // 5MB chunks
      async (chunk, index, setProgress, totalChunks) => {
        const { storageId, embedding } = await transcribeAudio({
          audioChunk: chunk,
          chunkIndex: index,
        });
        setProgress(Math.min(100, Math.floor(((index + 1) / totalChunks) * 75)));
        return { storageId, embedding };
      },
      setUploadProgress
    );


    const allStorageIds: Id<"_storage">[] = results.map(r => r.storageId);
    const combinedEmbedding = results.reduce((acc, { embedding }) =>
      acc.map((val, i) => val + embedding[i]),
      new Array(1536).fill(0)
    );

    const magnitude = Math.sqrt(combinedEmbedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = combinedEmbedding.map(val => val / magnitude);


    const storageId = await uploadFile(file, file.type);


    await storeLecture({
      title: values.title,
      description: values.description,
      completed: false,
      lectureTranscriptionEmbedding: normalizedEmbedding,
      lectureTranscription: allStorageIds,
      contentStorageId: storageId,
      moduleId: moduleId as Id<"modules">,
      fileType: "audio"
    });

    setUploadProgress(100);

  }


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {

      const file = values.file;

      if (fileType === 'pdf') {
        await handlePdfUpload(file, values, moduleId, setUploadProgress);
      } else if (fileType === 'audio') {
        await handleAudioUpload(file, values, moduleId, setUploadProgress);
      } else {
        // Video
        await handleVideoUpload(file, values, moduleId, setUploadProgress);

      }

      setUploadProgress(100);

      toast({
        title: "Lecture uploaded successfully.",
        description: "Your lecture has been added to the module.",
      });

      onComplete();
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


  return (
    <>
      <DialogHeader>
        <DialogTitle>Upload {fileType === 'pdf' ? 'PDF' : fileType === 'audio' ? 'Audio' : 'Video'}</DialogTitle>
      </DialogHeader>
      {!isLoading ? (
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
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept={fileType === 'pdf' ? ".pdf" : "audio/*,video/*"}
                      onChange={(e) => field.onChange(e.target.files?.[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button type="submit">Upload Lecture</Button>
            </div>
          </form>
        </Form>
      ) : (
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
  );
};

export default LectureUploadForm;

