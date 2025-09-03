from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uuid
import json
from companion import CompanionManager
import asyncio
#import whisper
import logging
from pathlib import Path
import os
import base64
import io
from gtts import gTTS
from datetime import datetime, timedelta, timezone

import config

# Import authentication modules
from database import init_db, get_db
from auth_api import router as auth_router
from protected_api import router as protected_router
from auth_middleware import auth_middleware, get_current_user
from models import User, UserSession, Conversation, UserContext
from sqlalchemy.orm import Session

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Start the monitoring
#     try:
#         task = asyncio.create_task(manager.log_connection_stats())
#         yield
#         task.cancel()
#         logger.info("Connection stats task cancelled")
#     except Exception as e:
#         logger.error(f"Error canceling task: {e}")
#     finally:
#         pass



# Get CORS origins from environment
def get_cors_origins() -> List[str]:
    
    # Split by comma and strip whitespace
    origins = [origin.strip() for origin in config.CORS_ORIGINS.split(",")]
    
    # Add localhost variants for development
    if "https://localhost:7777" in origins:
        origins.extend([
            "http://localhost:7777",
            "https://127.0.0.1:7777",
            "http://127.0.0.1:7777",
            #Add local ip address for local testing
            config.LOCAL_URL_SSL,
            config.LOCAL_URL
        ])
    
    return origins

# Add CORS configuration for the different environments and domains
def get_cors_config():
    #Get CORS config based on the environment
    environment = os.getenv("ENVIRONMENT", "Development")
    if environment == "Production":
        #Strict CORS config for production
        return {
            "allow_origins": get_cors_origins(),
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["*"],
            "expose_headers": ["*"],
            "max_age": 3600
        }
    else:
        #Relaxed CORS config for development
        return {
            "allow_origins": get_cors_origins(),
            "allow_credentials": True,
            "allow_methods": ["*"],
            "allow_headers": ["*"],
            "expose_headers": ["*"],
        }


app = FastAPI(title="Voice AI Companion", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    **get_cors_config()
)

# Add security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "yourdomain.com", config.LOCAL_IP]  # Configure for your domains
)

# Force HTTPS in production
if os.getenv("ENVIRONMENT") == "Production":
    app.add_middleware(HTTPSRedirectMiddleware)

# Mount static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include authentication routes
app.include_router(auth_router)
app.include_router(protected_router)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Whisper transcription function
# Commenting out for now as it is not needed for the web socket connection
# async def whisper_transcribe(audio_data: bytes) -> str:
#     """Transcribe audio data using Whisper"""
#     try:
#         # Load the Whisper model (you might want to cache this)
#         model = whisper.load_model("base")
        
#         # Save audio data to a temporary file
#         temp_file = "temp_audio.wav"
#         with open(temp_file, "wb") as f:
#             f.write(audio_data)
        
#         # Transcribe the audio
#         result = model.transcribe(temp_file)
        
#         # Clean up temporary file
#         if os.path.exists(temp_file):
#             os.remove(temp_file)
        
#         return result["text"]
#     except Exception as e:
#         logger.error(f"Error transcribing audio: {e}")
#         return "Sorry, I couldn't understand that audio."

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
        self.authenticated_users: Dict[str, Dict[str, Any]] = {}
        self.connection_timestamps: Dict[str, datetime] = {}
        self.client_to_user: Dict[str, str] = {}  # client_id -> user_id

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.connection_timestamps[client_id] = datetime.now(timezone.utc)
        logger.info(f"WebSocket connected: {client_id}")

    async def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            try:
                socket = self.active_connections[client_id]
                await socket.close(code=1000, reason="Server closed connection")
            except Exception as e:
                logger.error(f"Error closing connection for {client_id}: {e}")
            finally:
                del self.active_connections[client_id]

        # Remove authenticated user from the dictionary
        if client_id in self.authenticated_users:
            del self.authenticated_users[client_id]


        if client_id in self.connection_timestamps:
            duration = datetime.now(timezone.utc) - self.connection_timestamps[client_id]
            logger.info(f"Connection removed: {client_id}. Duration: {duration}. Total connections: {len(self.active_connections)}")
            del self.connection_timestamps[client_id]
            
    async def log_connection_stats(self):
        while True:
            await asyncio.sleep(180)
            logger.info(f"Active connections: {len(self.active_connections)}")
            logger.info(f"Authenticated users: {len(self.authenticated_users)}")
            for client_id, user_context in self.authenticated_users.items():
                logger.info(f"User: {user_context['user_name']} - Client ID: {client_id}")
        
    async def send_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except WebSocketDisconnect:
                await self.disconnect(client_id)
            except Exception as e:
                logger.error(f"Error sending message to client {client_id}: {e}")
                #TODO: Send error message or nack message to client and maybe disconnect
                #await self.disconnect(client_id)
    
    # Audio processing using Whisper
    # Commenting out for now as it is not needed for the web socket connection
    # async def process_audio(self, websocket: WebSocket, audio_data: bytes):
    #     # Your Whisper processing here
    #     # Much faster with async
    #     transcription = await whisper_transcribe(audio_data)
    #     await websocket.send_json({
    #         "type": "transcription",
    #         "text": transcription
    #     })


manager = ConnectionManager()
companion_manager = CompanionManager()

# Initialize companions (old way)
#companions = create_companions()

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

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    logger.info(f"WebSocket connection established: {client_id}")
    await manager.connect(websocket, client_id)
    
    # Store user context for this connection
    user_context = None
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            #logger.info(f"\nReceived message: {message_data}\n")

            match message_data.get("type"):
                #Verify authentication from the front-end
                case "auth":
                    logger.info(f"\nReceived auth message: {message_data}\n")
                    access_token = message_data.get("access_token")

                    # Check if access token is present
                    if not access_token or not isinstance(access_token, str):
                        await manager.send_message(
                            json.dumps({
                                "type": "auth_error",
                                "message": "Missing or ill formed access token",
                                "status": "error",
                            }),
                            client_id
                        )
                        continue
                        
                    #lets use the middleware to verify only the access token as it is the only one we need to verify and its faster
                    db = next(get_db())
                    user_context = await auth_middleware.verify_access_token_user(access_token, db)
                    if user_context:
                        # User is authenticated, store authenticated user context in the websocket
                        manager.authenticated_users[client_id] = user_context
                        
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
                                "message": "Invalid or expired access token",
                                "status": "error",
                            }),
                            client_id
                            )
                        continue
                case "create_companion":
                    logger.info(f"\nReceived create companion message: {message_data}\n")
                    access_token = message_data.get("access_token")
                    
                    # Check if access token is present
                    if not access_token or not isinstance(access_token, str):
                        await manager.send_message(
                            json.dumps({
                                "type": "auth_error",
                                "message": "Missing or ill formed access token",
                                "status": "error",
                            }),
                            client_id
                        )
                        continue

                    user_context = await auth_middleware.verify_access_token(access_token)
                    if user_context:
                        # Create Companion
                        companion = await companion_manager.create_companion(user_context["sub"])

                        # Send the companion to the client
                        if companion:
                            await manager.send_message(
                                json.dumps({
                                    "type": "companion_created",
                                    "companion": companion.name,
                                    "status": "success",
                                }),
                                client_id)
                        else:
                            await manager.send_message(
                                json.dumps({
                                    "type": "error",
                                    "message": "Failed to create companion",
                                    "status": "error",
                                }),
                                client_id
                            )
                    else:
                        await manager.send_message(
                            json.dumps({
                                "type": "auth_error",
                                "message": "Invalid or expired access token",
                                "status": "error",
                            }),
                            client_id
                        )
                        continue

                
                case "user_message":
                    logger.info(f"\nReceived user message: {message_data}\n")
                    access_token = message_data.get("access_token")

                    # Check if access token is present
                    if not access_token or not isinstance(access_token, str):
                        await manager.send_message(
                            json.dumps({
                                "type": "auth_error",
                                "message": "Missing or ill formed access token",
                                "status": "error",
                            }),
                            client_id
                        )
                        continue

                    # Both tokens are present but here we will use the middleware to only decode the jwt access token to ensure the user is authenticated for messages
                    user_context = await auth_middleware.verify_access_token(access_token)
                    if user_context:
                        try:
                            # Process message through agent system with user context
                            #logger.info(f"\nProcessing message: {message_data['content']}\n")
                
                            enhanced_message = message_data["content"]

                            # Get the user's companion
                            companion = companion_manager.get_companion(user_context["sub"])
                            response = await companion_manager.process_message(enhanced_message, companion)
                                
                            # Generate audio for the response
                            response_text = response.get("messages", str(response))[-1].content
                            audio_base64 = await text_to_speech(response_text)

                            logger.info(f"\nSending response to client: {response_text}\n")                                
                                
                            # Send the response with audio to client
                            response_data = {
                                "type": "companion_response",
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
                            continue                        
                    else:
                        await manager.send_message(
                            json.dumps({
                                "type": "auth_error",
                                "message": "Invalid or expired access token",
                                "status": "error"
                            }),
                            client_id
                        )
                        continue
                case "disconnect":
                    logger.info(f"\nReceived disconnect message: {message_data}\n")
                    logger.info(f"\nDisconnecting client: {client_id}\n")
                    await manager.disconnect(client_id)
                    companion_manager.delete_companion(client_id)
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
        logger.info(f"WebSocket connection closed: {client_id}")
        await manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        #await manager.disconnect(client_id)


if __name__ == "__main__":
    import uvicorn

    # Run the app
    uvicorn.run(
        app,
        host=config.HOST,
        port=config.PORT,
        ssl_keyfile="network.key",
        ssl_certfile="network.crt",
        ws_ping_interval=300,
        ws_ping_timeout=60
        ) 