import { YouTubeTranscriptExtractor } from "./youtube";



async function main() {


  const youtubeTranscriptApi = new YouTubeTranscriptExtractor();

  console.log(await youtubeTranscriptApi.retrieveTranscript("_594mPXoHMI&t=6s"));


}

main().catch((error) => {
  console.error('Error occurred:', error);
  process.exit(1);
});
