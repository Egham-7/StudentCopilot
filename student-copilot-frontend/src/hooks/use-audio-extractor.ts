import { useCallback, useRef } from 'react';

const useAudioExtractor = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const extractAudioFromVideo = useCallback(async (videoFile: File): Promise<ArrayBuffer> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    // Use Web Workers for audio processing
    const worker = new Worker('/audio-worker.js');

    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        resolve(e.data.audioBuffer);
        worker.terminate();
      };

      worker.onerror = reject;
      worker.postMessage({ videoFile });
    });
  }, []);

  return { extractAudioFromVideo };
};

export default useAudioExtractor;

