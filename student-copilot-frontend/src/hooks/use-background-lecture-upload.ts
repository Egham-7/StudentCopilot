import { useState, useCallback, useEffect } from 'react';
import { Id } from 'convex/_generated/dataModel';
import * as z from 'zod';
import { createFormSchema } from '@/lib/ui_utils';

interface BackgroundUploadState {
  id: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

type UploadMap = Map<string, BackgroundUploadState>;

export const useBackgroundUpload = () => {
  const [uploads, setUploads] = useState<UploadMap>(new Map());
  const [worker, setWorker] = useState<Worker | null>(null);

  const updateUploadProgress = useCallback((id: string, progress: number) => {
    setUploads((prev) => {
      const newMap = new Map(prev);
      const currentUpload = newMap.get(id);
      if (currentUpload) {
        newMap.set(id, {
          ...currentUpload,
          progress,
          status: 'processing'
        });
      }
      return newMap;
    });
  }, []);

  const completeUpload = useCallback((id: string) => {
    setUploads((prev) => {
      const newMap = new Map(prev);
      const currentUpload = newMap.get(id);
      if (currentUpload) {
        newMap.set(id, {
          ...currentUpload,
          progress: 100,
          status: 'completed'
        });
      }
      return newMap;
    });
  }, []);

  const handleUploadError = useCallback((id: string, error: string) => {
    setUploads((prev) => {
      const newMap = new Map(prev);
      const currentUpload = newMap.get(id);
      if (currentUpload) {
        newMap.set(id, {
          ...currentUpload,
          status: 'error',
          error
        });
      }
      return newMap;
    });
  }, []);

  useEffect(() => {
    const bgWorker = new Worker('/background-upload-worker.js');

    bgWorker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'UPLOAD_PROGRESS':
          updateUploadProgress(payload.id, payload.progress);
          break;
        case 'UPLOAD_COMPLETE':
          completeUpload(payload.id);
          break;
        case 'UPLOAD_ERROR':
          handleUploadError(payload.id, payload.error);
          break;
      }
    };

    setWorker(bgWorker);

    return () => bgWorker.terminate();
  }, [updateUploadProgress, completeUpload, handleUploadError]);

  const startBackgroundUpload = useCallback(async (
    values: z.infer<ReturnType<typeof createFormSchema>>,
    moduleId: Id<"modules">,
    fileType: 'pdf' | 'audio' | 'video' | 'website'
  ) => {
    if (!worker) return;

    const uploadId = crypto.randomUUID();

    setUploads((prev) => {
      const newMap = new Map(prev);
      newMap.set(uploadId, {
        id: uploadId,
        progress: 0,
        status: 'pending'
      });
      return newMap;
    });

    worker.postMessage({
      type: 'START_UPLOAD',
      payload: {
        uploadId,
        values,
        moduleId,
        fileType
      }
    });

    return uploadId;
  }, [worker]);

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  return {
    startBackgroundUpload,
    removeUpload,
    uploads,
  };
};

