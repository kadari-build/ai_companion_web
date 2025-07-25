/**
 * Speech Recognition Module
 * Handles speech recognition and transcription
 */

import { CONFIG } from '../config/settings.js';
import { logger } from '../utils/logger.js';
import { stateManager } from '../utils/stateManager.js';

export class SpeechRecognitionManager {
    constructor() {
        this.recognition = null;
        this.isInitialized = false;
        this.recognitionStartAttempted = false;
    }

    init() {
        try {
            // Initialize speech recognition
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                throw new Error('Speech Recognition API not available');
            }

            this.recognition = new SpeechRecognition();
            this.setupRecognitionSettings();
            this.setupEventHandlers();
            
            stateManager.setRecognitionState({ instance: this.recognition });
            this.isInitialized = true;
            
            logger.info('Speech recognition initialized successfully');
            return true;
        } catch (error) {
            logger.error(`Failed to initialize speech recognition: ${error.message}`);
            return false;
        }
    }

    setupRecognitionSettings() {
        this.recognition.lang = CONFIG.RECOGNITION.language;
        this.recognition.continuous = CONFIG.RECOGNITION.continuous;
        this.recognition.interimResults = CONFIG.RECOGNITION.interimResults;
        this.recognition.maxAlternatives = CONFIG.RECOGNITION.maxAlternatives;
    }

    setupEventHandlers() {
        // Start event
        this.recognition.onstart = () => {
            logger.info('Speech recognition started');
            stateManager.setRecognitionState({ 
                isRunning: true, 
                isListening: true 
            });
            this.updateUI('Listening...');
        };

        // Result event
        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            this.updateTranscript(transcript);
            logger.info(`Speech recognized: "${transcript}"`);
            
            if (event.results[event.results.length - 1].isFinal) {
                this.handleFinalResult(transcript);
            }
        };

        // Error event
        this.recognition.onerror = (event) => {
            logger.error(`Speech recognition error: ${event.error}`);
            
            if (event.error === 'no-speech') {
                this.handleNoSpeech();
            } else if (event.error === 'network') {
                this.handleNetworkError();
            } else if (event.error === 'not-allowed' || event.error === 'audio-capture') {
                this.handleAudioDeviceError();
            } else {
                this.handleGenericError(event.error);
            }
        };

        // End event
        this.recognition.onend = () => {
            logger.info('Speech recognition ended');
            stateManager.setRecognitionState({ 
                isRunning: false, 
                isListening: false 
            });
            
            // Restart if not speaking and no error occurred
            if (!stateManager.isSpeaking() && !this.recognitionStartAttempted) {
                this.restartRecognition();
            }
        };

        // Audio start event
        this.recognition.onaudiostart = () => {
            logger.debug('Audio capture started');
            this.updateListeningIndicator(true);
        };

        // Audio end event
        this.recognition.onaudioend = () => {
            logger.debug('Audio capture ended');
            this.updateListeningIndicator(false);
        };

        // Sound start event
        this.recognition.onsoundstart = () => {
            logger.debug('Sound detected');
        };

        // Sound end event
        this.recognition.onsoundend = () => {
            logger.debug('Sound ended');
        };

        // Speech start event
        this.recognition.onspeechstart = () => {
            logger.debug('Speech started');
        };

        // Speech end event
        this.recognition.onspeechend = () => {
            logger.debug('Speech ended');
        };
    }

    start() {
        if (!this.isInitialized) {
            logger.error('Speech recognition not initialized');
            return false;
        }

        if (stateManager.isRecognitionRunning()) {
            logger.warn('Recognition already running');
            return false;
        }

        try {
            this.recognitionStartAttempted = true;
            this.recognition.start();
            logger.info('Started speech recognition');
            return true;
        } catch (error) {
            logger.error(`Failed to start recognition: ${error.message}`);
            this.recognitionStartAttempted = false;
            return false;
        }
    }

    stop() {
        if (this.recognition && stateManager.isRecognitionRunning()) {
            try {
                this.recognition.stop();
                logger.info('Stopped speech recognition');
            } catch (error) {
                logger.error(`Error stopping recognition: ${error.message}`);
            }
        }
    }

    restartRecognition() {
        if (stateManager.isRecognitionRunning()) {
            logger.warn('Recognition already running, not restarting');
            return;
        }

        // Reset the flag
        this.recognitionStartAttempted = false;
        
        // Small delay to ensure proper cleanup
        setTimeout(() => {
            this.start();
        }, 100);
    }

    handleFinalResult(transcript) {
        if (!transcript.trim()) {
            logger.warn('Empty transcript received');
            return;
        }

        // Stop recognition while processing
        this.stop();
        
        // Update UI
        this.updateUI('Processing...');
        stateManager.setCurrentSpeaker('user');
        
        // Send to WebSocket
        this.sendTranscript(transcript);
    }

    handleNoSpeech() {
        logger.info('No speech detected, restarting recognition');
        this.recognitionStartAttempted = false;
        this.restartRecognition();
    }

    handleNetworkError() {
        logger.error('Network error in speech recognition');
        this.updateUI('Network error. Please check your connection.');
        
        // Try to restart after a delay
        setTimeout(() => {
            this.recognitionStartAttempted = false;
            this.restartRecognition();
        }, 2000);
    }

    handleGenericError(error) {
        logger.error(`Speech recognition error: ${error}`);
        this.updateUI(`Error: ${error}`);
        
        // Try to restart after a delay
        setTimeout(() => {
            this.recognitionStartAttempted = false;
            this.restartRecognition();
        }, 3000);
    }
    
    handleAudioDeviceError() {
        logger.error('Audio device not available or permission denied');
        this.updateUI('Audio device not available');
        
        // Show the audio error fallback
        const audioErrorFallback = document.getElementById('audioErrorFallback');
        if (audioErrorFallback) {
            audioErrorFallback.style.display = 'block';
        }
        
        stateManager.setRecognitionState({ isRunning: false });
    }

    sendTranscript(transcript) {
        const message = {
            type: 'user_message',
            content: transcript,
            timestamp: new Date().toISOString()
        };

        // Emit event for WebSocket to handle
        stateManager.emit('sendMessage', message);
    }

    updateTranscript(text) {
        const transcriptDiv = document.querySelector(CONFIG.UI.transcriptDiv);
        if (transcriptDiv) {
            transcriptDiv.textContent = text;
        }
    }

    updateUI(status) {
        const statusDiv = document.querySelector(CONFIG.UI.statusDiv);
        if (statusDiv) {
            statusDiv.textContent = status;
        }
    }

    updateListeningIndicator(isListening) {
        const indicator = document.querySelector(CONFIG.UI.listeningIndicator);
        if (indicator) {
            indicator.style.display = isListening ? 'block' : 'none';
        }
    }

    // Public methods for external control
    pauseRecognition() {
        this.stop();
        this.updateUI('Paused');
    }

    resumeRecognition() {
        this.start();
    }

    // Cleanup
    cleanup() {
        if (this.recognition) {
            this.stop();
            this.recognition = null;
        }
        this.isInitialized = false;
        logger.info('Speech recognition cleaned up');
    }
}

// Create singleton instance
export const speechRecognition = new SpeechRecognitionManager();

export default speechRecognition; 