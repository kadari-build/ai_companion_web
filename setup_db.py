"""
Database setup script for AI Companion application
"""

import os
import sys
from sqlalchemy import create_engine, text
from database import init_db, engine
from models import Base

def setup_database():
    """Setup the database and create tables"""
    try:
        print("Setting up database...")
        
        # Test database connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✓ Database connection successful")
        
        # Create tables
        print("✓ Initializing Database...")
        init_db()
        print("✓ Database tables created successfully")
        
        print("\nDatabase setup completed successfully!")
        print("\nNext steps:")
        print("1. Install PostgreSQL if not already installed")
        print("2. Create a database named 'ai_companion'")
        print("3. Update the DATABASE_URL in config.py if needed")
        print("4. Run the application with: python app.py")
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure PostgreSQL is running")
        print("2. Check that the database 'ai_companion' exists")
        print("3. Verify the DATABASE_URL in config.py")
        sys.exit(1)

if __name__ == "__main__":
    setup_database() 