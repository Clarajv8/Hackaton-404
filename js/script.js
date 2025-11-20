/* --- 1. INICIALIZACIÓN Y GSAP --- */
gsap.registerPlugin(ScrollTrigger);

// Variables globales
const canvas = document.getElementById('space-canvas');
const ctx = canvas.getContext('2d');
const spaceshipEl = document.getElementById('spaceship');
const gameLayer = document.getElementById('game-layer');
const hud = document.getElementById('hud'); // Asegúrate de que este ID exista en tu HTML o quita esta línea
const crashScreen = document.getElementById('crash-screen');

// Inicializamos dimensiones para evitar errores
let width = window.innerWidth;
let height = window.innerHeight;

// ESTADO DEL JUEGO
let isGameReady = false;
let isCrashed = false;
let isShipActive = false;

// CONFIGURACIÓN DE LA NAVE (Con prevY para rotación lateral)
let ship = { x: width/2, y: height/2, rot: 0, prevY: height/2 };

// Ajuste de tamaño
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

/* --- 2. GESTIÓN DE SCROLLYTELLING (RECUPERADO) --- */
gsap.set("#spaceship", { autoAlpha: 0, xPercent: -50, yPercent: -50, y: "-150vh" });

const tl = gsap.timeline({
    scrollTrigger: {
        trigger: ".scroll-container",
        start: "top top",
        end: "+=250%", 
        scrub: 1,
        pin: true,
        onLeave: () => enableGame(), 
        onEnterBack: () => disableGame()
    }
});

tl.to("#section-intro .content-wrapper", { opacity: 1, duration: 1 })
  .to("#section-intro .content-wrapper", { opacity: 0, scale: 2, duration: 1 }, "+=0.5")
  .to("#section-message .content-wrapper", { opacity: 1, y: 0, duration: 1 })
  .to("#section-message .content-wrapper", { opacity: 0, y: -50, duration: 1 }, "+=0.5")
  .to("#game-layer", { opacity: 1, duration: 0.5 }, "<") 
  .to("#spaceship", { autoAlpha: 1, y: 0, duration: 2, ease: "power2.out" });

tl.to("#section-intro .content-wrapper", { opacity: 1, y: 0, duration: 1 })
  .to("#section-intro .content-wrapper", { opacity: 0, scale: 1.5, duration: 1 }, "+=0.5")
  .to("#section-message .content-wrapper", { opacity: 1, y: 0, duration: 1 })
  .to("#section-message .content-wrapper", { opacity: 0, y: -100, duration: 1 }, "+=0.5")
  .to("#game-layer", { opacity: 1, duration: 0.5 }, "<") 
  .to("#spaceship", { autoAlpha: 1, y: "-50%", duration: 2, ease: "power2.out" });

// --- 2. ESTADO DEL JUEGO ---
function enableGame() {
    if (isGameReady) return;
    isGameReady = true;
    
    gameLayer.style.pointerEvents = "auto";
    if(hud) hud.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    
    // --- EL TRUCO PARA EVITAR EL SALTO ---
    gsap.killTweensOf("#spaceship");
    spaceshipEl.style.top = '0px';
    spaceshipEl.style.left = '0px';
    
    ship.x = window.innerWidth / 2;
    ship.y = window.innerHeight / 2;
    ship.prevY = window.innerHeight / 2;
    
    mouse.x = window.innerWidth / 2;
    mouse.y = window.innerHeight / 2;

    updateShip(); 
}

/* --- 4. LÓGICA Y FÍSICA --- */
let mouse = { x: width/2, y: height/2 };

window.addEventListener('mousemove', e => {
    if (isGameReady) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }
});
window.addEventListener('mousedown', () => activateShip(true));
window.addEventListener('mouseup', () => activateShip(false));

function activateShip(active) {
    if (!isGameReady || isCrashed) return;
    isShipActive = active;
    const msg = document.getElementById('status-msg');
    
    if (active) {
        spaceshipEl.classList.add('active');
        if(msg) {
            msg.innerText = "!!! ESQUIVA LOS OBSTÁCULOS !!!";
            msg.classList.add('text-red-500');
        }
    } else {
        spaceshipEl.classList.remove('active');
        if(msg) {
            msg.innerText = "SISTEMA EN ESPERA // CLICK PARA ACELERAR";
            msg.classList.remove('text-red-500');
        }
    }
}

/* --- 5. BUCLE PRINCIPAL --- */
function animate() {
    ctx.fillStyle = isShipActive ? 'rgba(0,0,0,0.3)' : '#050505';
    ctx.fillRect(0, 0, width, height);

    drawStars();

    if (isGameReady && !isCrashed) {
        updateShip();
        manageObstacles();
    }
    
    requestAnimationFrame(animate);
}

// --- MOVIMIENTO DE LA NAVE (CORREGIDO PARA PERFIL) ---
function updateShip() {
    ship.x = mouse.x;
    ship.y = mouse.y;

    let velocityY = mouse.y - ship.prevY;

    let targetRot = velocityY * 1.5;

    targetRot = Math.max(-30, Math.min(30, targetRot));

    ship.rot += (targetRot - ship.rot) * 0.1;

    ship.prevY = mouse.y;

    // 3. Aplicar CSS
    spaceshipEl.style.transform = `translate3d(${ship.x - 50}px, ${ship.y - 20}px, 0) rotate(${ship.rot}deg)`;
}

/* --- 6. ELEMENTOS VISUALES (Estrellas y Obstáculos) --- */
const stars = Array(100).fill().map(() => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 2,
    speed: Math.random() * 2 + 0.5
}));

function drawStars() {
    ctx.fillStyle = 'white';
    stars.forEach(star => {
        let speedFactor = isShipActive ? 25 : 1; 
        star.x -= star.speed * speedFactor;
        
        if (star.x < 0) {
            star.x = width;
            star.y = Math.random() * height;
        }
        
        ctx.beginPath();
        if(isShipActive) {
            ctx.fillRect(star.x, star.y, star.size * 15, star.size);
        } else {
            ctx.arc(star.x, star.y, star.size, 0, Math.PI*2);
            ctx.fill();
        }
    });
}

let obstacles = [];
let frameCount = 0;
function manageObstacles() {
    if (!isShipActive) return; 

    frameCount++;
    if (frameCount > 40) { 
        createObstacle();
        frameCount = 0;
    }

    obstacles.forEach((obs, index) => {
        obs.x -= 15; 
        obs.el.style.left = obs.x + 'px';

        let dx = ship.x - (obs.x + obs.size/2);
        let dy = ship.y - (obs.y + obs.size/2);
        let distance = Math.sqrt(dx*dx + dy*dy);

        if (distance < (obs.size/2 + 20)) { 
            triggerCrash();
        }

        if (obs.x < -200) {
            obs.el.remove();
            obstacles.splice(index, 1);
        }
    });
}

function createObstacle() {
    const el = document.createElement('div');
    el.className = 'obstacle-planet';
    const size = Math.random() * 60 + 40;
    const y = Math.random() * (height - size);
    
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.top = y + 'px';
    const hue = Math.random() * 360;
    el.style.background = `radial-gradient(circle at 30% 30%, hsl(${hue}, 70%, 60%), hsl(${hue}, 70%, 20%))`;
    
    gameLayer.appendChild(el);
    obstacles.push({ el, x: width, y, size });
}

function triggerCrash() {
    if(isCrashed) return;
    isCrashed = true;
    isShipActive = false;
    
    spaceshipEl.style.display = 'none'; 
    if(crashScreen) crashScreen.classList.remove('hidden'); 
    document.body.classList.add('shaking'); 

    console.log("CRITICAL FAILURE");

    setTimeout(() => {
        window.location.reload();
    }, 2000);
}

animate();