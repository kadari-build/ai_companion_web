/**
 * Application Configuration
 * Centralized settings for the AI Voice Assistant
 */

function getServerUrl() {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port || (protocol === 'https:' ? '443' : '80');
    
    // For development, use the current host
    return `${protocol}//${hostname}:${port}`;
}

function getWebSocketUrl() {
    const serverUrl = getServerUrl();
    const protocol = serverUrl.startsWith('https:') ? 'wss:' : 'ws:';
    const host = serverUrl.replace(/^https?:\/\//, '');
    return `${protocol}//${host}/ws/`;
}

export const CONFIG = {
    // Server settings
    SERVER_URL: getServerUrl(),
    WEBSOCKET_URL: getWebSocketUrl(),
    
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
    
    // Companion configurations
    COMPANIONS: {
        'assistant': {
            color: { hue: 220, saturation: 80, brightness: 60 },
            position: 0.5
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
        maxReconnectAttempts: 5
    },
    
    // Theme settings
    THEME: {
        default: 'light',
        storageKey: 'theme'
    }
};

export default CONFIG; 