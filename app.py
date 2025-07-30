from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Any
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
from datetime import datetime

# Import authentication modules
from database import init_db, get_db
from auth_api import router as auth_router
from protected_api import router as protected_router
from auth_middleware import auth_middleware, get_current_user
from models import User, UserSession, Conversation, UserContext
from sqlalchemy.orm import Session

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

# Include authentication routes
app.include_router(auth_router)
app.include_router(protected_router)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
        return FileResponse("static/login.html")
    except Exception as e:
        logger.error(f"Error serving HTML: {e}")
        return {"message": "AI Agent System API"}
    

@app.get("/companions")
async def get_companions():
    return companions.get_companion_status()

@app.post("/chat")
async def chat(
    message: Message,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Protected chat endpoint that requires authentication"""
    try:
        # Get user context from database
        user_context_data = db.query(UserContext).filter(
            UserContext.user_id == current_user["user_id"],
            UserContext.context_type == "conversation_history"
        ).first()
        
        # Add user context to the message
        context_prompt = ""
        if user_context_data:
            recent_conversations = user_context_data.context_data.get("recent_messages", [])
            if recent_conversations:
                context_prompt = f"User context: {current_user['user_name']}. Recent conversations: {' '.join(recent_conversations[-5:])}\n\n"
        
        enhanced_message = context_prompt + message.content
        response = await companions.process_message(enhanced_message)
        
        # Save conversation to database
        response_text = response.get("messages", str(response))[-1].content
        conversation = Conversation(
            user_id=current_user["user_id"],
            session_id="http_chat",
            user_message=message.content,
            ai_response=response_text,
            companion_name=response.get("companion", "assistant")
        )
        db.add(conversation)
        
        # Update user context
        if user_context_data:
            recent_messages = user_context_data.context_data.get("recent_messages", [])
            recent_messages.append(f"User: {message.content}")
            recent_messages.append(f"AI: {response_text}")
            recent_messages = recent_messages[-10:]  # Keep only last 10
            user_context_data.context_data["recent_messages"] = recent_messages
        else:
            # Create new context
            new_context = UserContext(
                user_id=current_user["user_id"],
                context_type="conversation_history",
                context_data={
                    "recent_messages": [
                        f"User: {message.content}",
                        f"AI: {response_text}"
                    ]
                }
            )
            db.add(new_context)
        
        db.commit()
        
        return {
            "response": response,
            "status": "success",
            "user_id": current_user["user_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    
    # Store user context for this connection
    user_context = None
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            logger.info(f"\nReceived message: {message_data}\n")

            match message_data.get("type"):
                #Verify authentication from the front-end
                case "auth":
                    logger.info(f"\nReceived auth message: {message_data}\n")
                    access_token = message_data.get("access_token")
                    session_token = message_data.get("session_token")
                    # Check if both session token and access token are present
                    if session_token and access_token:
                        # Both are present but lets use the middleware to verify only the access token as it is the only one we need to verify and its faster
                        db = next(get_db())
                        user_context = await auth_middleware.verify_access_token_user(access_token, db)
                        if user_context:
                            await manager.send_message(
                                json.dumps({
                                    "type": "auth_success",
                                    "user": user_context,
                                }),
                                client_id
                            )
                        else:
                            await manager.send_message(
                                json.dumps({
                                    "type": "auth_error",
                                    "message": "Invalid access token",
                                    "status": "error",
                                }),
                                client_id
                            )
                    else:
                        await manager.send_message(
                            json.dumps({
                                "type": "auth_error",
                                "message": "Invalid access token",
                                "status": "error",
                            }),
                            client_id
                        )
                    continue
                case "user_message":
                    logger.info(f"\nReceived user message: {message_data}\n")
                    access_token = message_data.get("access_token")
                    if access_token:
                        # Both tokens are present but here we will use the middleware to only decode the jwt access token to ensure the user is authenticated for messages
                        user_context = await auth_middleware.verify_access_token(access_token)
                        if user_context:
                            try:
                                # Process message through agent system with user context
                                logger.info(f"\nProcessing message: {message_data['content']}\n")
                
                                # # Get user context from database
                                # db = next(get_db())
                                # user_context_data = db.query(UserContext).filter(
                                # UserContext.user_id == user_context["user_id"],
                                # UserContext.context_type == "conversation_history"
                                # ).first()
                
                                # # Add user context to the message
                                # context_prompt = ""
                                # if user_context_data:
                                #     recent_conversations = user_context_data.context_data.get("recent_messages", [])
                                #     if recent_conversations:
                                #         context_prompt = f"User context: {user_context['user_name']}. Recent conversations: {' '.join(recent_conversations[-5:])}\n\n"
                
                                enhanced_message = message_data["content"]
                                response = await companions.process_message(enhanced_message)
                
                                # Send response back to client
                                logger.info(f"\nSending response: {response}\n")
                                
                                # Generate audio for the response
                                response_text = response.get("messages", str(response))[-1].content
                                audio_base64 = await text_to_speech(response_text)

                                logger.info(f"\nResponse text: {response_text}\n")
                                
                                # # Save conversation to database
                                # conversation = Conversation(
                                #     user_id=user_context["user_id"],
                                #     session_id=client_id,
                                #     user_message=message_data["content"],
                                #     ai_response=response_text,
                                #     companion_name=response.get("companion", "assistant")
                                # )
                                # db.add(conversation)
                                
                                # # Update user context with recent conversation
                                # if user_context_data:
                                #     recent_messages = user_context_data.context_data.get("recent_messages", [])
                                #     recent_messages.append(f"User: {message_data['content']}")
                                #     recent_messages.append(f"AI: {response_text}")
                                #     # Keep only last 10 messages
                                #     recent_messages = recent_messages[-10:]
                                #     user_context_data.context_data["recent_messages"] = recent_messages
                                # else:
                                #     # Create new context
                                #     new_context = UserContext(
                                #         user_id=user_context["user_id"],
                                #         context_type="conversation_history",
                                #         context_data={
                                #             "recent_messages": [
                                #                 f"User: {message_data['content']}",
                                #                 f"AI: {response_text}"
                                #             ]
                                #         }
                                #     )
                                #     db.add(new_context)
                                
                                # db.commit()
                                
                                # Send the response with audio to client
                                response_data = {
                                    "type": "agent_response",
                                    "companion": response.get("companion", "Companion"),
                                    "response": response_text,
                                    "audio": audio_base64,
                                    "status": "success",
                                }
                                await manager.send_message(
                                    json.dumps(response_data),
                                    client_id
                                )
                            except Exception as e:
                                await manager.send_message(
                                    json.dumps({
                                        "type": "error",
                                        "message": str(e),
                                        "status": "error",
                                    }),
                                    client_id
                                )
                    else:
                        await manager.send_message(
                            json.dumps({
                                "type": "auth_error",
                                "message": "Invalid access token",
                                "status": "error",
                            }),
                            client_id
                        )
                    continue
                case _:
                    logger.error(f"\nInvalid message type: {message_data.get('type')}\n")
                    await manager.send_message(
                        json.dumps({
                            "type": "error",
                            "message": "Invalid message type",
                            "status": "error",
                        }),
                        client_id
                    )
                    continue
    except WebSocketDisconnect:
        manager.disconnect(client_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=7777) 