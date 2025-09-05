/**
 * User Settings Overlay Module
 * Handles user-specific settings and preferences
 */

import { CONFIG } from '../config/settings.js';
import { logger } from '../utils/logger.js';
import { stateManager } from '../utils/stateManager.js';

export class UserSettingsOverlay {
    constructor() {
        this.speechRecognition = null;
        this.isOpen = false;
        this.overlay = null;
        this.voiceCommands = {
            'user settings': () => this.open(),
            'close user settings': () => this.close(),
            'user menu': () => this.open(),
            'close user menu': () => this.close(),
            'user profile': () => this.showUserProfile()
        };
    }

    init(speechRecognition) {
        try {
            this.speechRecognition = speechRecognition;
            this.createOverlay();
            this.setupEventListeners();
            // Voice commands are now handled by SettingsManager
            logger.info('User settings overlay initialized');
            return true;
        } catch (error) {
            logger.error(`Failed to initialize user settings overlay: ${error.message}`);
            return false;
        }
    }

    createOverlay() {
        // Create the overlay container
        this.overlay = document.createElement('div');
        this.overlay.className = 'settings-overlay user-settings-overlay';
        this.overlay.innerHTML = `
            <div class="settings-backdrop"></div>
            <div class="settings-panel">
                <div class="settings-header">
                    <h2>👤 User Settings</h2>
                    <button class="close-settings" id="closeUserSettingsBtn" title="Close User Settings">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div class="settings-content">
                <div class="settings-section">
                        <h3>👤 Account Information</h3>
                        <div class="profile-info">
                            <div class="profile-item">
                                <label>Account Type:</label>
                                <span id="profile-type">${stateManager.user.type || 'Standard'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h3>👤 User Profile</h3>
                        <div class="profile-info">
                            <div class="profile-item">
                                <label>Name:</label>
                                <span id="profile-name">${stateManager.user.name || 'Not set'}</span>
                            </div>
                            <div class="profile-item">
                                <label>Email:</label>
                                <span id="profile-email">${stateManager.user.email || 'Not set'}</span>
                            </div>
                            <div class="profile-item">
                                <label>Account Type:</label>
                                <span id="profile-type">${stateManager.user.type || 'Standard'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>🎙️ Voice Commands</h3>
                        <div class="voice-commands-help">
                            <p>Available voice commands for user settings:</p>
                            <ul>
                                <li>"User settings" or "User menu"</li>
                                <li>"Close user settings" or "Close user menu"</li>
                                <li>"User profile"</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="settings-footer">
                    <button class="save-settings" id="saveUserSettingsBtn">Save User Settings</button>
                    <button class="reset-settings" id="resetUserSettingsBtn">Reset to Default</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
    }

    setupEventListeners() {
        // Close on backdrop click
        const backdrop = this.overlay.querySelector('.settings-backdrop');
        backdrop.addEventListener('click', () => this.close());

        // Close on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Setup button event listeners
        this.setupButtonListeners();

        // Setup settings controls
        this.setupSettingsControls();
    }

    setupButtonListeners() {
        // Close button
        const closeBtn = this.overlay.querySelector('#closeUserSettingsBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Save and reset buttons
        const saveBtn = this.overlay.querySelector('#saveUserSettingsBtn');
        const resetBtn = this.overlay.querySelector('#resetUserSettingsBtn');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }
    }

    setupSettingsControls() {
        // Volume control
        const volumeSlider = this.overlay.querySelector('#audio-volume');
        const volumeDisplay = this.overlay.querySelector('#volume-display');
        if (volumeSlider && volumeDisplay) {
            volumeSlider.addEventListener('input', (e) => {
                volumeDisplay.textContent = `${e.target.value}%`;
            });
        }

        // Speed control
        const speedSlider = this.overlay.querySelector('#audio-speed');
        const speedDisplay = this.overlay.querySelector('#speed-display');
        if (speedSlider && speedDisplay) {
            speedSlider.addEventListener('input', (e) => {
                speedDisplay.textContent = `${e.target.value}x`;
            });
        }

        // Load saved settings
        this.loadSettings();
    }

    setupVoiceCommands() {
        // Add voice command listener to speech recognition
        if (this.speechRecognition) {
            this.speechRecognition.addVoiceCommandHandler((command) => {
                return this.handleVoiceCommand(command);
            });
        }
    }

    handleVoiceCommand(command) {
        const lowerCommand = command.toLowerCase();
        for (const [trigger, handler] of Object.entries(this.voiceCommands)) {
            if (lowerCommand.includes(trigger)) {
                handler();
                return true;
            }
        }
        return false;
    }

    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        
        // Update profile info
        this.updateProfileInfo();
        
        logger.info('User settings overlay opened');
    }

    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.overlay.classList.remove('open');
        document.body.style.overflow = '';
        
        logger.info('User settings overlay closed');
    }

    updateProfileInfo() {
        const nameElement = this.overlay.querySelector('#profile-name');
        const emailElement = this.overlay.querySelector('#profile-email');
        const typeElement = this.overlay.querySelector('#profile-type');
        
        if (nameElement) {
            nameElement.textContent = stateManager.user.name || 'Not set';
        }
        if (emailElement) {
            emailElement.textContent = stateManager.user.email || 'Not set';
        }
        if (typeElement) {
            typeElement.textContent = stateManager.user.type || 'Standard';
        }
    }

    showUserProfile() {
        this.open();
        // Scroll to user profile section
        const profileSection = this.overlay.querySelector('.settings-section:first-child');
        if (profileSection) {
            profileSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showAudioSettings() {
        this.open();
        // Scroll to audio settings section
        const audioSection = this.overlay.querySelector('.settings-section:nth-child(2)');
        if (audioSection) {
            audioSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showThemeSettings() {
        this.open();
        // Scroll to theme settings section
        const themeSection = this.overlay.querySelector('.settings-section:nth-child(3)');
        if (themeSection) {
            themeSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showAccessibilitySettings() {
        this.open();
        // Scroll to accessibility settings section
        const accessibilitySection = this.overlay.querySelector('.settings-section:nth-child(4)');
        if (accessibilitySection) {
            accessibilitySection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    setTheme(theme) {
        // Update theme buttons
        const themeButtons = this.overlay.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => btn.classList.remove('active'));
        
        const activeButton = this.overlay.querySelector(`[data-theme="${theme}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Apply theme
        if (window.toggleTheme) {
            window.toggleTheme(theme);
        }
    }

    saveSettings() {
        const settings = {
            audio: {
                volume: this.overlay.querySelector('#audio-volume').value,
                speed: this.overlay.querySelector('#audio-speed').value,
                echoCancellation: this.overlay.querySelector('#echo-cancellation').checked,
                noiseSuppression: this.overlay.querySelector('#noise-suppression').checked,
                autoPlayAudio: this.overlay.querySelector('#auto-play-audio').checked
            },
            theme: this.overlay.querySelector('.theme-btn.active')?.dataset.theme || 'light',
            accessibility: {
                reduceMotion: this.overlay.querySelector('#reduce-motion').checked,
                highContrast: this.overlay.querySelector('#high-contrast').checked,
                screenReaderSupport: this.overlay.querySelector('#screen-reader-support').checked,
                keyboardNavigation: this.overlay.querySelector('#keyboard-navigation').checked,
                voiceFeedback: this.overlay.querySelector('#voice-feedback').checked,
                fontSize: this.overlay.querySelector('#font-size').value
            }
        };

        // Save to localStorage
        localStorage.setItem('userSettings', JSON.stringify(settings));
        
        // Apply settings
        this.applySettings(settings);
        
        logger.info('User settings saved', settings);
        
        // Show success message
        this.showMessage('User settings saved successfully!', 'success');
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            this.applySettings(settings);
        }
    }

    applySettings(settings) {
        // Apply audio settings
        if (settings.audio) {
            const volumeSlider = this.overlay.querySelector('#audio-volume');
            const speedSlider = this.overlay.querySelector('#audio-speed');
            const echoCheckbox = this.overlay.querySelector('#echo-cancellation');
            const noiseCheckbox = this.overlay.querySelector('#noise-suppression');
            const autoPlayCheckbox = this.overlay.querySelector('#auto-play-audio');
            
            if (volumeSlider) {
                volumeSlider.value = settings.audio.volume;
                this.overlay.querySelector('#volume-display').textContent = `${settings.audio.volume}%`;
            }
            if (speedSlider) {
                speedSlider.value = settings.audio.speed;
                this.overlay.querySelector('#speed-display').textContent = `${settings.audio.speed}x`;
            }
            if (echoCheckbox) echoCheckbox.checked = settings.audio.echoCancellation;
            if (noiseCheckbox) noiseCheckbox.checked = settings.audio.noiseSuppression;
            if (autoPlayCheckbox) autoPlayCheckbox.checked = settings.audio.autoPlayAudio;
        }

        // Apply theme
        if (settings.theme) {
            this.setTheme(settings.theme);
        }

        // Apply accessibility settings
        if (settings.accessibility) {
            const reduceMotionCheckbox = this.overlay.querySelector('#reduce-motion');
            const highContrastCheckbox = this.overlay.querySelector('#high-contrast');
            const screenReaderCheckbox = this.overlay.querySelector('#screen-reader-support');
            const keyboardCheckbox = this.overlay.querySelector('#keyboard-navigation');
            const voiceFeedbackCheckbox = this.overlay.querySelector('#voice-feedback');
            const fontSizeSelect = this.overlay.querySelector('#font-size');
            
            if (reduceMotionCheckbox) reduceMotionCheckbox.checked = settings.accessibility.reduceMotion;
            if (highContrastCheckbox) highContrastCheckbox.checked = settings.accessibility.highContrast;
            if (screenReaderCheckbox) screenReaderCheckbox.checked = settings.accessibility.screenReaderSupport;
            if (keyboardCheckbox) keyboardCheckbox.checked = settings.accessibility.keyboardNavigation;
            if (voiceFeedbackCheckbox) voiceFeedbackCheckbox.checked = settings.accessibility.voiceFeedback;
            if (fontSizeSelect) fontSizeSelect.value = settings.accessibility.fontSize;
        }
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all user settings to default?')) {
            localStorage.removeItem('userSettings');
            this.loadSettings();
            this.showMessage('User settings reset to default!', 'info');
        }
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `settings-message ${type}`;
        messageDiv.textContent = message;
        
        this.overlay.querySelector('.settings-panel').appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    cleanup() {
        if (this.overlay) {
            this.overlay.remove();
        }
        this.isOpen = false;
    }
}

// Create singleton instance
export const userSettingsOverlay = new UserSettingsOverlay();

export default userSettingsOverlay;
