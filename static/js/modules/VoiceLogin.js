/**
 * Voice Login Module
 * Handles conversational voice input for login and registration forms
 * 
 * NOTE: This module is currently DISABLED for security and functionality reasons.
 * All code is preserved for future use. To re-enable:
 * 1. Uncomment the voice-related code in login.js
 * 2. Remove the "display: none" style from voice-status-section in login.html
 * 3. Test thoroughly for security and functionality issues
 */

import { logger } from '../utils/logger.js';
import { CONFIG } from '../config/settings.js';

export class VoiceLoginManager {
    constructor() {
        this.recognition = null;
        this.isIntro = null;
        this.isInitialized = false;
        this.isListening = false;
        this.isVoiceEnabled = true; // Whether voice input is enabled
        this.isInSleepMode = false; // Whether listening for wake words
        this.conversationState = 'idle'; // idle, waiting_for_email, waiting_for_password, waiting_for_login, completed
        this.formContext = 'login'; // 'login' or 'register'
        this.userCredentials = {
            name: '',
            email: '',
            password: ''
        };
        this.synthesis = null;
        this.wakeWords = ['use voice', 'voice login', 'voice input'];
        this.sleepWords = ['manual login', 'manual input', 'stop voice'];
    }

    init() {
        try {
            // Initialize speech recognition
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                throw new Error('Speech Recognition API not available');
            }

            // Initialize speech synthesis
            this.synthesis = window.speechSynthesis;

            this.recognition = new SpeechRecognition();
            this.setupRecognitionSettings();
            this.setupEventHandlers();
            
            this.isInitialized = true;
            this.isIntro = true;
            logger.info('Voice login manager initialized successfully');
            
            // Start automatic listening in sleep mode
            this.startSleepMode();
            
            return true;
        } catch (error) {
            logger.error(`Failed to initialize voice login manager: ${error.message}`);
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
            logger.info('Voice recognition started');
            this.isListening = true;
            if (this.isIntro) {
                // Speak welcome message
                this.speak("Welcome! Voice input is available. Say 'use voice' to enable voice login, or click the toggle button.");
                this.isIntro = false;
            }
            this.updateUIState('listening');
        };

        // Result event
        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            logger.info(`Voice input received: "${transcript}"`);
            // Stop recognition while processing
            this.stopListening();
            
            if (this.isInSleepMode) {
                this.handleWakeWord(transcript);
            } else if (this.isVoiceEnabled) {
                this.processConversationalInput(transcript);
            }
        };

        // Error event
        this.recognition.onerror = (event) => {
            logger.error(`Voice recognition error: ${event.error}`);
            
            if (event.error === 'no-speech') {
                this.handleNoSpeech();
            } else if (event.error === 'not-allowed') {
                this.handleMicrophoneDenied();
            } else {
                this.handleGenericError(event.error);
            }
        };

        // End event
        this.recognition.onend = () => {
            logger.info('Voice recognition ended');
            this.isListening = false;
            
            // Auto-restart if we're in sleep mode or active conversation
            if (this.isInSleepMode || (this.isVoiceEnabled && this.conversationState !== 'idle' && this.conversationState !== 'completed')) {
                setTimeout(() => {
                    if (this.isInSleepMode) {
                        this.startSleepMode();
                    } else {
                        this.startListening();
                    }
                }, 1000);
            }
        };

        // Audio start event
        this.recognition.onaudiostart = () => {
            logger.debug('Audio capture started');
        };

        // Audio end event
        this.recognition.onaudioend = () => {
            logger.debug('Audio capture ended');
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

    // Set form context (login or register)
    setFormContext(context) {
        this.formContext = context;
        logger.info(`Form context set to: ${context}`);
        this.resetConversation();
    }

    // Start sleep mode - listening for wake words
    startSleepMode() {
        this.isInSleepMode = true;
        this.conversationState = 'idle';
        this.isListening = false;
        
        // Start listening for wake words
        setTimeout(() => {
            this.startListening();
        }, 3000); // Wait for speech to finish
    }

    // Handle wake word detection
    handleWakeWord(transcript) {
        // Check for wake words
        if (this.wakeWords.some(word => transcript.includes(word))) {
            this.enableVoiceInput();
            return;
        }
        
        // Check for sleep words
        if (this.sleepWords.some(word => transcript.includes(word))) {
            this.disableVoiceInput();
            return;
        }
        
        // If no wake/sleep word detected, continue listening in sleep mode
        setTimeout(() => {
            this.startListening();
        }, 1000);
    }

    // Enable voice input and start conversation
    enableVoiceInput() {
        this.isVoiceEnabled = true;
        this.isInSleepMode = false;
        this.speak("Voice input enabled. Starting voice " + this.formContext + "...");
        
        // Start the conversation flow
        setTimeout(() => {
            this.startConversationalFlow();
        }, 2000);
    }

    // Disable voice input and return to sleep mode
    disableVoiceInput() {
        this.isVoiceEnabled = false;
        this.isInSleepMode = true;
        this.conversationState = 'idle';
        this.speak("Voice input disabled. Returning to manual mode.");
        
        // Update UI to show manual mode
        this.updateUIState('manual');
        
        // Return to sleep mode
        setTimeout(() => {
            this.startSleepMode();
        }, 2000);
    }

    // Toggle voice input on/off
    toggleVoiceInput() {
        if (this.isVoiceEnabled) {
            this.disableVoiceInput();
        } else {
            this.enableVoiceInput();
        }
    }

    // Start the conversational flow based on form context
    startConversationalFlow() {
        if (this.formContext === 'register') {
            this.startRegistrationFlow();
        } else {
            this.startLoginFlow();
        }
    }

    // Start the registration flow
    startRegistrationFlow() {
        this.conversationState = 'waiting_for_name';
        this.userCredentials = { name: '', email: '', password: '' };
        
        // Clear any existing form values
        this.clearFormFields();
        
        // Start listening
        setTimeout(() => {
            this.startListening();
            // Speak the first prompt
            this.speak("To register, please tell me your full name");
        }, 2000);
    }

    // Start the login flow
    startLoginFlow() {
        this.conversationState = 'waiting_for_email';
        this.userCredentials = { email: '', password: '' };
        
        // Clear any existing form values
        this.clearFormFields();
        
        // Start listening
        setTimeout(() => {
            this.startListening();
            // Speak the first prompt
            this.speak("To login, please tell me your email address");
        }, 2000);
    }

    // Process conversational input based on current state
    processConversationalInput(transcript) {
        const cleanedTranscript = transcript.toLowerCase().trim();
        
        switch (this.conversationState) {
            case 'waiting_for_name':
                this.handleNameInput(cleanedTranscript);
                break;
            case 'waiting_for_email':
                this.handleEmailInput(cleanedTranscript);
                break;
            case 'waiting_for_password':
                this.handlePasswordInput(cleanedTranscript);
                break;
            case 'waiting_for_login':
                this.handleLoginCommand(cleanedTranscript);
                break;
            case 'waiting_for_register':
                this.handleRegisterCommand(cleanedTranscript);
                break;
            default:
                logger.warn(`Unexpected conversation state: ${this.conversationState}`);
        }
    }

    // Handle name input (for registration)
    handleNameInput(transcript) {
        const name = this.processNameTranscript(transcript);
        this.userCredentials.name = name;
        
        // Update the form field
        this.updateFormField('registerName', name);
        
        // Speak confirmation and next prompt
        this.speak("Name received. Now please tell me your email address");
        
        // Update conversation state
        this.conversationState = 'waiting_for_email';
        
        // Start listening again after a short delay
        setTimeout(() => {
            this.startListening();
        }, 1000);
    }

    // Handle email input
    handleEmailInput(transcript) {
        const email = this.processEmailTranscript(transcript);
        this.userCredentials.email = email;
        
        // Update the appropriate form field based on context
        if (this.formContext === 'register') {
            this.updateFormField('registerEmail', email);
        } else {
            this.updateFormField('loginEmail', email);
        }
        
        // Speak confirmation and next prompt
        this.speak("Email received. Now please tell me your password");
        
        // Update conversation state
        this.conversationState = 'waiting_for_password';
        
        // Start listening again after a short delay
        setTimeout(() => {
            this.startListening();
        }, 1000);
    }

    // Handle password input
    handlePasswordInput(transcript) {
        const password = this.processPasswordTranscript(transcript);
        this.userCredentials.password = password;
        
        // Update the appropriate form field based on context
        if (this.formContext === 'register') {
            this.updateFormField('registerPassword', password);
        } else {
            this.updateFormField('loginPassword', password);
        }
        
        // Speak final prompt based on context
        if (this.formContext === 'register') {
            this.speak("Password received. To create your account, say Register");
            this.conversationState = 'waiting_for_register';
        } else {
            this.speak("Password received. To login, say Login");
            this.conversationState = 'waiting_for_login';
        }
        
        // Start listening again after a short delay
        setTimeout(() => {
            this.startListening();
        }, 1000);
    }

    // Handle login command
    handleLoginCommand(transcript) {
        if (transcript.includes('login')) {
            this.speak("Processing your login request...");
            this.conversationState = 'completed';
            
            // Trigger the login form submission
            this.submitLoginForm();
        } else {
            // User didn't say login, remind them
            this.speak("I didn't catch that. To login, please say Login");
            setTimeout(() => {
                this.startListening();
            }, 1000);
        }
    }

    // Handle register command
    handleRegisterCommand(transcript) {
        if (transcript.includes('register')) {
            this.speak("Processing your registration request...");
            this.conversationState = 'completed';
            
            // Trigger the register form submission
            this.submitRegisterForm();
        } else {
            // User didn't say register, remind them
            this.speak("I didn't catch that. To create your account, please say Register");
            setTimeout(() => {
                this.startListening();
            }, 1000);
        }
    }

    // Submit the login form automatically
    submitLoginForm() {
        const loginForm = document.getElementById('loginFormElement');
        if (loginForm) {
            // Trigger form submission
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            loginForm.dispatchEvent(submitEvent);
        }
    }

    // Submit the register form automatically
    submitRegisterForm() {
        const registerForm = document.getElementById('registerFormElement');
        if (registerForm) {
            // Trigger form submission
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            registerForm.dispatchEvent(submitEvent);
        }
    }

    // Handle no speech detected
    handleNoSpeech() {
        if (this.isInSleepMode) {
            // In sleep mode, just restart listening
            setTimeout(() => {
                this.startListening();
            }, 1000);
        } else {
            this.speak("I didn't hear anything. Please try again.");
            setTimeout(() => {
                this.startListening();
            }, 2000);
        }
    }

    // Handle microphone access denied
    handleMicrophoneDenied() {
        this.speak("I need microphone access to help you login. Please allow microphone access and try again.");
        this.conversationState = 'idle';
        this.isInSleepMode = false;
    }

    // Handle generic errors
    handleGenericError(error) {
        if (this.isInSleepMode) {
            // In sleep mode, just restart listening
            setTimeout(() => {
                this.startListening();
            }, 1000);
        } else {
            this.speak(`I encountered an error: ${error}. Please try again.`);
            setTimeout(() => {
                this.startListening();
            }, 2000);
        }
    }

    // Start listening for voice input
    startListening() {
        if (!this.isInitialized || this.isListening) {
            return false;
        }

        try {
            this.recognition.start();
            return true;
        } catch (error) {
            logger.error(`Failed to start voice recognition: ${error.message}`);
            return false;
        }
    }

    // Stop listening
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    // Speak text using speech synthesis
    speak(text) {
        if (!this.synthesis) return;

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        this.synthesis.speak(utterance);
        
        logger.info(`Speaking: "${text}"`);
    }

    // Update form field value
    updateFormField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
            // Trigger input event to update any validation or UI state
            field.dispatchEvent(new Event('input', { bubbles: true }));
            logger.info(`Updated field ${fieldId} with value: ${value}`);
        }
    }

    // Clear form fields based on context
    clearFormFields() {
        if (this.formContext === 'register') {
            const nameField = document.getElementById('registerName');
            const emailField = document.getElementById('registerEmail');
            const passwordField = document.getElementById('registerPassword');
            
            if (nameField) nameField.value = '';
            if (emailField) emailField.value = '';
            if (passwordField) passwordField.value = '';
        } else {
            const emailField = document.getElementById('loginEmail');
            const passwordField = document.getElementById('loginPassword');
            
            if (emailField) emailField.value = '';
            if (passwordField) passwordField.value = '';
        }
    }

    // Process transcript for different field types
    processTranscriptForField(transcript, fieldType) {
        // Clean up common speech artifacts
        let cleaned = transcript
            .toLowerCase()
            .replace(/\b(um|uh|ah|er|like|you know)\b/g, '') // Remove filler words
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        switch (fieldType) {
            case 'email':
                return this.processEmailTranscript(cleaned);
            case 'password':
                return this.processPasswordTranscript(cleaned);
            case 'text':
                return this.processNameTranscript(cleaned);
            default:
                return cleaned;
        }
    }

    processEmailTranscript(transcript) {
        // Handle common email speech patterns
        let email = transcript
            .replace(/\bat\b/g, '@')
            .replace(/\bdot\b/g, '.')
            .replace(/\bunderscore\b/g, '_')
            .replace(/\bhyphen\b/g, '-')
            .replace(/\bminus\b/g, '-')
            .replace(/\bplus\b/g, '+')
            .replace(/\bperiod\b/g, '.')
            .replace(/\bcom\b/g, '.com')
            .replace(/\bnet\b/g, '.net')
            .replace(/\borg\b/g, '.org')
            .replace(/\bedu\b/g, '.edu');

        // Ensure it looks like an email
        if (!email.includes('@')) {
            email = email.replace(/\s+/, '@');
        }

        return email;
    }

    processPasswordTranscript(transcript) {
        // Handle common password speech patterns
        let password = transcript
            .replace(/\bzero\b/g, '0')
            .replace(/\bone\b/g, '1')
            .replace(/\btwo\b/g, '2')
            .replace(/\bthree\b/g, '3')
            .replace(/\bfour\b/g, '4')
            .replace(/\bfive\b/g, '5')
            .replace(/\bsix\b/g, '6')
            .replace(/\bseven\b/g, '7')
            .replace(/\beight\b/g, '8')
            .replace(/\bnine\b/g, '9')
            .replace(/\bexclamation\b/g, '!')
            .replace(/\bhash\b/g, '#')
            .replace(/\bdollar\b/g, '$')
            .replace(/\bpercent\b/g, '%')
            .replace(/\bampersand\b/g, '&')
            .replace(/\bstar\b/g, '*')
            .replace(/\bplus\b/g, '+')
            .replace(/\bminus\b/g, '-')
            .replace(/\bequals\b/g, '=');

        return password;
    }

    processNameTranscript(transcript) {
        // Handle common name speech patterns
        let name = transcript
            .replace(/\bmy name is\b/g, '')
            .replace(/\bi am\b/g, '')
            .replace(/\bcall me\b/g, '')
            .replace(/\bthis is\b/g, '')
            .trim();

        // Capitalize first letter of each word
        name = name.replace(/\b\w/g, l => l.toUpperCase());
        
        return name;
    }

    // Update UI state for visual feedback
    updateUIState(state, message = '') {
        // Update the main voice status indicator
        const mainStatus = document.getElementById('mainVoiceStatus');
        if (mainStatus) {
            mainStatus.className = `voice-status ${state}`;
            if (state === 'listening') {
                mainStatus.textContent = 'Listening... Speak now';
            } else if (state === 'error') {
                mainStatus.textContent = message;
            } else if (state === 'success') {
                mainStatus.textContent = 'Voice input received!';
            } else if (state === 'manual') {
                mainStatus.textContent = 'Manual mode - say "use voice" to enable';
            } else if (state === 'sleep') {
                mainStatus.textContent = 'Listening for wake words...';
            }
        }

        // Update conversation progress indicator
        this.updateConversationProgress();
    }

    // Update conversation progress indicator
    updateConversationProgress() {
        const progressIndicator = document.getElementById('conversationProgress');
        if (!progressIndicator) return;

        let progressText = '';
        let progressClass = '';

        if (this.isInSleepMode) {
            progressText = 'Listening for wake words... Say "use voice" to enable voice ' + this.formContext;
            progressClass = 'sleep';
        } else if (this.formContext === 'register') {
            if (this.conversationState === 'waiting_for_name') {
                progressText = 'Step 1 of 4: Please provide your full name';
                progressClass = 'step-1';
            } else if (this.conversationState === 'waiting_for_email') {
                progressText = 'Step 2 of 4: Please provide your email address';
                progressClass = 'step-2';
            } else if (this.conversationState === 'waiting_for_password') {
                progressText = 'Step 3 of 4: Please provide your password';
                progressClass = 'step-3';
            } else if (this.conversationState === 'waiting_for_register') {
                progressText = 'Step 4 of 4: Say "Register" to create account';
                progressClass = 'step-3';
            } else if (this.conversationState === 'completed') {
                progressText = 'Registration request submitted!';
                progressClass = 'completed';
            }
        } else {
            if (this.conversationState === 'waiting_for_email') {
                progressText = 'Step 1 of 3: Please provide your email address';
                progressClass = 'step-1';
            } else if (this.conversationState === 'waiting_for_password') {
                progressText = 'Step 2 of 3: Please provide your password';
                progressClass = 'step-2';
            } else if (this.conversationState === 'waiting_for_login') {
                progressText = 'Step 3 of 3: Say "Login" to complete';
                progressClass = 'step-3';
            } else if (this.conversationState === 'completed') {
                progressText = 'Login request submitted!';
                progressClass = 'completed';
            }
        }

        if (!this.isVoiceEnabled) {
            progressText = 'Voice input disabled - use manual form or say "use voice"';
            progressClass = 'manual';
        } else if (this.conversationState === 'idle' && !this.isInSleepMode) {
            progressText = 'Ready for voice ' + this.formContext;
            progressClass = 'ready';
        }

        progressIndicator.className = `conversation-progress ${progressClass}`;
        progressIndicator.textContent = progressText;
    }

    // Reset conversation state
    resetConversation() {
        this.conversationState = 'idle';
        this.userCredentials = { name: '', email: '', password: '' };
        this.updateConversationProgress();
        this.updateUIState('idle');
    }

    // Public method to check if voice recognition is available
    isAvailable() {
        return this.isInitialized && this.recognition !== null;
    }

    // Get current conversation state
    getConversationState() {
        return this.conversationState;
    }

    // Get collected credentials
    getCredentials() {
        return { ...this.userCredentials };
    }

    // Check if voice input is enabled
    isVoiceInputEnabled() {
        return this.isVoiceEnabled;
    }

    // Check if in sleep mode
    isInSleepModeState() {
        return this.isInSleepMode;
    }

    // Cleanup method
    destroy() {
        if (this.recognition) {
            this.stopListening();
            this.recognition = null;
        }
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        this.isInitialized = false;
        this.conversationState = 'idle';
        this.isListening = false;
        this.isVoiceEnabled = false;
        this.isInSleepMode = false;
        this.userCredentials = { name: '', email: '', password: '' };
    }
}
