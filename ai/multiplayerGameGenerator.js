/**
 * Specialized 2-Player HTML5 Canvas Multiplayer Game Generator
 * Guarantees 100% playable, rich, 60FPS 2-Player games with:
 * - Real-time Bot AI vs Local 2-Player mode switching (window.MP)
 * - Dual Keyboard Controls (P1: WASD+Space • P2: Arrows+Enter)
 * - Dual Split-Screen Touch & Pointer Drag Controls (P1: Left Screen • P2: Right Screen)
 * - Delta-Time (dt) scaling for 60FPS smooth physics
 * - Infinite Level Progression Loop (Level 1 ➔ ∞) with dynamic scaling
 * - 8-Bit ZzFX Sound Effects & Particle FX
 */

export function generateProcedural2PGame(prompt) {
  const p = (prompt || '').toLowerCase();

  if (p.includes('bike') || p.includes('chase') || p.includes('race') || p.includes('racing') || p.includes('highway') || p.includes('moto') || p.includes('car') || p.includes('drive') || p.includes('speed') || p.includes('kart')) {
    return build2PBikeChaseRacingGame(prompt);
  } else if (p.includes('volley') || p.includes('soccer') || p.includes('football') || p.includes('jump') || p.includes('smash') || p.includes('ball sports') || p.includes('basketball')) {
    return build2PVolleySoccerGame(prompt);
  } else if (p.includes('pong') || p.includes('hockey') || p.includes('tennis') || p.includes('paddle') || p.includes('air hockey')) {
    return build2PPongHockeyGame(prompt);
  } else if (p.includes('tron') || p.includes('lightcycle') || p.includes('cycle') || p.includes('snake') || p.includes('trail') || p.includes('maze')) {
    return build2PLightcycleGridGame(prompt);
  } else if (p.includes('wizard') || p.includes('magic') || p.includes('spell') || p.includes('arcane') || p.includes('elemental') || p.includes('mage')) {
    return build2PWizardDuelGame(prompt);
  } else if (p.includes('sword') || p.includes('ninja') || p.includes('fight') || p.includes('brawl') || p.includes('boxing') || p.includes('sumo') || p.includes('punch')) {
    return build2PBrawlerDuelGame(prompt);
  } else {
    return build2PArenaCombatGame(prompt);
  }
}

/**
 * 1. ARENA COMBAT (Spaceships / Tanks / Laser Gunners / Cyber Warriors)
 */
function build2PArenaCombatGame(prompt) {
  const title = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
  return `
// 2-Player Arena Duel: ${title}
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.tabIndex = 0;

let currentLevel = 1;
let gameStarted = false;
let gameOver = false;
let winner = '';

let lastTime = performance.now();
const p1 = { x: 120, y: canvas.height / 2, angle: 0, vx: 0, vy: 0, hp: 100, maxHp: 100, color: '#38bdf8', cooldown: 0, radius: 18 };
const p2 = { x: canvas.width - 120, y: canvas.height / 2, angle: Math.PI, vx: 0, vy: 0, hp: 75, maxHp: 75, color: '#f43f5e', cooldown: 0, radius: 18 };

const bullets = [];
const particles = [];
let botShootTimer = 0;

function applyLevelSettings() {
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    p2.maxHp = Math.min(180, 70 + (currentLevel - 1) * 15);
    p2.turnSpeed = Math.min(0.065, 0.024 + (currentLevel - 1) * 0.006);
    p2.fireDelay = Math.max(14, 48 - (currentLevel - 1) * 5);
    p2.thrustPower = Math.min(0.48, 0.28 + (currentLevel - 1) * 0.03);
  } else {
    p2.maxHp = 100; p2.turnSpeed = 0.06; p2.fireDelay = 14; p2.thrustPower = 0.48;
  }
  p1.hp = p1.maxHp;
  p2.hp = p2.maxHp;
}

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.key) keys[e.key.toLowerCase()] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (!gameStarted) startGame();
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.key) keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('pointerdown', e => {
  canvas.focus({ preventScroll: true });
  if (!gameStarted) { startGame(); return; }
  if (gameOver) { handleGameOverClick(); return; }
  handleTouch(e, true);
});

canvas.addEventListener('pointermove', e => {
  if (gameStarted && e.buttons > 0) handleTouch(e, false);
});

function handleTouch(e, isTap) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (x < canvas.width / 2) {
    p1.angle = Math.atan2(y - p1.y, x - p1.x);
    p1.vx += Math.cos(p1.angle) * 0.45;
    p1.vy += Math.sin(p1.angle) * 0.45;
    if (isTap) shoot(p1, true);
  } else if (!window.MP || !window.MP.isBot) {
    p2.angle = Math.atan2(y - p2.y, x - p2.x);
    p2.vx += Math.cos(p2.angle) * 0.45;
    p2.vy += Math.sin(p2.angle) * 0.45;
    if (isTap) shoot(p2, false);
  }
}

function startGame() {
  gameStarted = true;
  applyLevelSettings();
  if (window.playSound) window.playSound('click');
}

function handleGameOverClick() {
  if (winner.includes('1') || winner.includes('CLEARED')) {
    currentLevel++;
  }
  p1.x = 120; p1.y = canvas.height / 2; p1.vx = 0; p1.vy = 0; p1.angle = 0;
  p2.x = canvas.width - 120; p2.y = canvas.height / 2; p2.vx = 0; p2.vy = 0; p2.angle = Math.PI;
  bullets.length = 0;
  gameOver = false;
  winner = '';
  applyLevelSettings();
}

function shoot(player, isP1) {
  if (player.cooldown > 0) return;
  player.cooldown = 14;
  const speed = 9.5;
  bullets.push({
    x: player.x + Math.cos(player.angle) * 22,
    y: player.y + Math.sin(player.angle) * 22,
    vx: Math.cos(player.angle) * speed,
    vy: Math.sin(player.angle) * speed,
    color: player.color, isP1, life: 60
  });
  if (window.playSound) window.playSound('shoot');
}

function update(dt) {
  if (!gameStarted || gameOver) return;

  // P1 Controls (WASD + Space)
  if (keys['KeyA'] || keys['a']) p1.angle -= 0.06;
  if (keys['KeyD'] || keys['d']) p1.angle += 0.06;
  if (keys['KeyW'] || keys['w']) { p1.vx += Math.cos(p1.angle) * 0.48; p1.vy += Math.sin(p1.angle) * 0.48; }
  if (keys['KeyS'] || keys['s']) { p1.vx *= 0.90; p1.vy *= 0.90; }
  if (keys['Space'] || keys[' ']) shoot(p1, true);

  // Dynamic Bot vs Player 2 Keys (Evaluated dynamically on EVERY frame)
  const isBot = (!window.MP || window.MP.isBot);
  if (isBot) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - p2.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    p2.angle += Math.sign(diff) * Math.min(Math.abs(diff), p2.turnSpeed || 0.025);
    const dist = Math.hypot(dx, dy);
    if (dist > 180) {
      p2.vx += Math.cos(p2.angle) * (p2.thrustPower || 0.28);
      p2.vy += Math.sin(p2.angle) * (p2.thrustPower || 0.28);
    }
    botShootTimer++;
    if (botShootTimer > (p2.fireDelay || 40) && Math.abs(diff) < 0.28 && dist < 420) {
      botShootTimer = 0;
      shoot(p2, false);
    }
  } else {
    // Local 2-Player (Arrow Keys + Enter / M)
    if (keys['ArrowLeft'] || keys['arrowleft']) p2.angle -= 0.06;
    if (keys['ArrowRight'] || keys['arrowright']) p2.angle += 0.06;
    if (keys['ArrowUp'] || keys['arrowup']) { p2.vx += Math.cos(p2.angle) * 0.48; p2.vy += Math.sin(p2.angle) * 0.48; }
    if (keys['ArrowDown'] || keys['arrowdown']) { p2.vx *= 0.90; p2.vy *= 0.90; }
    if (keys['Enter'] || keys['enter'] || keys['KeyM'] || keys['m']) shoot(p2, false);
  }

  const dtScale = dt * 60;
  [p1, p2].forEach(p => {
    p.vx *= 0.96; p.vy *= 0.96;
    p.x += p.vx * dtScale; p.y += p.vy * dtScale;
    if (p.cooldown > 0) p.cooldown--;
    if (p.x < 20) { p.x = 20; p.vx *= -0.5; }
    if (p.x > canvas.width - 20) { p.x = canvas.width - 20; p.vx *= -0.5; }
    if (p.y < 20) { p.y = 20; p.vy *= -0.5; }
    if (p.y > canvas.height - 20) { p.y = canvas.height - 20; p.vy *= -0.5; }
  });

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dtScale; b.y += b.vy * dtScale;
    b.life--;
    const target = b.isP1 ? p2 : p1;
    if (Math.hypot(b.x - target.x, b.y - target.y) < target.radius + 6) {
      target.hp -= 25;
      createSparks(b.x, b.y, b.color);
      bullets.splice(i, 1);
      if (window.playSound) window.playSound('hit');
      if (target.hp <= 0) {
        target.hp = 0; gameOver = true;
        winner = b.isP1 ? (isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'PLAYER 1 WINS!') : (isBot ? 'COMPUTER WINS THIS ROUND!' : 'PLAYER 2 WINS!');
        if (window.playSound) window.playSound(b.isP1 ? 'win' : 'explosion');
      }
      continue;
    }
    if (b.life <= 0 || b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx * dtScale; pt.y += pt.vy * dtScale;
    pt.life -= 0.04;
    if (pt.life <= 0) particles.splice(i, 1);
  }
}

function createSparks(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, r: Math.random() * 3 + 1, life: 1, color });
  }
}

function drawEntity(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(22, 0); ctx.lineTo(-14, -14); ctx.lineTo(-6, 0); ctx.lineTo(-14, 14); ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function draw() {
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  for (const b of bullets) {
    ctx.strokeStyle = b.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 1.5, b.y - b.vy * 1.5); ctx.stroke();
  }

  drawEntity(p1);
  drawEntity(p2);

  for (const pt of particles) {
    ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : '2-PLAYER ARENA', canvas.width / 2, 25);

  drawHPBar(30, 25, p1.hp, p1.maxHp, p1.color, 'P1: WASD+Space / Left Touch');
  const p2Title = isBot ? 'BOT LVL ' + currentLevel : 'P2: ARROWS+Enter / Right Touch';
  drawHPBar(canvas.width - 190, 25, p2.hp, p2.maxHp, p2.color, p2Title);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('${title.toUpperCase()}', canvas.width / 2, canvas.height / 2 - 25);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK / TOUCH TO PLAY', canvas.width / 2, canvas.height / 2 + 20);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = winner.includes('CLEARED') || winner.includes('1') ? '#22c55e' : '#f43f5e';
    ctx.textAlign = 'center';
    ctx.fillText(winner, canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    const actionText = isBot 
      ? (winner.includes('CLEARED') ? 'CLICK TO ADVANCE TO LEVEL ' + (currentLevel + 1) + ' →' : 'CLICK TO RETRY LEVEL ' + currentLevel + ' ↺')
      : 'CLICK TO REMATCH';
    ctx.fillText(actionText, canvas.width / 2, canvas.height / 2 + 25);
  }
}

function drawHPBar(x, y, hp, maxHp, color, label) {
  ctx.fillStyle = '#1e293b'; ctx.fillRect(x, y, 160, 14);
  ctx.fillStyle = color; ctx.fillRect(x, y, (Math.max(0, hp) / (maxHp || 100)) * 160, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.strokeRect(x, y, 160, 14);
  ctx.font = '10px monospace'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 5);
}

function loop(now = performance.now()) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`;
}

/**
 * 2. AIR HOCKEY / PONG / PADDLES
 */
function build2PPongHockeyGame(prompt) {
  const title = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
  return `
// 2-Player Air Hockey / Pong: ${title}
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.tabIndex = 0;

let currentLevel = 1;
let gameStarted = false;
let score1 = 0;
let score2 = 0;
const winningScore = 3;
let gameOver = false;
let winner = '';

let lastTime = performance.now();
const p1 = { x: 30, y: canvas.height / 2 - 50, w: 16, h: 105, speed: 9.5, color: '#00f0ff' };
const p2 = { x: canvas.width - 46, y: canvas.height / 2 - 50, w: 16, h: 100, speed: 3.6, color: '#f43f5e' };
const ball = { x: canvas.width / 2, y: canvas.height / 2, r: 10, vx: 0, vy: 0, speed: 5.2, color: '#fbbf24' };
const particles = [];
let botMistakeTimer = 0;
let botOffset = 0;

function applyLevelSettings() {
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    p2.speed = Math.min(8.8, 3.4 + (currentLevel - 1) * 0.55);
    ball.speed = Math.min(10.5, 5.0 + (currentLevel - 1) * 0.45);
  } else {
    p2.speed = p1.speed;
    ball.speed = 6.5;
  }
}

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.key) keys[e.key.toLowerCase()] = true;
  if (['ArrowUp', 'ArrowDown', 'Space', ' '].includes(e.key) || ['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (!gameStarted) startGame();
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.key) keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('pointerdown', e => {
  canvas.focus({ preventScroll: true });
  if (!gameStarted) { startGame(); return; }
  if (gameOver) { handleGameOverClick(); return; }
  handlePointer(e);
});

canvas.addEventListener('pointermove', e => {
  if (gameStarted && e.buttons > 0) handlePointer(e);
});

function handlePointer(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (x < canvas.width / 2) {
    p1.y = y - p1.h / 2;
  } else if (!window.MP || !window.MP.isBot) {
    p2.y = y - p2.h / 2;
  }
}

function startGame() {
  gameStarted = true;
  applyLevelSettings();
  if (window.playSound) window.playSound('click');
  resetBall(true);
}

function handleGameOverClick() {
  if (winner.includes('1') || winner.includes('CLEARED')) {
    currentLevel++;
  }
  score1 = 0; score2 = 0;
  gameOver = false; winner = '';
  applyLevelSettings();
  resetBall(true);
}

function resetBall(servingToP1) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.vx = (servingToP1 ? -1 : 1) * ball.speed;
  ball.vy = (Math.random() * 3.5 - 1.75);
}

function update(dt) {
  if (!gameStarted || gameOver) return;

  const dtScale = dt * 60;
  if (keys['KeyW'] || keys['w']) p1.y -= p1.speed * dtScale;
  if (keys['KeyS'] || keys['s']) p1.y += p1.speed * dtScale;
  p1.y = Math.max(10, Math.min(canvas.height - p1.h - 10, p1.y));

  const isBot = (!window.MP || window.MP.isBot);
  if (isBot) {
    botMistakeTimer++;
    const maxOffset = Math.max(8, 55 - (currentLevel - 1) * 8);
    if (botMistakeTimer > 45) {
      botMistakeTimer = 0;
      botOffset = (Math.random() - 0.5) * maxOffset;
    }
    if (ball.vx > 0) {
      const targetY = ball.y - p2.h / 2 + botOffset;
      if (p2.y < targetY - 14) p2.y += p2.speed * dtScale;
      else if (p2.y > targetY + 14) p2.y -= p2.speed * dtScale;
    }
  } else {
    if (keys['ArrowUp'] || keys['arrowup']) p2.y -= p2.speed * dtScale;
    if (keys['ArrowDown'] || keys['arrowdown']) p2.y += p2.speed * dtScale;
  }
  p2.y = Math.max(10, Math.min(canvas.height - p2.h - 10, p2.y));

  ball.x += ball.vx * dtScale; ball.y += ball.vy * dtScale;

  if (ball.y - ball.r <= 0) { ball.y = ball.r; ball.vy *= -1; if (window.playSound) window.playSound('click'); }
  if (ball.y + ball.r >= canvas.height) { ball.y = canvas.height - ball.r; ball.vy *= -1; if (window.playSound) window.playSound('click'); }

  if (ball.x - ball.r <= p1.x + p1.w && ball.x + ball.r >= p1.x && ball.y >= p1.y - 5 && ball.y <= p1.y + p1.h + 5 && ball.vx < 0) {
    ball.vx = Math.abs(ball.vx) * 1.04;
    ball.vy = ((ball.y - (p1.y + p1.h / 2)) / (p1.h / 2)) * 6.0;
    ball.x = p1.x + p1.w + ball.r;
    createSparks(ball.x, ball.y, '#00f0ff');
    if (window.playSound) window.playSound('hit');
  }

  if (ball.x + ball.r >= p2.x && ball.x - ball.r <= p2.x + p2.w && ball.y >= p2.y - 5 && ball.y <= p2.y + p2.h + 5 && ball.vx > 0) {
    ball.vx = -Math.abs(ball.vx) * 1.04;
    ball.vy = ((ball.y - (p2.y + p2.h / 2)) / (p2.h / 2)) * 6.0;
    ball.x = p2.x - ball.r;
    createSparks(ball.x, ball.y, '#f43f5e');
    if (window.playSound) window.playSound('hit');
  }

  if (ball.x < 0) {
    score2++;
    if (window.playSound) window.playSound('powerup');
    if (score2 >= winningScore) {
      gameOver = true; winner = isBot ? 'COMPUTER WINS THIS ROUND!' : 'PLAYER 2 WINS!';
      if (window.playSound) window.playSound('gameover');
    } else resetBall(false);
  } else if (ball.x > canvas.width) {
    score1++;
    if (window.playSound) window.playSound('powerup');
    if (score1 >= winningScore) {
      gameOver = true; winner = isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'PLAYER 1 WINS!';
      if (window.playSound) window.playSound('win');
    } else resetBall(true);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dtScale; p.y += p.vy * dtScale;
    p.life -= 0.03;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function createSparks(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, r: Math.random() * 3 + 1, life: 1, color });
  }
}

function draw() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 4;
  ctx.setLineDash([12, 12]);
  ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = p1.color; ctx.shadowColor = p1.color; ctx.shadowBlur = 15;
  ctx.fillRect(p1.x, p1.y, p1.w, p1.h);

  ctx.fillStyle = p2.color; ctx.shadowColor = p2.color; ctx.shadowBlur = 15;
  ctx.fillRect(p2.x, p2.y, p2.w, p2.h);

  if (gameStarted) {
    ctx.fillStyle = ball.color; ctx.shadowColor = ball.color; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  for (const p of particles) {
    ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#facc15'; ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : '2-PLAYER DUEL', canvas.width / 2, 25);

  ctx.font = 'bold 36px monospace'; ctx.fillStyle = '#00f0ff';
  ctx.fillText(score1, canvas.width / 2 - 70, 60);
  ctx.fillStyle = '#f43f5e';
  ctx.fillText(score2, canvas.width / 2 + 70, 60);

  ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#94a3b8';
  ctx.fillText('P1: [W/S] or Left Drag', 30, 25);
  const p2Label = isBot ? 'BOT (LVL ' + currentLevel + ')' : 'P2: [ARROWS] or Right Drag';
  ctx.textAlign = 'right'; ctx.fillText(p2Label, canvas.width - 30, 25);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#38bdf8'; ctx.textAlign = 'center';
    ctx.fillText('${title.toUpperCase()}', canvas.width / 2, canvas.height / 2 - 25);
    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK / TOUCH TO PLAY', canvas.width / 2, canvas.height / 2 + 20);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = winner.includes('1') || winner.includes('CLEARED') ? '#22c55e' : '#f43f5e';
    ctx.textAlign = 'center'; ctx.fillText(winner, canvas.width / 2, canvas.height / 2 - 25);

    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    const actionText = isBot 
      ? (winner.includes('CLEARED') ? 'CLICK TO ADVANCE TO LEVEL ' + (currentLevel + 1) + ' →' : 'CLICK TO RETRY LEVEL ' + currentLevel + ' ↺')
      : 'CLICK TO PLAY NEXT ROUND';
    ctx.fillText(actionText, canvas.width / 2, canvas.height / 2 + 25);
  }
}

function loop(now = performance.now()) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`;
}

/**
 * 3. VOLLEYBALL / SOCCER / SMASH
 */
function build2PVolleySoccerGame(prompt) {
  const title = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
  return `
// 2-Player Volleyball / Soccer: ${title}
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.tabIndex = 0;

let currentLevel = 1;
let gameStarted = false;
let score1 = 0;
let score2 = 0;
const winningScore = 3;
let gameOver = false;
let winner = '';

let lastTime = performance.now();
const groundY = canvas.height - 30;
const net = { x: canvas.width / 2 - 6, y: canvas.height - 130, w: 12, h: 130 };

const p1 = { x: 140, y: groundY, r: 40, vx: 0, vy: 0, isGrounded: true, color: '#38bdf8' };
const p2 = { x: canvas.width - 140, y: groundY, r: 40, vx: 0, vy: 0, isGrounded: true, color: '#ec4899' };
const ball = { x: 140, y: 160, vx: 0, vy: 0, r: 18, color: '#fbbf24' };
const particles = [];

function applyLevelSettings() {
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    p2.speed = Math.min(7.5, 3.8 + (currentLevel - 1) * 0.45);
    p2.jumpPower = Math.min(14, 10 + (currentLevel - 1) * 0.6);
  } else {
    p2.speed = 6.5; p2.jumpPower = 12.5;
  }
}

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.key) keys[e.key.toLowerCase()] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key) || ['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (!gameStarted) startGame();
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.key) keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('pointerdown', e => {
  canvas.focus({ preventScroll: true });
  if (!gameStarted) { startGame(); return; }
  if (gameOver) { handleGameOverClick(); return; }
  handleTouch(e, true);
});

canvas.addEventListener('pointermove', e => {
  if (gameStarted && e.buttons > 0) handleTouch(e, false);
});

function handleTouch(e, isTap) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (x < canvas.width / 2) {
    p1.x = Math.max(50, Math.min(net.x - p1.r, x));
    if (isTap && p1.isGrounded) { p1.vy = -13; p1.isGrounded = false; if (window.playSound) window.playSound('jump'); }
  } else if (!window.MP || !window.MP.isBot) {
    p2.x = Math.max(net.x + net.w + p2.r, Math.min(canvas.width - 50, x));
    if (isTap && p2.isGrounded) { p2.vy = -13; p2.isGrounded = false; if (window.playSound) window.playSound('jump'); }
  }
}

function startGame() {
  gameStarted = true;
  applyLevelSettings();
  serveBall(true);
  if (window.playSound) window.playSound('click');
}

function serveBall(toP1) {
  ball.x = toP1 ? 160 : canvas.width - 160;
  ball.y = 140;
  ball.vx = (toP1 ? 1 : -1) * 2.5;
  ball.vy = -2;
}

function handleGameOverClick() {
  if (winner.includes('1') || winner.includes('CLEARED')) {
    currentLevel++;
  }
  score1 = 0; score2 = 0;
  gameOver = false; winner = '';
  applyLevelSettings();
  serveBall(true);
}

function update(dt) {
  if (!gameStarted || gameOver) return;

  const dtScale = dt * 60;
  if (keys['KeyA'] || keys['a']) p1.x -= 6.5 * dtScale;
  if (keys['KeyD'] || keys['d']) p1.x += 6.5 * dtScale;
  if ((keys['KeyW'] || keys['w'] || keys['Space'] || keys[' ']) && p1.isGrounded) {
    p1.vy = -13; p1.isGrounded = false;
    if (window.playSound) window.playSound('jump');
  }

  const isBot = (!window.MP || window.MP.isBot);
  if (isBot) {
    if (ball.x > net.x) {
      const targetX = ball.x + (ball.vx * 10);
      const spd = (p2.speed || 4.5) * dtScale;
      if (p2.x < targetX - 8) p2.x += spd;
      else if (p2.x > targetX + 8) p2.x -= spd;
      if (ball.y > groundY - 140 && Math.abs(ball.x - p2.x) < 45 && p2.isGrounded && Math.random() < 0.75) {
        p2.vy = -(p2.jumpPower || 11); p2.isGrounded = false;
        if (window.playSound) window.playSound('jump');
      }
    } else {
      const restX = canvas.width - 160;
      if (p2.x < restX - 10) p2.x += 3 * dtScale;
      else if (p2.x > restX + 10) p2.x -= 3 * dtScale;
    }
  } else {
    if (keys['ArrowLeft'] || keys['arrowleft']) p2.x -= 6.5 * dtScale;
    if (keys['ArrowRight'] || keys['arrowright']) p2.x += 6.5 * dtScale;
    if ((keys['ArrowUp'] || keys['arrowup'] || keys['Enter'] || keys['enter']) && p2.isGrounded) {
      p2.vy = -13; p2.isGrounded = false;
      if (window.playSound) window.playSound('jump');
    }
  }

  [p1, p2].forEach(p => {
    p.vy += 0.65 * dtScale;
    p.y += p.vy * dtScale;
    if (p.y >= groundY) { p.y = groundY; p.vy = 0; p.isGrounded = true; }
  });

  p1.x = Math.max(p1.r + 10, Math.min(net.x - p1.r, p1.x));
  p2.x = Math.max(net.x + net.w + p2.r, Math.min(canvas.width - p2.r - 10, p2.x));

  ball.vy += 0.40 * dtScale;
  ball.x += ball.vx * dtScale; ball.y += ball.vy * dtScale;

  if (ball.x - ball.r <= 10) { ball.x = 10 + ball.r; ball.vx = Math.abs(ball.vx) * 0.85; }
  if (ball.x + ball.r >= canvas.width - 10) { ball.x = canvas.width - 10 - ball.r; ball.vx = -Math.abs(ball.vx) * 0.85; }

  if (ball.x + ball.r >= net.x && ball.x - ball.r <= net.x + net.w && ball.y + ball.r >= net.y) {
    ball.vx *= -0.85;
    if (ball.x < canvas.width / 2) ball.x = net.x - ball.r;
    else ball.x = net.x + net.w + ball.r;
    if (window.playSound) window.playSound('click');
  }

  [p1, p2].forEach(p => {
    const dx = ball.x - p.x; const dy = ball.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < p.r + ball.r && ball.y <= p.y) {
      const angle = Math.atan2(dy, dx);
      const hitSpeed = 11;
      ball.vx = Math.cos(angle) * hitSpeed;
      ball.vy = Math.sin(angle) * hitSpeed - 3;
      createSparks(ball.x, ball.y, p.color);
      if (window.playSound) window.playSound('hit');
    }
  });

  if (ball.y + ball.r >= groundY) {
    if (ball.x < canvas.width / 2) {
      score2++;
      if (window.playSound) window.playSound('powerup');
      if (score2 >= winningScore) {
        gameOver = true; winner = isBot ? 'COMPUTER WINS THIS ROUND!' : 'PLAYER 2 WINS!';
        if (window.playSound) window.playSound('gameover');
      } else serveBall(true);
    } else {
      score1++;
      if (window.playSound) window.playSound('powerup');
      if (score1 >= winningScore) {
        gameOver = true; winner = isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'PLAYER 1 WINS!';
        if (window.playSound) window.playSound('win');
      } else serveBall(false);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx * dtScale; pt.y += pt.vy * dtScale;
    pt.life -= 0.04;
    if (pt.life <= 0) particles.splice(i, 1);
  }
}

function createSparks(x, y, color) {
  for (let i = 0; i < 14; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, r: Math.random() * 3 + 1, life: 1, color });
  }
}

function draw() {
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1e293b'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.strokeRect(0, groundY, canvas.width, canvas.height - groundY);

  ctx.fillStyle = '#94a3b8'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
  ctx.fillRect(net.x, net.y, net.w, net.h); ctx.shadowBlur = 0;

  [p1, p2].forEach(p => {
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, Math.PI, 0, false); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
  });

  ctx.fillStyle = ball.color; ctx.shadowColor = ball.color; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

  for (const pt of particles) {
    ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#facc15'; ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : '2-PLAYER MATCH', canvas.width / 2, 25);

  ctx.font = 'bold 36px monospace'; ctx.fillStyle = '#38bdf8';
  ctx.fillText(score1, canvas.width / 2 - 80, 60);
  ctx.fillStyle = '#ec4899';
  ctx.fillText(score2, canvas.width / 2 + 80, 60);

  ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#94a3b8';
  ctx.fillText('P1: [A/D+W] or Left Drag/Tap', 30, 25);
  const p2Title = isBot ? 'BOT LVL ' + currentLevel : 'P2: [ARROWS] or Right Drag/Tap';
  ctx.textAlign = 'right'; ctx.fillText(p2Title, canvas.width - 30, 25);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#38bdf8'; ctx.textAlign = 'center';
    ctx.fillText('${title.toUpperCase()}', canvas.width / 2, canvas.height / 2 - 25);
    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK / TOUCH TO START', canvas.width / 2, canvas.height / 2 + 20);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = winner.includes('CLEARED') || winner.includes('1') ? '#22c55e' : '#f43f5e';
    ctx.textAlign = 'center'; ctx.fillText(winner, canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    const actionText = isBot 
      ? (winner.includes('CLEARED') ? 'CLICK TO ADVANCE TO LEVEL ' + (currentLevel + 1) + ' →' : 'CLICK TO RETRY LEVEL ' + currentLevel + ' ↺')
      : 'CLICK TO REMATCH';
    ctx.fillText(actionText, canvas.width / 2, canvas.height / 2 + 25);
  }
}

function loop(now = performance.now()) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`;
}

/**
 * 4. LIGHTCYCLES / GRID DUEL
 */
function build2PLightcycleGridGame(prompt) {
  const title = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
  return `
// 2-Player Grid Duel: ${title}
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.tabIndex = 0;

let currentLevel = 1;
let gameStarted = false;
let gameOver = false;
let winner = '';

let lastTime = performance.now();
const p1 = { x: 120, y: canvas.height / 2, dx: 4, dy: 0, color: '#22c55e', trail: [] };
const p2 = { x: canvas.width - 120, y: canvas.height / 2, dx: -3.2, dy: 0, color: '#a855f7', trail: [] };

function applyLevelSettings() {
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    p2.baseSpeed = Math.min(5.5, 3.0 + (currentLevel - 1) * 0.35);
    p2.lookAhead = Math.min(14, 4 + (currentLevel - 1) * 1.5);
  } else {
    p2.baseSpeed = 4.0; p2.lookAhead = 6;
  }
}

window.addEventListener('keydown', e => {
  const k = e.key ? e.key.toLowerCase() : '';
  if (!gameStarted) startGame();

  if ((e.code === 'KeyW' || k === 'w') && p1.dy === 0) { p1.dx = 0; p1.dy = -4; }
  if ((e.code === 'KeyS' || k === 's') && p1.dy === 0) { p1.dx = 0; p1.dy = 4; }
  if ((e.code === 'KeyA' || k === 'a') && p1.dx === 0) { p1.dx = -4; p1.dy = 0; }
  if ((e.code === 'KeyD' || k === 'd') && p1.dx === 0) { p1.dx = 4; p1.dy = 0; }

  const isBot = !window.MP || window.MP.isBot;
  if (!isBot) {
    const spd = 4;
    if ((e.code === 'ArrowUp' || k === 'arrowup') && p2.dy === 0) { p2.dx = 0; p2.dy = -spd; }
    if ((e.code === 'ArrowDown' || k === 'arrowdown') && p2.dy === 0) { p2.dx = 0; p2.dy = spd; }
    if ((e.code === 'ArrowLeft' || k === 'arrowleft') && p2.dx === 0) { p2.dx = -spd; p2.dy = 0; }
    if ((e.code === 'ArrowRight' || k === 'arrowright') && p2.dx === 0) { p2.dx = spd; p2.dy = 0; }
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
});

let touchStartX = 0; let touchStartY = 0;
canvas.addEventListener('pointerdown', e => {
  canvas.focus({ preventScroll: true });
  if (!gameStarted) { startGame(); return; }
  if (gameOver) { handleGameOverClick(); return; }
  const rect = canvas.getBoundingClientRect();
  touchStartX = (e.clientX - rect.left) * (canvas.width / rect.width);
  touchStartY = (e.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener('pointerup', e => {
  if (!gameStarted || gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const diffX = (e.clientX - rect.left) * (canvas.width / rect.width) - touchStartX;
  const diffY = (e.clientY - rect.top) * (canvas.height / rect.height) - touchStartY;
  
  if (Math.hypot(diffX, diffY) > 20) {
    if (touchStartX < canvas.width / 2) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && p1.dx === 0) { p1.dx = 4; p1.dy = 0; }
        else if (diffX < 0 && p1.dx === 0) { p1.dx = -4; p1.dy = 0; }
      } else {
        if (diffY > 0 && p1.dy === 0) { p1.dx = 0; p1.dy = 4; }
        else if (diffY < 0 && p1.dy === 0) { p1.dx = 0; p1.dy = -4; }
      }
    } else if (!window.MP || !window.MP.isBot) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && p2.dx === 0) { p2.dx = 4; p2.dy = 0; }
        else if (diffX < 0 && p2.dx === 0) { p2.dx = -4; p2.dy = 0; }
      } else {
        if (diffY > 0 && p2.dy === 0) { p2.dx = 0; p2.dy = 4; }
        else if (diffY < 0 && p2.dy === 0) { p2.dx = 0; p2.dy = -4; }
      }
    }
  }
});

function startGame() {
  gameStarted = true;
  applyLevelSettings();
  if (window.playSound) window.playSound('click');
}

function handleGameOverClick() {
  if (winner.includes('1') || winner.includes('CLEARED')) {
    currentLevel++;
  }
  p1.x = 120; p1.y = canvas.height / 2; p1.dx = 4; p1.dy = 0; p1.trail = [];
  p2.x = canvas.width - 120; p2.y = canvas.height / 2; p2.dx = -(p2.baseSpeed || 3.2); p2.dy = 0; p2.trail = [];
  gameOver = false; winner = '';
  applyLevelSettings();
}

function checkCollision(pt) {
  if (pt.x <= 10 || pt.x >= canvas.width - 10 || pt.y <= 10 || pt.y >= canvas.height - 10) return true;
  for (let i = 0; i < p1.trail.length - 2; i++) {
    if (Math.hypot(pt.x - p1.trail[i].x, pt.y - p1.trail[i].y) < 4) return true;
  }
  for (let i = 0; i < p2.trail.length - 2; i++) {
    if (Math.hypot(pt.x - p2.trail[i].x, pt.y - p2.trail[i].y) < 4) return true;
  }
  return false;
}

let botCounter = 0;

function update(dt) {
  if (!gameStarted || gameOver) return;

  const dtScale = dt * 60;
  const isBot = (!window.MP || window.MP.isBot);
  if (isBot) {
    botCounter++;
    const lookAhead = p2.lookAhead || 5;
    const spd = (p2.baseSpeed || 3.2);
    const nextX = p2.x + Math.sign(p2.dx) * spd * lookAhead;
    const nextY = p2.y + Math.sign(p2.dy) * spd * lookAhead;
    
    if (checkCollision({ x: nextX, y: nextY }) || (botCounter > 65 && Math.random() < 0.22)) {
      botCounter = 0;
      const turns = p2.dx !== 0 ? [{ dx: 0, dy: -spd }, { dx: 0, dy: spd }] : [{ dx: -spd, dy: 0 }, { dx: spd, dy: 0 }];
      const validTurns = turns.filter(t => !checkCollision({ x: p2.x + t.dx * 8, y: p2.y + t.dy * 8 }));
      if (validTurns.length > 0) {
        const choice = validTurns[Math.floor(Math.random() * validTurns.length)];
        p2.dx = choice.dx; p2.dy = choice.dy;
      }
    }
  }

  p1.trail.push({ x: p1.x, y: p1.y });
  p2.trail.push({ x: p2.x, y: p2.y });
  p1.x += p1.dx * dtScale; p1.y += p1.dy * dtScale;
  p2.x += p2.dx * dtScale; p2.y += p2.dy * dtScale;

  const p1Dead = checkCollision(p1);
  const p2Dead = checkCollision(p2);

  if (p1Dead && p2Dead) {
    gameOver = true; winner = 'DOUBLE CRASH! DRAW!';
    if (window.playSound) window.playSound('explosion');
  } else if (p1Dead) {
    gameOver = true; winner = isBot ? 'COMPUTER WINS THIS ROUND!' : 'PLAYER 2 WINS!';
    if (window.playSound) window.playSound('gameover');
  } else if (p2Dead) {
    gameOver = true; winner = isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'PLAYER 1 WINS!';
    if (window.playSound) window.playSound('win');
  }
}

function draw() {
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  ctx.lineWidth = 4;
  ctx.strokeStyle = p1.color; ctx.shadowColor = p1.color; ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i < p1.trail.length; i++) {
    const pt = p1.trail[i]; if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();

  ctx.strokeStyle = p2.color; ctx.shadowColor = p2.color; ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i < p2.trail.length; i++) {
    const pt = p2.trail[i]; if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(p1.x - 4, p1.y - 4, 8, 8);
  ctx.fillRect(p2.x - 4, p2.y - 4, 8, 8);

  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#facc15'; ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : 'GRID DUEL', canvas.width / 2, 30);

  ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = p1.color;
  ctx.fillText('P1: [W/A/S/D] or Left Swipe', 30, 30);
  const p2Text = isBot ? 'BOT LVL ' + currentLevel : 'P2: [ARROWS] or Right Swipe';
  ctx.textAlign = 'right'; ctx.fillStyle = p2.color; ctx.fillText(p2Text, canvas.width - 30, 30);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#22c55e'; ctx.textAlign = 'center';
    ctx.fillText('${title.toUpperCase()}', canvas.width / 2, canvas.height / 2 - 25);
    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK / SWIPE TO START', canvas.width / 2, canvas.height / 2 + 20);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = winner.includes('CLEARED') || winner.includes('1') ? '#22c55e' : '#f43f5e';
    ctx.textAlign = 'center'; ctx.fillText(winner, canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    const actionText = isBot 
      ? (winner.includes('CLEARED') ? 'CLICK TO ADVANCE TO LEVEL ' + (currentLevel + 1) + ' →' : 'CLICK TO RETRY LEVEL ' + currentLevel + ' ↺')
      : 'CLICK TO REMATCH';
    ctx.fillText(actionText, canvas.width / 2, canvas.height / 2 + 20);
  }
}

function loop(now = performance.now()) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`;
}

/**
 * 5. WIZARD DUEL / ARCANE SPELLFIRE
 */
function build2PWizardDuelGame(prompt) {
  const title = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
  return `
// 2-Player Wizard Duel: ${title}
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.tabIndex = 0;

let currentLevel = 1;
let gameStarted = false;
let gameOver = false;
let winner = '';

let lastTime = performance.now();
const groundY = canvas.height - 50;
const p1 = { x: 120, y: groundY - 30, w: 32, h: 48, vx: 0, vy: 0, hp: 100, maxHp: 100, color: '#38bdf8', cooldown: 0, isGrounded: true };
const p2 = { x: canvas.width - 120, y: groundY - 30, w: 32, h: 48, vx: 0, vy: 0, hp: 75, maxHp: 75, color: '#a855f7', cooldown: 0, isGrounded: true };

const spells = [];
const particles = [];

function applyLevelSettings() {
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    p2.maxHp = Math.min(180, 70 + (currentLevel - 1) * 15);
    p2.spellCadence = Math.max(14, 45 - (currentLevel - 1) * 4);
    p2.moveSpeed = Math.min(6.5, 3.5 + (currentLevel - 1) * 0.4);
  } else {
    p2.maxHp = 100; p2.spellCadence = 18; p2.moveSpeed = 5.5;
  }
  p1.hp = p1.maxHp;
  p2.hp = p2.maxHp;
}

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.key) keys[e.key.toLowerCase()] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key) || ['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (!gameStarted) startGame();
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.key) keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('pointerdown', e => {
  canvas.focus({ preventScroll: true });
  if (!gameStarted) { startGame(); return; }
  if (gameOver) { handleGameOverClick(); return; }
  handleTouch(e, true);
});

canvas.addEventListener('pointermove', e => {
  if (gameStarted && e.buttons > 0) handleTouch(e, false);
});

function handleTouch(e, isTap) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (x < canvas.width / 2) {
    if (x < p1.x - 20) p1.vx = -5;
    else if (x > p1.x + 20) p1.vx = 5;
    if (isTap) {
      if (y < groundY - 100 && p1.isGrounded) { p1.vy = -12; p1.isGrounded = false; }
      else castSpell(p1, 1, true);
    }
  } else if (!window.MP || !window.MP.isBot) {
    if (x < p2.x - 20) p2.vx = -5;
    else if (x > p2.x + 20) p2.vx = 5;
    if (isTap) {
      if (y < groundY - 100 && p2.isGrounded) { p2.vy = -12; p2.isGrounded = false; }
      else castSpell(p2, -1, false);
    }
  }
}

function startGame() {
  gameStarted = true;
  applyLevelSettings();
  if (window.playSound) window.playSound('click');
}

function handleGameOverClick() {
  if (winner.includes('1') || winner.includes('CLEARED')) {
    currentLevel++;
  }
  p1.x = 120; p1.y = groundY - 30; p1.vx = 0; p1.vy = 0;
  p2.x = canvas.width - 120; p2.y = groundY - 30; p2.vx = 0; p2.vy = 0;
  spells.length = 0;
  gameOver = false; winner = '';
  applyLevelSettings();
}

function castSpell(wizard, dir, isP1) {
  if (wizard.cooldown > 0) return;
  wizard.cooldown = 18;
  spells.push({
    x: wizard.x + dir * 25, y: wizard.y - 10,
    vx: dir * 9, vy: (Math.random() - 0.5) * 1.5,
    r: 9, color: wizard.color, isP1
  });
  if (window.playSound) window.playSound('shoot');
}

let botCastTimer = 0;

function update(dt) {
  if (!gameStarted || gameOver) return;

  const dtScale = dt * 60;
  if (keys['KeyA'] || keys['a']) p1.vx = -5.5;
  else if (keys['KeyD'] || keys['d']) p1.vx = 5.5;
  else p1.vx *= 0.82;

  if ((keys['KeyW'] || keys['w']) && p1.isGrounded) {
    p1.vy = -12.5; p1.isGrounded = false;
    if (window.playSound) window.playSound('jump');
  }
  if (keys['Space'] || keys[' ']) castSpell(p1, 1, true);

  const isBot = (!window.MP || window.MP.isBot);
  if (isBot) {
    const dx = p1.x - p2.x;
    const spd = p2.moveSpeed || 4;
    if (Math.abs(dx) > 280) p2.vx = -spd;
    else if (Math.abs(dx) < 180) p2.vx = spd;
    else p2.vx *= 0.8;

    botCastTimer++;
    if (botCastTimer > (p2.spellCadence || 30)) {
      botCastTimer = 0;
      castSpell(p2, -1, false);
      if (Math.random() < 0.35 && p2.isGrounded) { p2.vy = -11; p2.isGrounded = false; }
    }
  } else {
    if (keys['ArrowLeft'] || keys['arrowleft']) p2.vx = -5.5;
    else if (keys['ArrowRight'] || keys['arrowright']) p2.vx = 5.5;
    else p2.vx *= 0.82;

    if ((keys['ArrowUp'] || keys['arrowup']) && p2.isGrounded) {
      p2.vy = -12.5; p2.isGrounded = false;
      if (window.playSound) window.playSound('jump');
    }
    if (keys['Enter'] || keys['enter'] || keys['KeyM'] || keys['m']) castSpell(p2, -1, false);
  }

  [p1, p2].forEach(p => {
    p.vy += 0.55 * dtScale;
    p.x += p.vx * dtScale;
    p.y += p.vy * dtScale;
    if (p.cooldown > 0) p.cooldown--;
    if (p.y >= groundY - p.h / 2) { p.y = groundY - p.h / 2; p.vy = 0; p.isGrounded = true; }
  });

  p1.x = Math.max(30, Math.min(canvas.width / 2 - 30, p1.x));
  p2.x = Math.max(canvas.width / 2 + 30, Math.min(canvas.width - 30, p2.x));

  for (let i = spells.length - 1; i >= 0; i--) {
    const s = spells[i];
    s.x += s.vx * dtScale; s.y += s.vy * dtScale;
    const target = s.isP1 ? p2 : p1;
    if (Math.hypot(s.x - target.x, s.y - target.y) < target.w / 2 + s.r + 5) {
      target.hp -= 20;
      createSparks(s.x, s.y, s.color);
      spells.splice(i, 1);
      if (window.playSound) window.playSound('hit');
      if (target.hp <= 0) {
        target.hp = 0; gameOver = true;
        winner = s.isP1 ? (isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'WIZARD 1 WINS!') : (isBot ? 'COMPUTER WINS THIS ROUND!' : 'WIZARD 2 WINS!');
        if (window.playSound) window.playSound(s.isP1 ? 'win' : 'explosion');
      }
      continue;
    }
    if (s.x < 0 || s.x > canvas.width || s.y < 0 || s.y > canvas.height) spells.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx * dtScale; pt.y += pt.vy * dtScale;
    pt.life -= 0.04;
    if (pt.life <= 0) particles.splice(i, 1);
  }
}

function createSparks(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, r: Math.random() * 3 + 1, life: 1, color });
  }
}

function draw() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1e293b'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4; ctx.strokeRect(0, groundY, canvas.width, canvas.height - groundY);

  [p1, p2].forEach(p => {
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.h / 2);
    ctx.lineTo(p.x - p.w / 2, p.y + p.h / 2);
    ctx.lineTo(p.x + p.w / 2, p.y + p.h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.h / 2 - 18);
    ctx.lineTo(p.x - 14, p.y - p.h / 2);
    ctx.lineTo(p.x + 14, p.y - p.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  for (const s of spells) {
    ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  for (const pt of particles) {
    ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#facc15'; ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : 'ARCANE DUEL', canvas.width / 2, 25);

  drawHP(30, 25, p1.hp, p1.maxHp, p1.color, 'P1: WASD+Space / Left Touch');
  const p2Title = isBot ? 'BOT LVL ' + currentLevel : 'P2: ARROWS+Enter / Right Touch';
  drawHP(canvas.width - 190, 25, p2.hp, p2.maxHp, p2.color, p2Title);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#38bdf8'; ctx.textAlign = 'center';
    ctx.fillText('${title.toUpperCase()}', canvas.width / 2, canvas.height / 2 - 25);
    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK / TOUCH TO PLAY', canvas.width / 2, canvas.height / 2 + 20);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = winner.includes('CLEARED') || winner.includes('1') ? '#22c55e' : '#f43f5e';
    ctx.textAlign = 'center'; ctx.fillText(winner, canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    const actionText = isBot 
      ? (winner.includes('CLEARED') ? 'CLICK TO ADVANCE TO LEVEL ' + (currentLevel + 1) + ' →' : 'CLICK TO RETRY LEVEL ' + currentLevel + ' ↺')
      : 'CLICK TO REMATCH';
    ctx.fillText(actionText, canvas.width / 2, canvas.height / 2 + 25);
  }
}

function drawHP(x, y, hp, maxHp, color, label) {
  ctx.fillStyle = '#1e293b'; ctx.fillRect(x, y, 160, 14);
  ctx.fillStyle = color; ctx.fillRect(x, y, (Math.max(0, hp) / (maxHp || 100)) * 160, 14);
  ctx.font = '10px monospace'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 5);
}

function loop(now = performance.now()) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`;
}

/**
 * 6. BRAWLER / SWORD DUEL / CLOSE COMBAT
 */
function build2PBrawlerDuelGame(prompt) {
  const title = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
  return `
// 2-Player Brawler Duel: ${title}
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.tabIndex = 0;

let currentLevel = 1;
let gameStarted = false;
let gameOver = false;
let winner = '';

let lastTime = performance.now();
const groundY = canvas.height - 60;
const p1 = { x: 180, y: groundY, w: 36, h: 56, vx: 0, vy: 0, hp: 100, maxHp: 100, color: '#38bdf8', isAttacking: 0, cooldown: 0, isGrounded: true };
const p2 = { x: canvas.width - 180, y: groundY, w: 36, h: 56, vx: 0, vy: 0, hp: 75, maxHp: 75, color: '#f43f5e', isAttacking: 0, cooldown: 0, isGrounded: true };
const particles = [];

function applyLevelSettings() {
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    p2.maxHp = Math.min(180, 70 + (currentLevel - 1) * 15);
    p2.speed = Math.min(6.5, 3.6 + (currentLevel - 1) * 0.45);
    p2.attackAggression = Math.min(0.85, 0.40 + (currentLevel - 1) * 0.08);
  } else {
    p2.maxHp = 100; p2.speed = 5.5; p2.attackAggression = 0.5;
  }
  p1.hp = p1.maxHp;
  p2.hp = p2.maxHp;
}

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.key) keys[e.key.toLowerCase()] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key) || ['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (!gameStarted) startGame();
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.key) keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('pointerdown', e => {
  canvas.focus({ preventScroll: true });
  if (!gameStarted) { startGame(); return; }
  if (gameOver) { handleGameOverClick(); return; }
  handleTouch(e, true);
});

canvas.addEventListener('pointermove', e => {
  if (gameStarted && e.buttons > 0) handleTouch(e, false);
});

function handleTouch(e, isTap) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (x < canvas.width / 2) {
    if (x < p1.x - 20) p1.vx = -5;
    else if (x > p1.x + 20) p1.vx = 5;
    if (isTap) attack(p1, p2, true);
  } else if (!window.MP || !window.MP.isBot) {
    if (x < p2.x - 20) p2.vx = -5;
    else if (x > p2.x + 20) p2.vx = 5;
    if (isTap) attack(p2, p1, false);
  }
}

function startGame() {
  gameStarted = true;
  applyLevelSettings();
  if (window.playSound) window.playSound('click');
}

function handleGameOverClick() {
  if (winner.includes('1') || winner.includes('CLEARED')) {
    currentLevel++;
  }
  p1.x = 180; p1.y = groundY; p1.vx = 0; p1.vy = 0;
  p2.x = canvas.width - 180; p2.y = groundY; p2.vx = 0; p2.vy = 0;
  gameOver = false; winner = '';
  applyLevelSettings();
}

function attack(attacker, defender, isP1) {
  if (attacker.cooldown > 0) return;
  attacker.cooldown = 18;
  attacker.isAttacking = 10;
  if (window.playSound) window.playSound('shoot');

  const dist = Math.abs(attacker.x - defender.x);
  if (dist < 65 && Math.abs(attacker.y - defender.y) < 40) {
    defender.hp -= 20;
    const dir = attacker.x < defender.x ? 1 : -1;
    defender.vx = dir * 9;
    defender.vy = -5;
    createSparks(defender.x, defender.y - 20, attacker.color);
    if (window.playSound) window.playSound('hit');

    if (defender.hp <= 0) {
      defender.hp = 0; gameOver = true;
      const isBot = (!window.MP || window.MP.isBot);
      winner = isP1 ? (isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'PLAYER 1 WINS!') : (isBot ? 'COMPUTER WINS THIS ROUND!' : 'PLAYER 2 WINS!');
      if (window.playSound) window.playSound(isP1 ? 'win' : 'explosion');
    }
  }
}

let botActTimer = 0;

function update(dt) {
  if (!gameStarted || gameOver) return;

  const dtScale = dt * 60;
  if (keys['KeyA'] || keys['a']) p1.vx = -5.5;
  else if (keys['KeyD'] || keys['d']) p1.vx = 5.5;
  else p1.vx *= 0.8;

  if ((keys['KeyW'] || keys['w']) && p1.isGrounded) {
    p1.vy = -12; p1.isGrounded = false;
    if (window.playSound) window.playSound('jump');
  }
  if (keys['Space'] || keys[' ']) attack(p1, p2, true);

  const isBot = (!window.MP || window.MP.isBot);
  if (isBot) {
    const dx = p1.x - p2.x;
    const spd = p2.speed || 4.5;
    if (Math.abs(dx) > 55) p2.vx = Math.sign(dx) * spd;
    else p2.vx *= 0.8;

    botActTimer++;
    if (botActTimer > 25 && Math.abs(dx) < 68) {
      botActTimer = 0;
      if (Math.random() < (p2.attackAggression || 0.5)) {
        attack(p2, p1, false);
      }
    }
  } else {
    if (keys['ArrowLeft'] || keys['arrowleft']) p2.vx = -5.5;
    else if (keys['ArrowRight'] || keys['arrowright']) p2.vx = 5.5;
    else p2.vx *= 0.8;

    if ((keys['ArrowUp'] || keys['arrowup']) && p2.isGrounded) {
      p2.vy = -12; p2.isGrounded = false;
      if (window.playSound) window.playSound('jump');
    }
    if (keys['Enter'] || keys['enter'] || keys['KeyM'] || keys['m']) attack(p2, p1, false);
  }

  [p1, p2].forEach(p => {
    p.vy += 0.6 * dtScale; p.x += p.vx * dtScale; p.y += p.vy * dtScale;
    if (p.cooldown > 0) p.cooldown--;
    if (p.isAttacking > 0) p.isAttacking--;
    if (p.y >= groundY) { p.y = groundY; p.vy = 0; p.isGrounded = true; }
    p.x = Math.max(30, Math.min(canvas.width - 30, p.x));
  });

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx * dtScale; pt.y += pt.vy * dtScale;
    pt.life -= 0.04;
    if (pt.life <= 0) particles.splice(i, 1);
  }
}

function createSparks(x, y, color) {
  for (let i = 0; i < 14; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, r: Math.random() * 3 + 1, life: 1, color });
  }
}

function draw() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1e293b'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4; ctx.strokeRect(0, groundY, canvas.width, canvas.height - groundY);

  [p1, p2].forEach(p => {
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 14;
    ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);

    if (p.isAttacking > 0) {
      ctx.fillStyle = '#facc15';
      const dir = p === p1 ? 1 : -1;
      ctx.fillRect(p.x + dir * 18, p.y - p.h / 2 - 4, dir * 28, 8);
    }
    ctx.shadowBlur = 0;
  });

  for (const pt of particles) {
    ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#facc15'; ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : '2-PLAYER BRAWL', canvas.width / 2, 25);

  drawHP(30, 25, p1.hp, p1.maxHp, p1.color, 'P1: WASD+Space / Left Touch');
  const p2Title = isBot ? 'BOT LVL ' + currentLevel : 'P2: ARROWS+Enter / Right Touch';
  drawHP(canvas.width - 190, 25, p2.hp, p2.maxHp, p2.color, p2Title);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#38bdf8'; ctx.textAlign = 'center';
    ctx.fillText('${title.toUpperCase()}', canvas.width / 2, canvas.height / 2 - 25);
    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK / TOUCH TO START', canvas.width / 2, canvas.height / 2 + 20);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = winner.includes('CLEARED') || winner.includes('1') ? '#22c55e' : '#f43f5e';
    ctx.textAlign = 'center'; ctx.fillText(winner, canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    const actionText = isBot 
      ? (winner.includes('CLEARED') ? 'CLICK TO ADVANCE TO LEVEL ' + (currentLevel + 1) + ' →' : 'CLICK TO RETRY LEVEL ' + currentLevel + ' ↺')
      : 'CLICK TO REMATCH';
    ctx.fillText(actionText, canvas.width / 2, canvas.height / 2 + 25);
  }
}

function drawHP(x, y, hp, maxHp, color, label) {
  ctx.fillStyle = '#1e293b'; ctx.fillRect(x, y, 160, 14);
  ctx.fillStyle = color; ctx.fillRect(x, y, (Math.max(0, hp) / (maxHp || 100)) * 160, 14);
  ctx.font = '10px monospace'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 5);
}

function loop(now = performance.now()) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`;
}

/**
 * 7. NEON BIKE CHASE / HIGHWAY RACING (2-Player Racing, Lane Switching, Traffic, Nitro, EMP Bursts)
 */
function build2PBikeChaseRacingGame(prompt) {
  const title = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
  return `
// 2-Player Neon Bike Chase & Highway Racing: ${title}
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.tabIndex = 0;

let currentLevel = 1;
let gameStarted = false;
let gameOver = false;
let winner = '';

let lastTime = performance.now();
const roadLeft = 140;
const roadRight = canvas.width - 140;
const lanes = [200, 330, 470, 600];

const p1 = { x: lanes[1], y: canvas.height - 110, w: 26, h: 56, lane: 1, targetX: lanes[1], speed: 12, maxSpeed: 24, nitro: 100, empCooldown: 0, distance: 0, color: '#38bdf8', stunTimer: 0 };
const p2 = { x: lanes[2], y: canvas.height - 110, w: 26, h: 56, lane: 2, targetX: lanes[2], speed: 12, maxSpeed: 22, nitro: 100, empCooldown: 0, distance: 0, color: '#f43f5e', stunTimer: 0 };

const finishDistance = 2500;
const traffic = [];
const items = []; // nitro canisters, oil slicks
const empBursts = [];
const particles = [];
let roadScroll = 0;
let trafficSpawnTimer = 0;
let itemSpawnTimer = 0;

function applyLevelSettings() {
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    p2.maxSpeed = Math.min(26, 17 + (currentLevel - 1) * 1.5);
    p2.dodgeSkill = Math.min(0.92, 0.45 + (currentLevel - 1) * 0.10);
    p2.empCadence = Math.max(30, 90 - (currentLevel - 1) * 10);
  } else {
    p2.maxSpeed = 24; p2.dodgeSkill = 0.5; p2.empCadence = 60;
  }
  p1.distance = 0; p2.distance = 0;
  p1.speed = 12; p2.speed = 12;
  p1.nitro = 100; p2.nitro = 100;
  p1.stunTimer = 0; p2.stunTimer = 0;
}

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.key) keys[e.key.toLowerCase()] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (!gameStarted) startGame();

  // Instant lane shifts on key press
  if (e.code === 'KeyA' || e.key === 'a') {
    if (p1.lane > 0) { p1.lane--; p1.targetX = lanes[p1.lane]; if (window.playSound) window.playSound('click'); }
  }
  if (e.code === 'KeyD' || e.key === 'd') {
    if (p1.lane < lanes.length - 1) { p1.lane++; p1.targetX = lanes[p1.lane]; if (window.playSound) window.playSound('click'); }
  }

  const isBot = !window.MP || window.MP.isBot;
  if (!isBot) {
    if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
      if (p2.lane > 0) { p2.lane--; p2.targetX = lanes[p2.lane]; if (window.playSound) window.playSound('click'); }
    }
    if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
      if (p2.lane < lanes.length - 1) { p2.lane++; p2.targetX = lanes[p2.lane]; if (window.playSound) window.playSound('click'); }
    }
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.key) keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('pointerdown', e => {
  canvas.focus({ preventScroll: true });
  if (!gameStarted) { startGame(); return; }
  if (gameOver) { handleGameOverClick(); return; }
  handleTouch(e);
});

function handleTouch(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  if (x < canvas.width / 2) {
    if (x < p1.x - 20 && p1.lane > 0) { p1.lane--; p1.targetX = lanes[p1.lane]; }
    else if (x > p1.x + 20 && p1.lane < lanes.length - 1) { p1.lane++; p1.targetX = lanes[p1.lane]; }
    else triggerEMP(p1, p2, true);
  } else if (!window.MP || !window.MP.isBot) {
    if (x < p2.x - 20 && p2.lane > 0) { p2.lane--; p2.targetX = lanes[p2.lane]; }
    else if (x > p2.x + 20 && p2.lane < lanes.length - 1) { p2.lane++; p2.targetX = lanes[p2.lane]; }
    else triggerEMP(p2, p1, false);
  }
}

function startGame() {
  gameStarted = true;
  applyLevelSettings();
  if (window.playSound) window.playSound('click');
}

function handleGameOverClick() {
  if (winner.includes('1') || winner.includes('CLEARED')) {
    currentLevel++;
  }
  traffic.length = 0;
  items.length = 0;
  empBursts.length = 0;
  p1.lane = 1; p1.targetX = lanes[1]; p1.x = lanes[1];
  p2.lane = 2; p2.targetX = lanes[2]; p2.x = lanes[2];
  gameOver = false; winner = '';
  applyLevelSettings();
}

function triggerEMP(bike, opponent, isP1) {
  if (bike.empCooldown > 0 || bike.stunTimer > 0) return;
  bike.empCooldown = 75;
  empBursts.push({ x: bike.x, y: bike.y - 30, radius: 10, isP1, color: bike.color });
  if (window.playSound) window.playSound('laser');
}

let botTimer = 0;

function update(dt) {
  if (!gameStarted || gameOver) return;

  const dtScale = dt * 60;
  roadScroll = (roadScroll + 12 * dtScale) % 80;

  // P1 Accelerate & Nitro (W / S / Space)
  if (p1.stunTimer > 0) {
    p1.stunTimer -= dtScale;
    p1.speed = Math.max(5, p1.speed * 0.94);
  } else {
    if (keys['KeyW'] || keys['w']) {
      if (p1.nitro > 0) {
        p1.speed = Math.min(p1.maxSpeed, p1.speed + 0.45 * dtScale);
        p1.nitro = Math.max(0, p1.nitro - 0.75 * dtScale);
        createExhaustSparks(p1.x, p1.y + 25, '#38bdf8');
      } else {
        p1.speed = Math.min(18, p1.speed + 0.15 * dtScale);
      }
    } else if (keys['KeyS'] || keys['s']) {
      p1.speed = Math.max(7, p1.speed - 0.3 * dtScale);
    } else {
      p1.speed = Math.max(12, p1.speed - 0.08 * dtScale);
      p1.nitro = Math.min(100, p1.nitro + 0.15 * dtScale);
    }
    if (keys['Space'] || keys[' ']) triggerEMP(p1, p2, true);
  }

  // Dynamic Bot vs Player 2
  const isBot = (!window.MP || window.MP.isBot);
  if (isBot) {
    if (p2.stunTimer > 0) {
      p2.stunTimer -= dtScale;
      p2.speed = Math.max(5, p2.speed * 0.94);
    } else {
      // Bot traffic avoidance lookahead
      botTimer += dtScale;
      const aheadObstacle = traffic.find(t => t.lane === p2.lane && t.y < p2.y && t.y > p2.y - 200);
      if (aheadObstacle && Math.random() < (p2.dodgeSkill || 0.6)) {
        const altLanes = [p2.lane - 1, p2.lane + 1].filter(l => l >= 0 && l < lanes.length);
        if (altLanes.length > 0) {
          p2.lane = altLanes[Math.floor(Math.random() * altLanes.length)];
          p2.targetX = lanes[p2.lane];
        }
      }

      // Bot speed & EMP logic
      if (p2.distance < p1.distance - 40 && p2.nitro > 20) {
        p2.speed = Math.min(p2.maxSpeed, p2.speed + 0.4 * dtScale);
        p2.nitro = Math.max(0, p2.nitro - 0.6 * dtScale);
        createExhaustSparks(p2.x, p2.y + 25, '#f43f5e');
      } else {
        p2.speed = Math.min(p2.maxSpeed - 2, p2.speed + 0.15 * dtScale);
        p2.nitro = Math.min(100, p2.nitro + 0.15 * dtScale);
      }

      if (botTimer > (p2.empCadence || 80) && Math.abs(p2.x - p1.x) < 80) {
        botTimer = 0;
        triggerEMP(p2, p1, false);
      }
    }
  } else {
    // Local P2 (Up / Down / Enter / M)
    if (p2.stunTimer > 0) {
      p2.stunTimer -= dtScale;
      p2.speed = Math.max(5, p2.speed * 0.94);
    } else {
      if (keys['ArrowUp'] || keys['arrowup']) {
        if (p2.nitro > 0) {
          p2.speed = Math.min(p2.maxSpeed, p2.speed + 0.45 * dtScale);
          p2.nitro = Math.max(0, p2.nitro - 0.75 * dtScale);
          createExhaustSparks(p2.x, p2.y + 25, '#f43f5e');
        } else {
          p2.speed = Math.min(18, p2.speed + 0.15 * dtScale);
        }
      } else if (keys['ArrowDown'] || keys['arrowdown']) {
        p2.speed = Math.max(7, p2.speed - 0.3 * dtScale);
      } else {
        p2.speed = Math.max(12, p2.speed - 0.08 * dtScale);
        p2.nitro = Math.min(100, p2.nitro + 0.15 * dtScale);
      }
      if (keys['Enter'] || keys['enter'] || keys['KeyM'] || keys['m']) triggerEMP(p2, p1, false);
    }
  }

  // Smooth lane interpolation
  [p1, p2].forEach(p => {
    p.x += (p.targetX - p.x) * 0.22 * dtScale;
    p.distance += p.speed * 0.2 * dtScale;
    if (p.empCooldown > 0) p.empCooldown -= dtScale;
  });

  // Spawn traffic & pickups
  trafficSpawnTimer += dtScale;
  if (trafficSpawnTimer > 45) {
    trafficSpawnTimer = 0;
    const laneIdx = Math.floor(Math.random() * lanes.length);
    traffic.push({
      x: lanes[laneIdx], y: -60, w: 32, h: 60,
      lane: laneIdx, speed: Math.random() * 4 + 4,
      color: ['#e2e8f0', '#94a3b8', '#64748b', '#cbd5e1'][Math.floor(Math.random() * 4)]
    });
  }

  itemSpawnTimer += dtScale;
  if (itemSpawnTimer > 60) {
    itemSpawnTimer = 0;
    const laneIdx = Math.floor(Math.random() * lanes.length);
    const isNitro = Math.random() > 0.4;
    items.push({
      x: lanes[laneIdx], y: -40, r: 14,
      lane: laneIdx, type: isNitro ? 'nitro' : 'oil',
      color: isNitro ? '#22c55e' : '#eab308'
    });
  }

  // Update traffic positions & collisions
  const avgSpeed = (p1.speed + p2.speed) / 2;
  for (let i = traffic.length - 1; i >= 0; i--) {
    const car = traffic[i];
    car.y += (avgSpeed - car.speed + 4) * dtScale;

    [p1, p2].forEach(p => {
      if (Math.abs(p.x - car.x) < (p.w + car.w) / 2 && Math.abs(p.y - car.y) < (p.h + car.h) / 2) {
        p.speed = Math.max(4, p.speed - 6);
        p.stunTimer = 25;
        createExhaustSparks(p.x, p.y, '#f59e0b');
        if (window.playSound) window.playSound('hit');
      }
    });

    if (car.y > canvas.height + 80) traffic.splice(i, 1);
  }

  // Update items
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.y += (avgSpeed + 2) * dtScale;

    [p1, p2].forEach(p => {
      if (Math.hypot(p.x - it.x, p.y - it.y) < p.w / 2 + it.r) {
        if (it.type === 'nitro') {
          p.nitro = Math.min(100, p.nitro + 45);
          p.speed = Math.min(p.maxSpeed + 3, p.speed + 4);
          createExhaustSparks(p.x, p.y, '#22c55e');
          if (window.playSound) window.playSound('powerup');
        } else {
          p.stunTimer = 35;
          p.speed = Math.max(5, p.speed - 5);
          createExhaustSparks(p.x, p.y, '#eab308');
          if (window.playSound) window.playSound('hit');
        }
        items.splice(i, 1);
      }
    });

    if (it.y > canvas.height + 40) items.splice(i, 1);
  }

  // Update EMP Bursts
  for (let i = empBursts.length - 1; i >= 0; i--) {
    const emp = empBursts[i];
    emp.y -= 14 * dtScale;
    emp.radius += 1.5 * dtScale;

    const target = emp.isP1 ? p2 : p1;
    if (Math.hypot(emp.x - target.x, emp.y - target.y) < emp.radius + target.w) {
      target.stunTimer = 45;
      target.speed = Math.max(4, target.speed - 8);
      createExhaustSparks(target.x, target.y, emp.color);
      empBursts.splice(i, 1);
      if (window.playSound) window.playSound('hit');
      continue;
    }

    if (emp.y < -50 || emp.radius > 60) empBursts.splice(i, 1);
  }

  // Check finish line victory
  if (p1.distance >= finishDistance || p2.distance >= finishDistance) {
    gameOver = true;
    if (p1.distance >= finishDistance && p2.distance >= finishDistance) {
      winner = p1.distance > p2.distance ? (isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'PLAYER 1 WINS!') : (isBot ? 'COMPUTER WON THE CHASE!' : 'PLAYER 2 WINS!');
    } else if (p1.distance >= finishDistance) {
      winner = isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'PLAYER 1 REACHED THE FINISH!';
    } else {
      winner = isBot ? 'COMPUTER WON THE CHASE!' : 'PLAYER 2 REACHED THE FINISH!';
    }
    if (window.playSound) window.playSound(winner.includes('1') || winner.includes('CLEARED') ? 'win' : 'gameover');
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx * dtScale; pt.y += pt.vy * dtScale;
    pt.life -= 0.05;
    if (pt.life <= 0) particles.splice(i, 1);
  }
}

function createExhaustSparks(x, y, color) {
  for (let i = 0; i < 6; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: Math.random() * 4 + 4, r: Math.random() * 3 + 1, life: 1, color });
  }
}

function draw() {
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Highway tarmac
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(roadLeft, 0, roadRight - roadLeft, canvas.height);

  // Highway borders with glowing neon guardrails
  ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 6; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(roadLeft, 0); ctx.lineTo(roadLeft, canvas.height); ctx.stroke();
  ctx.strokeStyle = '#f43f5e'; ctx.shadowColor = '#f43f5e';
  ctx.beginPath(); ctx.moveTo(roadRight, 0); ctx.lineTo(roadRight, canvas.height); ctx.stroke();
  ctx.shadowBlur = 0;

  // Dashed lane dividers
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 3;
  ctx.setLineDash([24, 24]);
  ctx.lineDashOffset = -roadScroll;
  for (let i = 1; i < lanes.length; i++) {
    const dividerX = (lanes[i - 1] + lanes[i]) / 2;
    ctx.beginPath(); ctx.moveTo(dividerX, 0); ctx.lineTo(dividerX, canvas.height); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Items
  for (const it of items) {
    ctx.fillStyle = it.color; ctx.shadowColor = it.color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
    ctx.font = '10px monospace'; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
    ctx.fillText(it.type === 'nitro' ? '⚡' : '🛢️', it.x, it.y + 4);
  }
  ctx.shadowBlur = 0;

  // Traffic Cars
  for (const car of traffic) {
    ctx.fillStyle = car.color; ctx.shadowColor = car.color; ctx.shadowBlur = 6;
    ctx.fillRect(car.x - car.w / 2, car.y - car.h / 2, car.w, car.h);
    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(car.x - car.w / 2 + 3, car.y + car.h / 2 - 4, 6, 4);
    ctx.fillRect(car.x + car.w / 2 - 9, car.y + car.h / 2 - 4, 6, 4);
  }
  ctx.shadowBlur = 0;

  // EMP Bursts
  for (const emp of empBursts) {
    ctx.strokeStyle = emp.color; ctx.lineWidth = 4; ctx.shadowColor = emp.color; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(emp.x, emp.y, emp.radius, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Bikes
  [p1, p2].forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.stunTimer > 0) ctx.rotate((Math.random() - 0.5) * 0.3);

    // Bike Body
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 16;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);

    // Wheels
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-p.w / 2 + 2, -p.h / 2 + 4, p.w - 4, 10);
    ctx.fillRect(-p.w / 2 + 2, p.h / 2 - 14, p.w - 4, 10);

    // Stun halo
    if (p.stunTimer > 0) {
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, p.h / 2 + 8, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  });

  // Particles
  for (const pt of particles) {
    ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // HUD
  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#facc15'; ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : 'NEON HIGHWAY CHASE', canvas.width / 2, 25);

  // Distance Progress Bar
  const progressP1 = Math.min(1, p1.distance / finishDistance);
  const progressP2 = Math.min(1, p2.distance / finishDistance);
  drawProgressBar(canvas.width / 2 - 120, 35, 240, 10, progressP1, progressP2);

  drawBikeHUD(20, 25, p1, 'P1: [A/D] Lane • [W] Nitro • [Space] EMP', p1.color);
  const p2Title = isBot ? 'BOT LVL ' + currentLevel : 'P2: [Left/Right] • [Up] Nitro • [Enter] EMP';
  drawBikeHUD(canvas.width - 200, 25, p2, p2Title, p2.color);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#38bdf8'; ctx.textAlign = 'center';
    ctx.fillText('${title.toUpperCase()}', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    ctx.fillText('P1: [A/D] Lanes • [W] Nitro Boost • [Space] EMP Burst', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('CLICK / TOUCH TO PLAY', canvas.width / 2, canvas.height / 2 + 45);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 30px monospace';
    ctx.fillStyle = winner.includes('CLEARED') || winner.includes('1') ? '#22c55e' : '#f43f5e';
    ctx.textAlign = 'center'; ctx.fillText(winner, canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    const actionText = isBot 
      ? (winner.includes('CLEARED') ? 'CLICK TO ADVANCE TO LEVEL ' + (currentLevel + 1) + ' →' : 'CLICK TO RETRY LEVEL ' + currentLevel + ' ↺')
      : 'CLICK TO REMATCH';
    ctx.fillText(actionText, canvas.width / 2, canvas.height / 2 + 25);
  }
}

function drawProgressBar(x, y, w, h, p1Ratio, p2Ratio) {
  ctx.fillStyle = '#1e293b'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.strokeRect(x, y, w, h);
  // P1 indicator
  ctx.fillStyle = '#38bdf8'; ctx.fillRect(x + p1Ratio * (w - 8), y - 3, 6, h + 6);
  // P2 indicator
  ctx.fillStyle = '#f43f5e'; ctx.fillRect(x + p2Ratio * (w - 8), y - 3, 6, h + 6);
}

function drawBikeHUD(x, y, bike, label, color) {
  ctx.font = '10px monospace'; ctx.fillStyle = color; ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#1e293b'; ctx.fillRect(x, y + 6, 180, 10);
  ctx.fillStyle = '#22c55e'; ctx.fillRect(x, y + 6, (bike.nitro / 100) * 180, 10);
  ctx.fillStyle = '#ffffff'; ctx.font = '9px monospace';
  ctx.fillText('NITRO: ' + Math.floor(bike.nitro) + '% | DIST: ' + Math.floor(bike.distance) + 'm', x, y + 28);
}

function loop(now = performance.now()) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`;
}

