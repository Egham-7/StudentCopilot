import { useAuth } from "@clerk/clerk-react";
import { useCallback } from "react";
import axios from "axios";

export interface AudioSegment {
  id: number;
  startTime: string;
  endTime: string;
  audioData: ArrayBufferLike;
}

const useAudioExtractor = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const MAX_TOKENS_PER_SEGMENT = 16384;

  const extractAudioFromVideo = useCallback(
    async (file: File): Promise<AudioSegment[]> => {
      if (!isLoaded || !isSignedIn) {
        throw new Error("Authentication required");
      }

      if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
        throw new Error(
          "Invalid file type. Please upload a audio or video file.",
        );
      }

      try {
        const formData = new FormData();
        formData.append("file", file, file.name);

        const token = await getToken({
          template: "convex",
        });

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/Audio/segment`,
          formData,
          {
            params: {
              maxTokensPerSegment: MAX_TOKENS_PER_SEGMENT,
            },
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
            timeout: 300000, // 5 minute timeout
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          },
        );

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.message || error.message;
          if (error.code === "ECONNABORTED") {
            throw new Error(
              "Request timed out. The file might be too large or the server is busy.",
            );
          }
          throw new Error(errorMessage);
        }
        throw error;
      }
    },
    [isSignedIn, isLoaded, getToken],
  );

  return {
    extractAudioFromVideo,
    isReady: isLoaded && isSignedIn,
  };
};

export default useAudioExtractor;
