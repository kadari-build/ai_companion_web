# AI Companion Web

A sophisticated web-based AI conversation companion with advanced voice capabilities, authentication, and real-time communication.

## 🚀 Features

### Core Functionality
- **AI-powered conversation companion** with multi-model support (OpenAI, Anthropic, Google)
- **Voice login and interaction** with speech recognition and text-to-speech
- **JWT-based authentication** with refresh tokens
- **Real-time WebSocket communication** for instant responses
- **Database integration** with PostgreSQL for user management and conversation history
- **LangChain integration** for advanced AI workflows
- **Gmail integration** for email processing capabilities

### Technical Features
- **FastAPI backend** with async support
- **WebSocket connections** for real-time chat
- **CORS configuration** for cross-origin requests
- **Environment-based configuration** with secure credential management
- **Modular architecture** with separate authentication and API modules
- **Voice processing** with Whisper for speech recognition
- **Text-to-speech** with gTTS and pyttsx3

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

**Option B: Create from scratch**
Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ai_companion_db
DATABASE_PW=your_database_password_here
DATABASE_USER=your_database_username
DATABASE_NAME=ai_companion_db
DATABASE_HOST=localhost
DATABASE_PORT=5432

# Security
SECRET_KEY=your_super_secret_key_here_make_it_at_least_32_characters_long

# Server Configuration
HOST=localhost
PORT=7777
LOCAL_URL_SSL=https://localhost:7777
LOCAL_URL=http://localhost:7777
LOCAL_IP=127.0.0.1

# CORS Configuration
CORS_ORIGINS=https://localhost:7777,http://localhost:7777

# JWT Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=3
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
│   ├── home.html       # Main application page
│   ├── login.html      # Login page
│   └── companion.css   # Stylesheets
└── docs/               # Documentation
    ├── AUTHENTICATION_README.md
    ├── VOICE_LOGIN_README.md
    └── APP_FLOW_DIAGRAM.md
```

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

### Production Considerations
1. **Use a production WSGI server** (Gunicorn, uvicorn)
2. **Set up reverse proxy** (Nginx, Apache)
3. **Configure SSL/TLS certificates**
4. **Use environment-specific database credentials**
5. **Set up proper logging and monitoring**
6. **Configure backup strategies**

## 📚 Documentation

- [Authentication Guide](AUTHENTICATION_README.md) - Detailed authentication setup
- [Voice Login Guide](VOICE_LOGIN_README.md) - Voice interaction features
- [App Flow Diagram](APP_FLOW_DIAGRAM.md) - Application architecture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the documentation files
- Review the app flow diagram
- Examine the authentication and voice login guides
- Create an issue in the repository

## 🔄 Version History

- **v1.0.0** - Initial release with core AI companion functionality
- Voice login and authentication
- Real-time WebSocket communication
- Database integration
- Multi-model AI support
