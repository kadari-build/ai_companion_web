/**
 * Main Entry Point
 * Provides backward compatibility and global functions
 */

import { app } from './app.js';
import { logger } from './utils/logger.js';

// Global functions for backward compatibility
window.initVoiceChat = async () => {
    try {
        if (!app.isInitialized) {
            await app.init();
        }
        logger.info('Voice chat initialized via global function');
    } catch (error) {
        logger.error(`Failed to initialize voice chat: ${error.message}`);
    }
};

window.toggleTheme = () => {
    const currentTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', currentTheme);
    logger.info(`Theme toggled to ${currentTheme}`);
};

window.copyDebugLog = () => {
    logger.copyDebugLog();
};

// Export for module usage
export { app }; 