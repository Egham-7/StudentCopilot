from pydantic import BaseModel
from typing import List


class VideoMetaData(BaseModel):
    output_format: str = "mp3"
    video_id: str


class AudioMetaData(BaseModel):

    transcription_ids: List[str]
    transcription_embedding: List[float]
