export interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
}

export interface VideoMetadata {
  title: string;
  duration: string;
  author: string;
  views: string;
  description: string;
  keywords: string[];
  isLiveContent: boolean;
  uploadDate?: string;
}

export interface TranscriptResponse {
  transcript: TranscriptSegment[];
  metadata: VideoMetadata;
  rawTranscript: any; // You can type this more specifically if needed
}

export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind: string;
  name?: {
    simpleText: string;
  };
}

export interface PlayerResponse {
  videoDetails: {
    title: string;
    lengthSeconds: string;
    author: string;
    viewCount: string;
    shortDescription: string;
    keywords: string[];
    isLiveContent: boolean;
  };
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: CaptionTrack[];
    };
  };
  microformat?: {
    playerMicroformatRenderer?: {
      uploadDate: string;
    };
  };
}
