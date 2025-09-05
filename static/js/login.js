/**
 * Login Page JavaScript
 * Handles manual login and registration forms
 * Voice input functionality is disabled but code is preserved for future use
 */

import { CONFIG } from './config/settings.js';
import { logger } from './utils/logger.js';
import { checkAuthStatus } from './utils/auth.js';
import { VoiceLoginManager } from './modules/VoiceLogin.js';

// Initialize voice login manager (disabled for now)
const voiceLoginManager = new VoiceLoginManager();

// Form management
function toggleForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (formType === 'register') {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        // Update voice manager context for registration (disabled)
        // voiceLoginManager.setFormContext('register');
    } else {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
        // Update voice manager context for login (disabled)
        // voiceLoginManager.setFormContext('login');
    }
    
    // Clear error messages
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
    document.getElementById('registerSuccess').textContent = '';
    
    // Reset voice conversation when switching forms (disabled)
    // voiceLoginManager.resetConversation();
}

// Voice login setup (disabled for now)
function setupVoiceLogin() {
    // Voice input is currently disabled for security and functionality reasons
    // All voice-related code is preserved but not initialized
    logger.info('Voice login is disabled - using manual login only');
    
    // Uncomment the following lines to re-enable voice input in the future:
    /*
    if (!voiceLoginManager.init()) {
        logger.warn('Voice login not available, showing manual login only');
        disableVoiceInput();
        return;
    }

    // Setup voice toggle button
    setupVoiceToggle();
    
    // Set initial form context
    voiceLoginManager.setFormContext('login');
    
    logger.info('Voice login setup completed');
    */
}

// Setup voice toggle button (disabled for now)
function setupVoiceToggle() {
    // Voice toggle functionality is disabled
    // Code preserved for future use
    /*
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    if (!voiceToggleBtn) return;

    voiceToggleBtn.addEventListener('click', () => {
        voiceLoginManager.toggleVoiceInput();
        updateVoiceToggleButton();
    });

    // Initial button state
    updateVoiceToggleButton();
    */
}

// Update voice toggle button appearance (disabled for now)
function updateVoiceToggleButton() {
    // Voice toggle button updates are disabled
    // Code preserved for future use
    /*
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    if (!voiceToggleBtn) return;

    const toggleText = voiceToggleBtn.querySelector('.toggle-text');
    const isEnabled = voiceLoginManager.isVoiceInputEnabled();

    if (isEnabled) {
        voiceToggleBtn.classList.remove('voice-disabled');
        toggleText.textContent = 'Voice Input: ON';
        voiceToggleBtn.title = 'Click to disable voice input';
    } else {
        voiceToggleBtn.classList.add('voice-disabled');
        toggleText.textContent = 'Voice Input: OFF';
        voiceToggleBtn.title = 'Click to enable voice input';
    }
    */
}

// Disable voice input (fallback for unsupported browsers)
function disableVoiceInput() {
    // Voice input is disabled by default
    // Code preserved for future use
    /*
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    if (voiceToggleBtn) {
        voiceToggleBtn.classList.add('voice-disabled');
        voiceToggleBtn.disabled = true;
        voiceToggleBtn.querySelector('.toggle-text').textContent = 'Voice Input: Unavailable';
        voiceToggleBtn.title = 'Voice input not supported in this browser';
    }
    */
}

// Authentication functions
async function login(email, password) {
    try {
        logger.info('Login request received for email: ' + email);
        const response = await fetch(`${CONFIG.SERVER_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        logger.info('Login response ' + data);
        
        if (response.ok) {
            const audio = new Audio('/static/media/login.mp3');
            audio.play();
            // Store tokens
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('session_token', data.session_token);
            
            // Store user name (extract from email for now)
            const userName = email.split('@')[0];
            localStorage.setItem('user_name', userName);
            
            logger.info('Current URL: ' + window.location.href);
            // Redirect to main app
            setTimeout(() => {
                window.location.href = '/static/home.html';
            }, 3000);

            logger.info('New URL:' + window.location.href);
        } else {
            throw new Error(data.detail || 'Login failed');
        }
    } catch (error) {
        logger.error('Login error: ' + error);
        throw error;
    }
}

async function register(name, email, password) {
    try {
        const response = await fetch(`${CONFIG.SERVER_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return data;
        } else {
            throw new Error(data.detail || 'Registration failed');
        }
    } catch (error) {
        throw error;
    }
}

// Event handlers
function setupLoginForm() {
    document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const loginBtn = document.getElementById('loginBtn');
        const errorDiv = document.getElementById('loginError');
        
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        errorDiv.textContent = '';
        
        try {
            await login(email, password);
        } catch (error) {
            errorDiv.textContent = error.message;
        } finally {
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
        }
    });
}

function setupRegisterForm() {
    document.getElementById('registerFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const registerBtn = document.getElementById('registerBtn');
        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');
        
        registerBtn.disabled = true;
        registerBtn.classList.add('loading');
        errorDiv.textContent = '';
        successDiv.textContent = '';
        
        try {
            await register(name, email, password);
            successDiv.textContent = 'Registration successful! You can now login.';
            
            // Auto-switch to login form after successful registration
            setTimeout(() => {
                toggleForm('login');
                document.getElementById('loginEmail').value = email;
            }, 2000);
            
        } catch (error) {
            errorDiv.textContent = error.message;
        } finally {
            registerBtn.disabled = false;
            registerBtn.classList.remove('loading');
        }
    });
}

// Setup conversation state monitoring (disabled for now)
function setupConversationMonitoring() {
    // Voice conversation monitoring is disabled
    // Code preserved for future use
    /*
    // Monitor conversation state changes
    setInterval(() => {
        const state = voiceLoginManager.getConversationState();
        const isVoiceEnabled = voiceLoginManager.isVoiceInputEnabled();
        const isInSleepMode = voiceLoginManager.isInSleepModeState();
        
        // Update voice toggle button
        updateVoiceToggleButton();
        
        // Update conversation progress
        voiceLoginManager.updateConversationProgress();
        
        // Update voice status based on current state
        if (isInSleepMode) {
            voiceLoginManager.updateUIState('sleep');
        } else if (!isVoiceEnabled) {
            voiceLoginManager.updateUIState('manual');
        } else if (state === 'completed') {
            voiceLoginManager.updateUIState('success');
            // Reset after a delay
            setTimeout(() => {
                voiceLoginManager.resetConversation();
            }, 3000);
        }
        
    }, 500);
    */
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupLoginForm();
    setupRegisterForm();
    //setupVoiceLogin(); // Disabled but function call preserved
    //setupConversationMonitoring(); // Disabled but function call preserved
    
    // Voice input availability check is disabled
    // logger.info('Voice login is available and ready to use');
    logger.info('Manual login/registration is active - voice input is disabled');
});

// Make functions globally available for onclick handlers
window.toggleForm = toggleForm;