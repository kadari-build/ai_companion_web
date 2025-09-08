# Conversational AI Companion

AI companion web application with voice capabilities, user authentication, and real-time communication.

<img width="2554" height="1263" alt="AI Companion Demo" src="https://github.com/user-attachments/assets/2dd70112-3675-4bcf-80d8-2553b5fdd785" />

## Problem
AI has proven transformative across many domains, but accessing this technology remains challenging for users who require accessible interfaces. Current AI tools often rely heavily on visual elements, complex navigation, and mobile app components that create significant barriers for visually impaired users. Existing accessibility features are typically retrofitted rather than designed as core interaction models.

## Goal
AI Companion addresses this gap by designing voice and conversation as the primary interface from the ground up. Rather than adding accessibility as an afterthought, the application leverages natural speech, audio cues, and conversational commands as the main navigation method, with traditional accessibility support as reinforcement rather than the sole solution

## What It Does

- Provides user registration and login with full accessibility support
- Enables real-time voice conversations with AI models (OpenAI, Anthropic, Google)
- Maintains separate conversation histories for each user account
- Searches the web when the AI needs current information or external data
- Allows voice control of app settings and navigation

https://github.com/user-attachments/assets/d93b30d4-017c-4f06-aeb0-7443333e74e0

## Features

- **Conversational AI companion** with multi-model support (OpenAI, Anthropic, Google)
- **Voice interaction** with speech recognition and text-to-speech
- **JWT-based authentication** with refresh tokens
- **Real-time WebSocket communication** for instant responses
- **Database integration** with PostgreSQL for user management and conversation history
- **LangChain/LangGraph integration** for advanced AI workflows
- **Gmail integration Hooks** for email processing capabilities

## Challenges
- **Accessible authentication flow:** Implementing a secure voice-controlled login/registration while maintaining full keyboard navigation and screen reader compatibility
- **LLM-driven app control:** AI management of conversational input and system commands (opening settings, navigating menus) based on natural voice requests
- **Conversation management:** Automatically summarizing long conversation histories to maintain context while staying within token limits and preserving important details
- **Persistent user memory:** Storing and retrieving key personal information, preferences, and conversation context across sessions without compromising privacy
- **Cost-efficient multi-LLM routing:** Dynamically selecting optimal AI models based on query type while managing API costs across multiple providers


### Technical Features
- **FastAPI backend** with async support
- **WebSocket connections** for real-time chat
- **CORS configuration** for cross-origin requests
- **Environment-based configuration** with secure credential management
- **Modular architecture** with separate authentication and API modules
- **Text-to-speech** with gTTS

## Prerequisites

- **Python 3.8+**
- **PostgreSQL database**
- **Git** for version control
- **Required Python packages** (see `requirements.txt`)

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd ai_companion_web
```

### 2. Create Virtual Environment
```bash
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Configuration

**Option A: Use the provided example file**
```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your actual values
# Use your preferred text editor
```

### 5. Generate a Strong Secret Key
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 6. Database Setup
```bash
python setup_db.py
```

### 7. Run the Application
```bash
python app.py
```

The application will be available at `http://localhost:7777`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
