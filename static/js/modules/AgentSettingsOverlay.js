/**
 * Agent Settings Overlay Module
 * Handles agent-specific settings and preferences
 */

import { CONFIG } from '../config/settings.js';
import { logger } from '../utils/logger.js';
import { stateManager } from '../utils/stateManager.js';

export class AgentSettingsOverlay {
    constructor() {
        this.speechRecognition = null;
        this.isOpen = false;
        this.overlay = null;
        this.voiceCommands = {
            'agent settings': () => this.open(),
            'close agent settings': () => this.close(),
            'agent menu': () => this.open(),
            'close agent menu': () => this.close()
        };
    }

    init(speechRecognition) {
        try {
            this.speechRecognition = speechRecognition;
            this.createOverlay();
            this.setupEventListeners();
            // Voice commands are now handled by SettingsManager
            logger.info('Agent settings overlay initialized');
            return true;
        } catch (error) {
            logger.error(`Failed to initialize agent settings overlay: ${error.message}`);
            return false;
        }
    }

    createOverlay() {
        // Create the overlay container
        this.overlay = document.createElement('div');
        this.overlay.className = 'settings-overlay agent-settings-overlay';
        this.overlay.innerHTML = `
            <div class="settings-backdrop"></div>
            <div class="settings-panel">
                <div class="settings-header">
                    <h2>🤖 Agent Settings</h2>
                    <button class="close-settings" id="closeAgentSettingsBtn" title="Close Agent Settings">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div class="settings-content">
                    <div class="settings-section">
                        <h3>🤖 Agent Personality</h3>
                        <div class="agent-settings">
                            <div class="setting-item">
                                <label for="agent-personality">Personality Type:</label>
                                <select id="agent-personality">
                                    <option value="friendly">😊 Friendly & Warm</option>
                                    <option value="professional">💼 Professional & Formal</option>
                                    <option value="casual">😎 Casual & Relaxed</option>
                                    <option value="creative">🎨 Creative & Imaginative</option>
                                    <option value="analytical">🔍 Analytical & Precise</option>
                                    <option value="humorous">😄 Humorous & Witty</option>
                                </select>
                            </div>
                            <div class="setting-item">
                                <label for="response-length">Response Length:</label>
                                <select id="response-length">
                                    <option value="short">📝 Short & Concise</option>
                                    <option value="medium">📄 Medium & Balanced</option>
                                    <option value="long">📚 Long & Detailed</option>
                                </select>
                            </div>
                            <div class="setting-item">
                                <label for="conversation-style">Conversation Style:</label>
                                <select id="conversation-style">
                                    <option value="conversational">💬 Conversational</option>
                                    <option value="instructional">📖 Instructional</option>
                                    <option value="collaborative">🤝 Collaborative</option>
                                    <option value="mentoring">🎓 Mentoring</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>🎯 Response Preferences</h3>
                        <div class="response-settings">
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="include-examples" checked>
                                    Include Examples
                                </label>
                            </div>
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="ask-clarifying-questions" checked>
                                    Ask Clarifying Questions
                                </label>
                            </div>
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="provide-alternatives" checked>
                                    Provide Alternatives
                                </label>
                            </div>
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="use-emojis" checked>
                                    Use Emojis
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>🎙️ Voice Commands</h3>
                        <div class="voice-commands-help">
                            <p>Available voice commands for agent settings:</p>
                            <ul>
                                <li>"Agent settings" or "Agent menu"</li>
                                <li>"Close agent settings" or "Close agent menu"</li>
                                <li>"Change personality"</li>
                                <li>"Response length"</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="settings-footer">
                    <button class="save-settings" id="saveAgentSettingsBtn">Save Agent Settings</button>
                    <button class="reset-settings" id="resetAgentSettingsBtn">Reset to Default</button>
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
        const closeBtn = this.overlay.querySelector('#closeAgentSettingsBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Save and reset buttons
        const saveBtn = this.overlay.querySelector('#saveAgentSettingsBtn');
        const resetBtn = this.overlay.querySelector('#resetAgentSettingsBtn');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }
    }

    setupSettingsControls() {
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
        
        logger.info('Agent settings overlay opened');
    }

    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.overlay.classList.remove('open');
        document.body.style.overflow = '';
        
        logger.info('Agent settings overlay closed');
    }

    showPersonalitySettings() {
        this.open();
        // Scroll to personality settings section
        const personalitySection = this.overlay.querySelector('.settings-section:first-child');
        if (personalitySection) {
            personalitySection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showResponseLengthSettings() {
        this.open();
        // Scroll to response preferences section
        const responseSection = this.overlay.querySelector('.settings-section:nth-child(2)');
        if (responseSection) {
            responseSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    saveSettings() {
        const settings = {
            agent: {
                personality: this.overlay.querySelector('#agent-personality').value,
                responseLength: this.overlay.querySelector('#response-length').value,
                conversationStyle: this.overlay.querySelector('#conversation-style').value,
                includeExamples: this.overlay.querySelector('#include-examples').checked,
                askClarifyingQuestions: this.overlay.querySelector('#ask-clarifying-questions').checked,
                provideAlternatives: this.overlay.querySelector('#provide-alternatives').checked,
                useEmojis: this.overlay.querySelector('#use-emojis').checked
            }
        };

        // Save to localStorage
        localStorage.setItem('agentSettings', JSON.stringify(settings));
        
        // Apply settings
        this.applySettings(settings);
        
        logger.info('Agent settings saved', settings);
        
        // Show success message
        this.showMessage('Agent settings saved successfully!', 'success');
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('agentSettings');
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
            const conversationStyleSelect = this.overlay.querySelector('#conversation-style');
            const includeExamplesCheckbox = this.overlay.querySelector('#include-examples');
            const askClarifyingQuestionsCheckbox = this.overlay.querySelector('#ask-clarifying-questions');
            const provideAlternativesCheckbox = this.overlay.querySelector('#provide-alternatives');
            const useEmojisCheckbox = this.overlay.querySelector('#use-emojis');
            
            if (personalitySelect) personalitySelect.value = settings.agent.personality;
            if (responseLengthSelect) responseLengthSelect.value = settings.agent.responseLength;
            if (conversationStyleSelect) conversationStyleSelect.value = settings.agent.conversationStyle;
            if (includeExamplesCheckbox) includeExamplesCheckbox.checked = settings.agent.includeExamples;
            if (askClarifyingQuestionsCheckbox) askClarifyingQuestionsCheckbox.checked = settings.agent.askClarifyingQuestions;
            if (provideAlternativesCheckbox) provideAlternativesCheckbox.checked = settings.agent.provideAlternatives;
            if (useEmojisCheckbox) useEmojisCheckbox.checked = settings.agent.useEmojis;
        }
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all agent settings to default?')) {
            localStorage.removeItem('agentSettings');
            this.loadSettings();
            this.showMessage('Agent settings reset to default!', 'info');
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
export const agentSettingsOverlay = new AgentSettingsOverlay();

export default agentSettingsOverlay;
