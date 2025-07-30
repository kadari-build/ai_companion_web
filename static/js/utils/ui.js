import { logger } from './logger.js';
import { webSocketManager } from '../modules/WebSocketManager.js';

// Current input mode
let currentInputMode = 'voice'; // 'voice' or 'text'

// Text input functions
export function showTextInput() {
    console.log('showTextInput called');
    const container = document.getElementById('textInputContainer');
    const textInput = document.getElementById('textInput');
    const audioErrorFallback = document.getElementById('audioErrorFallback');
    
    console.log('Elements found:', {
        container: !!container,
        textInput: !!textInput,
        audioErrorFallback: !!audioErrorFallback
    });
    
    if (container && textInput) {
        // Hide audio error fallback if it's showing
        if (audioErrorFallback) {
            audioErrorFallback.style.display = 'none';
        }
        
        console.log('Container before:', {
            display: container.style.display,
            visibility: container.style.visibility,
            opacity: container.style.opacity,
            zIndex: container.style.zIndex
        });
        
        // Force the container to be visible
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        container.style.zIndex = '10';
        
        // Ensure it's positioned correctly
        container.style.position = 'fixed';
        container.style.bottom = '100px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        
        console.log('Container after:', {
            display: container.style.display,
            visibility: container.style.visibility,
            opacity: container.style.opacity,
            zIndex: container.style.zIndex,
            position: container.style.position,
            bottom: container.style.bottom,
            left: container.style.left,
            transform: container.style.transform
        });
        
        textInput.focus();
        logger.info('Text input shown');
        console.log('Text input shown successfully');
    } else {
        logger.error('Text input elements not found');
        console.error('Text input elements not found');
    }
}

export function hideTextInput() {
    const container = document.getElementById('textInputContainer');
    const textInput = document.getElementById('textInput');
    
    if (container && textInput) {
        container.style.display = 'none';
        textInput.value = '';
        logger.info('Text input hidden');
    } else {
        logger.error('Text input elements not found');
    }
}

export function sendTextMessage() {
    const textInput = document.getElementById('textInput');
    
    if (textInput && textInput.value.trim()) {
        const message = textInput.value.trim();
        logger.info(`Sending text message: ${message}`);
        
        // Send message through WebSocket
        webSocketManager.sendUserMessage(message);
        
        // Clear input and hide container
        textInput.value = '';
        hideTextInput();
    } else {
        logger.warn('No text message to send');
    }
}

// Mode switching functions
export function switchToVoiceMode() {
    currentInputMode = 'voice';
    updateModeButtons();
    hideTextInput();
    
    // Update hint text
    const hintText = document.querySelector('.hint-text');
    if (hintText) {
        hintText.textContent = 'Speak to interact';
    }
    
    logger.info('Switched to voice mode');
}

export function switchToTextMode() {
    console.log('switchToTextMode called');
    currentInputMode = 'text';
    updateModeButtons();
    showTextInput();
    
    // Update hint text
    const hintText = document.querySelector('.hint-text');
    if (hintText) {
        hintText.textContent = 'Type to interact';
    }
    
    logger.info('Switched to text mode');
    console.log('Switched to text mode');
}

function updateModeButtons() {
    const voiceBtn = document.getElementById('voiceModeBtn');
    const textBtn = document.getElementById('textModeBtn');
    
    if (voiceBtn && textBtn) {
        if (currentInputMode === 'voice') {
            voiceBtn.classList.add('active');
            textBtn.classList.remove('active');
        } else {
            textBtn.classList.add('active');
            voiceBtn.classList.remove('active');
        }
    }
}

// Get current input mode
export function getCurrentInputMode() {
    return currentInputMode;
}

// Keyboard shortcuts
export function handleTextInputKeyboard(event) {
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        sendTextMessage();
    }
}

// Setup text input event listeners
export function setupTextInputListeners() {
    const textInput = document.getElementById('textInput');
    if (textInput) {
        textInput.addEventListener('keydown', handleTextInputKeyboard);
        logger.info('Text input keyboard listeners setup');
    }
    
    // Initialize mode buttons
    updateModeButtons();
} 

// Test function for debugging
export function testTextInput() {
    console.log('=== Testing Text Input ===');
    
    const container = document.getElementById('textInputContainer');
    const textInput = document.getElementById('textInput');
    
    console.log('Container element:', container);
    console.log('Text input element:', textInput);
    
    if (container) {
        console.log('Container styles:', {
            display: container.style.display,
            visibility: container.style.visibility,
            opacity: container.style.opacity,
            position: container.style.position,
            bottom: container.style.bottom,
            left: container.style.left,
            transform: container.style.transform,
            zIndex: container.style.zIndex
        });
        
        console.log('Container computed styles:', {
            display: window.getComputedStyle(container).display,
            visibility: window.getComputedStyle(container).visibility,
            opacity: window.getComputedStyle(container).opacity,
            position: window.getComputedStyle(container).position,
            bottom: window.getComputedStyle(container).bottom,
            left: window.getComputedStyle(container).left,
            transform: window.getComputedStyle(container).transform,
            zIndex: window.getComputedStyle(container).zIndex
        });
        
        // Force show the container
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        container.style.zIndex = '9999';
        container.style.position = 'fixed';
        container.style.bottom = '100px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.backgroundColor = 'red'; // Temporary for debugging
        
        console.log('Container forced to be visible');
    } else {
        console.error('Container not found!');
    }
}

// Make test function globally available
window.testTextInput = testTextInput; 