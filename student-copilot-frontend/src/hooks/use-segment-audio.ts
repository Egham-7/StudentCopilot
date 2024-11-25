import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { useCallback } from "react";

interface AudioSegment {
  id: number;
  startTime: string;
  endTime: string;
  audioData: ArrayBuffer;
}

interface RawAudioSegment {
  id: number;
  startTime: string;
  endTime: string;
  audioData: string;
}

const processAudioSegment = (segment: RawAudioSegment): ArrayBuffer => {
  const binaryString = window.atob(segment.audioData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const useSegmentAudio = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const MAX_TOKENS_PER_SEGMENT = 16384;
  const MAX_CONTENT_LENGTH = 200 * 1024 * 1024; // 200 MB
  const TIMEOUT_MILLISECONDS = 300000;

  const segmentAudio = useCallback(
    async (file: File): Promise<AudioSegment[]> => {
      if (!isLoaded || !isSignedIn) {
        throw new Error("Authentication required");
      }

      if (!file.type.startsWith("audio/")) {
        throw new Error("Must pass an audio file.");
      }

      const formData = new FormData();
      formData.append("file", file, file.name);

      const token = await getToken({
        template: "convex",
      });

      console.log("VITE API URL", import.meta.env.VITE_API_URL);

      const response = await axios.post<RawAudioSegment[]>(
        `c-api-production.up.railway.app/Audio/segment`,
        formData,
        {
          params: { maxTokensPerSegment: MAX_TOKENS_PER_SEGMENT },
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
          timeout: TIMEOUT_MILLISECONDS,
          maxContentLength: MAX_CONTENT_LENGTH,
          maxBodyLength: MAX_CONTENT_LENGTH,
        },
      );

      const segments = response.data.map((segment) => ({
        ...segment,
        audioData: processAudioSegment(segment),
      }));

      return segments;
    },
    [isSignedIn, isLoaded, getToken, MAX_CONTENT_LENGTH, TIMEOUT_MILLISECONDS],
  );

  return {
    segmentAudio,
    isReady: isLoaded && isSignedIn,
  };
};

export default useSegmentAudio;
