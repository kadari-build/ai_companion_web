/**
 * Main Application Module
 * Coordinates all modules and handles application lifecycle
 */

import { CONFIG } from './config/settings.js';
import { logger } from './utils/logger.js';
import { stateManager } from './utils/stateManager.js';
import { particleCloudVisualizer } from './modules/ParticleCloudVisualizer.js';
import { audioManager } from './modules/AudioManager.js';
import { speechRecognition } from './modules/SpeechRecognition.js';
import { webSocketManager } from './modules/WebSocketManager.js';
import { settingsManager } from './modules/SettingsManager.js';
import { signOut, isAuthenticated, requireAuth, toggleTheme, initializeTheme, copyDebugLog } from './utils/auth.js';
import { showTextInput, hideTextInput, sendTextMessage, setupTextInputListeners, switchToVoiceMode, switchToTextMode, testTextInput } from './utils/ui.js';

export class AICompanionApp {
    constructor() {
        this.isInitialized = false;
        this.init_retries = 0;
        this.modules = {
            particleCloudVisualizer,
            audioManager,
            speechRecognition,
            webSocketManager,
            settingsManager
        };
        
    }

    async init() {
        try {
            logger.info('Initializing AI Companion Application...');
            
            
            // Check authentication first
            if (!this.checkAuthentication()) {
                logger.error('User not authenticated, redirecting to login');
                window.location.href = '/static/login.html';
                return;
            }
            
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
            
            // Initialize global functions for HTML onclick
            this.initializeGlobalFunctions();

            // Initialize companion
            await this.initializeCompanion();
            
            // Start the application
            await this.start();
            
            this.isInitialized = true;
            logger.info('Application initialized successfully');
            
        } catch (error) {
            logger.error(`Failed to initialize application: ${error.message}`);
            this.handleInitializationError(error);
        }
    }

    checkAuthentication() {
        return isAuthenticated();
    }

    async initializeModules() {

        // Connect to WebSocket
        await webSocketManager.init();

        // Setup WebSocket listeners
        webSocketManager.setupStateListeners();

        // Initialize particle cloud visualizer
        if (!particleCloudVisualizer.init()) {
            throw new Error('Failed to initialize particle cloud visualizer');
        }
        
        // Initialize audio manager
        await audioManager.init();
        
        // Initialize speech recognition
        if (!speechRecognition.init()) {
            throw new Error('Failed to initialize speech recognition');
        }
        // Initialize settings manager with speech recognition as dependency
        if (!settingsManager.init(speechRecognition)) {
            throw new Error('Failed to initialize settings manager');
        }
    
        
        logger.info('All modules initialized');
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            particleCloudVisualizer.onWindowResize();
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
        // Initialize theme
        this.initializeTheme();
        
        // Update user display
        this.updateUserDisplay();
        
        // Setup debug panel toggle
        const debugToggle = document.querySelector('.debug-toggle');
        if (debugToggle) {
            debugToggle.addEventListener('click', () => this.toggleDebugPanel());
        }
        
        // Setup settings button event listeners
        this.setupSettingsButtonListeners();
        
        // Setup keyboard shortcuts
        document.addEventListener('keydown', (event) => this.handleKeyboardShortcuts(event));
        
        logger.info('UI initialized');
    }

    setupSettingsButtonListeners() {
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                settingsManager.openGeneralSettings();
            });
        }

        // Agent settings button
        const agentSettingsBtn = document.getElementById('agentSettingsBtn');
        if (agentSettingsBtn) {
            agentSettingsBtn.addEventListener('click', () => {
                settingsManager.openAgentSettings();
            });
        }

        // User settings button
        const userSettingsBtn = document.getElementById('userSettingsBtn');
        if (userSettingsBtn) {
            userSettingsBtn.addEventListener('click', () => {
                settingsManager.openUserSettings();
            });
        }
    }

    initializeTheme() {
        // Use the auth module function
        initializeTheme();
    }

    async initializeCompanion() {
        if (stateManager.companion.isInitialized) {
            logger.info('Companion already initialized');
            return;
        }

        // Create a new promise for this initialization
        stateManager.companion.companionInitPromise = new Promise((resolve, reject) => {
            stateManager.companion.companionInitResolve = resolve;
            stateManager.companion.companionInitReject = reject;
        });

        //Send a message to the backend to create a companion
        logger.info(`Sending message to create companion for user ${stateManager.user.name}`);
        webSocketManager.sendMessage({
            type: 'create_companion',
            data: {
                user_name: stateManager.user.name
            }
        });

        // Wait for the companion to be initialized using a Promise
        try {
            await Promise.race([
                stateManager.companion.companionInitPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Companion initialization timeout')), 10000)
                )
            ]);
            return true;
        } catch (error) {
            // Clean up promise on error
            stateManager.companion.companionInitResolve = null;
            stateManager.companion.companionInitReject = null;
            logger.error(`Companion initialization failed: ${error.message}`);
            throw error;
        }        
        
    }
    async start() {
        try {
            
            // Start particle cloud visualizer
            particleCloudVisualizer.start();
            
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
        // Handle global keyboard shortcuts
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            sendTextMessage();
        }
        
        // Add other keyboard shortcuts as needed
        if (event.key === 'Escape') {
            hideTextInput();
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
        // Clean up app and retry initialization if it fails
        if (this.init_retries < 3) {
            statusDiv.textContent = "Retrying initialization...";
            this.init_retries++;
            setTimeout(() => {
                this.cleanup();
                this.init();
            }, 3000);
        }
        else {
            logger.error('Application initialization failed after 3 retries');
            this.cleanup();
            statusDiv.textContent = "Initialization failed";
        }
    }

    cleanup() {
        logger.info('Cleaning up application...');
        
        // Stop all modules
        particleCloudVisualizer.stop();
        speechRecognition.cleanup();
        audioManager.cleanup();
        settingsManager.cleanup();

        // Resolve the promise if it exists
        if (stateManager.companion.companionInitResolve) {
            stateManager.companion.companionInitResolve(null);
            stateManager.companion.companionInitResolve = null;
            stateManager.companion.companionInitReject = null;
        }


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


     // Text input functions
    initializeGlobalFunctions() {
        // Make functions available globally for HTML onclick attributes
        window.signOut = signOut;
        window.toggleTheme = toggleTheme;
        window.showTextInput = showTextInput;
        window.hideTextInput = hideTextInput;
        window.sendTextMessage = sendTextMessage;
        window.copyDebugLog = copyDebugLog;
        window.switchToVoiceMode = switchToVoiceMode;
        window.switchToTextMode = switchToTextMode;
        window.testTextInput = testTextInput; // For debugging
        
        // Setup text input listeners
        setupTextInputListeners();
        
        // Initialize user display
        this.updateUserDisplay();
    }

    updateUserDisplay() {
        // Use the existing requireAuth function to handle user display
        requireAuth();
        
        // Also check if header is visible
        const headerElement = document.querySelector('.header');
        if (headerElement) {
            logger.info('Header element found');
            // Ensure header is visible
            headerElement.style.display = 'flex';
            headerElement.style.visibility = 'visible';
            headerElement.style.opacity = '1';
            logger.info('Header visibility ensured');
        } else {
            logger.error('Header element not found');
        }
        
        // Check user info element
        const userInfoElement = document.querySelector('.user-info');
        if (userInfoElement) {
            logger.info('User info element found');
            userInfoElement.style.display = 'flex';
            userInfoElement.style.visibility = 'visible';
        } else {
            logger.error('User info element not found');
        }
        
        // Check theme toggle
        const themeToggleElement = document.querySelector('.theme-toggle');
        if (themeToggleElement) {
            logger.info('Theme toggle element found');
            themeToggleElement.style.display = 'flex';
            themeToggleElement.style.visibility = 'visible';
        } else {
            logger.error('Theme toggle element not found');
        }
    }
}

// Create and export singleton instance
export const app = new AICompanionApp();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM loaded, initializing application...');
        logger.info('DOM loaded, initializing application...');
        
        // Set up global functions immediately for debugging
        window.signOut = signOut;
        window.toggleTheme = toggleTheme;
        window.showTextInput = showTextInput;
        window.hideTextInput = hideTextInput;
        window.sendTextMessage = sendTextMessage;
        window.copyDebugLog = copyDebugLog;
        window.switchToVoiceMode = switchToVoiceMode;
        window.switchToTextMode = switchToTextMode;
        
        // console.log('Global functions set up:', {
        //     signOut: typeof window.signOut,
        //     toggleTheme: typeof window.toggleTheme,
        //     showTextInput: typeof window.showTextInput,
        //     switchToVoiceMode: typeof window.switchToVoiceMode,
        //     switchToTextMode: typeof window.switchToTextMode
        // });
        
        await app.init();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        logger.error('Application initialization failed:', error);
    }
});

// Make app available globally for debugging
window.AICompanionApp = app;

export default app; 