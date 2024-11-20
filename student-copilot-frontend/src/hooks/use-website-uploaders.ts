import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { Id } from "convex/_generated/dataModel";
import { z } from "zod";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createFormSchema } from "@/lib/ui_utils";
import { UploadProgressSetter } from "@/lib/lecture-upload-utils";

import { TEXT_SPLITTER_CONFIG } from "@/lib/lecture-upload-utils";

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
    const uploadFile = async (file: File): Promise<Id<"_storage">> => {
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
      totalChunks: number,
      setUploadProgress: UploadProgressSetter,
    ): Promise<{ storageId: Id<"_storage">; embedding: number[] }> => {
      const uploadChunkUrl = await generateUploadUrl();
      const uploadChunkResult = await fetch(uploadChunkUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: chunkText,
      });

      if (!uploadChunkResult.ok) {
        throw new Error(`Failed to upload text chunk ${index}`);
      }

      const { storageId } = await uploadChunkResult.json();
      const chunkEmbedding = await getEmbedding({ text: chunkText });

      setUploadProgress(Math.min(100, Math.floor(((index + 1) / totalChunks) * 100)));

      return { storageId, embedding: chunkEmbedding };
    };

    const processTranscription = async (
      transcription: string,
      setUploadProgress: UploadProgressSetter,
    ) => {
      const textSplitter = new RecursiveCharacterTextSplitter(TEXT_SPLITTER_CONFIG);
      const chunks = await textSplitter.splitText(transcription);

      const results = await Promise.all(
        chunks.map((chunk, index) =>
          processTextChunk(chunk, index, chunks.length, setUploadProgress)
        )
      );

      const textChunkStorageIds = results.map(result => result.storageId);
      const embeddings = results.map(result => result.embedding);

      // Calculate average embedding
      const averageEmbedding = new Array(1536).fill(0).map((_, i) =>
        embeddings.reduce((sum, embedding) => sum + (embedding[i] || 0), 0) / embeddings.length
      );

      // Normalize the average embedding
      const magnitude = Math.sqrt(averageEmbedding.reduce((sum, val) => sum + val * val, 0));
      const normalizedEmbedding = averageEmbedding.map(val => val / magnitude);

      return { textChunkStorageIds, normalizedEmbedding };
    };

    const createUploader = (
      canHandle: (url: string) => boolean,
      getTranscription: (link: string) => Promise<string>,
      getImage?: (link: string) => Promise<File | undefined>,
    ): WebsiteUploader => ({
      canHandle,
      upload: async (values, moduleId, setUploadProgress) => {
        if (values.type !== "website") {
          throw new Error("Invalid content type for website uploader");
        }

        const linkStorageId = await uploadFile(
          new File([values.link], "link.txt", { type: "text/plain" })
        );

        const transcription = await getTranscription(values.link);
        const { textChunkStorageIds, normalizedEmbedding } = await processTranscription(
          transcription,
          setUploadProgress
        );

        const image = getImage ? await getImage(values.link) : undefined;
        const imageStorageId = image ? await uploadFile(image) : undefined;

        await storeLecture({
          title: values.title,
          description: values.description,
          completed: false,
          lectureTranscriptionEmbedding: normalizedEmbedding,
          lectureTranscription: textChunkStorageIds,
          contentStorageId: linkStorageId,
          moduleId,
          fileType: "website",
          image: imageStorageId,
        });

        return true;
      },
    });

    const isYoutubeUrl = (url: string): boolean =>
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url);

    return [
      createUploader(
        isYoutubeUrl,
        (link: string) => getYoutubeVideoTranscription({ videoUrl: link })
      ),
      createUploader(
        () => true,
        (link) => getWebsiteText({ link }),
      ),
    ];
  }, [getWebsiteText, storeLecture, generateUploadUrl, getEmbedding, getYoutubeVideoTranscription]);

  const getUploader = (url: string): WebsiteUploader =>
    uploaders.find((uploader) => uploader.canHandle(url)) ?? uploaders[uploaders.length - 1];

  return { getUploader };
};

