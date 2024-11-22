import { useAuth } from "@clerk/clerk-react";
import { useCallback } from "node_modules/react-resizable-panels/dist/declarations/src/vendor/react";
import axios from "axios";

interface AudioSegment {
  id: number;
  startTime: string;
  endTime: string;
  audioData: number[];
}

const useAudioExtractor = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const MAX_TOKENS_PER_SEGMENT = 16384;

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
          timeout: 300000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      );

      return response.data;
    },
    [isSignedIn, isLoaded, getToken],
  );

  return {
    extractAudioFromVideo,
    isReady: isLoaded && isSignedIn,
  };
};

export default useAudioExtractor;
