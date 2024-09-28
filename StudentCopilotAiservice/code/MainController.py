import os
import uvicorn
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import Response
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from convex import ConvexClient
from services.audio_extractor import AudioExtractor
from contextlib import asynccontextmanager

load_dotenv(".env.local")
load_dotenv()

convex_url = os.getenv("CONVEX_URL")
if not convex_url:
    raise ValueError("CONVEX_URL is not set in the environment variables")



convex_client = ConvexClient(convex_url)


audio_extractor = AudioExtractor(convex_client)

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

@app.get("/extract-audio/")
async def extract_audio_from_video(
    video_id: str = Query(...),
    output_format: str = "mp3",
):
    try:
        output_format = output_format.strip().lower()
        if output_format not in ["mp3", "wav"]:
            raise ValueError(f"Unsupported output format: {output_format}")
        
        audio_bytes = await audio_extractor.extract_audio(video_id, output_format)
        return Response(audio_bytes, media_type=f"audio/{output_format}")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))

