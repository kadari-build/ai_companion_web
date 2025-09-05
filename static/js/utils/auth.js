import { CONFIG } from '../config/settings.js';
import { logger } from '../utils/logger.js';
import { webSocketManager } from '../modules/WebSocketManager.js';

// Sign out function
export function signOut() {
    console.log('signOut function called');
    logger.info('Sign out function called');

    const audio = new Audio('/static/media/logout.mp3');
    audio.play();

    // Close all websocket connections
    webSocketManager.disconnect();
    
    const sessionToken = localStorage.getItem('session_token');
    console.log('Session token:', sessionToken ? 'Present' : 'Missing');
    
    // Call logout endpoint
    fetch(`${CONFIG.SERVER_URL}/auth/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_token: sessionToken })
    }).then(response => {
        console.log('Logout response:', response.status);
        logger.info(`Logout response: ${response.status}`);
    }).catch(error => {
        console.error('Logout request failed:', error);
        logger.error('Logout request failed:', error);
    }).finally(() => {
        console.log('Clearing localStorage and redirecting');
        // Clear all stored data
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_name');
        
        updateUI('Signing out...');

        console.log("About to redirect to: /static/login.html");

        setTimeout(() => {
            window.location.replace('/static/login.html');
        }, 2000); // 5 second delay
    });
}

// Check authentication
export function isAuthenticated() {
    const sessionToken = localStorage.getItem('session_token');
    const userName = localStorage.getItem('user_name');
    
    //logger.info(`Checking authentication - Session token: ${sessionToken ? 'Present' : 'Missing'}, User name: ${userName || 'Not set'}`);
    
    if (!sessionToken) {
        logger.error('No session token found');
        return false;
    }
    
    if (!userName) {
        logger.error('No user name found');
        return false;
    }
    
    logger.info('Authentication check passed');
    return true;
}
  
export function requireAuth(redirectTo = '/static/login.html') {
    console.log('requireAuth called');
    if (!isAuthenticated()) {
        console.log('Not authenticated, redirecting to:', redirectTo);
        window.location.href = redirectTo;
    } else {
        // Display user name if available
        const userName = localStorage.getItem('user_name') || 'User';
        console.log('Setting user name to:', userName);
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = userName;
            console.log('User name element updated successfully');
            logger.info('User name updated successfully');
        } else {
            console.error('User name element not found');
            logger.error('User name element not found');
        }
    }
}

export function getAccessToken() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        handleAuthFailure();
    }
    return accessToken;
}

// Check authentication status
export function checkAuthStatus() {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
        // Redirect to main app if already logged in
        window.location.href = '/static/home.html';
    }
}


export function handleAuthFailure() {
    logger.error('Authentication failed, signing out');
    signOut();
}

// Theme toggle function
export function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update theme icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        if (newTheme === 'dark') {
            themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />';
        } else {
            themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />';
        }
    }
    
    logger.info(`Theme toggled to ${newTheme}`);
}

// Initialize theme
export function initializeTheme() {
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update theme icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        if (savedTheme === 'dark') {
            themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />';
        } else {
            themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />';
        }
    }
    
    logger.info(`Theme initialized to ${savedTheme}`);
}

// Copy debug log function
export function copyDebugLog() {
    const debugContent = document.querySelector('.debug-content');
    if (debugContent) {
        const text = debugContent.textContent;
        navigator.clipboard.writeText(text).then(() => {
            logger.info('Debug log copied to clipboard');
        }).catch(err => {
            logger.error('Failed to copy debug log:', err);
        });
    }
}

export function updateUI(status) {
    const statusDiv = document.querySelector(CONFIG.UI.statusDiv);
    if (statusDiv) {
        statusDiv.textContent = status;
    }
}