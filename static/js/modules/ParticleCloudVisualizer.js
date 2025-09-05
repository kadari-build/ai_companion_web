/**
 * AI Particle Cloud Visualizer
 * Enhanced particle system with AI speaking pulse effects
 * Maintains compatibility with existing ParticleSystem interface
 */

import { CONFIG } from '../config/settings.js';
import { logger } from '../utils/logger.js';
import { stateManager } from '../utils/stateManager.js';

export class ParticleCloudVisualizer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.isRunning = false;
        this.lastTime = 0;
        
        // Particle configuration
        this.particles = [];
        this.particleCount = CONFIG.PARTICLES.count || 80;
        this.pulseIntensity = 1;
        this.connectionDistance = CONFIG.PARTICLES.maxDistance || 120;
        
        // AI speaking state
        this.isAISpeaking = false;
        this.speakingStartTime = 0;
        this.speakingDuration = 3000; // 3 seconds
        
        // Performance tracking
        this.frameCount = 0;
        this.fps = 0;
    }

    init() {
        try {
            this.canvas = document.getElementById('visualizer');
            if (!this.canvas) {
                logger.error('Canvas element not found');
                return false;
            }

            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                logger.error('Could not get canvas context');
                return false;
            }

            this.resizeCanvas();
            this.createParticles();
            
            logger.info('Particle Cloud Visualizer initialized successfully');
            return true;
        } catch (error) {
            logger.error(`Failed to initialize Particle Cloud Visualizer: ${error.message}`);
            return false;
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.createParticles(); // Recreate particles for new canvas size
    }

    createParticles() {
        this.particles = [];
        
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 2,
                baseSize: Math.random() * 3 + 2,
                color: this.getRandomParticleColor(),
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.02 + 0.01,
                speakingPulse: 0,
                speakingPulseSpeed: Math.random() * 0.05 + 0.02
            });
        }
    }

    getRandomParticleColor() {
        const colors = [
            { r: 100, g: 150, b: 255 }, // Blue
            { r: 150, g: 100, b: 255 }, // Purple
            { r: 100, g: 255, b: 150 }, // Green
            { r: 255, g: 150, b: 100 }, // Orange
            { r: 255, g: 100, b: 150 }, // Pink
            { r: 150, g: 255, b: 255 }  // Cyan
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update FPS counter
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1 / deltaTime);
        }

        // Get audio intensity from audio manager
        const audioIntensity = this.getAudioIntensity();

        // Update AI speaking state based on audio intensity
        if (audioIntensity > 0.1) {
            if (!this.isAISpeaking) {
                this.startAISpeaking();
            }
            this.speakingStartTime = currentTime; // Keep updating while audio is playing
        } else if (this.isAISpeaking && currentTime - this.speakingStartTime > 500) {
            // Stop after 500ms of no audio
            this.stopAISpeaking();
        }

        // Update particles
        this.particles.forEach(particle => {
            // Move particles
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Bounce off edges
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
            
            // Keep particles in bounds
            particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
            
            // Update pulse effects
            particle.pulsePhase += particle.pulseSpeed;
            const naturalPulse = Math.sin(particle.pulsePhase) * 0.3 + 0.7;
            
            // AI speaking pulse effect based on actual audio intensity
            if (this.isAISpeaking && audioIntensity > 0.1) {
                // Use audio intensity to drive the pulse effect
                const audioPulse = audioIntensity * this.pulseIntensity;
                particle.speakingPulse = audioPulse;
            } else {
                particle.speakingPulse *= 0.95; // Fade out
            }
            
            // Combined pulse effect
            const totalPulse = naturalPulse + particle.speakingPulse;
            particle.size = particle.baseSize * (0.5 + totalPulse * 0.5);
        });
    }

    draw() {
        if (!this.ctx || !this.canvas) return;

        // Clear with fade effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections first
        this.drawConnections();

        // Draw particles
        this.particles.forEach(particle => {
            const alpha = 0.6 + particle.speakingPulse * 0.4;
            const size = particle.size;
            
            // Particle glow when AI is speaking
            if (this.isAISpeaking && particle.speakingPulse > 0.1) {
                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, size * 4
                );
                gradient.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha * 0.8})`);
                gradient.addColorStop(0.5, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha * 0.3})`);
                gradient.addColorStop(1, 'transparent');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(particle.x - size * 4, particle.y - size * 4, size * 8, size * 8);
            }

            // Particle core
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
            this.ctx.fill();
        });
    }

    drawConnections() {
        if (!this.ctx) return;

        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const particle1 = this.particles[i];
                const particle2 = this.particles[j];
                const distance = Math.hypot(particle1.x - particle2.x, particle1.y - particle2.y);
                
                if (distance < this.connectionDistance) {
                    const alpha = (1 - distance / this.connectionDistance) * 0.3;
                    
                    // Enhance connection when AI is speaking
                    const speakingEnhancement = this.isAISpeaking ? 0.2 : 0;
                    const totalAlpha = alpha + speakingEnhancement;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle1.x, particle1.y);
                    this.ctx.lineTo(particle2.x, particle2.y);
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${totalAlpha})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        if (!this.isRunning) return;

        this.update();
        this.draw();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
        logger.info('Particle Cloud Visualizer started');
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        logger.info('Particle Cloud Visualizer stopped');
    }

    // AI Speaking Integration
    startAISpeaking() {
        this.isAISpeaking = true;
        this.speakingStartTime = performance.now();
        logger.info('AI speaking pulse effect activated');
    }

    stopAISpeaking() {
        this.isAISpeaking = false;
        logger.info('AI speaking pulse effect deactivated');
    }

    // Configuration methods
    setParticleCount(count) {
        this.particleCount = count;
        this.createParticles();
    }

    setPulseIntensity(intensity) {
        this.pulseIntensity = intensity;
    }

    setConnectionDistance(distance) {
        this.connectionDistance = distance;
    }

    // Window resize handler
    onWindowResize() {
        this.resizeCanvas();
    }

    // Get audio intensity from audio manager
    getAudioIntensity() {
        try {
            // Try to get audio intensity from state manager if available
            if (stateManager && stateManager.audio && stateManager.audio.analyser) {
                // Use the audio analyser to get real-time intensity
                const dataArray = stateManager.audio.dataArray;
                if (dataArray) {
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const value = (dataArray[i] - 128) / 128;
                        sum += value * value;
                    }
                    return Math.min(1, Math.sqrt(sum / dataArray.length) * 5);
                }
            }
            // Fallback to a simple intensity based on speaking state
            return this.isAISpeaking ? 0.5 : 0;
        } catch (error) {
            // Fallback to a simple intensity based on speaking state
            return this.isAISpeaking ? 0.5 : 0;
        }
    }

    // Performance info
    getPerformanceInfo() {
        return {
            fps: this.fps,
            particleCount: this.particles.length,
            isAISpeaking: this.isAISpeaking,
            memoryEstimate: Math.round(this.particles.length * 40 / 1024)
        };
    }

    // Cleanup
    cleanup() {
        this.stop();
        this.particles = [];
        this.canvas = null;
        this.ctx = null;
        logger.info('Particle Cloud Visualizer cleaned up');
    }
}

// Create and export singleton instance
export const particleCloudVisualizer = new ParticleCloudVisualizer();
