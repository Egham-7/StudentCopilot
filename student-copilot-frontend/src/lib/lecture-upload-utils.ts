
export type UploadProgressSetter = (progress: number) => void;

export const TEXT_SPLITTER_CONFIG = {
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", " ", ""],
};


