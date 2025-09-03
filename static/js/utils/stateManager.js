/**
 * State Manager
 * Centralized state management for the AI Voice Assistant
 */

export class StateManager {
    constructor() {
        this.state = {
            // Audio state
            audio: {
                context: null,
                analyser: null,
                dataArray: null,
                isStreaming: false,
                queue: [],
                currentAudio: null
            },
            
            // Recognition state
            recognition: {
                instance: null,
                isRunning: false,
                isListening: false,
                isSpeaking: false,
                currentSpeaker: 'none'
            },
            
            // WebSocket state
            websocket: {
                connection: null,
                clientId: null,
                isConnected: false
            },
            
            // Companion state
            companion: {
                companion: null,
                status: {},
                active: {},
                responseQueue: [],
                isProcessingResponse: false,
                isInitialized: false,
                companionInitPromise: null,
                companionInitResolve: null,
                companionInitReject: null
            },
            
            // UI state
            ui: {
                canvas: null,
                ctx: null,
                particles: {},
                animationId: null,
                currentTheme: 'light'
            },
            
            // Media state
            media: {
                recorder: null,
                chunks: [],
                sessionId: null
            },
            
            // User state
            user: {
                id: null,
                name: null,
                email: null,
                isAuthenticated: false
            }
        };
        
        this.listeners = new Map();
    }

    // State getters
    get audio() { return this.state.audio; }
    get recognition() { return this.state.recognition; }
    get websocket() { return this.state.websocket; }
    get companion() { return this.state.companion; }
    get ui() { return this.state.ui; }
    get media() { return this.state.media; }
    get user() { return this.state.user; }

    // State setters with event emission
    setAudioState(updates) {
        this.state.audio = { ...this.state.audio, ...updates };
        this.emit('audioStateChanged', this.state.audio);
    }

    setRecognitionState(updates) {
        this.state.recognition = { ...this.state.recognition, ...updates };
        this.emit('recognitionStateChanged', this.state.recognition);
    }

    setWebSocketState(updates) {
        this.state.websocket = { ...this.state.websocket, ...updates };
        this.emit('websocketStateChanged', this.state.websocket);
    }

    setCompanionState(updates) {
        this.state.companion = { ...this.state.companion, ...updates };
        this.emit('companionStateChanged', this.state.companion);
    }

    setUIState(updates) {
        this.state.ui = { ...this.state.ui, ...updates };
        this.emit('uiStateChanged', this.state.ui);
    }

    setMediaState(updates) {
        this.state.media = { ...this.state.media, ...updates };
        this.emit('mediaStateChanged', this.state.media);
    }

    setUserState(updates) {
        this.state.user = { ...this.state.user, ...updates };
        this.emit('userStateChanged', this.state.user);
    }

    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        // This function is used to emit events to the listeners
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Utility methods
    isRecognitionRunning() {
        return this.state.recognition.isRunning;
    }

    isSpeaking() {
        return this.state.recognition.isSpeaking;
    }

    isStreaming() {
        return this.state.audio.isStreaming;
    }

    isWebSocketConnected() {
        return this.state.websocket.isConnected;
    }

    getCurrentSpeaker() {
        return this.state.recognition.currentSpeaker;
    }

    setCurrentSpeaker(speaker) {
        this.setRecognitionState({ currentSpeaker: speaker });
    }

    // Queue management
    addToResponseQueue(response) {
        this.state.companion.responseQueue.push(response);
        this.emit('responseQueueChanged', this.state.companion.responseQueue);
    }

    getNextResponse() {
        return this.state.companion.responseQueue.shift();
    }

    hasResponses() {
        return this.state.companion.responseQueue.length > 0;
    }

    // Audio queue management
    addToAudioQueue(audioChunk) {
        this.state.audio.queue.push(audioChunk);
        this.emit('audioQueueChanged', this.state.audio.queue);
    }

    getNextAudioChunk() {
        return this.state.audio.queue.shift();
    }

    hasAudioChunks() {
        return this.state.audio.queue.length > 0;
    }

    // Theme management
    setTheme(theme) {
        this.state.ui.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.emit('themeChanged', theme);
    }

    getTheme() {
        return this.state.ui.currentTheme;
    }

    // Reset state
    reset() {
        this.state = {
            audio: { context: null, analyser: null, dataArray: null, isStreaming: false, queue: [], currentAudio: null },
            recognition: { instance: null, isRunning: false, isListening: false, isSpeaking: false, currentSpeaker: 'none' },
            websocket: { connection: null, clientId: null, isConnected: false },
            companion: { active: {}, status: {}, responseQueue: [], isProcessingResponse: false },
            ui: { canvas: null, ctx: null, particles: {}, animationId: null, currentTheme: 'light' },
            media: { recorder: null, chunks: [], sessionId: null }
        };
        this.emit('stateReset', this.state);
    }
}

// Create singleton instance
export const stateManager = new StateManager();

export default stateManager; 