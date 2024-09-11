import os
import tempfile
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from moviepy.editor import VideoFileClip
from typing import Optional
from fastapi import BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware


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


@app.post("/extract-audio/")
async def extract_audio_from_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    output_format: str = "mp3",
    start_time: Optional[float] = None,
    duration: Optional[float] = None,
):
    """
    Extract audio from a video file.

    This endpoint allows you to extract the audio track from a video file and save it in a specified format.

    Parameters:
    - background_tasks (BackgroundTasks): FastAPI background tasks object for cleanup operations.
    - video (UploadFile): The video file to extract audio from.
    - output_format (str, optional): The desired output audio format. Defaults to "mp3".
    - start_time (float, optional): The start time in seconds from where to begin audio extraction.
    - duration (float, optional): The duration in seconds of the audio to extract.

    Returns:
    - FileResponse: The extracted audio file.

    Raises:
    - HTTPException: If there's an error processing the video or extracting the audio.

    Note:
    - The function creates temporary files for processing, which are cleaned up after the response is sent.
    - Supported output formats depend on the codecs available in the system.
    """

    # Read video buffer
    video_buffer = await video.read()

    # Create a temporary file to store the video
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
        temp_video.write(video_buffer)
        temp_video_path = temp_video.name

    try:
        # Load the video file
        video_clip = VideoFileClip(temp_video_path)

        # Extract audio
        audio = video_clip.audio

        # Apply options if provided
        if start_time is not None:
            audio = audio.subclip(start_time)
        if duration is not None:
            audio = audio.subclip(0, duration)

        # Create a temporary file for the audio
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=f".{output_format}"
        ) as temp_audio:
            temp_audio_path = temp_audio.name

        # Write audio to file
        audio.write_audiofile(temp_audio_path)

        # Close the video to release resources
        video_clip.close()

        # Schedule background task to clean up the temporary files after the response is sent
        background_tasks.add_task(os.unlink, temp_video_path)
        background_tasks.add_task(os.unlink, temp_audio_path)

        # Return the audio file
        return FileResponse(
            temp_audio_path,
            media_type=f"audio/{output_format}",
            filename=f"extracted_audio.{output_format}",
        )

    except Exception as e:
        # Clean up the temp video file in case of error
        print(f"Error processing request: {str(e)}")
        os.unlink(temp_video_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    return {"status": "ok"}
