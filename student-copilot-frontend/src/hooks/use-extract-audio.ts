import { useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";

const useExtractAudio = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();

  const MAX_CONTENT_LENGTH = 200 * 1024 * 1024; // 200 MB
  const TIMEOUT_MILLISECONDS = 300000;

  const extractAudio = useCallback(
    async (file: File): Promise<File> => {
      if (!isSignedIn || !isLoaded) {
        throw new Error("Must be signed in or loaded.");
      }

      const formData = new FormData();
      formData.append("file", file, file.name);

      const token = await getToken({
        template: "convex",
      });

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/Audio/convert`,
        formData,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: TIMEOUT_MILLISECONDS,
          maxContentLength: MAX_CONTENT_LENGTH,
          maxBodyLength: MAX_CONTENT_LENGTH,
          responseType: "blob",
        },
      );

      const audioBlob = new Blob([response.data], { type: "audio/mp3" });
      const audioFile = new File(
        [audioBlob],
        `${file.name.split(".")[0]}.mp3`,
        { type: "audio/mp3" },
      );

      return audioFile;
    },
    [isLoaded, isSignedIn, getToken, MAX_CONTENT_LENGTH],
  );

  return {
    extractAudio,
  };
};

export default useExtractAudio;
