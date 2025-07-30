"""
Configuration settings for the AI Companion application
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:RoxyM%40n%400589!@localhost:5432/ai_companion")
DATABASE_PW = os.getenv("DATABASE_PW", "RoxyM@n@0589!")
DATABASE_USER = os.getenv("DATABASE_USER", "postgres")
DATABASE_NAME = os.getenv("DATABASE_NAME", "ai_companion")
DATABASE_HOST = os.getenv("DATABASE_HOST", "localhost")
DATABASE_PORT = os.getenv("DATABASE_PORT", "5432")

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")
ALGORITHM = "HS256"

# Server Configuration
HOST = os.getenv("HOST", "localhost")
PORT = int(os.getenv("PORT", "7777"))

# JWT Configuration
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 3