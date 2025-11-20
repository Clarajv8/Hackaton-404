gsap.registerPlugin(ScrollTrigger);

// --- CONFIGURACIÓN BÁSICA ---
const canvas = document.getElementById('space-canvas');
const ctx = canvas.getContext('2d');
const spaceshipEl = document.getElementById('spaceship');
const gameLayer = document.getElementById('game-layer');
const hud = document.getElementById('hud');
const crashScreen = document.getElementById('crash-screen');

let width, height;
let isGameReady = false;
let isCrashed = false;
let isShipActive = false;

const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
};
window.addEventListener('resize', resize);
resize();

// --- 1. SCROLLYTELLING (GSAP) ---
gsap.set("#spaceship", { y: "150vh", x: "-50%" });

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
  .to("#spaceship", { y: "-50%", duration: 2, ease: "power2.out" });

// --- 2. ESTADO DEL JUEGO ---
function enableGame() {
    if (isGameReady) return;
    isGameReady = true;
    
    gameLayer.style.pointerEvents = "auto";
    hud.classList.remove('hidden');
    
    document.body.style.overflow = "hidden";
    
    ship.x = width / 2;
    ship.y = height / 2;
    mouse.x = width / 2;
    mouse.y = height / 2;
}

function disableGame() {
    isGameReady = false;
    gameLayer.style.pointerEvents = "none";
    hud.classList.add('hidden');
    document.body.style.overflow = "auto";
}

// --- 3. LÓGICA DEL JUEGO ---
let mouse = { x: width/2, y: height/2 };
let ship = { x: width/2, y: height/2, rot: 0 };
const obstacles = [];

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
    if (active) {
        spaceshipEl.classList.add('active');
        document.getElementById('status-msg').innerText = "!!! ESQUIVA LOS OBSTÁCULOS !!!";
        document.getElementById('status-msg').classList.add('text-red-500');
    } else {
        spaceshipEl.classList.remove('active');
        document.getElementById('status-msg').innerText = "SISTEMA EN ESPERA // CLICK PARA ACELERAR";
        document.getElementById('status-msg').classList.remove('text-red-500');
    }
}

// --- 4. RENDER LOOP (Canvas + DOM) ---
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

function updateShip() {
    ship.x += (mouse.x - ship.x) * 0.1;
    ship.y += (mouse.y - ship.y) * 0.1;

    let tilt = (mouse.x - ship.x) * 0.15;
    ship.rot += (tilt - ship.rot) * 0.1;

    spaceshipEl.style.transform = `translate3d(calc(${ship.x}px - 50%), calc(${ship.y}px - 50%), 0) rotate(${ship.rot}deg)`;
}

const stars = Array(100).fill().map(() => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 2,
    speed: Math.random() * 2 + 0.5
}));

function drawStars() {
    ctx.fillStyle = 'white';
    stars.forEach(star => {
        let speedFactor = isShipActive ? 20 : 1; 
        star.x -= star.speed * speedFactor;
        
        if (star.x < 0) {
            star.x = width;
            star.y = Math.random() * height;
        }
        
        ctx.beginPath();
        if(isShipActive) {
            ctx.fillRect(star.x, star.y, star.size * 10, star.size);
        } else {
            ctx.arc(star.x, star.y, star.size, 0, Math.PI*2);
            ctx.fill();
        }
    });
}

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

        if (distance < (obs.size/2 + 30)) { 
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
    el.style.background = `hsl(${Math.random()*360}, 70%, 50%)`;
    
    gameLayer.appendChild(el);
    obstacles.push({ el, x: width, y, size });
}

function triggerCrash() {
    if(isCrashed) return;
    isCrashed = true;
    isShipActive = false;
    
    spaceshipEl.style.display = 'none'; 
    crashScreen.classList.remove('hidden'); 
    document.body.classList.add('shaking'); 

    console.log("CRITICAL FAILURE");

    setTimeout(() => {
        window.location.reload();
    }, 2000);
}

animate();