from typing import List
import asyncio
import aiohttp
from convex import ConvexClient
from moviepy.editor import AudioFileClip
import tempfile
import os
import re
from concurrent.futures import ThreadPoolExecutor

class AudioExtractor:
    def __init__(self, convex_client: ConvexClient) -> None:
        self.convex_client = convex_client
        self.session = None
        self.executor = ThreadPoolExecutor(max_workers=4)  # Adjust based on your needs

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
        self.executor.shutdown()

    async def extract_audio(self, video_id: str, output_format: str = "mp3") -> bytes:
        video_data = await self.fetch_video(video_id)
        audio_clip = await self.process_video(video_data)
        audio_data = await self.write_audio_to_buffer(audio_clip, output_format)
        return audio_data

    async def fetch_video(self, video_id: str) -> bytes:
        video_url = self.convex_client.query("storage:getStorageUrl", {"storageId": video_id})
        async with self.session.get(video_url) as response:
            return await response.read()

    async def process_video(self, video: bytes) -> AudioFileClip:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self.executor, self._process_video_sync, video)

    def _process_video_sync(self, video: bytes) -> AudioFileClip:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
            temp_video.write(video)
            temp_video_path = temp_video.name

        try:
            return AudioFileClip(temp_video_path)
        finally:
            os.unlink(temp_video_path)

    async def write_audio_to_buffer(self, audio: AudioFileClip, output_format: str) -> bytes:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self.executor, self._write_audio_to_buffer_sync, audio, output_format)

    def _write_audio_to_buffer_sync(self, audio: AudioFileClip, output_format: str) -> bytes:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{output_format}') as temp_audio:
            temp_audio_path = temp_audio.name

        try:
            if output_format.lower() == 'mp3':
                audio.write_audiofile(temp_audio_path, codec='libmp3lame', ffmpeg_params=["-f", "mp3"])
            else:
                audio.write_audiofile(temp_audio_path, codec='pcm_s16le', ffmpeg_params=["-f", "wav"])

            with open(temp_audio_path, "rb") as audio_file:
                return audio_file.read()
        finally:
            os.unlink(temp_audio_path)
            audio.close()

    @staticmethod
    def sanitize_filename(filename):
        return re.sub(r'[\x00-\x1f<>:"/\\|?*]', '', filename)

