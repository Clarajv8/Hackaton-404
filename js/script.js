/* --- CONFIGURACIÓN INICIAL --- */
const canvas = document.getElementById('space-canvas');
const ctx = canvas.getContext('2d');
let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

/* --- ESTADO DEL JUEGO --- */
let isShipActive = false; 
let isResetting = false;

let mouse = { x: width/2, y: height/2 };

let ship = { 
    x: width/2, 
    y: height/2, 
    rot: 0,       
    targetRot: 0   
};

const updateMouse = (x, y) => {
    mouse.x = x;
    mouse.y = y;
};
window.addEventListener('mousemove', e => updateMouse(e.clientX, e.clientY));
window.addEventListener('touchmove', e => {
    updateMouse(e.touches[0].clientX, e.touches[0].clientY);
}, {passive: false});

/* --- FUNCIÓN MÁGICA: LERP --- */
const lerp = (start, end, factor) => start + (end - start) * factor;

/* --- SISTEMA DE PARTÍCULAS (MOTOR) --- */
const particles = [];

class Particle {
    constructor(x, y, isTurbo, shipVelocityX) {
        this.x = x;
        this.y = y;
        
        const baseSpeed = isTurbo ? (Math.random() * 10 + 15) : (Math.random() * 2 + 2);
        
        this.vx = -baseSpeed + (shipVelocityX * 0.2); 
        this.vy = (Math.random() - 0.5) * 2; 
        
        this.life = 1.0; 
        this.decay = Math.random() * 0.03 + 0.01;
        this.isTurbo = isTurbo;
        this.size = Math.random() * 5 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.95;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        
        if(this.isTurbo) {
            ctx.fillStyle = `hsl(${200 + Math.random()*40}, 100%, ${50 + Math.random()*50}%)`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00aaff';
        } else {
            ctx.fillStyle = `hsl(${10 + Math.random()*40}, 100%, 50%)`;
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#ff3300';
        }
        
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

/* --- FONDO (ESTRELLAS) --- */
const stars = [];
class Star {
    constructor() { this.init(); }
    init() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.baseSpeed = Math.random() * 0.5 + 0.1;
        this.size = Math.random() * 1.5;
    }
    update() {
        let currentSpeed = isShipActive ? this.baseSpeed + 35 : this.baseSpeed;
        this.x -= currentSpeed;
        if (this.x < 0) { this.x = width; this.y = Math.random() * height; }
    }
    draw() {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        if(isShipActive) {
            ctx.rect(this.x, this.y, this.size + 50, this.size); 
        } else {
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        }
        ctx.fill();
    }
}
for(let i=0; i<200; i++) stars.push(new Star());

/* --- GESTOR DE OBSTÁCULOS --- */
let obstacles = [];
let obstacleTimer = 0;

function manageObstacles() {
    if(isResetting) return;
    
    if(isShipActive) {
        obstacleTimer++;
        if(obstacleTimer > 35) {
            spawnObstacle();
            obstacleTimer = 0;
        }
    }
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= isShipActive ? 15 : 1; 
        obs.el.style.left = obs.x + 'px';
        
        if(isShipActive) checkShipCrash(obs);

        if (obs.x < -200) {
            obs.el.remove();
            obstacles.splice(i, 1);
        }
    }
}

function spawnObstacle() {
    const size = 40 + Math.random() * 80;
    const el = document.createElement('div');
    el.className = 'obstacle-planet';
    el.style.width = size + 'px'; el.style.height = size + 'px';
    el.style.top = Math.random() * (height - size) + 'px';
    const hue = Math.random() * 360;
    el.style.background = `radial-gradient(circle at 30% 30%, hsl(${hue}, 80%, 60%), hsl(${hue}, 60%, 20%))`;
    document.getElementById('game-layer').appendChild(el);
    obstacles.push({ el: el, x: width + 100, size: size });
}

/* --- BUCLE PRINCIPAL (PHYSICS LOOP) --- */
const spaceshipEl = document.getElementById('spaceship');

function animate() {
    ctx.fillStyle = isShipActive ? '#000000' : '#050505';
    ctx.fillRect(0, 0, width, height);

    stars.forEach(s => { s.update(); s.draw(); });

    if(!isResetting) {
        // --- LÓGICA DE MOVIMIENTO SUAVE (LERP) ---
        
        const followSpeed = 0.08; 
        
        const rotationSpeed = 0.1; 

        if (isShipActive) {
            let prevX = ship.x;

            ship.x = lerp(ship.x, mouse.x, followSpeed);
            ship.y = lerp(ship.y, mouse.y, followSpeed);
            
            let velX = ship.x - prevX;

            let diffX = mouse.x - ship.x;
            let targetAngle = diffX * 0.15; 
            
            targetAngle = Math.max(-40, Math.min(40, targetAngle));
            
            ship.rot = lerp(ship.rot, targetAngle, rotationSpeed);
            
            const nozzleOffset = -80; 
            const rad = ship.rot * Math.PI/180;
            const nozzleX = ship.x + Math.cos(rad) * nozzleOffset;
            const nozzleY = ship.y + Math.sin(rad) * nozzleOffset;
            
            for(let i=0; i<5; i++) {
                particles.push(new Particle(nozzleX, nozzleY + (Math.random()-0.5)*10, true, velX));
            }

        } else {
            ship.y = lerp(ship.y, ship.y + Math.sin(Date.now()/500)*0.5, 0.1);
     
            ship.rot = lerp(ship.rot, 0, 0.05);
            
            const nozzleOffset = -80;
            const nozzleX = ship.x + Math.cos(ship.rot*Math.PI/180) * nozzleOffset;
            const nozzleY = ship.y + Math.sin(ship.rot*Math.PI/180) * nozzleOffset;
            particles.push(new Particle(nozzleX, nozzleY, false, 0));
        }

        // APLICAR TRANSFORMACIÓN AL DOM
        // Usamos translate3d para aceleración por hardware
        spaceshipEl.style.transform = `translate3d(calc(${ship.x}px - 50%), calc(${ship.y}px - 50%), 0) rotate(${ship.rot}deg)`;
    }

    // 3. Actualizar Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    manageObstacles();
    requestAnimationFrame(animate);
}
animate();

/* --- EVENTOS DE INPUT --- */
const statusMsg = document.getElementById('status-msg');

spaceshipEl.addEventListener('mousedown', () => activateShip(true));
window.addEventListener('mouseup', () => activateShip(false));
spaceshipEl.addEventListener('touchstart', (e) => { e.preventDefault(); activateShip(true); });
window.addEventListener('touchend', () => activateShip(false));

function activateShip(active) {
    if(isResetting) return;
    isShipActive = active;
    if(active) {
        spaceshipEl.classList.add('active');
        statusMsg.innerText = "¡HIPERVELOCIDAD ACTIVA! ESQUIVA LOS PLANETAS";
        statusMsg.style.color = "#00aaff";
        statusMsg.style.textShadow = "0 0 10px #00aaff";
    } else {
        spaceshipEl.classList.remove('active');
        statusMsg.innerText = "SISTEMA EN ESPERA // CLICK Y ARRASTRA LA NAVE";
        statusMsg.style.color = "#fff";
        statusMsg.style.textShadow = "none";
    }
}

/* --- COLISIONES Y LÓGICA DE JUEGO --- */
function checkShipCrash(obs) {
    const dx = ship.x - (obs.x + obs.size/2);
    const dy = ship.y - (parseFloat(obs.el.style.top) + obs.size/2);
    const dist = Math.hypot(dx, dy);

    if(dist < 30 + obs.size/2) {
        triggerCrash();
    }
}

function triggerCrash() {
    isResetting = true;
    isShipActive = false;
    spaceshipEl.classList.remove('active');
    spaceshipEl.style.opacity = 0;

    const boom = document.createElement('div');
    boom.className = 'explosion';
    boom.style.left = ship.x + 'px';
    boom.style.top = ship.y + 'px';
    document.body.appendChild(boom);
    document.body.classList.add('shaking');

    setTimeout(() => location.reload(), 1500);
}