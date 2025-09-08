# AI Companion Web

A sophisticated web-based AI conversation companion with advanced voice capabilities, authentication, and real-time communication.

<img width="2554" height="1263" alt="AI Companion Demo" src="https://github.com/user-attachments/assets/2dd70112-3675-4bcf-80d8-2553b5fdd785" />

## ✨ Problem
Editing video content can be a daunting task. Video editing represents 70-80% of content creation time, with creators manually reviewing hours of footage to identify 2-3 minutes of highlight-worthy moments. This process is both time-intensive and inconsistent, often missing great content buried in long recordings

## 🚀 What It Does

- ** Access8ble Login/Registration: User can register and create an account with keyboard navigation and screen reader support
- ** Real-time voice conversation with LLM
- Conversation threads are isolated by user account
- LLM can search the internet for information that it cannot handle on its own
- **🎤 Voice-controlled settings** with context-aware command routing

https://github.com/user-attachments/assets/d93b30d4-017c-4f06-aeb0-7443333e74e0

## 🚀 Features

- **AI-powered conversation companion** with multi-model support (OpenAI, Anthropic, Google)
- **Voice interaction** with speech recognition and text-to-speech
- **JWT-based authentication** with refresh tokens
- **Real-time WebSocket communication** for instant responses
- **Database integration** with PostgreSQL for user management and conversation history
- **LangChain/LangGraph integration** for advanced AI workflows
- **Gmail integration Hooks** for email processing capabilities

## ✨ Challenges
- Voice controlled user login, registration, and credentnal management coupled with keyboard navigation and screen reader support
- Seamless natural conversation: Automatically merging overlapping or adjacent exciting moments while preserving peak intensity and avoiding redundancy
- LLM app control: Creating cohesive content by combining highlights from multiple source videos with engaging sequencing, proper flow and transitions
- Precise editing: Achieving frame-accurate cuts and seamless transitions between automated edit point cuts
- Cost-efficient LLM analysis: Implementing scalable video/audio analysis using LLM models


### Technical Features
- **FastAPI backend** with async support
- **WebSocket connections** for real-time chat
- **CORS configuration** for cross-origin requests
- **Environment-based configuration** with secure credential management
- **Modular architecture** with separate authentication and API modules
- **Text-to-speech** with gTTS

## 📋 Prerequisites

- **Python 3.8+**
- **PostgreSQL database**
- **Git** for version control
- **Required Python packages** (see `requirements.txt`)

## 🛠️ Installation & Setup

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

## 🏗️ Project Structure

```
ai_companion_web/
├── app.py                 # Main FastAPI application
├── config.py             # Configuration settings
├── database.py           # Database connection and setup
├── models.py             # SQLAlchemy models
├── schemas.py            # Pydantic schemas
├── auth.py               # Authentication utilities
├── auth_api.py           # Authentication API endpoints
├── auth_middleware.py    # Authentication middleware
├── protected_api.py      # Protected API endpoints
├── companion.py          # AI companion logic
├── companions.py         # Companion management
├── setup_db.py           # Database initialization
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
├── static/              # Frontend assets
│   ├── js/             # JavaScript modules
│   │   ├── modules/    # Modular JavaScript components
│   │   │   ├── SettingsManager.js      # Centralized settings coordinator
│   │   │   ├── SettingsOverlay.js      # General settings overlay
│   │   │   ├── AgentSettingsOverlay.js # Agent-specific settings
│   │   │   ├── UserSettingsOverlay.js  # User-specific settings
│   │   │   └── SpeechRecognition.js    # Voice command handling
│   │   └── app.js       # Main application logic
│   ├── home.html       # Main application page
│   ├── login.html      # Login page
│   ├── companion.css   # Stylesheets with HUD design
│   └── settings-test.html # Settings testing page
└── docs/               # Documentation
    ├── AUTHENTICATION_README.md
    ├── VOICE_LOGIN_README.md
    ├── APP_FLOW_DIAGRAM.md
    └── SETTINGS_OVERLAY_README.md
```

## ⚙️ Settings System

The AI Companion features a sophisticated, modern settings management system with three specialized overlays and voice control capabilities.

### 🎨 Modern HUD Design

The settings overlays feature a beautiful glassmorphism design that:
- **🪟 Semi-transparent panels** with backdrop blur effects
- **📱 Compact 420px width** that doesn't dominate the screen
- **🎯 Color-coded overlays** for easy identification
- **📱 Responsive design** optimized for all devices
- **✨ Smooth animations** with elegant transitions

### 🎤 Voice Commands

The settings system supports comprehensive voice control:

#### Universal Commands
- `"Settings"` or `"Settings menu"` → Opens General Settings
- `"Close settings"` or `"Close menu"` → Closes current overlay
- `"Agent settings"` or `"Agent menu"` → Opens Agent Settings
- `"User settings"` or `"User menu"` → Opens User Settings

#### Navigation Commands
- `"User profile"` → Opens User Settings + scrolls to profile
- `"Audio settings"` → Opens User Settings + scrolls to audio
- `"Theme settings"` → Opens User Settings + scrolls to theme
- `"Change personality"` → Opens Agent Settings + scrolls to personality
- `"Response length"` → Opens Agent Settings + scrolls to response settings

#### Future Voice-Controlled Settings
The architecture supports direct setting modification:
- `"Set agent personality to friendly"`
- `"Change theme to dark"`
- `"Increase volume to 80%"`
- `"Enable noise suppression"`

### 🧪 Testing

#### Manual Testing
1. **Open Application**: Navigate to the main page
2. **Test Buttons**: Click each of the three settings buttons
3. **Test Voice Commands**: Try all voice commands
4. **Test Navigation**: Use voice commands to navigate between sections
5. **Test Persistence**: Close and reopen to verify settings are saved

#### Test Page
Visit `/static/settings-test.html` for a standalone test environment.

For detailed information, see [Settings Overlay Documentation](SETTINGS_OVERLAY_README.md).

## 🔧 Configuration

### Environment Variables

The application uses the following environment variables (see `.env.example` for details):

- **Database**: Connection details for PostgreSQL
- **Security**: JWT secret key and token expiration
- **Server**: Host, port, and URL configurations
- **CORS**: Allowed origins for cross-origin requests

### AI Model Configuration

The application supports multiple AI providers:
- **OpenAI** (GPT models)
- **Anthropic** (Claude models)
- **Google** (Gemini models)

Configure your API keys in the respective environment variables.

## 🔒 Security

### Best Practices
- ✅ **Never commit `.env` files** to version control
- ✅ **Use strong, unique secret keys** in production
- ✅ **Configure CORS origins** appropriately for your deployment
- ✅ **Secure database credentials** and use environment variables
- ✅ **Use HTTPS** in production environments
- ✅ **Implement proper authentication** with JWT tokens

### Security Features
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- CORS protection
- Input validation with Pydantic
- SQL injection protection with SQLAlchemy

## 🚀 Deployment

### Development
```bash
python app.py
```


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
