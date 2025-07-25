"""
Protected API routes that require authentication
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

from database import get_db
from models import User, UserContext, Conversation
from auth_middleware import get_current_user, get_optional_user
from schemas import ContextResponse, ConversationResponse

router = APIRouter(prefix="/api", tags=["protected"])

@router.get("/me")
async def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user profile"""
    return {
        "user_id": current_user["user_id"],
        "name": current_user["user_name"],
        "email": current_user["user_email"],
        "is_authenticated": True
    }

@router.get("/context")
async def get_user_context(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user context data"""
    context_data = db.query(UserContext).filter(
        UserContext.user_id == current_user["user_id"]
    ).all()
    
    return {
        "user_id": current_user["user_id"],
        "contexts": [
            {
                "type": ctx.context_type,
                "data": ctx.context_data,
                "updated_at": ctx.updated_at
            }
            for ctx in context_data
        ]
    }

@router.get("/conversations")
async def get_user_conversations(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    """Get user conversation history"""
    conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user["user_id"]
    ).order_by(
        Conversation.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    return {
        "user_id": current_user["user_id"],
        "conversations": [
            {
                "id": str(conv.id),
                "user_message": conv.user_message,
                "ai_response": conv.ai_response,
                "companion_name": conv.companion_name,
                "created_at": conv.created_at
            }
            for conv in conversations
        ],
        "total": len(conversations)
    }

@router.post("/context")
async def update_user_context(
    context_type: str,
    context_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user context data"""
    # Check if context already exists
    existing_context = db.query(UserContext).filter(
        UserContext.user_id == current_user["user_id"],
        UserContext.context_type == context_type
    ).first()
    
    if existing_context:
        # Update existing context
        existing_context.context_data = context_data
        existing_context.updated_at = datetime.utcnow()
    else:
        # Create new context
        new_context = UserContext(
            user_id=current_user["user_id"],
            context_type=context_type,
            context_data=context_data
        )
        db.add(new_context)
    
    db.commit()
    
    return {
        "message": "Context updated successfully",
        "context_type": context_type
    }

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific conversation"""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user["user_id"]
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    db.delete(conversation)
    db.commit()
    
    return {"message": "Conversation deleted successfully"}

@router.get("/stats")
async def get_user_stats(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user statistics"""
    # Count conversations
    total_conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user["user_id"]
    ).count()
    
    # Count context entries
    total_contexts = db.query(UserContext).filter(
        UserContext.user_id == current_user["user_id"]
    ).count()
    
    # Get recent activity
    recent_conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user["user_id"]
    ).order_by(
        Conversation.created_at.desc()
    ).limit(5).all()
    
    return {
        "user_id": current_user["user_id"],
        "stats": {
            "total_conversations": total_conversations,
            "total_contexts": total_contexts,
            "recent_activity": [
                {
                    "message": conv.user_message[:50] + "..." if len(conv.user_message) > 50 else conv.user_message,
                    "created_at": conv.created_at
                }
                for conv in recent_conversations
            ]
        }
    }

# Optional authentication endpoints (can work with or without auth)
@router.get("/public/info")
async def get_public_info(
    optional_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """Get public info (works with or without authentication)"""
    if optional_user:
        return {
            "message": "Welcome back!",
            "user_name": optional_user["user_name"],
            "is_authenticated": True
        }
    else:
        return {
            "message": "Welcome! Please log in for personalized experience.",
            "is_authenticated": False
        } 