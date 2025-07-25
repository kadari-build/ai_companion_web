/**
 * Login Page JavaScript
 * Handles authentication, registration, and form management
 */

const API_BASE = 'http://localhost:7777';

// Form management
function toggleForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (formType === 'register') {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    } else {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
    }
    
    // Clear error messages
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
    document.getElementById('registerSuccess').textContent = '';
}

// Authentication functions
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store tokens
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('session_token', data.session_token);
            
            // Store user name (extract from email for now)
            const userName = email.split('@')[0];
            localStorage.setItem('user_name', userName);
            
            // Redirect to main app
            window.location.href = 'home.html';
        } else {
            throw new Error(data.detail || 'Login failed');
        }
    } catch (error) {
        throw error;
    }
}

async function register(name, email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
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
        loginBtn.textContent = 'Logging in...';
        errorDiv.textContent = '';
        
        try {
            await login(email, password);
        } catch (error) {
            errorDiv.textContent = error.message;
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
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
        registerBtn.textContent = 'Registering...';
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
            registerBtn.textContent = 'Register';
        }
    });
}

// Check authentication status
function checkAuthStatus() {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
        // Redirect to main app if already logged in
        window.location.href = 'home.html';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupLoginForm();
    setupRegisterForm();
});

// Make functions globally available for onclick handlers
window.toggleForm = toggleForm;