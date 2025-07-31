/**
 * WebSocket Manager Module
 * Handles WebSocket communication with the backend
 */

import { CONFIG } from '../config/settings.js';
import { logger } from '../utils/logger.js';
import { stateManager } from '../utils/stateManager.js';
import { audioManager } from './AudioManager.js';
import { getAccessToken, handleAuthFailure } from '../utils/auth.js';

export class WebSocketManager {
    constructor() {
        this.connection = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = CONFIG.WEBSOCKET.maxReconnectAttempts;
        this.reconnectDelay = CONFIG.WEBSOCKET.reconnectDelay;
        this.isConnecting = false;
    }

    async init() {
        if (this.isConnecting || stateManager.isWebSocketConnected()) {
            logger.warn('WebSocket connection already in progress or connected');
            return;
        }
        
        try {
            const wsUrl = CONFIG.WEBSOCKET_URL;
            const clientId = this.generateClientId();
            logger.info(`Client ID: ${clientId}`);
            this.connection = new WebSocket(wsUrl + clientId);
            this.isConnecting = true;

            // Set the client ID in the state manager
            stateManager.websocket.clientId = clientId;

            // Set the connection state in the state manager
            stateManager.setWebSocketState({
                connection: this.connection,
                isConnected: true
            });
            
            this.setupEventHandlers();
            
            logger.info(`WebSocket connection initiated on: ${wsUrl}`);
        } catch (error) {
            logger.error(`Failed to create WebSocket connection: ${error.message}`);
            this.isConnecting = false;
            this.handleConnectionError(error);
        }
    }

    setupEventHandlers() {
        // Connection opened
        this.connection.onopen = () => {
            // Check authentication via websocket to ensure user can send authenticated messages to the server
            const accessToken = localStorage.getItem('access_token');
            logger.info('Access token: ' + accessToken);
            if (accessToken) {
                logger.info('Sending authentication message');
                this.sendMessage({
                    type: 'auth'
                });
            } else {
                // If authentication fails, sign out the user and redirect to login page
                handleAuthFailure();
            }

            logger.info('WebSocket connection established');
            this.isConnecting = false;
            this.reconnectAttempts = 0;    

        };

        // Message received
        this.connection.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                logger.error(`Error parsing WebSocket message: ${error.message}`);
            }
        };

        // Connection closed
        this.connection.onclose = (event) => {
            logger.info(`WebSocket connection closed: ${event.code} - ${event.reason}`);
            this.isConnecting = false;
            
            stateManager.setWebSocketState({
                connection: null,
                isConnected: false
            });
            
            if (!event.wasClean) {
                this.handleConnectionError(new Error('Connection closed unexpectedly'));
            }
        };

        // Connection error
        this.connection.onerror = (error) => {
            logger.error(`WebSocket error: ${error.message}`);
            this.handleConnectionError(error);
        };
    }

    handleMessage(data) {
        logger.info(`Received message: ${data.type}`);
        
        switch (data.type) {
            case 'auth_success':
                this.handleAuthSuccess(data);
                break;
                
            case 'auth_error':
                this.handleAuthError(data);
                break;
                
            case 'connection_ack':
                this.handleConnectionAck(data);
                break;
                
            case 'agent_response':
                this.handleAgentResponse(data);
                break;
                
            case 'error':
                this.handleError(data);
                break;
                
            case 'status':
                this.handleStatus(data);
                break;
                
            default:
                logger.warn(`Unknown message type: ${data.type}`);
        }
    }

    handleAuthSuccess(data) {
        logger.info('Authentication successful');
        if (data.user) {
            // Store user info in state
            stateManager.setUserState({
                id: data.user.user_id,
                name: data.user.user_name,
                email: data.user.user_email,
                isAuthenticated: true
            });
            logger.info(`Authenticated as: ${data.user.user_name}`);
        }
        this.reconnectAttempts = 0;
    }

    handleAuthError(data) {
        logger.error(`Authentication failed: ${data.message}`);
        // Set reconnect attempts to max to prevent infinite reconnect attempts
        this.reconnectAttempts = this.maxReconnectAttempts;
        // Clear stored tokens and redirect to login
        handleAuthFailure();
    }

    handleConnectionAck(data) {
        if (data.clientId) {
            stateManager.setWebSocketState({ clientId: data.clientId });
            logger.info(`Client ID assigned: ${data.clientId}`);
        }
    }

    handleConnectionError(error) {
        logger.error(`WebSocket connection error: ${error.message}`);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.init();
            }, this.reconnectDelay);
        } else {
            logger.error('Max reconnection attempts reached');
            this.updateUI('Connection failed. Please refresh the page.');
        }
    }

    handleAgentResponse(data) {
        try {
            // Extract response data
            //const response = data.response || data;
            const response = data.response || [];
            const companion = data.companion || 'assistant';
            const audioData = data.audio;

            //logger.info(`Handling received response: ${JSON.stringify(data)}`);
            
            logger.info(`Processing response from ${companion}`);
            
            // Add to response queue (audio will be processed in processNextResponse)
            stateManager.addToResponseQueue({
                companion,
                response,
                audio: audioData
            });
            
            // Update agent status
            stateManager.setAgentsState({
                status: {
                    ...stateManager.agents.status,
                    [companion]: 'active'
                }
            });
            
            // Trigger response processing
            if (!stateManager.agents.isProcessingResponse) {
                this.processNextResponse();
            }
            
        } catch (error) {
            logger.error(`Error processing agent response: ${error.message}`);
        }
    }

    handleError(data) {
        logger.error(`Server error: ${data.message || 'Unknown error'}`);
        
        // Update UI with error
        const statusDiv = document.querySelector(CONFIG.UI.statusDiv);
        if (statusDiv) {
            statusDiv.textContent = `Error: ${data.message || 'Unknown error'}`;
        }
    }

    handleStatus(data) {
        logger.info(`Status update: ${data.status}`);
        
        // Update UI with status
        const statusDiv = document.querySelector(CONFIG.UI.statusDiv);
        if (statusDiv) {
            statusDiv.textContent = data.status;
        }
    }

    processNextResponse() {
        if (!stateManager.hasResponses() || stateManager.agents.isProcessingResponse) {
            return;
        }

        stateManager.setAgentsState({ isProcessingResponse: true });
        
        const response = stateManager.getNextResponse();
        const { companion, messages, audio } = response;
        
        logger.info(`Processing response from ${companion}`);
        
        // Update UI
        const statusDiv = document.querySelector(CONFIG.UI.statusDiv);
        if (statusDiv) {
            statusDiv.textContent = `${companion} is speaking...`;
        }
        
        // Update speaker state
        stateManager.setCurrentSpeaker(companion);
        stateManager.setRecognitionState({ isSpeaking: true });
        
        // Stop recognition while AI is speaking
        if (stateManager.isRecognitionRunning()) {
            try {
                stateManager.recognition.instance.stop();
            } catch (error) {
                logger.error(`Error stopping recognition: ${error.message}`);
            }
        }
        
        // Process audio if available
        if (audio) {
            logger.info(`Processing audio for ${companion}`);
            audioManager.processBase64Audio(audio);
        } else {
            logger.info(`No audio for ${companion}, restarting recognition`);
            // If no audio, restart recognition immediately
            setTimeout(() => {
                this.restartRecognitionAfterResponse();
            }, 100);
        }
        
        // Mark as processed (audio will handle the flow)
        if (!audio) {
            stateManager.setAgentsState({ isProcessingResponse: false });
        }
    }

    restartRecognitionAfterResponse() {
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
                logger.info('Restarted recognition after response');
            } catch (error) {
                logger.error(`Failed to restart recognition: ${error.message}`);
            }
        }
        
        // Mark as processed
        stateManager.setAgentsState({ isProcessingResponse: false });
    }

    sendMessage(message) {
        // This function is used to send messages to the backendserver
        // It is called when the user speaks or uses the text input to send a message to the ai companion.

        //TODO: Add a front-end check to see if the user is authenticated.
        //TODO: Include the bearer token in the request header.

        if (!stateManager.isWebSocketConnected()) {
            logger.error('WebSocket not connected, cannot send message');
            return false;
        }

        const accessToken = getAccessToken();

        try {
            const authenticatedMessage = {
                ...message,
                access_token: accessToken,
                clientId: stateManager.websocket.clientId,
                timestamp: new Date().toISOString()
            };
            
            this.connection.send(JSON.stringify(authenticatedMessage));
            logger.info(`Sent message: ${message.type}`);
            logger.info(`Sent message: ${JSON.stringify(authenticatedMessage)}`);
            return true;
        } catch (error) {
            logger.error(`Error sending message: ${error.message}`);
            return false;
        }
    }

    // Helper method to make authenticated HTTP requests
    async makeAuthenticatedRequest(url, options = {}) {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('No access token available');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        const response = await fetch(url, defaultOptions);
        
        if (response.status === 401) {
            // Token expired, redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('session_token');
            window.location.href = '/static/login.html';
            throw new Error('Authentication required');
        }

        return response;
    }

    updateUI(message) {
        const statusDiv = document.querySelector(CONFIG.UI.statusDiv);
        if (statusDiv) {
            statusDiv.textContent = message;
        }
    }

    generateClientId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    disconnect() {
        if (this.connection) {
            // Send logout notification to server
            try {
                this.sendMessage({
                    type: 'disconnect'
                });
            } catch (error) {
                logger.error('Failed to send logout notification:', error);
            }
        
        // Close the connection
            this.connection.close(1000, 'Client disconnecting');
            this.connection = null;
        }
        
        stateManager.setWebSocketState({
            connection: null,
            isConnected: false
        });
        
        logger.info('WebSocket disconnected');
    }

    // Public methods for external use
    sendUserMessage(content) {
        return this.sendMessage({
            type: 'user_message',
            content: content
        });
    }

    // Event listeners for state changes
    setupStateListeners() {
        // Listen for messages to send
        stateManager.on('sendMessage', (message) => {
            this.sendMessage(message);
        });
        
        // Listen for response processing
        stateManager.on('processNextResponse', () => {
            this.processNextResponse();
        });
    }
}

// Create singleton instance
export const webSocketManager = new WebSocketManager();

export default webSocketManager; 