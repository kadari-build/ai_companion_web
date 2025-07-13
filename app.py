from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uuid
import json
from companions import Companions, create_companions
import asyncio
import whisper
import logging
from pathlib import Path
import os
import base64
import io
from gtts import gTTS

app = FastAPI(title="Voice AI Companion", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define static directory path
static_dir = Path("static")

# Whisper transcription function
async def whisper_transcribe(audio_data: bytes) -> str:
    """Transcribe audio data using Whisper"""
    try:
        # Load the Whisper model (you might want to cache this)
        model = whisper.load_model("base")
        
        # Save audio data to a temporary file
        temp_file = "temp_audio.wav"
        with open(temp_file, "wb") as f:
            f.write(audio_data)
        
        # Transcribe the audio
        result = model.transcribe(temp_file)
        
        # Clean up temporary file
        if os.path.exists(temp_file):
            os.remove(temp_file)
        
        return result["text"]
    except Exception as e:
        logger.error(f"Error transcribing audio: {e}")
        return "Sorry, I couldn't understand that audio."

# Text-to-speech function
async def text_to_speech(text: str) -> str:
    """Convert text to speech and return base64 encoded audio"""
    try:
        # Create gTTS object
        tts = gTTS(text=text, lang='en', slow=False)
        
        # Save to bytes buffer
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        # Convert to base64
        audio_data = audio_buffer.read()
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        return audio_base64
    except Exception as e:
        logger.error(f"Error generating speech: {e}")
        return ""

# WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            
    async def send_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def process_audio(self, websocket: WebSocket, audio_data: bytes):
        # Your Whisper processing here
        # Much faster with async
        transcription = await whisper_transcribe(audio_data)
        await websocket.send_json({
            "type": "transcription",
            "text": transcription
        })
            
    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = ConnectionManager()

# Initialize companions
companions = create_companions()

# Models
class Message(BaseModel):
    content: str

class CompanionResponse(BaseModel):
    response: str
    status: str

# Routes
@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main HTML page"""
    logger.info("Serving main HTML page")
    try:
        # Try to read from static/home.html first
        html_file = static_dir / "home.html"
        if html_file.exists():
            return FileResponse(html_file)
        else:
            # Fallback to embedded HTML
            return {"message": "AI Agent System API"}
    except Exception as e:
        logger.error(f"Error serving HTML: {e}")
        return {"message": "AI Agent System API"}
    

@app.get("/companions")
async def get_companions():
    return companions.get_companion_status()

@app.post("/chat")
async def chat(message: Message):
    try:
        response = await companions.process_message(message.content)
        return {
            "response": response,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            logger.info(f"\nReceived message: {message_data}\n")
            
            try:
                # Process message through agent system
                logger.info(f"\nProcessing message: {message_data['content']}\n")
                response = await companions.process_message(message_data["content"])
                
                # Send response back to client
                logger.info(f"\nSending response: {response}\n")
                
                # Generate audio for the response
                response_text = response.get("messages", str(response))[-1].content
                audio_base64 = await text_to_speech(response_text)
                
                # Send the response with audio to client
                response_data = {
                    "companion": response.get("companion", "Companion"),
                    "response": response_text,
                    "audio": audio_base64,
                    "status": "success"
                }
                #logger.info(f"\nSending to frontend: {response_data}\n")
                await manager.send_message(
                    json.dumps(response_data),
                    client_id
                )
                
                # TODO:  Broadcast to other companions when we have multiple companions
                '''
                # Broadcast to other agents if needed
                if message_data.get("broadcast", False):
                    await manager.broadcast(
                        json.dumps({
                            "response": response,
                            "status": "broadcast"
                        })
                    )
                '''

            except Exception as e:
                await manager.send_message(
                    json.dumps({
                        "response": str(e),
                        "status": "error"
                    }),
                    client_id
                )
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=7777) 