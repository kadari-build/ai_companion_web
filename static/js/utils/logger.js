/**
 * Logger Utility
 * Centralized logging system for debugging and development
 */

export class Logger {
    constructor() {
        this.debugContent = document.querySelector('.debug-content');
        this.isDebugVisible = false;
        this.setupDebugToggle();
    }

    setupDebugToggle() {
        const debugToggle = document.querySelector('.debug-toggle');
        const debugPanel = document.querySelector('.debug-panel');
        
        if (debugToggle && debugPanel) {
            debugToggle.addEventListener('click', () => {
                this.isDebugVisible = !this.isDebugVisible;
                debugPanel.classList.toggle('visible');
                debugToggle.textContent = this.isDebugVisible ? 'Hide Debug' : 'Show Debug';
            });
        }
    }

    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        
        // Add to debug panel
        if (this.debugContent) {
            const entry = document.createElement('div');
            entry.className = `debug-entry ${level}`;
            entry.textContent = logEntry;
            this.debugContent.appendChild(entry);
            this.debugContent.scrollTop = this.debugContent.scrollHeight;
        }
        
        // Console logging
        console.log(`[${level.toUpperCase()}] ${message}`);
    }

    info(message) {
        this.log(message, 'info');
    }

    error(message) {
        this.log(message, 'error');
    }

    warn(message) {
        this.log(message, 'warn');
    }

    debug(message) {
        this.log(message, 'debug');
    }

    copyDebugLog() {
        if (!this.debugContent) return;
        
        const debugText = Array.from(this.debugContent.children)
            .map(entry => entry.textContent)
            .join('\n');
            
        navigator.clipboard.writeText(debugText)
            .then(() => {
                const copyBtn = document.querySelector('.copy-button');
                if (copyBtn) {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy Log';
                    }, 2000);
                }
            })
            .catch(err => this.error('Failed to copy debug log: ' + err.message));
    }
}

// Create singleton instance
export const logger = new Logger();

// Make copyDebugLog available globally
window.copyDebugLog = () => logger.copyDebugLog();

export default logger; 