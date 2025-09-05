/**
 * Settings Overlay Module
 * Handles the settings menu overlay and user preferences
 */

import { CONFIG } from '../config/settings.js';
import { logger } from '../utils/logger.js';
import { stateManager } from '../utils/stateManager.js';

export class SettingsOverlay {
    constructor() {
        this.speechRecognition = null;
        this.isOpen = false;
        this.overlay = null;
        this.settingsButton = null;
        this.voiceCommands = {
            'open settings': () => this.open(),
            'close settings': () => this.close(),
            'settings menu': () => this.open(),
            'close menu': () => this.close(),
            'audio settings': () => this.showAudioSettings()
        };
    }

    init(speechRecognition) {
        try {
            this.speechRecognition = speechRecognition;
            this.createOverlay();
            this.setupEventListeners();
            // Voice commands are now handled by SettingsManager
            logger.info('Settings overlay initialized');
            return true;
        } catch (error) {
            logger.error(`Failed to initialize settings overlay: ${error.message}`);
            return false;
        }
    }

    createOverlay() {
        // Create the overlay container
        this.overlay = document.createElement('div');
        this.overlay.className = 'settings-overlay';
        this.overlay.innerHTML = `
            <div class="settings-backdrop"></div>
            <div class="settings-panel">
                <div class="settings-header">
                    <h2>Settings</h2>
                    <button class="close-settings" id="closeSettingsBtn" title="Close Settings">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div class="settings-content">
                    
                    <div class="settings-section">
                        <h3>Audio Settings</h3>
                        <div class="audio-settings">
                            <div class="setting-item">
                                <label for="audio-volume">Volume:</label>
                                <input type="range" id="audio-volume" min="0" max="100" value="80">
                                <span id="volume-display">80%</span>
                            </div>
                            <div class="setting-item">
                                <label for="audio-speed">Speech Speed:</label>
                                <input type="range" id="audio-speed" min="0.5" max="2" step="0.1" value="1">
                                <span id="speed-display">1x</span>
                            </div>
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="echo-cancellation" checked>
                                    Echo Cancellation
                                </label>
                            </div>
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="noise-suppression" checked>
                                    Noise Suppression
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>♿ Accessibility</h3>
                        <div class="accessibility-settings">
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="screen-reader-support" checked>
                                    Screen Reader Support
                                </label>
                            </div>
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="keyboard-navigation" checked>
                                    Keyboard Navigation
                                </label>
                            </div>
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="voice-feedback" checked>
                                    Voice Feedback
                                </label>
                            </div>
                            <div class="setting-item">
                                <label for="font-size">Font Size:</label>
                                <select id="font-size">
                                    <option value="small">Small</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="large">Large</option>
                                    <option value="extra-large">Extra Large</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>Voice Commands</h3>
                        <div class="voice-commands-help">
                            <p>Available voice commands:</p>
                            <ul>
                                <li>"Open settings" or "Settings menu"</li>
                                <li>"Close settings" or "Close menu"</li>
                                <li>"Agent settings"</li>
                                <li>"User profile"</li>
                                <li>"Audio settings"</li>
                                <li>"Theme settings"</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="settings-footer">
                    <button class="save-settings" id="saveSettingsBtn">Save Settings</button>
                    <button class="reset-settings" id="resetSettingsBtn">Reset to Default</button>
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
        const closeBtn = this.overlay.querySelector('#closeSettingsBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Theme buttons
        const themeLightBtn = this.overlay.querySelector('#themeLightBtn');
        const themeDarkBtn = this.overlay.querySelector('#themeDarkBtn');
        const themeAutoBtn = this.overlay.querySelector('#themeAutoBtn');

        if (themeLightBtn) {
            themeLightBtn.addEventListener('click', () => this.setTheme('light'));
        }
        if (themeDarkBtn) {
            themeDarkBtn.addEventListener('click', () => this.setTheme('dark'));
        }
        if (themeAutoBtn) {
            themeAutoBtn.addEventListener('click', () => this.setTheme('auto'));
        }

        // Save and reset buttons
        const saveBtn = this.overlay.querySelector('#saveSettingsBtn');
        const resetBtn = this.overlay.querySelector('#resetSettingsBtn');

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
        volumeSlider.addEventListener('input', (e) => {
            volumeDisplay.textContent = `${e.target.value}%`;
        });

        // Speed control
        const speedSlider = this.overlay.querySelector('#audio-speed');
        const speedDisplay = this.overlay.querySelector('#speed-display');
        speedSlider.addEventListener('input', (e) => {
            speedDisplay.textContent = `${e.target.value}x`;
        });

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
        
        logger.info('Settings overlay opened');
    }

    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.overlay.classList.remove('open');
        document.body.style.overflow = '';
        
        logger.info('Settings overlay closed');
    }

    updateProfileInfo() {
        const nameElement = this.overlay.querySelector('#profile-name');
        const emailElement = this.overlay.querySelector('#profile-email');
        
        if (nameElement) {
            nameElement.textContent = stateManager.user.name || 'Not set';
        }
        if (emailElement) {
            emailElement.textContent = stateManager.user.email || 'Not set';
        }
    }

    saveSettings() {
        const settings = {
            agent: {
                personality: this.overlay.querySelector('#agent-personality').value,
                responseLength: this.overlay.querySelector('#response-length').value
            },
            audio: {
                volume: this.overlay.querySelector('#audio-volume').value,
                speed: this.overlay.querySelector('#audio-speed').value,
                echoCancellation: this.overlay.querySelector('#echo-cancellation').checked,
                noiseSuppression: this.overlay.querySelector('#noise-suppression').checked
            },
            theme: this.overlay.querySelector('.theme-btn.active')?.dataset.theme || 'light'
        };

        // Save to localStorage
        localStorage.setItem('appSettings', JSON.stringify(settings));
        
        // Apply settings
        this.applySettings(settings);
        
        logger.info('Settings saved', settings);
        
        // Show success message
        this.showMessage('Settings saved successfully!', 'success');
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            this.applySettings(settings);
        }
    }

    applySettings(settings) {
        // Apply agent settings
        if (settings.agent) {
            const personalitySelect = this.overlay.querySelector('#agent-personality');
            const responseLengthSelect = this.overlay.querySelector('#response-length');
            
            if (personalitySelect) personalitySelect.value = settings.agent.personality;
            if (responseLengthSelect) responseLengthSelect.value = settings.agent.responseLength;
        }

        // Apply audio settings
        if (settings.audio) {
            const volumeSlider = this.overlay.querySelector('#audio-volume');
            const speedSlider = this.overlay.querySelector('#audio-speed');
            const echoCheckbox = this.overlay.querySelector('#echo-cancellation');
            const noiseCheckbox = this.overlay.querySelector('#noise-suppression');
            
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
        }

        // Apply theme
        if (settings.theme) {
            this.setTheme(settings.theme);
        }
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            localStorage.removeItem('appSettings');
            this.loadSettings();
            this.showMessage('Settings reset to default!', 'info');
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
export const settingsOverlay = new SettingsOverlay();

export default settingsOverlay;
