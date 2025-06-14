const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;

// Canvas scaling for mobile responsiveness
let canvasScale = 1;
let canvasOffsetX = 0;
let canvasOffsetY = 0;

function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const containerRect = container.getBoundingClientRect();
    
    // Calculate scale to fit the container while maintaining aspect ratio
    const scaleX = containerRect.width / 800;
    const scaleY = containerRect.height / 600;
    canvasScale = Math.min(scaleX, scaleY);
    
    // Set canvas size
    canvas.style.width = (800 * canvasScale) + 'px';
    canvas.style.height = (600 * canvasScale) + 'px';
    
    // Calculate offsets for centering
    canvasOffsetX = (containerRect.width - (800 * canvasScale)) / 2;
    canvasOffsetY = (containerRect.height - (600 * canvasScale)) / 2;
    
    canvas.style.left = canvasOffsetX + 'px';
    canvas.style.top = canvasOffsetY + 'px';
}

// Initial resize and listen for window resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
    constructor(x, y, vx, vy, color, size, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.lifetime--;
    }

    draw() {
        const alpha = this.lifetime / this.maxLifetime;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.restore();
    }
}

class Player {
    constructor(x, y, isEcho = false) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = false;
        this.isEcho = isEcho;
        this.color = isEcho ? 'rgba(100, 200, 255, 0.4)' : '#00ff88';
        this.animFrame = 0;
        this.recordedPath = [];
        this.pathIndex = 0;
    }

    update(keys, platforms) {
        if (!this.isEcho) {
            if (keys.ArrowLeft) this.vx = -MOVE_SPEED;
            else if (keys.ArrowRight) this.vx = MOVE_SPEED;
            else this.vx = 0;

            if (keys[' '] && this.isGrounded) {
                this.vy = JUMP_FORCE;
                this.onJump();
            }
        } else {
            if (this.pathIndex < this.recordedPath.length) {
                const frame = this.recordedPath[this.pathIndex];
                this.x = frame.x;
                this.y = frame.y;
                this.pathIndex++;
            }
        }

        if (!this.isEcho) {
            this.vy += GRAVITY;
            this.x += this.vx;
            this.y += this.vy;

            this.isGrounded = false;
            
            platforms.forEach(platform => {
                if ((platform.type !== 'echo' || platform.activated) && this.checkCollision(platform)) {
                    if (this.vy > 0 && this.y < platform.y) {
                        const wasInAir = this.vy > 2;
                        this.y = platform.y - this.height;
                        this.vy = 0;
                        this.isGrounded = true;
                        if (wasInAir) {
                            this.onLand();
                        }
                    }
                }
            });

            if (this.y + this.height > canvas.height) {
                const wasInAir = this.vy > 2;
                this.y = canvas.height - this.height;
                this.vy = 0;
                this.isGrounded = true;
                if (wasInAir) {
                    this.onLand();
                }
            }

            if (this.x < 0) this.x = 0;
            if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        }
    }

    checkCollision(platform) {
        return this.x < platform.x + platform.width &&
               this.x + this.width > platform.x &&
               this.y < platform.y + platform.height &&
               this.y + this.height > platform.y;
    }

    draw() {
        ctx.save();
        
        // Add glow effect
        if (!this.isEcho) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
        } else {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(100, 200, 255, 0.6)';
        }
        
        // Draw player body with rounded corners
        ctx.fillStyle = this.color;
        this.roundRect(this.x, this.y, this.width, this.height, 8);
        
        // Draw eyes
        if (!this.isEcho) {
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 0;
            ctx.fillRect(this.x + 8, this.y + 10, 5, 5);
            ctx.fillRect(this.x + 17, this.y + 10, 5, 5);
            
            // Add eye glow
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(this.x + 9, this.y + 11, 2, 2);
            ctx.fillRect(this.x + 18, this.y + 11, 2, 2);
        }
        
        ctx.restore();
    }
    
    roundRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    startRecording() {
        this.recordedPath = [];
    }

    record() {
        this.recordedPath.push({ x: this.x, y: this.y });
    }
    
    onJump() {
        if (!this.isEcho && window.game) {
            // Create jump particles
            for (let i = 0; i < 8; i++) {
                window.game.particles.push(new Particle(
                    this.x + this.width / 2,
                    this.y + this.height,
                    (Math.random() - 0.5) * 4,
                    Math.random() * -2,
                    '#00ff88',
                    Math.random() * 3 + 2,
                    20
                ));
            }
        }
    }
    
    onLand() {
        if (!this.isEcho && window.game) {
            // Create landing particles
            for (let i = 0; i < 6; i++) {
                window.game.particles.push(new Particle(
                    this.x + this.width / 2 + (Math.random() - 0.5) * this.width,
                    this.y + this.height,
                    (Math.random() - 0.5) * 3,
                    Math.random() * -1,
                    '#00ff88',
                    Math.random() * 2 + 1,
                    15
                ));
            }
        }
    }
}

class Platform {
    constructor(x, y, width, height, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.activated = false;
    }

    draw() {
        ctx.save();
        
        if (this.type === 'echo' && !this.activated) {
            // Draw ghostly platform
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.setLineDash([]);
            
            // Inner glow
            ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        } else if (this.type === 'echo' && this.activated) {
            // Activated echo platform
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ccff';
            
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#0088cc');
            gradient.addColorStop(1, '#004466');
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Edge highlight
            ctx.strokeStyle = '#00ccff';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        } else {
            // Normal platform
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowOffsetY = 2;
            
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#4a5568');
            gradient.addColorStop(1, '#2d3748');
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Top highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(this.x, this.y, this.width, 2);
        }
        
        ctx.restore();
    }
}

class Button {
    constructor(x, y, targetPlatform) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 10;
        this.pressed = false;
        this.targetPlatform = targetPlatform;
        this.glowIntensity = 0;
    }

    checkPress(player) {
        const wasPressed = this.pressed;
        this.pressed = player.x < this.x + this.width &&
                      player.x + player.width > this.x &&
                      player.y + player.height > this.y &&
                      player.y + player.height < this.y + this.height + 10;
        
        if (this.pressed && !wasPressed && this.targetPlatform) {
            this.targetPlatform.activated = true;
        }
    }

    draw() {
        ctx.save();
        
        // Animate glow
        this.glowIntensity = this.pressed ? Math.min(this.glowIntensity + 0.1, 1) : Math.max(this.glowIntensity - 0.05, 0);
        
        // Button glow
        if (this.glowIntensity > 0) {
            ctx.shadowBlur = 20 * this.glowIntensity;
            ctx.shadowColor = '#ff4444';
        }
        
        // Button top
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        if (this.pressed) {
            gradient.addColorStop(0, '#cc3333');
            gradient.addColorStop(1, '#ff4444');
        } else {
            gradient.addColorStop(0, '#ff8833');
            gradient.addColorStop(1, '#ff6600');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Button base
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.x - 5, this.y + this.height, this.width + 10, 5);
        
        // Button highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(this.x + 5, this.y + 2, this.width - 10, 2);
        
        ctx.restore();
    }
}

class Game {
    constructor() {
        this.player = new Player(100, 400);
        this.echoes = [];
        this.particles = [];
        
        const echoPlatform1 = new Platform(350, 150, 100, 20, 'echo');
        const echoPlatform2 = new Platform(650, 300, 100, 20, 'echo');
        
        this.platforms = [
            new Platform(0, 550, 200, 50),
            new Platform(250, 500, 150, 50),
            new Platform(450, 450, 100, 50),
            new Platform(600, 400, 150, 50),
            new Platform(300, 350, 100, 20),
            new Platform(100, 250, 150, 20),
            new Platform(500, 250, 120, 20),
            echoPlatform1,
            echoPlatform2
        ];
        
        this.buttons = [
            new Button(260, 490, echoPlatform1),
            new Button(520, 240, echoPlatform2)
        ];
        
        this.keys = {};
        this.isRecording = false;
        this.maxEchoes = 3;
        this.echoesUsed = 0;
        
        this.setupInput();
        this.gameLoop();
    }

    setupInput() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key === 'r' || e.key === 'R') {
                if (!this.isRecording && this.echoesUsed < this.maxEchoes) {
                    this.startRecording();
                } else if (this.isRecording) {
                    this.stopRecording();
                }
            }
            
            if (e.key === 'e' || e.key === 'E') {
                this.clearEchoes();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Mobile touch controls
        this.setupMobileControls();
    }

    setupMobileControls() {
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const jumpBtn = document.getElementById('jumpBtn');
        const recordBtn = document.getElementById('recordBtn');
        const clearBtn = document.getElementById('clearBtn');

        // Left button
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = true;
        });
        leftBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = false;
        });
        leftBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = true;
        });
        leftBtn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = false;
        });

        // Right button
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = true;
        });
        rightBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = false;
        });
        rightBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = true;
        });
        rightBtn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = false;
        });

        // Jump button
        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys[' '] = true;
        });
        jumpBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys[' '] = false;
        });
        jumpBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.keys[' '] = true;
        });
        jumpBtn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.keys[' '] = false;
        });

        // Record button
        recordBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.isRecording && this.echoesUsed < this.maxEchoes) {
                this.startRecording();
            } else if (this.isRecording) {
                this.stopRecording();
            }
        });
        recordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.isRecording && this.echoesUsed < this.maxEchoes) {
                this.startRecording();
            } else if (this.isRecording) {
                this.stopRecording();
            }
        });

        // Clear button
        clearBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.clearEchoes();
        });
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearEchoes();
        });

        // Prevent context menu on mobile
        document.addEventListener('contextmenu', (e) => {
            if (e.target.classList.contains('mobile-btn')) {
                e.preventDefault();
            }
        });

        // Prevent scrolling when touching game area
        document.body.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'CANVAS' || e.target.classList.contains('mobile-btn')) {
                e.preventDefault();
            }
        }, { passive: false });

        document.body.addEventListener('touchend', (e) => {
            if (e.target.tagName === 'CANVAS' || e.target.classList.contains('mobile-btn')) {
                e.preventDefault();
            }
        }, { passive: false });

        document.body.addEventListener('touchmove', (e) => {
            if (e.target.tagName === 'CANVAS' || e.target.classList.contains('mobile-btn')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    startRecording() {
        this.isRecording = true;
        this.player.startRecording();
        
        // Create recording start particles
        for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 * i) / 15;
            this.particles.push(new Particle(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height / 2,
                Math.cos(angle) * 3,
                Math.sin(angle) * 3,
                '#ff4444',
                4,
                30
            ));
        }
    }

    stopRecording() {
        this.isRecording = false;
        const echo = new Player(this.player.recordedPath[0].x, this.player.recordedPath[0].y, true);
        echo.recordedPath = [...this.player.recordedPath];
        this.echoes.push(echo);
        this.echoesUsed++;
        this.updateUI();
    }

    clearEchoes() {
        this.echoes = [];
        this.echoesUsed = 0;
        this.updateUI();
    }

    updateUI() {
        document.getElementById('echoCount').textContent = this.maxEchoes - this.echoesUsed;
    }

    update() {
        this.player.update(this.keys, this.platforms);
        
        if (this.isRecording) {
            this.player.record();
        }
        
        this.echoes.forEach(echo => {
            echo.update({}, this.platforms);
        });
        
        this.buttons.forEach(button => {
            button.checkPress(this.player);
            this.echoes.forEach(echo => {
                button.checkPress(echo);
            });
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update();
            return particle.lifetime > 0;
        });
    }

    draw() {
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0a0e1a');
        gradient.addColorStop(0.5, '#1a1f3a');
        gradient.addColorStop(1, '#0f1420');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add subtle grid pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        this.platforms.forEach(platform => platform.draw());
        this.buttons.forEach(button => button.draw());
        this.particles.forEach(particle => particle.draw());
        this.echoes.forEach(echo => echo.draw());
        this.player.draw();
        
        if (this.isRecording) {
            // Animated recording indicator
            const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
            
            // Top bar with pulsing effect
            const recordGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            recordGradient.addColorStop(0, `rgba(255, 0, 0, ${0.2 * pulse})`);
            recordGradient.addColorStop(0.5, `rgba(255, 0, 0, ${0.4 * pulse})`);
            recordGradient.addColorStop(1, `rgba(255, 0, 0, ${0.2 * pulse})`);
            ctx.fillStyle = recordGradient;
            ctx.fillRect(0, 0, canvas.width, 15);
            
            // Recording text with glow
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('● RECORDING', 15, 35);
            ctx.restore();
            
            // Echo trail effect
            if (this.player.recordedPath.length > 1) {
                ctx.save();
                ctx.strokeStyle = `rgba(100, 200, 255, ${0.3 * pulse})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                for (let i = Math.max(0, this.player.recordedPath.length - 30); i < this.player.recordedPath.length; i++) {
                    const point = this.player.recordedPath[i];
                    if (i === Math.max(0, this.player.recordedPath.length - 30)) {
                        ctx.moveTo(point.x + this.player.width/2, point.y + this.player.height/2);
                    } else {
                        ctx.lineTo(point.x + this.player.width/2, point.y + this.player.height/2);
                    }
                }
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.game = new Game();

// Welcome popup functionality
function closeWelcomePopup() {
    const popup = document.getElementById('welcomePopup');
    popup.classList.add('hidden');
}