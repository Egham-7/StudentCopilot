import os
import uvicorn
from fastapi import FastAPI,  HTTPException
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from convex import ConvexClient
from code.services.audio_extractor import AudioExtractor
from contextlib import asynccontextmanager
from code.models import VideoMetaData, AudioMetaData
from openai import OpenAI

load_dotenv(".env.local")
load_dotenv()


open_ai_api_key = os.getenv("OPEN_AI_API_KEY")
openai = OpenAI(api_key=open_ai_api_key)

convex_url = os.getenv("CONVEX_URL")
if not convex_url:
    raise ValueError("CONVEX_URL is not set in the environment variables")


convex_client = ConvexClient(convex_url)


audio_extractor = AudioExtractor(convex_client, openai)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await audio_extractor.initialize()
    yield
    # Shutdown
    await audio_extractor.cleanup()

app = FastAPI(lifespan=lifespan)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/process-video")
async def process_video(video_meta_data: VideoMetaData) -> AudioMetaData:
    try:
        transcription_storage_ids, combined_embedding = await audio_extractor.extract_audio(video_meta_data)

        return AudioMetaData(transcription_ids=transcription_storage_ids, transcription_embedding=combined_embedding)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
