/**
 * Particle System Module
 * Handles real-time audio visualization using Canvas particles
 */

import { CONFIG } from '../config/settings.js';
import { logger } from '../utils/logger.js';
import { stateManager } from '../utils/stateManager.js';

export class Particle {
    constructor(x, y, baseRadius, agentId) {
        this.x = x;
        this.y = y;
        this.baseRadius = baseRadius;
        this.radius = baseRadius;
        this.angle = Math.random() * Math.PI * 2;
        this.velocity = CONFIG.PARTICLES.velocity.min + Math.random() * (CONFIG.PARTICLES.velocity.max - CONFIG.PARTICLES.velocity.min);
        this.distance = CONFIG.PARTICLES.distance.min + Math.random() * (CONFIG.PARTICLES.distance.max - CONFIG.PARTICLES.distance.min);
        this.originalX = x;
        this.originalY = y;
        this.agentId = agentId;
        this.alpha = 0.4 + Math.random() * 0.3;
        this.lastIntensity = 0;
        this.updateColors();
    }

    updateColors() {
        const colors = CONFIG.COMPANIONS[this.agentId].color;
        this.hue = colors.hue + Math.random() * 30;
        this.saturation = colors.saturation + Math.random() * 30;
        this.brightness = colors.brightness + Math.random() * 20;
    }

    update(intensity) {
        // Pre-calculate common values
        const angleIncrement = this.velocity * (1 + intensity * 0.8);
        const distanceMultiplier = 0.5 + intensity * 0.5;
        const radiusMultiplier = 1 + intensity * 1.5;
        
        this.angle += angleIncrement;
        this.x = this.originalX + Math.cos(this.angle) * this.distance * distanceMultiplier;
        this.y = this.originalY + Math.sin(this.angle) * this.distance * distanceMultiplier;
        this.radius = this.baseRadius * radiusMultiplier;
        this.alpha = 0.4 + intensity * 0.3;
        
        // Only update colors if intensity changes significantly
        if (Math.abs(this.lastIntensity - intensity) > 0.1) {
            this.updateColors();
            this.lastIntensity = intensity;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.brightness}%, ${this.alpha})`;
        ctx.fill();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = {};
        this.animationId = null;
        this.hue = 220;
        this.isInitialized = false;
    }

    init() {
        const canvas = document.getElementById('visualizer');
        if (!canvas) {
            logger.error('Canvas element not found');
            return false;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            logger.error('Could not get canvas context');
            return false;
        }

        stateManager.setUIState({ canvas, ctx });
        this.resizeCanvas();
        this.initParticles();
        this.isInitialized = true;
        
        logger.info('Particle system initialized');
        return true;
    }

    resizeCanvas() {
        const { canvas, ctx } = stateManager.ui;
        if (!canvas || !ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.initParticles();
    }

    initParticles() {
        this.particles = {};
        
        // Create particles for each agent
        for (const [agentId, config] of Object.entries(CONFIG.COMPANIONS)) {
            this.particles[agentId] = [];
            for (let i = 0; i < CONFIG.PARTICLES.count; i++) {
                const baseRadius = CONFIG.PARTICLES.baseRadius.min + Math.random() * (CONFIG.PARTICLES.baseRadius.max - CONFIG.PARTICLES.baseRadius.min);
                this.particles[agentId].push(new Particle(
                    stateManager.ui.canvas.width * config.position,
                    stateManager.ui.canvas.height / 2,
                    baseRadius,
                    agentId
                ));
            }
        }
    }

    getAudioIntensity() {
        const { analyser, dataArray } = stateManager.audio;
        if (!analyser) return 0.2;
        
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const value = (dataArray[i] - 128) / 128;
            sum += value * value;
        }
        
        return Math.min(1, Math.sqrt(sum / dataArray.length) * 5);
    }

    drawConnection(p1, p2, intensity, ctx) {
        // Only draw connections between particles in the same cloud
        if (p1.agentId !== p2.agentId) return;
        
        const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (distance < CONFIG.PARTICLES.maxDistance) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            const alpha = (1 - distance / CONFIG.PARTICLES.maxDistance) * 0.15 * intensity;
            ctx.strokeStyle = `hsla(${this.hue}, 80%, 50%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    draw() {
        const { canvas, ctx } = stateManager.ui;
        
        // Check if canvas and context are available
        if (!canvas || !ctx) {
            this.animationId = requestAnimationFrame(() => this.draw());
            return;
        }
        
        this.animationId = requestAnimationFrame(() => this.draw());
        
        const baseIntensity = this.getAudioIntensity();
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-fade');
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles for each companion
        for (const [agentId, agentParticles] of Object.entries(this.particles)) {
            // Calculate companion-specific intensity
            const agentIntensity = stateManager.companion.active[agentId] ? baseIntensity : 0.2;
            
            // Optimize particle updates by reducing unnecessary calculations
            const centerX = canvas.width * CONFIG.COMPANIONS[agentId].position;
            const centerY = canvas.height / 2;
            const centerColor = CONFIG.COMPANIONS[agentId].color;
            
            // Batch particle updates
            for (let i = 0; i < agentParticles.length; i++) {
                const particle = agentParticles[i];
                particle.update(agentIntensity);
                particle.draw(ctx);
                
                // Draw connections only for nearby particles
                for (let j = i + 1; j < agentParticles.length; j++) {
                    const otherParticle = agentParticles[j];
                    const dx = particle.x - otherParticle.x;
                    const dy = particle.y - otherParticle.y;
                    const distance = dx * dx + dy * dy; // Squared distance for comparison
                    
                    if (distance < CONFIG.PARTICLES.maxDistance * CONFIG.PARTICLES.maxDistance) {
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        const alpha = (1 - Math.sqrt(distance) / CONFIG.PARTICLES.maxDistance) * 0.15 * agentIntensity;
                        ctx.strokeStyle = `hsla(${this.hue}, 80%, 50%, ${alpha})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            // Draw central glow for each agent
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, 200
            );
            
            const alpha = Math.max(0, Math.min(1, 0.15 * agentIntensity));
            gradient.addColorStop(0, `hsla(${centerColor.hue}, ${centerColor.saturation}%, ${centerColor.brightness}%, ${alpha})`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    start() {
        if (!this.isInitialized) {
            logger.error('Particle system not initialized');
            return;
        }
        this.draw();
        logger.info('Particle system started');
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        logger.info('Particle system stopped');
    }

    // Event handlers
    onWindowResize() {
        this.resizeCanvas();
    }

    onCompanionActivated(agentId) {
        stateManager.setCompanionState({
            active: { ...stateManager.companion.active, [agentId]: true }
        });
    }

    onCompanionDeactivated(agentId) {
        const active = { ...stateManager.companion.active };
        delete active[agentId];
        stateManager.setCompanionState({ active });
    }
}

// Create singleton instance
export const particleSystem = new ParticleSystem();

export default particleSystem; 