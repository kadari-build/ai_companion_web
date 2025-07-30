"""
Authentication middleware for protecting API endpoints and WebSocket connections
"""

from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from datetime import datetime

from database import get_db
from models import User, UserSession
from auth import verify_token

# Security scheme for HTTP Bearer tokens
security = HTTPBearer()

class AuthMiddleware:
    """Centralized authentication middleware"""
    
    def __init__(self):
        self.require_auth = True
    
    async def verify_access_token_user(self, token: str, db: Session) -> Optional[Dict[str, Any]]:
        """Verify JWT access token and return user info"""
        try:
            payload = verify_token(token)
            if not payload or payload.get("type") != "access":
                return None
            
            user_id = payload.get("sub")
            if not user_id:
                return None
            
            # Check if user exists and is active
            user = db.query(User).filter(
                User.id == user_id,
                User.is_active == True
            ).first()
            
            if not user:
                return None
            
            return {
                "user_id": str(user.id),
                "user_name": user.name,
                "user_email": user.email,
                "is_authenticated": True
            }
            
        except Exception as e:
            return None
    
    async def verify_session_token(self, session_token: str, db: Session) -> Optional[Dict[str, Any]]:
        """Verify session token and return user info"""
        try:
            session = db.query(UserSession).filter(
                UserSession.session_token == session_token,
                UserSession.expires_at > datetime.utcnow()
            ).first()
            
            if not session:
                return None
            
            user = db.query(User).filter(
                User.id == session.user_id,
                User.is_active == True
            ).first()
            
            if not user:
                return None
            
            return {
                "user_id": str(user.id),
                "user_name": user.name,
                "user_email": user.email,
                "is_authenticated": True
            }
            
        except Exception as e:
            return None

    async def verify_access_token(self, access_token: str) -> Optional[dict]:
        """Verify and decode access token only"""
        try:
            payload = verify_token(access_token)
            if not payload or payload.get("type") != "access":
                return None
            
            return payload
        
        except Exception as e:
            return None
    
    async def get_current_user_http(
        self, 
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ) -> Dict[str, Any]:
        """Get current user from HTTP Bearer token"""
        token = credentials.credentials
        user_info = await self.verify_access_token(token, db)
        
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_info
    
    async def get_current_user_websocket(
        self, 
        session_token: str,
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """Get current user from WebSocket session token"""
        return await self.verify_session_token(session_token, db)
    
    def require_authentication(self, require: bool = True):
        """Decorator to mark endpoints as requiring authentication"""
        def decorator(func):
            func.require_auth = require
            return func
        return decorator

# Global auth middleware instance
auth_middleware = AuthMiddleware()

# Dependency for HTTP endpoints
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Dependency for HTTP endpoints requiring authentication"""
    return await auth_middleware.get_current_user_http(credentials, db)

# Dependency for optional authentication (for endpoints that can work with or without auth)
async def get_optional_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """Dependency for endpoints with optional authentication"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    return await auth_middleware.verify_access_token(token, db) 