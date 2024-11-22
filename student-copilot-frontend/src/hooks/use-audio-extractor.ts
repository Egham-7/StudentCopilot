import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { useCallback } from "react";

interface AudioSegment {
  id: number;
  startTime: string;
  endTime: string;
  audioData: ArrayBuffer;
}

const useAudioExtractor = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const MAX_TOKENS_PER_SEGMENT = 16384;
  const MAX_CONTENT_LENGTH = 200 * 1024 * 1024; // 200 MB
  const TIMEOUT_MILLISECONDS = 300000;

  const extractAudioFromVideo = useCallback(
    async (file: File): Promise<AudioSegment[]> => {
      if (!isLoaded || !isSignedIn) {
        throw new Error("Authentication required");
      }

      const formData = new FormData();
      formData.append("file", file, file.name);

      const token = await getToken({
        template: "convex",
      });

      const response = await axios.post<AudioSegment[]>(
        `${import.meta.env.VITE_API_URL}/api/Audio/segment`,
        formData,
        {
          params: { maxTokensPerSegment: MAX_TOKENS_PER_SEGMENT },
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: TIMEOUT_MILLISECONDS,
          maxContentLength: MAX_CONTENT_LENGTH,
          maxBodyLength: MAX_CONTENT_LENGTH,
        },
      );

      return response.data;
    },
    [isSignedIn, isLoaded, getToken, MAX_CONTENT_LENGTH, TIMEOUT_MILLISECONDS],
  );

  return {
    extractAudioFromVideo,
    isReady: isLoaded && isSignedIn,
  };
};

export default useAudioExtractor;
