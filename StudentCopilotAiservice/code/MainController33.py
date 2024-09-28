import json
import os
import tempfile
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
from NoteGenerator import GenerateNote
from Grader import Grader
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from moviepy.editor import VideoFileClip
from typing import Optional
from fastapi import BackgroundTasks
from PromptValidator import ValidatePrompt
from fastapi.responses import JSONResponse
from transformers import AutoTokenizer
import openai
import time
app = FastAPI()
note_generator = GenerateNote()
grader = Grader()
validator=ValidatePrompt()

class NoteResponse(BaseModel):
    lecture_title: str
    notes: list[str]

# Update the path accordingly for WSL
input_file_path = "/mnt/c/Users/i7 11Th/Desktop/prjcts7-9/StudentCopilot/StudentCopilot-1/StudentCopilotAiservice/code/british.txt"

# Check if the file exists
if os.path.exists(input_file_path):
    try:
        with open(input_file_path, 'r', encoding='utf-8') as input_file:
            content = input_file.read()
    except Exception as e:
        print(f"An error occurred: {e}")
else:
    print("File not found. Please check the path.")


STATIC_YEAR = "1st year undergraduate"
STATIC_FIELD_OF_STUDY = "Physics"
STATIC_MODULE = "Mechanics101"
STATIC_NOTES_STYLE = "Bullet Points"
STATIC_LEARNING_STYLE="Visual Learner"
STATIC_ORIGINAL_PROMPT = "generate notes"

@app.get("/")
def read_root():
    return {"Hello": "World"}



@app.post("/generate_notes/")
async def generate_notes():
    import tiktoken
    # Select the tokenizer based on your model (e.g., gpt-4, gpt-3.5-turbo)
    encoding = tiktoken.encoding_for_model("gpt-4")
    # Tokenize the text and count the tokens
    tokens = encoding.encode(content)
    num_tokens = len(tokens)
    midpoint = len(content) // 3
    part1 = content[:midpoint]
    print(f"Number of tokens: {num_tokens}")
    '''''
    if(num_tokens>10000):
            # Determine the midpoint of the content
            
            # Split the content into two parts
            
            #part2 = content[midpoint:]
            
            
            
            res1=note_generator.generate_note_first(learningStyle=STATIC_LEARNING_STYLE,
                                                    lecture_text=part1,
                                                    levelOfStudy=STATIC_YEAR,
                                                    course=STATIC_MODULE,
                                                    notesStyle=STATIC_NOTES_STYLE)
            
            time.sleep(60)
            res2=note_generator.generate_note_next(learningStyle=STATIC_LEARNING_STYLE,
                                                    lecture_text=part1,
                                                    levelOfStudy=STATIC_YEAR,
                                                    course=STATIC_MODULE,
                                                    notesStyle=STATIC_NOTES_STYLE,
                                                    prevNotes=res1)
            
            return res1,res2
        
    return 0
    '''''
    res1=note_generator.generate_note_first(learningStyle=STATIC_LEARNING_STYLE,
                                                    lecture_text=part1,
                                                    levelOfStudy=STATIC_YEAR,
                                                    course=STATIC_MODULE,
                                                    notesStyle=STATIC_NOTES_STYLE)
    
    return res1