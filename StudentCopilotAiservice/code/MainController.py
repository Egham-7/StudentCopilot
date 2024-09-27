import os
import uvicorn
from fastapi import FastAPI, Query
from fastapi.responses import Response
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from convex import ConvexClient
from services.audio_extractor import AudioExtractor

load_dotenv(".env.local")
load_dotenv()


convex_url = os.getenv("CONVEX_URL")
if not convex_url:
    raise ValueError("CONVEX_URL is not set in the environment variables")


convex_client = ConvexClient(convex_url)
audio_extractor = AudioExtractor(convex_client)

app = FastAPI()


origins = ["http://localhost:5173", "http://127.0.0.1:5173"]


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/extract-audio/")
async def extract_audio_from_video(
    video_chunk_ids: str = Query(...),
    output_format: str = "mp3",
):
    # Convert the comma-separated string to a list
    video_chunk_ids_list = video_chunk_ids.split(',')

    output_format = output_format.strip()

    audio_bytes = await audio_extractor.extract_audio(
        video_chunk_ids_list, output_format)

    return Response(audio_bytes, media_type=f"audio/{output_format}")


@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
