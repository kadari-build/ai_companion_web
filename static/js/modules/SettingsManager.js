/**
 * Settings Manager Module
 * Central coordinator for all settings overlays and voice commands
 */

import { logger } from '../utils/logger.js';
import { SettingsOverlay } from './SettingsOverlay.js';
import { AgentSettingsOverlay } from './AgentSettingsOverlay.js';
import { UserSettingsOverlay } from './UserSettingsOverlay.js';
import { signOut } from '../utils/auth.js';

export class SettingsManager {
    constructor(speechRecognition) {
        this.speechRecognition = speechRecognition;
        this.currentOverlay = null;
        this.overlays = {
            general: null,
            agent: null,
            user: null
        };
        this.isInitialized = false;
    }

    init(speechRecognition) {
        try {
            this.speechRecognition = speechRecognition;
            
            // Create overlay instances
            this.overlays.general = new SettingsOverlay();
            this.overlays.agent = new AgentSettingsOverlay();
            this.overlays.user = new UserSettingsOverlay();

            // Initialize all overlays
            if (!this.overlays.general.init(speechRecognition)) {
                throw new Error('Failed to initialize general settings overlay');
            }
            if (!this.overlays.agent.init(speechRecognition)) {
                throw new Error('Failed to initialize agent settings overlay');
            }
            if (!this.overlays.user.init(speechRecognition)) {
                throw new Error('Failed to initialize user settings overlay');
            }

            // Register single voice command handler
            this.speechRecognition.addVoiceCommandHandler((command) => {
                return this.handleVoiceCommand(command);
            });

            this.isInitialized = true;
            logger.info('Settings manager initialized successfully');
            return true;
        } catch (error) {
            logger.error(`Failed to initialize settings manager: ${error.message}`);
            return false;
        }
    }

    handleVoiceCommand(command) {
        const lowerCommand = command.toLowerCase();
        
        
        // Handle open commands
        if (lowerCommand.includes('agent settings') || lowerCommand.includes('agent menu')) {
            this.openOverlay('agent');
            const audio = new Audio('/static/media/agent_settings.mp3');
            audio.play();
            return true;
        }
        
        if (lowerCommand.includes('user settings') || lowerCommand.includes('user menu')) {
            this.openOverlay('user');
            const audio = new Audio('/static/media/user_settings.mp3');
            audio.play();
            return true;
        }
        
        if (lowerCommand.includes('settings') || lowerCommand.includes('menu')) {
            this.openOverlay('general');
            const audio = new Audio('/static/media/general_settings.mp3');
            audio.play();
            return true;
        }
        
        // Handle close commands
        if (lowerCommand.includes('close')) {
            if (this.currentOverlay) {
                this.currentOverlay.close();
                this.currentOverlay = null;
                logger.info('Settings overlay closed via voice command');
                return true;
            }
        }

        // Handle specific section commands
        if (lowerCommand.includes('user profile')) {
            this.openOverlay('user');
            // Scroll to profile section
            setTimeout(() => {
                this.overlays.user.showUserProfile();
            }, 100);
            return true;
        }

        if (lowerCommand.includes('audio settings')) {
            this.openOverlay('general');
            // Scroll to audio section
            setTimeout(() => {
                this.overlays.user.showAudioSettings();
            }, 100);
            return true;
        }

        //Handle Logout
        if (lowerCommand.includes('logout') || lowerCommand.includes('sign out') || lowerCommand.includes('log out')) {
            signOut();
            return true;
        }

        
        return false;
    }

    openOverlay(type) {
        try {
            // Close current overlay if open
            if (this.currentOverlay) {
                this.currentOverlay.close();
            }
            
            // Open new overlay
            this.currentOverlay = this.overlays[type];
            if (this.currentOverlay) {
                this.currentOverlay.open();
                logger.info(`${type} settings overlay opened`);
            } else {
                logger.error(`Overlay type '${type}' not found`);
            }
        } catch (error) {
            logger.error(`Failed to open ${type} overlay: ${error.message}`);
        }
    }

    closeCurrentOverlay() {
        if (this.currentOverlay) {
            this.currentOverlay.close();
            this.currentOverlay = null;
            logger.info('Current settings overlay closed');
        }
    }

    // Public API methods for button clicks
    openGeneralSettings() {
        this.openOverlay('general');
    }

    openAgentSettings() {
        this.openOverlay('agent');
    }

    openUserSettings() {
        this.openOverlay('user');
    }

    // Get current overlay type
    getCurrentOverlayType() {
        if (!this.currentOverlay) return null;
        
        for (const [type, overlay] of Object.entries(this.overlays)) {
            if (overlay === this.currentOverlay) {
                return type;
            }
        }
        return null;
    }

    // Check if any overlay is open
    isAnyOverlayOpen() {
        return this.currentOverlay !== null;
    }

    cleanup() {
        // Close current overlay
        if (this.currentOverlay) {
            this.currentOverlay.close();
            this.currentOverlay = null;
        }

        // Cleanup all overlays
        Object.values(this.overlays).forEach(overlay => {
            if (overlay && typeof overlay.cleanup === 'function') {
                overlay.cleanup();
            }
        });

        this.isInitialized = false;
        logger.info('Settings manager cleaned up');
    }
}

// Create singleton instance
export const settingsManager = new SettingsManager();

export default settingsManager;
