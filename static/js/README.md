# AI Companion Web App - JavaScript Architecture

This directory contains the modular JavaScript architecture for the AI Voice Assistant web application.

## Directory Structure

```
static/js/
├── config/
│   └── settings.js          # Centralized configuration
├── utils/
│   ├── logger.js            # Logging utility
│   └── stateManager.js      # State management
├── modules/
│   ├── ParticleSystem.js    # Audio visualization
│   ├── AudioManager.js      # Audio processing
│   ├── SpeechRecognition.js # Speech recognition
│   └── WebSocketManager.js  # WebSocket communication
├── app.js                   # Main application coordinator
├── main.js                  # Entry point with global functions
└── README.md               # This file
```

## Architecture Overview

### Core Principles

1. **Modularity**: Each concern is separated into its own module
2. **Single Responsibility**: Each module has one clear purpose
3. **Dependency Injection**: Modules communicate through well-defined interfaces
4. **State Management**: Centralized state with event-driven updates
5. **Error Handling**: Comprehensive error handling at each level

### Module Responsibilities

#### Configuration (`config/settings.js`)
- Centralizes all hardcoded values
- Provides easy configuration management
- Supports environment-specific settings

#### Utilities

**Logger (`utils/logger.js`)**
- Centralized logging system
- Debug panel integration
- Log level management

**State Manager (`utils/stateManager.js`)**
- Centralized application state
- Event-driven state updates
- State persistence and restoration

#### Core Modules

**Particle System (`modules/ParticleSystem.js`)**
- Real-time audio visualization
- Canvas-based particle effects
- Performance-optimized rendering

**Audio Manager (`modules/AudioManager.js`)**
- Audio context management
- Audio playback and streaming
- Audio analysis for visualization

**Speech Recognition (`modules/SpeechRecognition.js`)**
- Web Speech API integration
- Speech-to-text processing
- Recognition state management

**WebSocket Manager (`modules/WebSocketManager.js`)**
- Real-time communication with backend
- Connection management and reconnection
- Message routing and processing

#### Application Coordinator (`app.js`)
- Orchestrates all modules
- Handles application lifecycle
- Manages initialization and cleanup
- Provides public API

## Usage

### Basic Initialization

```javascript
import { app } from './js/app.js';

// Initialize the application
await app.init();

// Get application status
const status = app.getStatus();
```

### Module Access

```javascript
import { audioManager } from './js/modules/AudioManager.js';
import { speechRecognition } from './js/modules/SpeechRecognition.js';
import { webSocketManager } from './js/modules/WebSocketManager.js';

// Use modules directly
speechRecognition.start();
webSocketManager.sendUserMessage("Hello");
```

### State Management

```javascript
import { stateManager } from './js/utils/stateManager.js';

// Listen for state changes
stateManager.on('recognitionStateChanged', (state) => {
    console.log('Recognition state:', state);
});

// Update state
stateManager.setRecognitionState({ isListening: true });
```

## Development Guidelines

### Adding New Features

1. **Identify the appropriate module** for your feature
2. **Follow the existing patterns** in that module
3. **Update state management** if needed
4. **Add configuration** if required
5. **Update documentation**

### Error Handling

- Use the logger for all error reporting
- Implement proper error recovery
- Provide user-friendly error messages
- Log errors with context

### Performance Considerations

- Use requestAnimationFrame for animations
- Implement proper cleanup
- Avoid memory leaks
- Optimize audio processing

### Testing

- Each module can be tested independently
- Use dependency injection for testing
- Mock external dependencies
- Test state changes and events

## Configuration

All configuration is centralized in `config/settings.js`. Key sections:

- **Audio Settings**: Sample rate, channels, etc.
- **Particle Settings**: Visualization parameters
- **Recognition Settings**: Speech recognition options
- **WebSocket Settings**: Connection parameters
- **UI Settings**: DOM selectors and UI elements

## Browser Compatibility

- Modern browsers with ES6+ support
- Web Speech API support
- WebSocket support
- Canvas API support
- Web Audio API support

## Debugging

- Use the debug panel (Ctrl/Cmd + D)
- Check browser console for logs
- Use `window.AICompanionApp` for debugging
- Monitor WebSocket messages in Network tab

## Future Enhancements

- Unit testing framework
- Performance monitoring
- Accessibility improvements
- Mobile optimization
- Offline support
- Plugin system 