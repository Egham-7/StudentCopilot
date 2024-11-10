import axios from 'axios';

export class YouTubeTranscriptExtractor {
  private static readonly YT_INITIAL_PLAYER_RESPONSE_RE = /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/;

  public async retrieveTranscript(videoId: string) {
    try {
      const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`);
      const body = response.data;

      const playerResponse = body.match(YouTubeTranscriptExtractor.YT_INITIAL_PLAYER_RESPONSE_RE);
      if (!playerResponse) {
        throw new Error('Unable to parse playerResponse');
      }

      const player = JSON.parse(playerResponse[1]);
      const metadata = {
        title: player.videoDetails.title,
        duration: player.videoDetails.lengthSeconds,
        author: player.videoDetails.author,
        views: player.videoDetails.viewCount,
      };

      // Get and sort tracks by priority
      const tracks = player.captions.playerCaptionsTracklistRenderer.captionTracks;
      tracks.sort(this.compareTracks);

      // Fetch transcript
      const transcriptResponse = await axios.get(`${tracks[0].baseUrl}&fmt=json3`);
      const transcript = transcriptResponse.data;

      const timestampedTranscript = transcript.events
        .filter((x: any) => x.segs)
        .map((x: any) => ({
          text: x.segs.map((y: any) => y.utf8).join(' '),
          startTime: x.tStartMs / 1000, // Convert to seconds
          endTime: (x.tStartMs + x.dDurationMs) / 1000,
        }));

      const enhancedMetadata = {
        ...metadata,
        description: player.videoDetails.shortDescription,
        keywords: player.videoDetails.keywords,
        isLiveContent: player.videoDetails.isLiveContent,
        uploadDate: player.microformat?.playerMicroformatRenderer?.uploadDate,
      };

      return {
        transcript: timestampedTranscript,
        metadata: enhancedMetadata,
        rawTranscript: transcript
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to retrieve transcript: ${error.message}`);
      }
    }
  }

  private compareTracks(track1: any, track2: any): number {
    const langCode1 = track1.languageCode;
    const langCode2 = track2.languageCode;

    if (langCode1 === 'en' && langCode2 !== 'en') {
      return -1; // English comes first
    } else if (langCode1 !== 'en' && langCode2 === 'en') {
      return 1; // English comes first
    } else if (track1.kind !== 'asr' && track2.kind === 'asr') {
      return -1; // Non-ASR comes first
    } else if (track1.kind === 'asr' && track2.kind !== 'asr') {
      return 1; // Non-ASR comes first
    }
    return 0;
  }
}

