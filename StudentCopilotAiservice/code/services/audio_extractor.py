import asyncio
from concurrent.futures import ThreadPoolExecutor
import os
import tempfile
from typing import List, Tuple, Optional
from code.models import VideoMetaData
import aiohttp
from convex import ConvexClient
from moviepy.editor import AudioFileClip
import numpy as np
from openai import OpenAI
from io import BytesIO
import json


CHUNK_SIZE = 5 * 1024 * 1024  # 5MB
EMBEDDING_MODEL = "text-embedding-3-small"
WHISPER_MODEL = "whisper-1"


class AudioExtractor:
    def __init__(self, convex_client: ConvexClient, openai: OpenAI) -> None:
        self.convex_client: ConvexClient = convex_client
        self.session: Optional[aiohttp.ClientSession] = None
        self.executor: Optional[ThreadPoolExecutor] = None
        self.client = openai

    async def initialize(self) -> None:
        self.session = aiohttp.ClientSession()
        self.executor = ThreadPoolExecutor(max_workers=4)

    async def cleanup(self) -> None:
        if self.session:
            await self.session.close()
        if self.executor:
            self.executor.shutdown()

    async def extract_audio(self, video_meta_data: VideoMetaData) -> Tuple[List[str], List[float]]:
        try:
            video_data = await self.fetch_video(video_meta_data.video_id)
            audio_clip = await self.process_video(video_data)
            audio_data = await self.write_audio_to_buffer(audio_clip, video_meta_data.output_format)

            results = await self.chunk_and_process(audio_data, CHUNK_SIZE)

            # Flatten the results
            transcriptions, embeddings = zip(*results)

            transcription_storage_ids = await self.store_transcriptions(list(transcriptions))

            # Concatenate all embeddings into a single 2D numpy array
            combined_embeddings = np.concatenate(embeddings, axis=0)

            # Convert to float64
            combined_embeddings_float64 = combined_embeddings.astype(
                np.float64)

            return transcription_storage_ids, combined_embeddings_float64

        except Exception as e:
            raise Exception(f"Error extracting audio: {str(e)}") from e

    async def fetch_video(self, video_id: str) -> bytes:
        if not self.session:
            raise RuntimeError(
                "Session not initialized. Call initialize() first.")
        video_url = self.convex_client.query(
            "storage:getStorageUrl", {"storageId": video_id})
        async with self.session.get(video_url) as response:
            response.raise_for_status()
            return await response.read()

    async def process_video(self, video: bytes) -> AudioFileClip:
        if not self.executor:
            raise RuntimeError(
                "Executor not initialized. Call initialize() first.")
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self.executor, self._process_video_sync, video)

    @staticmethod
    def _process_video_sync(video: bytes) -> AudioFileClip:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
            temp_video.write(video)
            temp_video_path = temp_video.name
        try:
            return AudioFileClip(temp_video_path)
        finally:
            os.unlink(temp_video_path)

    async def write_audio_to_buffer(self, audio: AudioFileClip, output_format: str) -> bytes:
        if not self.executor:
            raise RuntimeError(
                "Executor not initialized. Call initialize() first.")
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self.executor, self._write_audio_to_buffer_sync, audio, output_format)

    @staticmethod
    def _write_audio_to_buffer_sync(audio: AudioFileClip, output_format: str) -> bytes:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{output_format}') as temp_audio:
            temp_audio_path = temp_audio.name
        try:
            if output_format.lower() == 'mp3':
                audio.write_audiofile(
                    temp_audio_path, codec='libmp3lame', ffmpeg_params=["-f", "mp3"])
            else:
                audio.write_audiofile(
                    temp_audio_path, codec='pcm_s16le', ffmpeg_params=["-f", "wav"])
            with open(temp_audio_path, "rb") as audio_file:
                return audio_file.read()
        finally:
            os.unlink(temp_audio_path)
            audio.close()

    async def chunk_and_process(self, audio_buffer: bytes, chunk_size: int) -> List[Tuple[str, np.ndarray]]:
        chunks = [audio_buffer[i:i+chunk_size]
                  for i in range(0, len(audio_buffer), chunk_size)]
        tasks = [self.process_chunk(chunk) for chunk in chunks]
        return await asyncio.gather(*tasks)

    async def process_chunk(self, chunk: bytes) -> Tuple[str, np.ndarray]:
        transcribed_audio = AudioExtractor.transcribe_audio_chunk(
            self.client, chunk)
        embedding = AudioExtractor.get_embedding(
            self.client, transcribed_audio)
        return transcribed_audio, np.array(embedding)

    async def store_transcriptions(self, transcriptions: List[str]) -> List[str]:

        transcription_storage_ids = [self.store_transcription(
            transcription) for transcription in transcriptions]

        return await asyncio.gather(*transcription_storage_ids)

    async def store_transcription(self, transcription: str) -> str:

        upload_url = self.convex_client.mutation("uploads:generateUploadUrl")

        data = json.dumps({"transcription": transcription})

        async with self.session.post(upload_url, data=data, headers={'Content-Type': 'application/json'}) as response:
            if response.status == 200:
                data = await response.json()
                return data['storageId']
            else:
                raise Exception(
                    f"Failed to upload transcription: {response.status}")

    @staticmethod
    def transcribe_audio_chunk(client: OpenAI, audio_chunk: bytes) -> str:
        try:
            file = BytesIO(audio_chunk)
            file.name = 'audio.wav'

            transcription = client.audio.transcriptions.create(
                model=WHISPER_MODEL, file=file)

            return transcription.text

        except Exception as error:
            print(f"Error transcribing audio chunk: {error}")
            raise

    @staticmethod
    def get_embedding(client: OpenAI, text: str, model=EMBEDDING_MODEL) -> List[float]:

        return client.embeddings.create(input=text, model=model).data[0].embedding
