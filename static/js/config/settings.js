/**
 * Application Configuration
 * Centralized settings for the AI Voice Assistant
 */

export const CONFIG = {
    // Server settings
    SERVER_URL: 'http://localhost:7777',
    
    // Audio settings
    AUDIO: {
        sampleRate: 16000,
        channels: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        fftSize: 512
    },
    
    // Particle system settings
    PARTICLES: {
        count: 50,
        maxDistance: 100,
        baseRadius: { min: 3, max: 5 },
        velocity: { min: 0.005, max: 0.015 },
        distance: { min: 60, max: 180 }
    },
    
    // Agent configurations
    AGENTS: {
        'assistant': {
            color: { hue: 220, saturation: 80, brightness: 60 },
            position: 0.3
        }
    },
    
    // Recognition settings
    RECOGNITION: {
        language: 'en-US',
        continuous: true,
        interimResults: false,
        maxAlternatives: 1
    },
    
    // UI settings
    UI: {
        debugPanel: '.debug-panel',
        debugContent: '.debug-content',
        debugToggle: '.debug-toggle',
        statusDiv: '.status',
        transcriptDiv: '.transcript',
        listeningIndicator: '#listeningIndicator'
    },
    
    // Animation settings
    ANIMATION: {
        frameRate: 60,
        performanceThreshold: 16 // ms
    },
    
    // WebSocket settings
    WEBSOCKET: {
        reconnectDelay: 5000,
        maxReconnectAttempts: 10
    },
    
    // Theme settings
    THEME: {
        default: 'light',
        storageKey: 'theme'
    }
};

export default CONFIG; 