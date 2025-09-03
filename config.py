"""
Configuration settings for the AI Companion application
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_PW = os.getenv("DATABASE_PW")
DATABASE_USER = os.getenv("DATABASE_USER")
DATABASE_NAME = os.getenv("DATABASE_NAME")
DATABASE_HOST = os.getenv("DATABASE_HOST")
DATABASE_PORT = os.getenv("DATABASE_PORT")

# Security
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

# Server Configuration
HOST = os.getenv("HOST", "localhost")
PORT = int(os.getenv("PORT", "7777"))

## To run this locally, add the ip address of the machine running the server
LOCAL_URL_SSL = os.getenv("LOCAL_URL_SSL")
LOCAL_URL = os.getenv("LOCAL_URL")
LOCAL_IP = os.getenv("LOCAL_IP")

#CORS Configuration
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "https://localhost:7777")

# JWT Configuration
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 3))