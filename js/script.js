gsap.registerPlugin(ScrollTrigger);

// --- SETUP ---
const canvas = document.getElementById('space-canvas');
const ctx = canvas.getContext('2d');
const spaceshipEl = document.getElementById('spaceship');
const gameLayer = document.getElementById('game-layer');
const hud = document.getElementById('instr');
const crashScreen = document.getElementById('crash-screen');
const scoreboard = document.getElementById('scoreboard');
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('highscore-display');
const newRecordMsg = document.getElementById('new-record-msg');
const recordTextContent = document.getElementById('record-text-content');
const introHighScore = document.getElementById('intro-highscore');

let width = window.innerWidth;
let height = window.innerHeight;

// VARS
let gameDifficulty = 1; 
let score = 0;
let highScore = localStorage.getItem('warpRunHighScore') || 0;
highScoreDisplay.innerText = Math.floor(highScore);
if(introHighScore) introHighScore.innerText = Math.floor(highScore);

const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
};
window.addEventListener('resize', resize);
resize();

// --- 1. SCROLLYTELLING ---
const startY = -200; 
const centerX = width / 2 - 50; 
const centerY = height / 2 - 20; 

// Inicialización
gsap.set("#spaceship", { x: centerX, y: startY, autoAlpha: 1 });
gsap.set("#game-layer", { autoAlpha: 0 }); 
gsap.set("#text-404", { autoAlpha: 0, scale: 0.5 });

// TIMELINE
let tl = gsap.timeline({
    scrollTrigger: {
        trigger: ".scroll-container",
        start: "top top",
        end: "+=600%",
        scrub: 1,
        pin: true, 
        onLeave: () => enableGame(),
        onEnterBack: () => disableGame()
    }
});

tl.to("#text-approach", { opacity: 0, duration: 1 })
  .to("#giant-mars", { scale: 0, opacity: 0, duration: 2, ease: "power2.in" }, "-=0.5")
  .to("#text-404", { autoAlpha: 1, scale: 1, duration: 1, ease: "elastic.out(1, 0.75)" })
  .to("#text-404", { autoAlpha: 0, duration: 1, delay: 1 })
  .to("#game-layer", { autoAlpha: 1, duration: 0.5 })
  .fromTo("#spaceship", 
      { x: centerX, y: startY }, 
      { x: centerX, y: centerY, duration: 3, ease: "power2.out" }
  );

// --- 2. GAME LOGIC ---
let isGameReady = false;
let isCrashed = false;
let isShipActive = false;
let ship = { x: width/2, y: height/2, rot: 0, prevY: height/2 };
let mouse = { x: width/2, y: height/2 };

function enableGame() {
    if (isGameReady || isCrashed) return;
    isGameReady = true;
    
    gameLayer.style.pointerEvents = "auto";
    hud.classList.remove('hidden');
    scoreboard.classList.remove('hidden'); 
    document.body.style.overflow = "hidden";
    canvas.style.opacity = 1; 
    
    ship.x = width / 2; ship.y = height / 2;
    mouse.x = width / 2; mouse.y = height / 2;
    gameDifficulty = 1; score = 0; scoreDisplay.innerText = "0";
    
    gsap.killTweensOf("#spaceship");
    spaceshipEl.style.opacity = 1;
    spaceshipEl.style.visibility = 'visible';
    spaceshipEl.style.display = 'block';
    gameLayer.style.opacity = 1;
    gameLayer.style.visibility = 'visible';
    
    updateShip();
}

function disableGame() {
    isGameReady = false;
    gameLayer.style.pointerEvents = "none";
    hud.classList.add('hidden');
    scoreboard.classList.add('hidden');
    document.body.style.overflow = "auto";
}

// --- 3. INPUTS ---
window.addEventListener('mousedown', () => activateShip(true));
window.addEventListener('mouseup', () => activateShip(false));
window.addEventListener('touchstart', () => activateShip(true), {passive: false});
window.addEventListener('touchend', () => activateShip(false));
window.addEventListener('mousemove', e => { if(isGameReady) { mouse.x = e.clientX; mouse.y = e.clientY; } });
window.addEventListener('touchmove', e => { if(isGameReady) { e.preventDefault(); mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; } }, {passive: false});

function activateShip(active) {
    if (!isGameReady || isCrashed) return;
    isShipActive = active;
    const msg = document.getElementById('status-msg');
    if (active) {
        spaceshipEl.classList.add('active');
        msg.innerText = "¡¡¡ ACELERANDO - CUIDADO !!!"; msg.classList.add('text-red-500');
    } else {
        spaceshipEl.classList.remove('active');
        msg.innerText = "SISTEMA MANUAL // CLICK PARA ACELERAR"; msg.classList.remove('text-red-500');
        if(gameDifficulty > 1) gameDifficulty -= 0.5;
        if(gameDifficulty < 1) gameDifficulty = 1;
    }
}

function updateShip() {
    let nextX = ship.x + (mouse.x - ship.x) * 0.2; 
    let nextY = ship.y + (mouse.y - ship.y) * 0.2;
    ship.x = Math.max(55, Math.min(width - 55, nextX));
    ship.y = Math.max(25, Math.min(height - 25, nextY));
    let velocityY = mouse.y - ship.prevY;
    let targetRot = velocityY * 2;
    targetRot = Math.max(-30, Math.min(30, targetRot));
    ship.rot += (targetRot - ship.rot) * 0.1;
    ship.prevY = mouse.y;
    spaceshipEl.style.transform = `translate3d(${ship.x - 50}px, ${ship.y - 20}px, 0) rotate(${ship.rot}deg)`;
}

// --- 4. ANIMATION LOOP ---
const stars = Array(60).fill().map(() => ({ x: Math.random()*width, y: Math.random()*height, speed: Math.random()+0.5 }));

function animate() {
    ctx.fillStyle = isShipActive ? 'rgba(0,0,0,0.2)' : '#050505';
    ctx.fillRect(0, 0, width, height);

    if (isShipActive && isGameReady && !isCrashed) {
        gameDifficulty += 0.002; if(gameDifficulty > 4) gameDifficulty = 4; 
        score += (gameDifficulty * 0.5); scoreDisplay.innerText = Math.floor(score);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    stars.forEach(s => {
        let currentSpeed = s.speed * (isShipActive ? (10 * gameDifficulty) : 1);
        s.x -= currentSpeed;
        if(s.x < 0) { s.x = width; s.y = Math.random()*height; }
        ctx.beginPath(); 
        if(isShipActive) ctx.fillRect(s.x, s.y, 40 * gameDifficulty, 2);
        else ctx.arc(s.x, s.y, Math.random()*2, 0, Math.PI*2);
        ctx.fill();
    });

    if(isGameReady && !isCrashed) {
        updateShip();
        manageObstacles();
    }
    requestAnimationFrame(animate);
}

let obstacles = [];
let frameCount = 0;
function manageObstacles() {
    if(!isShipActive) return;
    frameCount++;
    let spawnRate = 100 / gameDifficulty;
    if(frameCount > spawnRate) {
        const el = document.createElement('div');
        el.className = 'obstacle-planet';
        const size = Math.random()*50 + 30; const y = Math.random()*(height-size);
        el.style.width = size+'px'; el.style.height = size+'px'; el.style.top = y+'px'; 
        el.style.background = `radial-gradient(circle at 30% 30%, hsl(${Math.random()*360}, 70%, 60%), #000)`;
        gameLayer.appendChild(el);
        obstacles.push({el, x: width, y, size});
        frameCount = 0;
    }
    obstacles.forEach((o, i) => {
        o.x -= 7 * gameDifficulty; o.el.style.left = o.x+'px';
        let dx = ship.x - (o.x + o.size/2);
        let dy = ship.y - (o.y + o.size/2);
        if(Math.sqrt(dx*dx + dy*dy) < o.size/2 + 15) triggerCrash();
        if(o.x < -150) { o.el.remove(); obstacles.splice(i, 1); }
    });
}

// --- 5. CRASH LOGIC ---
function createExplosion(x, y) {
    const shockwave = document.createElement('div');
    shockwave.className = 'shockwave';
    shockwave.style.left = x + 'px'; shockwave.style.top = y + 'px';
    shockwave.style.width = '10px'; shockwave.style.height = '10px';
    gameLayer.appendChild(shockwave);
    gsap.to(shockwave, { width: 500, height: 500, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => shockwave.remove() });
    for(let i=0; i<40; i++) {
        const p = document.createElement('div');
        p.className = 'explosion-particle';
        const rand = Math.random();
        const color = rand > 0.6 ? '#ffaa00' : (rand > 0.3 ? '#ffffff' : '#888888');
        const size = Math.random() * 8 + 2;
        p.style.backgroundColor = color; p.style.width = size + 'px'; p.style.height = size + 'px';
        p.style.left = x + 'px'; p.style.top = y + 'px';
        gameLayer.appendChild(p);
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 150 + 50;
        gsap.to(p, { x: Math.cos(angle) * velocity, y: Math.sin(angle) * velocity, opacity: 0, duration: Math.random() * 1 + 0.5, ease: "power3.out", onComplete: () => p.remove() });
    }
}

function triggerCrash() {
    isCrashed = true; isShipActive = false; gameDifficulty = 1; 
    spaceshipEl.style.display = 'none';
    createExplosion(ship.x, ship.y);
    gsap.to('.obstacle-planet', { scale: 0, opacity: 0, duration: 0.6, ease: "power4.in", stagger: 0.02 });
    setTimeout(() => {
        const finalScore = Math.floor(score);
        if (finalScore > highScore) {
            highScore = finalScore; localStorage.setItem('warpRunHighScore', highScore); highScoreDisplay.innerText = highScore;
            if(introHighScore) introHighScore.innerText = highScore;
            recordTextContent.innerText = `¡FELICIDADES! RÉCORD: ${finalScore}`;
            newRecordMsg.classList.remove('hidden');
        } else {
            crashScreen.classList.remove('hidden');
        }
        setTimeout(() => {
            crashScreen.classList.add('hidden'); newRecordMsg.classList.add('hidden');
            isGameReady = false; gameLayer.style.pointerEvents = "none";
            hud.classList.add('hidden'); scoreboard.classList.add('hidden');
            document.body.style.overflow = "auto"; 
            obstacles.forEach(o => o.el.remove()); obstacles = []; isCrashed = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 3000);
    }, 800);
}

animate();