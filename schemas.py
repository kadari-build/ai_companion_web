"""
Pydantic schemas for API requests and responses
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    session_token: Optional[str] = None

class TokenData(BaseModel):
    user_id: Optional[str] = None

# Session schemas
class SessionCreate(BaseModel):
    user_id: uuid.UUID
    session_token: str
    expires_at: datetime

class SessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    session_token: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# Context schemas
class ContextBase(BaseModel):
    context_type: str
    context_data: dict

class ContextCreate(ContextBase):
    user_id: uuid.UUID

class ContextResponse(ContextBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Memory schemas
class MemoryBase(BaseModel):
    memory_type: str
    memory: str

class MemoryCreate(MemoryBase):
    user_id: uuid.UUID

class MemoryResponse(MemoryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    last_accessed_at: datetime

    class Config:
        from_attributes = True

# Conversation schemas
class ConversationBase(BaseModel):
    user_message: str
    ai_response: str
    companion_name: Optional[str] = None

class ConversationCreate(ConversationBase):
    user_id: uuid.UUID
    session_id: str

class ConversationResponse(ConversationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    session_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# WebSocket message schemas
class WebSocketMessage(BaseModel):
    type: str
    data: Optional[dict] = None
    user_id: Optional[str] = None
    session_token: Optional[str] = None

class WebSocketResponse(BaseModel):
    type: str
    data: Optional[dict] = None
    error: Optional[str] = None 