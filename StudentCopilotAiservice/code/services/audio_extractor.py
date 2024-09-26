from typing import List
import asyncio
import aiohttp
from convex import ConvexClient
from moviepy.editor import AudioFileClip, concatenate_audioclips
import tempfile
import os
import re


class AudioExtractor:
    def __init__(self, convex_client: ConvexClient) -> None:
        self.convex_client = convex_client

    async def extract_audio(
        self,
        chunk_ids: List[str],
        output_format: str = "mp3",
    ) -> bytes:
        chunk_data_list = await self.fetch_all_chunks(chunk_ids)
        audio_clips = await self.process_all_chunks(chunk_data_list)
        final_audio = concatenate_audioclips(audio_clips)
        audio_data = self.write_audio_to_buffer(final_audio, output_format)
        return audio_data

    async def fetch_all_chunks(self, chunk_ids: List[str]) -> List[bytes]:
        async with aiohttp.ClientSession() as session:
            return await asyncio.gather(
                *[self.fetch_chunk(chunk_id, session) for chunk_id in chunk_ids]
            )

    async def fetch_chunk(self, chunk_id: str, session: aiohttp.ClientSession) -> bytes:
        chunk_url = self.convex_client.query(
            "storage:getStorageUrl", {"storageId": chunk_id})
        async with session.get(chunk_url) as response:
            file = await response.read()
            print("File type:", type(file))
            return file

    async def process_all_chunks(self, chunk_data_list: List[bytes]) -> List[AudioFileClip]:
        return [await self.process_chunk(chunk) for chunk in chunk_data_list]

    @staticmethod
    async def process_chunk(chunk: bytes) -> AudioFileClip:
        sanitized_suffix = AudioExtractor.sanitize_filename(".mp4")
        with tempfile.NamedTemporaryFile(delete=False, suffix=sanitized_suffix) as temp_video:
            temp_video.write(chunk)
            temp_video_path = temp_video.name

        try:
            return AudioFileClip(temp_video_path)
        except Exception as e:
            print(f"Audio File error: {str(e)}")
            raise
        finally:
            os.unlink(temp_video_path)

    @staticmethod
    def write_audio_to_buffer(audio: AudioFileClip, output_format: str) -> bytes:
        sanitized_suffix = AudioExtractor.sanitize_filename(
            f".{output_format}")
        with tempfile.NamedTemporaryFile(delete=False, suffix=sanitized_suffix) as temp_audio:
            temp_audio_path = temp_audio.name

        print(f"Audio Path: {temp_audio_path}")

        sanitized_path = AudioExtractor.sanitize_filename(temp_audio_path)

        try:
            if output_format.lower() == 'mp3':
                audio.write_audiofile(
                    sanitized_path, codec='libmp3lame', ffmpeg_params=["-f", "mp3"])

            else:
                audio.write_audiofile(
                    sanitized_path, codec='pcm_s16le', ffmpeg_params=["-f", "wav"])

            with open(sanitized_path, "rb") as audio_file:
                return audio_file.read()
        finally:
            os.unlink(temp_audio_path)

    @staticmethod
    def sanitize_filename(filename):
        # Remove null characters and other potentially problematic characters
        return re.sub(r'[\x00-\x1f<>:"/\\|?*]', '', filename)
