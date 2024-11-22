import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import pdfToText from "react-pdftotext";
import * as z from "zod";
import { useWebsiteUploaders } from "./use-website-uploaders";
import { UploadProgressSetter } from "@/lib/lecture-upload-utils";
import { createFormSchema } from "@/lib/ui_utils";
import { TEXT_SPLITTER_CONFIG } from "@/lib/lecture-upload-utils";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import useAudioExtractor from "./use-audio-extractor";

export const useLectureUpload = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0.0);

  const transcribeAudio = useAction(api.lectures.transcribeAudio);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const storeLecture = useMutation(api.lectures.store);
  const getEmbedding = useAction(api.ai.generateTextEmbeddingClient);
  const { getUploader } = useWebsiteUploaders();

  const { extractAudioFromVideo, isReady } = useAudioExtractor();

  const uploadFile = async (
    file: File,
    contentType: string,
  ): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: file,
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

  const processText = async (
    text: string,
    setProgress: UploadProgressSetter,
  ) => {
    const textSplitter = new RecursiveCharacterTextSplitter(
      TEXT_SPLITTER_CONFIG,
    );
    const chunks = await textSplitter.splitText(text);

    const results = await Promise.all(
      chunks.map(async (chunk, index) => {
        const chunkFile = new File([chunk], `chunk-${index}.txt`, {
          type: "text/plain",
        });
        const storageId = await uploadFile(chunkFile, "text/plain");
        const embedding = await getEmbedding({ text: chunk });

        setProgress(
          Math.min(100, Math.floor(((index + 1) / chunks.length) * 100)),
        );

        return { storageId, embedding };
      }),
    );

    const storageIds = results.map((r) => r.storageId);
    const embeddings = results.map((r) => r.embedding);

    const averageEmbedding = new Array(1536)
      .fill(0)
      .map(
        (_, i) =>
          embeddings.reduce((sum, emb) => sum + emb[i], 0) / embeddings.length,
      );

    const magnitude = Math.sqrt(
      averageEmbedding.reduce((sum, val) => sum + val * val, 0),
    );
    const normalizedEmbedding = averageEmbedding.map((val) => val / magnitude);

    return { storageIds, normalizedEmbedding };
  };

  const handlePdfUpload = async (
    file: File,
    values: z.infer<ReturnType<typeof createFormSchema>>,
    moduleId: Id<"modules">,
    setUploadProgress: UploadProgressSetter,
  ): Promise<void> => {
    const storageId = await uploadFile(file, file.type);
    const rawText = await parsePdf(file);

    const { storageIds, normalizedEmbedding } = await processText(
      rawText,
      setUploadProgress,
    );

    await storeLecture({
      title: values.title,
      description: values.description,
      completed: false,
      lectureTranscriptionEmbedding: normalizedEmbedding,
      lectureTranscription: storageIds,
      contentStorageId: storageId,
      moduleId,
      fileType: "pdf",
      image: undefined,
    });
  };

  const handleAudioUpload = async (
    file: File,
    values: z.infer<ReturnType<typeof createFormSchema>>,
    moduleId: Id<"modules">,
    setUploadProgress: UploadProgressSetter,
  ): Promise<void> => {
    if (isReady) {
      const audioSegments = await extractAudioFromVideo(file);

      console.log("Audio Segments: ", audioSegments);

      const results = await Promise.all(
        audioSegments.map(async (segment, index) => {
          const { storageId, embedding } = await transcribeAudio({
            audioChunk: new Uint8Array(segment.audioData).buffer,
            chunkIndex: index,
          });

          setUploadProgress(
            25 +
              Math.min(
                50,
                Math.floor(((index + 1) / audioSegments.length) * 50),
              ),
          );

          return { storageId, embedding };
        }),
      );

      const storageIds = results.map((r) => r.storageId);

      const averageEmbedding = new Array(1536)
        .fill(0)
        .map(
          (_, i) =>
            results.reduce((sum, r) => sum + r.embedding[i], 0) /
            results.length,
        );

      const magnitude = Math.sqrt(
        averageEmbedding.reduce((sum, val) => sum + val * val, 0),
      );

      const normalizedEmbedding = averageEmbedding.map(
        (val) => val / magnitude,
      );

      const storageId = await uploadFile(file, file.type);

      await storeLecture({
        title: values.title,
        description: values.description,
        completed: false,
        lectureTranscriptionEmbedding: normalizedEmbedding,
        lectureTranscription: storageIds,
        contentStorageId: storageId,
        moduleId: moduleId,
        fileType: "audio",
        image: undefined,
      });
    }
  };

  const handleVideoUpload = async (
    file: File,
    values: z.infer<ReturnType<typeof createFormSchema>>,
    moduleId: Id<"modules">,
    setUploadProgress: UploadProgressSetter,
  ) => {
    if (isReady) {
      const audioSegments = await extractAudioFromVideo(file);
      console.log("Audio Segments: ", audioSegments);
      setUploadProgress(25);

      const results = await Promise.all(
        audioSegments.map(async (segment, index) => {
          const { storageId, embedding } = await transcribeAudio({
            audioChunk: new Uint8Array(segment.audioData).buffer,
            chunkIndex: index,
          });

          setUploadProgress(
            25 +
              Math.min(
                50,
                Math.floor(((index + 1) / audioSegments.length) * 50),
              ),
          );

          return { storageId, embedding };
        }),
      );

      const storageIds = results.map((r) => r.storageId);

      const averageEmbedding = new Array(1536)
        .fill(0)
        .map(
          (_, i) =>
            results.reduce((sum, r) => sum + r.embedding[i], 0) /
            results.length,
        );

      const magnitude = Math.sqrt(
        averageEmbedding.reduce((sum, val) => sum + val * val, 0),
      );

      const normalizedEmbedding = averageEmbedding.map(
        (val) => val / magnitude,
      );

      const videoId = await uploadFile(file, file.type);
      setUploadProgress(90);

      await storeLecture({
        title: values.title,
        description: values.description,
        completed: false,
        lectureTranscriptionEmbedding: normalizedEmbedding,
        lectureTranscription: storageIds,
        contentStorageId: videoId,
        moduleId: moduleId,
        fileType: "video",
        image: undefined,
      });

      setUploadProgress(100);
    }
  };

  const uploadLecture = async (
    values: z.infer<ReturnType<typeof createFormSchema>>,
    moduleId: Id<"modules">,
    fileType: "pdf" | "audio" | "video" | "website",
  ) => {
    setIsLoading(true);
    try {
      let success = false;

      if (values.type === "website") {
        success = await handleWebsiteUpload(values, moduleId);
      } else if (
        values.type === "file" &&
        values.file &&
        fileType !== "website"
      ) {
        success = await handleFileUpload(values, moduleId, fileType);
      } else {
        throw new Error("Invalid form data");
      }

      if (success) {
        showSuccessToast();
      }

      return success;
    } catch (error) {
      console.error("Upload failed:", error);
      showErrorToast();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebsiteUpload = async (
    values: z.infer<ReturnType<typeof createFormSchema>>,
    moduleId: Id<"modules">,
  ): Promise<boolean> => {
    if (values.type !== "website") throw new Error("Has to be a website.");

    try {
      const uploader = getUploader(values.link);

      return await uploader.upload(values, moduleId, setUploadProgress);
    } catch (err) {
      if (err instanceof Error) {
        showErrorToast(err.message);
      }
    }

    return false;
  };

  const handleFileUpload = async (
    values: z.infer<ReturnType<typeof createFormSchema>> & {
      type: "file";
      file: File;
    },
    moduleId: Id<"modules">,
    fileType: "pdf" | "audio" | "video",
  ): Promise<boolean> => {
    switch (fileType) {
      case "pdf":
        await handlePdfUpload(values.file, values, moduleId, setUploadProgress);
        break;
      case "audio":
        await handleAudioUpload(
          values.file,
          values,
          moduleId,
          setUploadProgress,
        );
        break;
      case "video":
        await handleVideoUpload(
          values.file,
          values,
          moduleId,
          setUploadProgress,
        );
        break;
      default:
        throw new Error("Unsupported file type");
    }
    setUploadProgress(100);
    return true;
  };

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
