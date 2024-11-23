import { useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";

const useExtractAudio = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();

  const MAX_CONTENT_LENGTH = 200 * 1024 * 1024; // 200 MB
  const TIMEOUT_MILLISECONDS = 300000;

  const extractAudio = useCallback(
    async (file: File): Promise<File> => {
      if (!isSignedIn && !isLoaded) {
        throw new Error("Must be signed in or loaded.");
      }

      if (!file.type.startsWith("video/")) {
        throw new Error("File must be a video file.");
      }

      const formData = new FormData();
      formData.append("file", file, file.name);

      const token = await getToken({
        template: "convex",
      });

      const response = await axios.post<File>(
        `${import.meta.env.VITE_API_URL}/api/Audio/convert`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: TIMEOUT_MILLISECONDS,
          maxContentLength: MAX_CONTENT_LENGTH,
          maxBodyLength: MAX_CONTENT_LENGTH,
        },
      );

      const videoFile = response.data;

      return videoFile;
    },
    [isLoaded, isSignedIn, getToken, MAX_CONTENT_LENGTH],
  );

  return {
    extractAudio,
  };
};

export default useExtractAudio;
