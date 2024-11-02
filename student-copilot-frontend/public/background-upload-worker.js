const UPLOAD_QUEUE_KEY = 'lecture-upload-queue';

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  if (type === 'START_UPLOAD') {
    const { uploadData, resumePoint } = payload;
    await handleUpload(uploadData, resumePoint);
  }
});

async function handleUpload(uploadData, resumePoint = 0) {
  await saveUploadState(uploadData, resumePoint);

  try {

    for (let progress = resumePoint; progress <= 100; progress += 10) {
      self.postMessage({
        type: 'UPLOAD_PROGRESS',
        payload: { id: uploadId, progress }
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }


    self.postMessage({ type: 'UPLOAD_PROGRESS', payload: { progress: progress } });
  } catch (error) {
    self.postMessage({ type: 'UPLOAD_ERROR', payload: { error: error.message } });
  }
}

async function saveUploadState(uploadData, resumePoint) {
  const queue = await getUploadQueue();
  queue.push({ uploadData, resumePoint });
  await self.indexedDB.put(UPLOAD_QUEUE_KEY, queue);
}

async function getUploadQueue() {
  const db = await openDB('uploads-db', 1, {
    upgrade(db) {
      db.createObjectStore('uploads', { keyPath: 'id' });
    }
  });

  const queue = await db.get('uploads', UPLOAD_QUEUE_KEY) || [];
  return queue;
}

async function openDB(name, version, upgradeCallback) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => upgradeCallback(event.target.result);
  });
}
