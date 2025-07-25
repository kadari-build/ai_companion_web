import { CONFIG } from '../config/settings.js';
import { logger } from '../utils/logger.js';

// Sign out function
export function signOut() {
    const sessionToken = localStorage.getItem('session_token');
    
    // Call logout endpoint
    fetch(`${CONFIG.SERVER_URL}/auth/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_token: sessionToken })
    }).catch(error => {
        logger.error('Logout request failed:', error);
    }).finally(() => {
        // Clear all stored data
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_name');
        
        // Redirect to login
        window.location.href = 'login.html';
    });
}

// Check authentication
export function isAuthenticated() {
    const sessionToken = localStorage.getItem('session_token');
    // optionally check expiry or decode JWT
    return sessionToken;
  }
  
  export function requireAuth(redirectTo = '/login.html') {
    if (!isAuthenticated()) {
      window.location.href = redirectTo;
    } else {
        // Display user name if available
        const userName = localStorage.getItem('user_name') || 'User';
        document.getElementById('userName').textContent = userName;
    }
  }

