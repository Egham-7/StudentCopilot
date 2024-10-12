import { useCallback, useRef } from 'react';

const useAudioExtractor = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const extractAudioFromVideo = useCallback(async (videoFile: File): Promise<ArrayBuffer> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);

    await new Promise(resolve => {
      video.onloadedmetadata = resolve;
    });

    const source = audioContext.createMediaElementSource(video);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    video.play();

    const mediaRecorder = new MediaRecorder(destination.stream);
    const audioChunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.start();

    await new Promise(resolve => {
      video.onended = resolve;
    });

    mediaRecorder.stop();

    await new Promise(resolve => {
      mediaRecorder.onstop = resolve;
    });

    const audioBlob = new Blob(audioChunks, { type: 'audio/webm; codecs=opus' });
    const arrayBuffer = await audioBlob.arrayBuffer();

    URL.revokeObjectURL(video.src);

    return arrayBuffer;
  }, []);

  return { extractAudioFromVideo };
};

export default useAudioExtractor;

