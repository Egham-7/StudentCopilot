import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { z } from "zod";
import { useWebsiteUploaders } from "./use-website-uploaders";
import { UploadProgressSetter } from "@/lib/lecture-upload-utils";
import { createFormSchema } from "@/lib/ui_utils";
import { TEXT_SPLITTER_CONFIG } from "@/lib/lecture-upload-utils";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import useSegmentAudio from "./use-segment-audio";
import useExtractAudio from "./use-extract-audio";
import { pdfjs } from "@/lib/pdf-config";

export const useLectureUpload = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0.0);

  const transcribeAudio = useAction(api.lectures.transcribeAudio);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const storeLecture = useMutation(api.lectures.store);
  const getEmbedding = useAction(api.ai.generateTextEmbeddingClient);
  const { getUploader } = useWebsiteUploaders();

  const { segmentAudio, isReady } = useSegmentAudio();

  const { extractAudio } = useExtractAudio();

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
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({
      data: arrayBuffer,
      cMapUrl: "../node_modules/pdfjs-dist/cmaps/",
      cMapPacked: true,
      disableFontFace: true,
    }).promise;

    const images: { data: Uint8Array; pageNum: number }[] = [];
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // Extract text
      const textContent = await page.getTextContent();
      fullText +=
        textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ") + "\n";

      // Extract images using the more reliable render method
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context!,
        viewport: viewport,
      }).promise;

      // Convert rendered page to image data
      const imageData = context!.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      images.push({
        data: new Uint8Array(imageData.data.buffer),
        pageNum,
      });
    }

    return { text: fullText, images };
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

  const processImages = async (
    images: { data: Uint8Array; pageNum: number }[],
    setProgress: UploadProgressSetter,
  ) => {
    const results = await Promise.all(
      images.map(async ({ data, pageNum }, index) => {
        const imageBlob = new Blob([data], { type: "image/png" });
        const imageFile = new File(
          [imageBlob],
          `image-${pageNum}-${index}.png`,
          { type: "image/png" },
        );
        const storageId = await uploadFile(imageFile, "image/png");

        setProgress(
          Math.min(100, Math.floor(((index + 1) / images.length) * 100)),
        );

        return {
          storageId,
          pageNumber: pageNum,
        };
      }),
    );

    return results;
  };

  const handlePdfUpload = async (
    file: File,
    values: z.infer<ReturnType<typeof createFormSchema>>,
    moduleId: Id<"modules">,
    setUploadProgress: UploadProgressSetter,
  ): Promise<void> => {
    const storageId = await uploadFile(file, file.type);
    const { text, images } = await parsePdf(file);

    const { storageIds, normalizedEmbedding } = await processText(
      text,
      setUploadProgress,
    );

    const processedImages = await processImages(images, setUploadProgress);

    await storeLecture({
      title: values.title,
      description: values.description,
      completed: false,
      contentStorageId: storageId,
      moduleId,
      fileType: "pdf",
      image: undefined,
      lectureData: {
        transcriptionChunks: storageIds,
        embedding: normalizedEmbedding,
        images: processedImages,
      },
    });
  };

  const handleAudioUpload = async (
    file: File,
    values: z.infer<ReturnType<typeof createFormSchema>>,
    moduleId: Id<"modules">,
    setUploadProgress: UploadProgressSetter,
  ): Promise<void> => {
    if (isReady) {
      // Initial segmentation - 0% to 20%
      setUploadProgress(10);
      const audioSegments = await segmentAudio(file);
      setUploadProgress(20);

      // Transcription phase - 20% to 70%
      const transcriptionProgressPerSegment = 50 / audioSegments.length;
      const results = await Promise.all(
        audioSegments.map(async (segment, index) => {
          const { storageId, embedding } = await transcribeAudio({
            audioChunk: segment.audioData,
            chunkIndex: index,
          });

          // Calculate progress based on completed segments
          const transcriptionProgress =
            20 + (index + 1) * transcriptionProgressPerSegment;
          setUploadProgress(Math.floor(transcriptionProgress));

          return { storageId, embedding };
        }),
      );

      // Processing embeddings - 70% to 80%
      setUploadProgress(75);
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
      setUploadProgress(80);

      // Final storage phase - 80% to 95%
      const storageId = await uploadFile(file, file.type);
      setUploadProgress(90);

      // Storing lecture data - 95% to 100%
      await storeLecture({
        title: values.title,
        description: values.description,
        completed: false,
        lectureData: {
          transcriptionChunks: storageIds,
          embedding: normalizedEmbedding,
        },
        contentStorageId: storageId,
        moduleId: moduleId,
        fileType: "audio",
        image: undefined,
      });
    }

    setUploadProgress(100);
  };

  const handleVideoUpload = async (
    file: File,
    values: z.infer<ReturnType<typeof createFormSchema>>,
    moduleId: Id<"modules">,
    setUploadProgress: UploadProgressSetter,
  ) => {
    if (isReady) {
      // Audio extraction: 0-15%
      setUploadProgress(0);
      const audioFile = await extractAudio(file);
      setUploadProgress(15);

      // Audio segmentation: 15-25%
      const audioSegments = await segmentAudio(audioFile);
      setUploadProgress(25);

      // Transcription and embedding: 25-85%
      const transcriptionProgressRange = 60; // 85 - 25
      const progressPerSegment =
        transcriptionProgressRange / audioSegments.length;

      const results = await Promise.all(
        audioSegments.map(async (segment, index) => {
          const { storageId, embedding } = await transcribeAudio({
            audioChunk: segment.audioData,
            chunkIndex: index,
          });

          setUploadProgress(25 + Math.floor((index + 1) * progressPerSegment));
          return { storageId, embedding };
        }),
      );

      // Calculate embeddings: 85-90%
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
      setUploadProgress(90);

      // Final storage: 90-100%
      const videoId = await uploadFile(file, file.type);
      setUploadProgress(95);

      await storeLecture({
        title: values.title,
        description: values.description,
        completed: false,
        lectureData: {
          embedding: normalizedEmbedding,
          transcriptionChunks: storageIds,
        },
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
      if (error instanceof Error) {
        showErrorToast(error.message);
      }
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
