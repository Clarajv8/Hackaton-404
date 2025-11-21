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
const planetEarth = document.getElementById('planet-earth');
const successMsg = document.getElementById('success-msg');
const blackOverlay = document.getElementById('black-overlay');
const postVictoryText = document.getElementById('post-victory-text');
const secondLineText = document.querySelector('.setup-fade-in');
const finalGlitchScreen = document.getElementById('final-glitch-screen');

let width = window.innerWidth;
let height = window.innerHeight;

function isInfiniteModeUnlocked() {
    return localStorage.getItem('infiniteMode') === 'true';
}

// --- VARS ESTADO ---
let isGameReady = false;
let isCrashed = false;
let isShipActive = false;
let isLanding = false;
let ship = { x: width/2, y: height/2, rot: 0, prevY: height/2 };
let mouse = { x: width/2, y: height/2 };

let gameDifficulty = 1; 
let score = 0;
let highScore = localStorage.getItem('warpRunHighScore') || 0;

const IS_INFINITE_UNLOCKED = localStorage.getItem('infiniteMode') === 'true';
const missionGoalEl = document.querySelector('.mission-goal');

highScoreDisplay.innerText = Math.floor(highScore);
if(introHighScore) introHighScore.innerText = Math.floor(highScore);

if (IS_INFINITE_UNLOCKED && missionGoalEl) {
    missionGoalEl.style.display = 'none';
}

// --- RESIZE ---
const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
     canvas.width = width;
     canvas.height = height;
     ScrollTrigger.refresh();
     if (isGameReady) {
        ship.x = Math.max(50, Math.min(width - 50, ship.x));
        ship.y = Math.max(25, Math.min(height - 25, ship.y));
         mouse.x = ship.x;
        mouse.y = ship.y;
        spaceshipEl.style.transform = `translate3d(${ship.x - 50}px, ${ship.y - 20}px, 0) rotate(${ship.rot}deg)`;
     } else if (!gsap.isTweening("#spaceship")) {
         gsap.set("#spaceship", { x: width / 2 - 50 });
     }
};
window.addEventListener('resize', resize);
resize();

// --- SCROLLYTELLING ---
const startY = -200; 
gsap.set("#spaceship", { x: () => window.innerWidth / 2 - 50, y: startY, autoAlpha: 1 });
gsap.set("#game-layer", { autoAlpha: 0 }); 
gsap.set("#text-404", { autoAlpha: 0, scale: 0.5 });
gsap.set("#planet-earth", { right: -350 });

let tl = gsap.timeline({
     scrollTrigger: {
        trigger: ".scroll-container",
         start: "top top",
         end: "+=600%",
         scrub: 1,
        pin: true, 
         invalidateOnRefresh: true,
        onLeave: () => enableGame(),
         onEnterBack: () => disableGame()
    }
});

tl.to("#text-approach", { opacity: 0, duration: 1 })
     .to("#giant-mars", { scale: 0, opacity: 0, duration: 2, ease: "power2.in" }, "-=0.5")
     .to("#text-404", { autoAlpha: 1, scale: 1, duration: 1, ease: "elastic.out(1, 0.75)" })
     .to("#text-404", { autoAlpha: 0, duration: 1, delay: 1 })
     .to("#game-layer", { autoAlpha: 1, duration: 0.5 })
     .fromTo("#spaceship", { x: () => window.innerWidth / 2 - 50, y: startY }, { x: () => window.innerWidth / 2 - 50, y: () => window.innerHeight / 2 - 20, duration: 3, ease: "power2.out" });

// --- LOGICA ---
function enableGame() {
    if (isCrashed) isCrashed = false; 
     if (isGameReady) return;

     isGameReady = true;
     isLanding = false;

     document.body.classList.add('game-active');
     
 gameLayer.style.pointerEvents = "auto";
 hud.classList.remove('hidden');
 scoreboard.classList.remove('hidden'); 
 document.body.style.overflow = "hidden";
 canvas.style.opacity = 1; 
 
 crashScreen.classList.remove('active'); crashScreen.classList.add('hidden');
 newRecordMsg.classList.add('hidden');
 blackOverlay.classList.remove('active'); 
 postVictoryText.classList.remove('force-visible'); 
 secondLineText.classList.remove('fade-in-now');
 finalGlitchScreen.classList.remove('force-visible');

 ship.x = width / 2; ship.y = height / 2;
 mouse.x = width / 2; mouse.y = height / 2;
 gameDifficulty = 1; score = 0; scoreDisplay.innerText = "0";
 
 gsap.killTweensOf("#spaceship");
 gsap.set("#planet-earth", { right: -350 }); 
 spaceshipEl.style.display = 'block'; spaceshipEl.style.visibility = 'visible'; spaceshipEl.style.opacity = 1;
 spaceshipEl.classList.remove('active');
 gameLayer.style.opacity = 1; gameLayer.style.visibility = 'visible';
 updateShip();
}

function disableGame() {
 isGameReady = false; isShipActive = false;

 document.body.classList.remove('game-active');

 gameLayer.style.pointerEvents = "none";
 hud.classList.add('hidden');
 scoreboard.classList.add('hidden');
 document.body.style.overflow = "auto";
}

// --- INPUTS ---
const startThrust = (e) => {
    if (!isGameReady || isCrashed || isLanding) return;
    if(e.cancelable) e.preventDefault(); 
    activateShip(true);
};
const endThrust = (e) => { activateShip(false); };

window.addEventListener('mouseup', endThrust);
window.addEventListener('touchend', endThrust);
window.addEventListener('mousedown', startThrust);
window.addEventListener('touchstart', startThrust, {passive: false});
window.addEventListener('mousemove', e => { if(isGameReady && !isLanding) { mouse.x = e.clientX; mouse.y = e.clientY; } });
window.addEventListener('touchmove', e => { if(isGameReady && !isLanding) { e.preventDefault(); mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; } }, {passive: false});

function activateShip(active) {
    if (!isGameReady || isCrashed || isLanding) {
        isShipActive = false; spaceshipEl.classList.remove('active'); return;
    }
    isShipActive = active;
    const msg = document.getElementById('status-msg');
    const hudPanel = document.querySelector('.hud-panel');
    if (active) {
        spaceshipEl.classList.add('active');
        if(msg) msg.innerText = ">>> IMPULSORES AL MÁXIMO <<<";
        if(hudPanel) hudPanel.classList.add('warning');
    } else {
        spaceshipEl.classList.remove('active');
        if(msg) msg.innerText = "MANTÉN PULSADO PARA IMPULSAR 🚀";
        if(hudPanel) hudPanel.classList.remove('warning');
        if(gameDifficulty > 1) gameDifficulty -= 0.5;
        if(gameDifficulty < 1) gameDifficulty = 1;
    }
}

function updateShip() {
    if (isLanding) return;
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

// --- LOOP ---
const stars = Array(60).fill().map(() => ({ x: Math.random()*width, y: Math.random()*height, speed: Math.random()+0.5 }));
function animate() {
    ctx.fillStyle = isShipActive ? 'rgba(0,0,0,0.2)' : '#050505';
    ctx.fillRect(0, 0, width, height);

   if (isShipActive && isGameReady && !isCrashed && !isLanding) {
        gameDifficulty += 0.002; if(gameDifficulty > 4) gameDifficulty = 4; 
        score += (gameDifficulty * 0.5); scoreDisplay.innerText = Math.floor(score);

        if (score >= 1000 && !isInfiniteModeUnlocked()) {
            startLandingSequence();
        }
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    stars.forEach(s => {
        let speedMult = isLanding ? 2 : (isShipActive ? (10 * gameDifficulty) : 1);
        s.x -= s.speed * speedMult;
        if(s.x < 0) { s.x = width; s.y = Math.random()*height; }
        ctx.beginPath(); 
        if(isShipActive && !isLanding) ctx.fillRect(s.x, s.y, 40 * gameDifficulty, 2);
        else ctx.arc(s.x, s.y, Math.random()*2, 0, Math.PI*2);
        ctx.fill();
    });

    if(isGameReady && !isCrashed) { updateShip(); manageObstacles(); }
    requestAnimationFrame(animate);
}

let obstacles = [];
let frameCount = 0;
function manageObstacles() {
    if (isLanding) {
        obstacles.forEach((o, i) => {
            o.x -= 10; o.el.style.left = o.x+'px'; o.el.style.opacity = 0;
            if(o.x < -150) { o.el.remove(); obstacles.splice(i, 1); }
        });
        return;
    }
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

// --- VICTORIA Y SECUENCIA FINAL DRAMÁTICA ---
function startLandingSequence() {
    isLanding = true; isShipActive = false; 
    hud.classList.add('hidden'); successMsg.classList.remove('hidden');

    localStorage.setItem('infiniteMode', 'true');
    if (missionGoalEl) missionGoalEl.style.display = 'none'; 

    gsap.to("#planet-earth", { right: 80, duration: 4, ease: "power2.out" });
    spaceshipEl.classList.add('active'); 
    spaceshipEl.querySelector('.engine-fire').style.width = '60px'; 
    
    gsap.to(spaceshipEl, {
        x: width - 120, y: height / 2, rotation: 0, scale: 0.1, opacity: 0, 
        duration: 5, ease: "power2.inOut",
        onComplete: () => {
            blackOverlay.classList.add('active'); 
            
            setTimeout(() => {
                successMsg.classList.add('hidden');
                runPostVictorySequence();
            }, 1000);
        }
    });
}

// --- COREOGRAFÍA DEL FINAL META (CORREGIDO EL FADE-IN) ---
function runPostVictorySequence() {
    scoreboard.classList.add('hidden'); 
    
    setTimeout(() => {
        postVictoryText.style.transition = 'opacity 1s ease-in-out';
        postVictoryText.style.opacity = '1';
        postVictoryText.style.pointerEvents = 'auto'; 
        
        setTimeout(() => {
             secondLineText.classList.add('fade-in-now');
        }, 1500);

    }, 1000);
    setTimeout(() => {
        postVictoryText.style.opacity = '0'; 
    }, 6000);
    setTimeout(() => {
        finalGlitchScreen.classList.add('force-visible');
    }, 7000);
    setTimeout(() => {
        finalGlitchScreen.classList.remove('force-visible');
        
        blackOverlay.classList.remove('active');
        
        setTimeout(() => {
            restartGameLoop(); 
        }, 1000);
    }, 11000);
}

function restartGameLoop() {
    isGameReady = false; 
    gameLayer.style.pointerEvents = "none";
    hud.classList.add('hidden');
    scoreboard.classList.add('hidden');
    document.body.style.overflow = "auto"; 
    obstacles.forEach(o => o.el.remove()); obstacles = []; 
    isCrashed = false; isLanding = false;
    postVictoryText.style.opacity = '0'; 
    postVictoryText.style.pointerEvents = 'none';
    secondLineText.classList.remove('fade-in-now');

    // SCROLL
    window.scrollTo({ top: 0, behavior: 'auto' });
    gsap.set("#planet-earth", { right: -350 }); 
    gsap.set(spaceshipEl, { scale: 1, opacity: 1, rotation: 0 });
    ScrollTrigger.refresh();
}

// --- CRASH ---

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
            setTimeout(() => crashScreen.classList.add('active'), 50);
        }
        setTimeout(() => {
            crashScreen.classList.remove('active');
            newRecordMsg.classList.add('hidden');
            crashScreen.classList.add('hidden');
            window.scrollTo({ top: 0, behavior: 'auto' });
            isGameReady = false;
            gameLayer.style.pointerEvents = "none";
            hud.classList.add('hidden');
            scoreboard.classList.add('hidden');
            document.body.style.overflow = "auto";
            obstacles.forEach(o => o.el.remove());
            obstacles = [];
            isCrashed = false;
            ScrollTrigger.refresh();
        }, 3500); 
    }, 800);
}

animate();