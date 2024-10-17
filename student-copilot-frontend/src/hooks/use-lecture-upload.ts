import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import pdfToText from 'react-pdftotext';
import * as z from 'zod';
import { formSchema } from '@/lib/ui_utils';
import useAudioExtractor from './use-audio-extractor';
import { useWebsiteUploaders } from './use-website-uploaders';
import { chunkAndProcess, UploadProgressSetter } from '@/lib/lecture-upload-utils';
const PDF_CHUNK_SIZE = 500; // 500 words


export const useLectureUpload = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0.0);

  const transcribeAudio = useAction(api.lectures.transcribeAudio);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const storeLecture = useMutation(api.lectures.store);
  const getEmbedding = useAction(api.ai.generateTextEmbeddingClient);
  const { getUploader } = useWebsiteUploaders();


  const { extractAudioFromVideo } = useAudioExtractor();

  const uploadFile = async (file: File, contentType: string): Promise<Id<"_storage">> => {
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
  };

  const parsePdf = async (file: File) => {
    const text = await pdfToText(file);
    return text;
  };

  const processTextChunk = async (
    chunkText: string,
    index: number,
    setUploadProgress: UploadProgressSetter,
    totalChunks: number
  ): Promise<{ storageId: Id<"_storage">; embedding: number[] }> => {
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
  };




  const handlePdfUpload = async (
    file: File,
    values: z.infer<typeof formSchema>,
    moduleId: Id<"modules">,
    setUploadProgress: UploadProgressSetter
  ): Promise<void> => {
    const storageId = await uploadFile(file, file.type);
    const rawText = await parsePdf(file);
    const results = await chunkAndProcess(
      rawText,
      PDF_CHUNK_SIZE,
      processTextChunk,
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
      moduleId: moduleId,
      fileType: "pdf",
      image: undefined
    });
  };


  const processAudio = async (audioBuffer: ArrayBuffer, setUploadProgress: UploadProgressSetter) => {
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

    return {
      allStorageIds,
      normalizedEmbedding
    };
  };


  const handleAudioUpload = async (
    file: File,
    values: z.infer<typeof formSchema>,
    moduleId: Id<"modules">,
    setUploadProgress: UploadProgressSetter
  ): Promise<void> => {
    const audioBuffer = await file.arrayBuffer();
    const { allStorageIds, normalizedEmbedding } = await processAudio(audioBuffer, setUploadProgress);

    const storageId = await uploadFile(file, file.type);

    await storeLecture({
      title: values.title,
      description: values.description,
      completed: false,
      lectureTranscriptionEmbedding: normalizedEmbedding,
      lectureTranscription: allStorageIds,
      contentStorageId: storageId,
      moduleId: moduleId,
      fileType: "audio",
      image: undefined
    });
  };

  const handleVideoUpload = async (
    file: File,
    values: z.infer<typeof formSchema>,
    moduleId: Id<"modules">,
    setUploadProgress: UploadProgressSetter
  ) => {
    const audioBuffer = await extractAudioFromVideo(file);
    setUploadProgress(25);

    const { allStorageIds, normalizedEmbedding } = await processAudio(audioBuffer, (progress) => {
      setUploadProgress(25 + progress * 0.5);
    });

    const videoId = await uploadFile(file, file.type);
    setUploadProgress(90);

    await storeLecture({
      title: values.title,
      description: values.description,
      completed: false,
      lectureTranscriptionEmbedding: normalizedEmbedding,
      lectureTranscription: allStorageIds,
      contentStorageId: videoId,
      moduleId: moduleId,
      fileType: "video",
      image: undefined
    });

    setUploadProgress(100);
  };

  const uploadLecture = async (
    values: z.infer<typeof formSchema>,
    moduleId: Id<"modules">,
    fileType: 'pdf' | 'audio' | 'video' | 'website'
  ) => {
    setIsLoading(true);
    try {
      let success = false;

      if (values.type === 'website') {
        success = await handleWebsiteUpload(values, moduleId);
      } else if (values.type === 'file' && values.file && fileType !== "website") {
        success = await handleFileUpload(values, moduleId, fileType);
      } else {
        throw new Error("Invalid form data");
      }

      if (success) {
        showSuccessToast();
      }

      return success;
    } catch (error) {
      console.error('Upload failed:', error);
      showErrorToast();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebsiteUpload = async (
    values: z.infer<typeof formSchema>,
    moduleId: Id<"modules">
  ): Promise<boolean> => {

    if (values.type !== "website") throw new Error("Has to be a website.");

    try {
      const uploader = getUploader(values.link);

      return await uploader.upload(values, moduleId, setUploadProgress);
    } catch (err: any) {
      showErrorToast("Failed to get transcription");
    }

    return false;
  };


  const handleFileUpload = async (
    values: z.infer<typeof formSchema> & { type: 'file', file: File },
    moduleId: Id<"modules">,
    fileType: 'pdf' | 'audio' | 'video'
  ): Promise<boolean> => {
    switch (fileType) {
      case 'pdf':
        await handlePdfUpload(values.file, values, moduleId, setUploadProgress);
        break;
      case 'audio':
        await handleAudioUpload(values.file, values, moduleId, setUploadProgress);
        break;
      case 'video':
        await handleVideoUpload(values.file, values, moduleId, setUploadProgress);
        break;
      default:
        throw new Error("Unsupported file type");
    }
    setUploadProgress(100);
    return true;
  }

  const showSuccessToast = () => {
    toast({
      title: "Lecture uploaded successfully.",
      description: "Your lecture has been added to the module.",
    });
  };

  const showErrorToast = (message?: string) => {
    toast({
      title: "Upload failed.",
      description: message || "Hang tight and try again later!",
      variant: "destructive",
    });
  };


  return {
    isLoading,
    uploadProgress,
    uploadLecture,
  };
};

