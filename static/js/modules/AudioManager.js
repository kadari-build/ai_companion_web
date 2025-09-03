/**
 * Audio Manager Module
 * Handles audio context, analysis, and playback
 */

import { CONFIG } from '../config/settings.js';
import { logger } from '../utils/logger.js';
import { stateManager } from '../utils/stateManager.js';

export class AudioManager {
    constructor() {
        this.isInitialized = false;
    }

    async init() {
        try {
            const stream = await this.getUserMedia();
            await this.setupAudioContext(stream);
            this.isInitialized = true;
            
            logger.info('Audio context initialized successfully');
            return stream;
        } catch (err) {
            logger.error('Error initializing audio: ' + err.message);
            this.setupFallbackAudio();
            //throw err;
        }
    }

    async getUserMedia() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: CONFIG.AUDIO.echoCancellation,
                    noiseSuppression: CONFIG.AUDIO.noiseSuppression,
                    autoGainControl: CONFIG.AUDIO.autoGainControl,
                    channelCount: CONFIG.AUDIO.channels,
                    sampleRate: CONFIG.AUDIO.sampleRate
                }
            });
            logger.info('Audio stream obtained successfully');
            return stream;
        } catch (error) {
            logger.error(`Error setting up audio: ${error.message}`);
            throw error;
        }
    }

    async setupAudioContext(stream) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = CONFIG.AUDIO.fftSize;
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        stateManager.setAudioState({
            context: audioContext,
            analyser: analyser,
            dataArray: dataArray
        });
    }

    setupFallbackAudio() {
        const dataArray = new Uint8Array(256).fill(128);
        stateManager.setAudioState({ dataArray });
    }

    getAudioIntensity() {
        const { analyser, dataArray } = stateManager.audio;
        if (!analyser) return 0.2;
        
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const value = (dataArray[i] - 128) / 128;
            sum += value * value;
        }
        
        return Math.min(1, Math.sqrt(sum / dataArray.length) * 5);
    }

    async playStreamingAudio(audioChunks) {
        if (audioChunks.length === 0) return;
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        logger.info(`Playing audio: ${audioUrl}`);
        
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            this.handleAudioEnded();
        };

        audio.onerror = (error) => {
            logger.error(`Audio playback error: ${error}`);
            URL.revokeObjectURL(audioUrl);
            this.handleAudioError();
        };

        try {
            await audio.play();
        } catch (error) {
            logger.error(`Failed to play audio: ${error}`);
            this.handleAudioError();
        }
    }

    handleAudioEnded() {
        if (stateManager.hasAudioChunks()) {
            const nextChunk = stateManager.getNextAudioChunk();
            this.playStreamingAudio(nextChunk);
        } else {
            stateManager.setAudioState({ isStreaming: false });
            this.handleAllAudioFinished();
        }
    }

    handleAudioError() {
        if (stateManager.hasAudioChunks()) {
            const nextChunk = stateManager.getNextAudioChunk();
            this.playStreamingAudio(nextChunk);
        }
    }

    handleAllAudioFinished() {
        logger.info('All audio finished, checking for more responses');
        
        // Mark response as processed
        stateManager.setCompanionState({ isProcessingResponse: false });
        
        if (stateManager.hasResponses()) {
            setTimeout(() => {
                // Trigger response processing
                stateManager.emit('processNextResponse');
            }, 500);
        } else {
            this.restartRecognition();
        }
    }

    restartRecognition() {
        stateManager.setCurrentSpeaker('user');
        stateManager.setRecognitionState({ isSpeaking: false });
        
        // Update UI
        const statusDiv = document.querySelector(CONFIG.UI.statusDiv);
        if (statusDiv) {
            statusDiv.textContent = "Listening...";
        }
        
        // Restart recognition if not already running
        if (!stateManager.isRecognitionRunning()) {
            try {
                stateManager.recognition.instance.start();
                logger.info('Restarted recognition after all AI responses');
            } catch (error) {
                logger.error(`Failed to restart recognition after audio: ${error}`);
            }
        }
    }

    // Audio queue management
    addToAudioQueue(audioBuffer) {
        logger.info(`Adding audio buffer to queue (length: ${audioBuffer.length})`);
        stateManager.addToAudioQueue([audioBuffer]);
        
        // Start playing if not already streaming
        if (!stateManager.isStreaming()) {
            logger.info('Starting audio playback');
            stateManager.setAudioState({ isStreaming: true });
            const firstChunk = stateManager.getNextAudioChunk();
            this.playStreamingAudio(firstChunk);
        } else {
            logger.info('Audio already streaming, buffer queued');
        }
    }

    // Base64 audio processing
    processBase64Audio(base64Data) {
        try {
            logger.info(`Processing base64 audio data (length: ${base64Data.length})`);
            const audioData = atob(base64Data);
            const audioBuffer = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
                audioBuffer[i] = audioData.charCodeAt(i);
            }
            logger.info(`Converted audio data to buffer (length: ${audioBuffer.length})`);
            this.addToAudioQueue(audioBuffer);
        } catch (error) {
            logger.error(`Error processing base64 audio: ${error}`);
        }
    }

    // System requirements check
    async checkSystemRequirements() {
        logger.info('Checking system requirements...');
        
        try {
            // Check for required APIs
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                logger.error('MediaDevices API not available');
                return false;
            }
            logger.info('MediaDevices API available');

            if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
                logger.error('Speech Recognition API not available');
                return false;
            }
            logger.info('Speech Recognition API available');

            if (!window.speechSynthesis) {
                logger.error('Speech Synthesis API not available');
                return false;
            }
            logger.info('Speech Synthesis API available');

            return true;
        } catch (error) {
            logger.error(`Error checking system requirements: ${error.message}`);
            return false;
        }
    }

    // Cleanup
    cleanup() {
        const { context } = stateManager.audio;
        if (context) {
            context.close();
        }
        this.isInitialized = false;
        logger.info('Audio manager cleaned up');
    }
}

// Create singleton instance
export const audioManager = new AudioManager();

export default audioManager; 