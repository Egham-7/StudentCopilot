import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { Id } from "convex/_generated/dataModel";
import { z } from "zod";
import { createFormSchema } from "@/lib/ui_utils";

import {
  UploadProgressSetter,
  CHUNK_SIZE,
  chunkAndProcess,
} from "@/lib/lecture-upload-utils";

export type UploadFunction = (
  values: z.infer<ReturnType<typeof createFormSchema>>,
  moduleId: Id<"modules">,
  setUploadProgress: UploadProgressSetter,
) => Promise<boolean>;

export type WebsiteUploader = {
  canHandle: (url: string) => boolean;
  upload: UploadFunction;
};

export const useWebsiteUploaders = () => {
  const storeLecture = useMutation(api.lectures.store);
  const getWebsiteText = useAction(api.websites.html.getWebsiteTranscription);
  const getEmbedding = useAction(api.ai.generateTextEmbeddingClient);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const getYoutubeVideoTranscription = useAction(api.websites.youtube.getYoutubeTranscript);

  const uploaders = useMemo(() => {
    const uploadFile = async (file: File) => {
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResult.ok) {
        throw new Error(`Failed to upload ${file.name}`);
      }
      return (await uploadResult.json()).storageId;
    };

    const processTextChunk = async (
      chunkText: string,
      index: number,
      setUploadProgress: UploadProgressSetter,
      totalChunks: number,
    ): Promise<{ storageId: Id<"_storage">; embedding: number[] }> => {
      const uploadChunkUrl = await generateUploadUrl();
      const uploadChunkResult = await fetch(uploadChunkUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: chunkText,
      });
      if (!uploadChunkResult.ok) {
        throw new Error(`Failed to upload text chunk ${index}.`);
      }
      const { storageId } = await uploadChunkResult.json();
      const chunkEmbedding = await getEmbedding({ text: chunkText });
      setUploadProgress(
        Math.min(100, Math.floor(((index + 1) / totalChunks) * 100)),
      );
      return { storageId, embedding: chunkEmbedding };
    };

    const processTranscription = async (
      transcription: string,
      setUploadProgress: UploadProgressSetter,
    ) => {
      const results = await chunkAndProcess(
        transcription,
        CHUNK_SIZE,
        processTextChunk,
        setUploadProgress,
      );
      const textChunkStorageIds = results.map((result) => result.storageId);
      const allEmbeddings = results.map((result) => result.embedding);
      const concatenatedEmbedding = new Array(1536)
        .fill(0)
        .map(
          (_, i) =>
            allEmbeddings.reduce(
              (acc, embedding) => acc + (embedding[i] || 0),
              0,
            ) / allEmbeddings.length,
        );
      const magnitude = Math.sqrt(
        concatenatedEmbedding.reduce((sum, val) => sum + val * val, 0),
      );
      const normalizedEmbedding = concatenatedEmbedding.map(
        (val) => val / magnitude,
      );
      return { textChunkStorageIds, normalizedEmbedding };
    };

    const createUploader = (
      canHandle: (url: string) => boolean,
      getTranscription: (link: string) => Promise<string>,
      getImage?: (link: string) => Promise<File | undefined>,
    ): WebsiteUploader => ({
      canHandle,
      upload: async (values, moduleId, setUploadProgress) => {
        if (values.type !== "website")
          throw new Error("Cannot upload a non-website.");
        const linkStorageId = await uploadFile(
          new File([values.link], "link.txt", { type: "text/plain" }),
        );
        const transcription = await getTranscription(values.link);
        const { textChunkStorageIds, normalizedEmbedding } =
          await processTranscription(transcription, setUploadProgress);
        const image = getImage ? await getImage(values.link) : undefined;
        const imageStorageId = image ? await uploadFile(image) : undefined;
        await storeLecture({
          title: values.title,
          description: values.description,
          completed: false,
          lectureTranscriptionEmbedding: normalizedEmbedding,
          lectureTranscription: textChunkStorageIds,
          contentStorageId: linkStorageId,
          moduleId: moduleId as Id<"modules">,
          fileType: "website",
          image: imageStorageId,
        });
        return true;
      },
    });

    const isYoutubeUrl = (url: string): boolean => {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      return youtubeRegex.test(url);
    }

    return [

      createUploader(
        (url: string): boolean => isYoutubeUrl(url),
        (link: string) => getYoutubeVideoTranscription({ videoUrl: link })

      ),

      createUploader(
        () => true,
        (link) => getWebsiteText({ link }),
      ),
    ];
  }, [getWebsiteText, storeLecture, generateUploadUrl, getEmbedding, getYoutubeVideoTranscription]);

  const getUploader = (url: string): WebsiteUploader =>
    uploaders.find((uploader) => uploader.canHandle(url)) ||
    uploaders[uploaders.length - 1];

  return { getUploader };
};
