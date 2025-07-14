/**
 * Main Application Module
 * Coordinates all modules and handles application lifecycle
 */

import { CONFIG } from './config/settings.js';
import { logger } from './utils/logger.js';
import { stateManager } from './utils/stateManager.js';
import { particleSystem } from './modules/ParticleSystem.js';
import { audioManager } from './modules/AudioManager.js';
import { speechRecognition } from './modules/SpeechRecognition.js';
import { webSocketManager } from './modules/WebSocketManager.js';

export class AICompanionApp {
    constructor() {
        this.isInitialized = false;
        this.modules = {
            particleSystem,
            audioManager,
            speechRecognition,
            webSocketManager
        };
    }

    async init() {
        try {
            logger.info('Initializing AI Companion Application...');
            
            // Check system requirements
            if (!await audioManager.checkSystemRequirements()) {
                throw new Error('System requirements not met');
            }
            
            // Initialize modules in order
            await this.initializeModules();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup state listeners
            this.setupStateListeners();
            
            // Initialize UI
            this.initializeUI();
            
            // Start the application
            await this.start();
            
            this.isInitialized = true;
            logger.info('Application initialized successfully');
            
        } catch (error) {
            logger.error(`Failed to initialize application: ${error.message}`);
            this.handleInitializationError(error);
        }
    }

    async initializeModules() {

        // Connect to WebSocket
        await webSocketManager.init();

        // Setup WebSocket listeners
        webSocketManager.setupStateListeners();

        // Initialize particle system
        if (!particleSystem.init()) {
            throw new Error('Failed to initialize particle system');
        }
        
        // Initialize audio manager
        await audioManager.init();
        
        // Initialize speech recognition
        if (!speechRecognition.init()) {
            throw new Error('Failed to initialize speech recognition');
        }
    
        
        logger.info('All modules initialized');
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            particleSystem.onWindowResize();
        });

        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        });

        // Before unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
    }

    setupStateListeners() {
        // Listen for state changes and update UI accordingly
        stateManager.on('recognitionStateChanged', (recognitionState) => {
            this.updateRecognitionUI(recognitionState);
        });

        stateManager.on('websocketStateChanged', (websocketState) => {
            this.updateConnectionUI(websocketState);
        });

        stateManager.on('audioStateChanged', (audioState) => {
            this.updateAudioUI(audioState);
        });
    }

    initCanvas() {
        const canvas = document.getElementById('visualizer');
        if (!canvas) {
            logger.error('Canvas element not found');
            return false;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            logger.error('Could not get canvas context');
            return false;
        }
        
        stateManager.setUIState({ canvas, ctx });
        return true;
    }

    initializeUI() {

        // Initialize canvas first
        //if (!this.initCanvas()) {
        //    throw new Error('Failed to initialize canvas');
        //}

        // Set initial theme
        const savedTheme = localStorage.getItem(CONFIG.THEME.storageKey) || CONFIG.THEME.default;
        stateManager.setTheme(savedTheme);
        
        // Update initial UI state
        this.updateUI();
        
        logger.info('UI initialized');
    }

    async start() {
        try {
            
            // Start particle system
            particleSystem.start();
            
            // Start speech recognition
            speechRecognition.start();
            
            logger.info('Application started successfully');
            
        } catch (error) {
            logger.error(`Failed to start application: ${error.message}`);
            throw error;
        }
    }

    updateUI() {
        // Update status
        const statusDiv = document.querySelector(CONFIG.UI.statusDiv);
        if (statusDiv) {
            if (stateManager.isWebSocketConnected()) {
                statusDiv.textContent = 'Ready';
            } else {
                statusDiv.textContent = 'Connecting...';
            }
        }
    }

    updateRecognitionUI(recognitionState) {
        const statusDiv = document.querySelector(CONFIG.UI.statusDiv);
        if (statusDiv) {
            if (recognitionState.isListening) {
                statusDiv.textContent = 'Listening...';
            } else if (recognitionState.isSpeaking) {
                statusDiv.textContent = 'AI is speaking...';
            } else if (recognitionState.isRunning) {
                statusDiv.textContent = 'Ready';
            }
        }
    }

    updateConnectionUI(websocketState) {
        const statusDiv = document.querySelector(CONFIG.UI.statusDiv);
        if (statusDiv) {
            if (websocketState.isConnected) {
                statusDiv.textContent = 'Connected';
            } else {
                statusDiv.textContent = 'Disconnected';
            }
        }
    }

    updateAudioUI(audioState) {
        // Update audio-related UI elements
        if (audioState.isStreaming) {
            // Audio is playing
        } else {
            // Audio stopped
        }
    }

    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + Space: Toggle recognition
        if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
            event.preventDefault();
            this.toggleRecognition();
        }
        
        // Ctrl/Cmd + R: Restart recognition
        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyR') {
            event.preventDefault();
            this.restartRecognition();
        }
        
        // Ctrl/Cmd + D: Toggle debug panel
        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyD') {
            event.preventDefault();
            this.toggleDebugPanel();
        }
    }

    toggleRecognition() {
        if (stateManager.isRecognitionRunning()) {
            speechRecognition.pauseRecognition();
        } else {
            speechRecognition.resumeRecognition();
        }
    }

    restartRecognition() {
        speechRecognition.stop();
        setTimeout(() => {
            speechRecognition.start();
        }, 100);
    }

    toggleDebugPanel() {
        const debugPanel = document.querySelector(CONFIG.UI.debugPanel);
        const debugToggle = document.querySelector(CONFIG.UI.debugToggle);
        
        if (debugPanel && debugToggle) {
            const isVisible = debugPanel.classList.contains('visible');
            debugPanel.classList.toggle('visible');
            debugToggle.textContent = isVisible ? 'Show Debug' : 'Hide Debug';
        }
    }

    handlePageHidden() {
        logger.info('Page hidden, pausing recognition');
        speechRecognition.pauseRecognition();
    }

    handlePageVisible() {
        logger.info('Page visible, resuming recognition');
        speechRecognition.resumeRecognition();
    }

    handleInitializationError(error) {
        const statusDiv = document.querySelector(CONFIG.UI.statusDiv);
        if (statusDiv) {
            statusDiv.textContent = `Initialization failed: ${error.message}`;
        }
        
        // Show error in debug panel
        logger.error(`Application initialization failed: ${error.message}`);
    }

    cleanup() {
        logger.info('Cleaning up application...');
        
        // Stop all modules
        particleSystem.stop();
        speechRecognition.cleanup();
        audioManager.cleanup();
        webSocketManager.disconnect();
        
        // Reset state
        stateManager.reset();
        
        logger.info('Application cleaned up');
    }

    // Public API methods
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isConnected: stateManager.isWebSocketConnected(),
            isListening: stateManager.recognition.isListening,
            isSpeaking: stateManager.recognition.isSpeaking,
            currentSpeaker: stateManager.getCurrentSpeaker()
        };
    }

    sendMessage(content) {
        return webSocketManager.sendUserMessage(content);
    }

    pause() {
        speechRecognition.pauseRecognition();
    }

    resume() {
        speechRecognition.resumeRecognition();
    }
}

logger.info('Launching AI Companion...');

// Create and export singleton instance
export const app = new AICompanionApp();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await app.init();
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
});

// Make app available globally for debugging
window.AICompanionApp = app;

export default app; 