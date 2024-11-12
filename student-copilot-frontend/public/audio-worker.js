self.onmessage = async function(e) {
  const { videoFile } = e.data;


  // Set up audio processing context
  const audioContext = new AudioContext();
  const videoElement = await createVideoElement(videoFile);
  const source = audioContext.createMediaElementSource(videoElement);
  const destination = audioContext.createMediaStreamDestination();

  source.connect(destination);

  // Set up media recording
  const mediaRecorder = new MediaRecorder(destination.stream);
  const audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  // Start recording and playing
  mediaRecorder.start();
  videoElement.play();

  // Wait for video to finish
  await new Promise(resolve => {
    videoElement.onended = resolve;
  });

  mediaRecorder.stop();

  // Wait for recording to finish
  await new Promise(resolve => {
    mediaRecorder.onstop = resolve;
  });

  const audioBlob = new Blob(audioChunks, { type: 'audio/webm; codecs=opus' });
  const audioBuffer = await audioBlob.arrayBuffer();

  // Send processed audio back to main thread
  self.postMessage({ audioBuffer }, [audioBuffer]);
};

// Helper function to create video element in worker context
async function createVideoElement(videoFile) {
  const video = document.createElement('video');
  video.src = URL.createObjectURL(videoFile);

  await new Promise(resolve => {
    video.onloadedmetadata = resolve;
  });

  return video;
}

