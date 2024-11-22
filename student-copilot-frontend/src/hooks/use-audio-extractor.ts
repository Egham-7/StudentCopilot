import { useCallback } from "react";

interface AudioSegment {
  id: number;
  startTime: string;
  endTime: string;
  audioData: ArrayBufferLike;
}

const useAudioExtractor = () => {
  const extractAudioFromVideo = useCallback(
    async (videoFile: File): Promise<AudioSegment[]> => {
      const formData = new FormData();
      formData.append("audioFile", videoFile);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/audio/segment`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    },
    [],
  );

  return { extractAudioFromVideo };
};

export default useAudioExtractor;
