/**
 * Curated 2-Player Local & VS Computer Arcade Game Library
 * Features:
 * - Dual Keyboard & Split-Screen Touch/Pointer Drag Controls across all games.
 * - Infinite Level Progression Loop (Level 1 ➔ ∞) with dynamic scaling.
 * - 6 Curated Games:
 *   1. Cyber Pong 1v1
 *   2. Space Dogfight 1v1
 *   3. Neon Lightcycles 1v1
 *   4. Neon Slime Volleyball 1v1 (New)
 *   5. Speed Chess 1v1
 *   6. Wizard Spellfire 1v1 (New)
 */

export const CURATED_2P_GAMES = [
  {
    id: 'curated_2p_pong_duel',
    title: 'Cyber Pong 1v1: Neon Clash',
    genre: '2-Player Arcade Duel',
    desc: 'Classic neon air hockey duel with infinite level scaling! Play head-to-head with split touch/keyboard controls or climb infinite bot levels!',
    controls: 'P1: W/S or Left Drag • P2: Up/Down Arrows or Right Drag / Bot',
    code: `
// Cyber Pong 1v1: Neon Clash
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

// Dual Split-Screen Touch & Pointer Drag Controls
const touches = {};
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

canvas.addEventListener('pointerdown', e => {
  canvas.focus({ preventScroll: true });
  if (!gameStarted) { startGame(); return; }
  if (gameOver) { handleGameOverClick(); return; }
  touches[e.pointerId] = true;
  handlePointer(e);
});

canvas.addEventListener('pointermove', e => {
  if (gameStarted && touches[e.pointerId]) handlePointer(e);
});

canvas.addEventListener('pointerup', e => { delete touches[e.pointerId]; });
canvas.addEventListener('pointercancel', e => { delete touches[e.pointerId]; });

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
  score1 = 0;
  score2 = 0;
  gameOver = false;
  winner = '';
  applyLevelSettings();
  resetBall(true);
}

function resetBall(servingToP1) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.vx = (servingToP1 ? -1 : 1) * ball.speed;
  ball.vy = (Math.random() * 3.5 - 1.75);
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: ball.x, y: ball.y,
      vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
      r: Math.random() * 4 + 2, life: 1, color: '#fbbf24'
    });
  }
}

function update() {
  if (!gameStarted || gameOver) return;

  // Player 1 Controls (W/S)
  if (keys['KeyW'] || keys['w']) p1.y -= p1.speed;
  if (keys['KeyS'] || keys['s']) p1.y += p1.speed;
  p1.y = Math.max(10, Math.min(canvas.height - p1.h - 10, p1.y));

  // Player 2 Controls (Bot or Arrow Keys)
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    botMistakeTimer++;
    const maxOffset = Math.max(8, 55 - (currentLevel - 1) * 8);
    if (botMistakeTimer > 45) {
      botMistakeTimer = 0;
      botOffset = (Math.random() - 0.5) * maxOffset;
    }
    if (ball.vx > 0) {
      const targetY = ball.y - p2.h / 2 + botOffset;
      if (p2.y < targetY - 14) p2.y += p2.speed;
      else if (p2.y > targetY + 14) p2.y -= p2.speed;
    }
  } else {
    if (keys['ArrowUp'] || keys['arrowup']) p2.y -= p2.speed;
    if (keys['ArrowDown'] || keys['arrowdown']) p2.y += p2.speed;
  }
  p2.y = Math.max(10, Math.min(canvas.height - p2.h - 10, p2.y));

  // Move Ball
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall bounce
  if (ball.y - ball.r <= 0) {
    ball.y = ball.r; ball.vy *= -1;
    if (window.playSound) window.playSound('click');
  }
  if (ball.y + ball.r >= canvas.height) {
    ball.y = canvas.height - ball.r; ball.vy *= -1;
    if (window.playSound) window.playSound('click');
  }

  // Paddle 1 Collision
  if (ball.x - ball.r <= p1.x + p1.w && ball.x + ball.r >= p1.x &&
      ball.y >= p1.y - 5 && ball.y <= p1.y + p1.h + 5 && ball.vx < 0) {
    ball.vx = Math.abs(ball.vx) * 1.04;
    const impact = (ball.y - (p1.y + p1.h / 2)) / (p1.h / 2);
    ball.vy = impact * 6.0;
    ball.x = p1.x + p1.w + ball.r;
    createSparks(ball.x, ball.y, '#00f0ff');
    if (window.playSound) window.playSound('hit');
  }

  // Paddle 2 Collision
  if (ball.x + ball.r >= p2.x && ball.x - ball.r <= p2.x + p2.w &&
      ball.y >= p2.y - 5 && ball.y <= p2.y + p2.h + 5 && ball.vx > 0) {
    ball.vx = -Math.abs(ball.vx) * 1.04;
    const impact = (ball.y - (p2.y + p2.h / 2)) / (p2.h / 2);
    ball.vy = impact * 6.0;
    ball.x = p2.x - ball.r;
    createSparks(ball.x, ball.y, '#f43f5e');
    if (window.playSound) window.playSound('hit');
  }

  // Scoring
  if (ball.x < 0) {
    score2++;
    if (window.playSound) window.playSound('powerup');
    if (score2 >= winningScore) {
      gameOver = true;
      winner = isBot ? 'COMPUTER WINS THIS ROUND!' : 'PLAYER 2 WINS!';
      if (window.playSound) window.playSound('gameover');
    } else resetBall(false);
  } else if (ball.x > canvas.width) {
    score1++;
    if (window.playSound) window.playSound('powerup');
    if (score1 >= winningScore) {
      gameOver = true;
      winner = isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'PLAYER 1 WINS!';
      if (window.playSound) window.playSound('win');
    } else resetBall(true);
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.life -= 0.03;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function createSparks(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
      r: Math.random() * 3 + 1, life: 1, color
    });
  }
}

function draw() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Court markings
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Paddles
  ctx.fillStyle = p1.color;
  ctx.shadowColor = p1.color;
  ctx.shadowBlur = 15;
  ctx.fillRect(p1.x, p1.y, p1.w, p1.h);

  ctx.fillStyle = p2.color;
  ctx.shadowColor = p2.color;
  ctx.shadowBlur = 15;
  ctx.fillRect(p2.x, p2.y, p2.w, p2.h);

  // Ball
  if (gameStarted) {
    ctx.fillStyle = ball.color;
    ctx.shadowColor = ball.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Particles
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Level Badge & Score HUD
  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : '2-PLAYER VERSUS', canvas.width / 2, 25);

  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#00f0ff';
  ctx.fillText(score1, canvas.width / 2 - 70, 60);
  ctx.fillStyle = '#f43f5e';
  ctx.fillText(score2, canvas.width / 2 + 70, 60);

  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('P1: [W/S] or Left Drag', 30, 25);
  const p2Label = isBot ? 'BOT (LVL ' + currentLevel + ')' : 'P2: [ARROWS] or Right Drag';
  ctx.textAlign = 'right';
  ctx.fillText(p2Label, canvas.width - 30, 25);

  // Attract Screen
  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER PONG 1v1', canvas.width / 2, canvas.height / 2 - 35);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#facc15';
    ctx.fillText('LEVEL ' + currentLevel + ' READY', canvas.width / 2, canvas.height / 2);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK / TOUCH TO PLAY', canvas.width / 2, canvas.height / 2 + 35);
  }

  // Game Over / Next Level Screen
  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = winner.includes('1') || winner.includes('CLEARED') ? '#22c55e' : '#f43f5e';
    ctx.textAlign = 'center';
    ctx.fillText(winner, canvas.width / 2, canvas.height / 2 - 25);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    const actionText = isBot 
      ? (winner.includes('CLEARED') ? 'CLICK TO ADVANCE TO LEVEL ' + (currentLevel + 1) + ' →' : 'CLICK TO RETRY LEVEL ' + currentLevel + ' ↺')
      : 'CLICK TO PLAY NEXT ROUND';
    ctx.fillText(actionText, canvas.width / 2, canvas.height / 2 + 25);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`
  },
  {
    id: 'curated_2p_space_dogfight',
    title: 'Space Dogfight 1v1: Star Arena',
    genre: '2-Player Dogfight',
    desc: 'Starfighter combat with dual touch & keyboard controls and infinite level scaling! Maneuver and destroy enemy ships!',
    controls: 'P1: WASD + Space / Left Touch • P2: Arrows + Enter / Right Touch / Bot',
    code: `
// Space Dogfight 1v1: Star Arena
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.tabIndex = 0;

let currentLevel = 1;
let gameStarted = false;
let gameOver = false;
let winner = '';

const p1 = { x: 120, y: canvas.height / 2, angle: 0, vx: 0, vy: 0, hp: 100, maxHp: 100, color: '#38bdf8', cooldown: 0, radius: 18 };
const p2 = { x: canvas.width - 120, y: canvas.height / 2, angle: Math.PI, vx: 0, vy: 0, hp: 70, maxHp: 70, color: '#f43f5e', cooldown: 0, radius: 18 };

const lasers = [];
const particles = [];
const stars = [];

for (let i = 0; i < 60; i++) {
  stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 + 1 });
}

let botShootCooldown = 0;

function applyLevelSettings() {
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    p2.maxHp = Math.min(180, 65 + (currentLevel - 1) * 15);
    p2.turnSpeed = Math.min(0.065, 0.022 + (currentLevel - 1) * 0.006);
    p2.fireCadence = Math.max(14, 48 - (currentLevel - 1) * 5);
  } else {
    p2.maxHp = 100; p2.turnSpeed = 0.06; p2.fireCadence = 14;
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

// Touch & Drag Controls
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
  lasers.length = 0;
  gameOver = false;
  winner = '';
  applyLevelSettings();
}

function shoot(player, isP1) {
  if (player.cooldown > 0) return;
  player.cooldown = 14;
  const speed = 9;
  lasers.push({
    x: player.x + Math.cos(player.angle) * 22,
    y: player.y + Math.sin(player.angle) * 22,
    vx: Math.cos(player.angle) * speed,
    vy: Math.sin(player.angle) * speed,
    color: player.color, isP1, life: 60
  });
  if (window.playSound) window.playSound('shoot');
}

function update() {
  if (!gameStarted || gameOver) return;

  // P1 controls
  if (keys['KeyA'] || keys['a']) p1.angle -= 0.06;
  if (keys['KeyD'] || keys['d']) p1.angle += 0.06;
  if (keys['KeyW'] || keys['w']) { p1.vx += Math.cos(p1.angle) * 0.48; p1.vy += Math.sin(p1.angle) * 0.48; }
  if (keys['KeyS'] || keys['s']) { p1.vx *= 0.90; p1.vy *= 0.90; }
  if (keys['Space'] || keys[' ']) shoot(p1, true);

  // P2 controls (Bot AI or Arrow Keys)
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - p2.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    p2.angle += Math.sign(diff) * Math.min(Math.abs(diff), p2.turnSpeed || 0.025);
    const dist = Math.hypot(dx, dy);
    if (dist > 190) {
      p2.vx += Math.cos(p2.angle) * 0.26;
      p2.vy += Math.sin(p2.angle) * 0.26;
    }
    botShootCooldown++;
    if (botShootCooldown > (p2.fireCadence || 40) && Math.abs(diff) < 0.25 && dist < 380) {
      botShootCooldown = 0;
      shoot(p2, false);
    }
  } else {
    if (keys['ArrowLeft'] || keys['arrowleft']) p2.angle -= 0.06;
    if (keys['ArrowRight'] || keys['arrowright']) p2.angle += 0.06;
    if (keys['ArrowUp'] || keys['arrowup']) { p2.vx += Math.cos(p2.angle) * 0.48; p2.vy += Math.sin(p2.angle) * 0.48; }
    if (keys['ArrowDown'] || keys['arrowdown']) { p2.vx *= 0.90; p2.vy *= 0.90; }
    if (keys['Enter'] || keys['enter'] || keys['KeyM'] || keys['m']) shoot(p2, false);
  }

  [p1, p2].forEach(p => {
    p.vx *= 0.96; p.vy *= 0.96;
    p.x += p.vx; p.y += p.vy;
    if (p.cooldown > 0) p.cooldown--;
    if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
  });

  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i];
    l.x += l.vx; l.y += l.vy;
    l.life--;
    const target = l.isP1 ? p2 : p1;
    if (Math.hypot(l.x - target.x, l.y - target.y) < target.radius + 6) {
      target.hp -= 25;
      createExplosion(l.x, l.y, l.color);
      lasers.splice(i, 1);
      if (window.playSound) window.playSound('hit');
      if (target.hp <= 0) {
        target.hp = 0; gameOver = true;
        winner = l.isP1 ? (isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'PLAYER 1 WINS!') : (isBot ? 'COMPUTER WINS THIS ROUND!' : 'PLAYER 2 WINS!');
        if (window.playSound) window.playSound(l.isP1 ? 'win' : 'explosion');
      }
      continue;
    }
    if (l.life <= 0 || l.x < 0 || l.x > canvas.width || l.y < 0 || l.y > canvas.height) lasers.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx; pt.y += pt.vy;
    pt.life -= 0.04;
    if (pt.life <= 0) particles.splice(i, 1);
  }
}

function createExplosion(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, r: Math.random() * 3 + 1, life: 1, color });
  }
}

function drawShip(player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = player.color;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(22, 0); ctx.lineTo(-14, -14); ctx.lineTo(-6, 0); ctx.lineTo(-14, 14); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const s of stars) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(s.x, s.y, s.size, s.size); }

  for (const l of lasers) {
    ctx.strokeStyle = l.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x - l.vx * 1.5, l.y - l.vy * 1.5); ctx.stroke();
  }

  drawShip(p1);
  drawShip(p2);

  for (const pt of particles) {
    ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : 'DOGFIGHT DUEL', canvas.width / 2, 25);

  drawHealthBar(30, 25, p1.hp, p1.maxHp, p1.color, 'P1: WASD / Left Touch');
  const p2Title = isBot ? 'BOT LVL ' + currentLevel : 'P2: ARROWS / Right Touch';
  drawHealthBar(canvas.width - 190, 25, p2.hp, p2.maxHp, p2.color, p2Title);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('SPACE DOGFIGHT 1v1', canvas.width / 2, canvas.height / 2 - 25);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK / TOUCH TO START', canvas.width / 2, canvas.height / 2 + 20);
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

function drawHealthBar(x, y, hp, maxHp, color, label) {
  ctx.fillStyle = '#1e293b'; ctx.fillRect(x, y, 160, 14);
  ctx.fillStyle = color; ctx.fillRect(x, y, (Math.max(0, hp) / (maxHp || 100)) * 160, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.strokeRect(x, y, 160, 14);
  ctx.font = '10px monospace'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 5);
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
`
  },
  {
    id: 'curated_2p_tron_lightcycles',
    title: 'Neon Lightcycles 1v1: Grid Duel',
    genre: '2-Player Grid Strategy',
    desc: 'Leave glowing light trails with touch swipes & keyboard across infinite level speeds! Cut off your rival and win!',
    controls: 'P1: W/A/S/D or Left Swipes • P2: Arrow Keys or Right Swipes / Bot',
    code: `
// Neon Lightcycles 1v1: Grid Duel
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.tabIndex = 0;

let currentLevel = 1;
let gameStarted = false;
let gameOver = false;
let winner = '';

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

  // P1: W=UP, S=DOWN, A=LEFT, D=RIGHT
  if ((e.code === 'KeyW' || k === 'w') && p1.dy === 0) { p1.dx = 0; p1.dy = -4; }
  if ((e.code === 'KeyS' || k === 's') && p1.dy === 0) { p1.dx = 0; p1.dy = 4; }
  if ((e.code === 'KeyA' || k === 'a') && p1.dx === 0) { p1.dx = -4; p1.dy = 0; }
  if ((e.code === 'KeyD' || k === 'd') && p1.dx === 0) { p1.dx = 4; p1.dy = 0; }

  // P2: Arrows
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

// Swipe & Touch Controls
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
  const endX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const endY = (e.clientY - rect.top) * (canvas.height / rect.height);
  const diffX = endX - touchStartX;
  const diffY = endY - touchStartY;
  
  if (Math.hypot(diffX, diffY) > 20) {
    if (touchStartX < canvas.width / 2) {
      // P1 Swipe
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && p1.dx === 0) { p1.dx = 4; p1.dy = 0; }
        else if (diffX < 0 && p1.dx === 0) { p1.dx = -4; p1.dy = 0; }
      } else {
        if (diffY > 0 && p1.dy === 0) { p1.dx = 0; p1.dy = 4; }
        else if (diffY < 0 && p1.dy === 0) { p1.dx = 0; p1.dy = -4; }
      }
    } else if (!window.MP || !window.MP.isBot) {
      // P2 Swipe
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
  gameOver = false;
  winner = '';
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

let botDecisionCounter = 0;

function update() {
  if (!gameStarted || gameOver) return;

  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    botDecisionCounter++;
    const lookAhead = p2.lookAhead || 5;
    const spd = p2.baseSpeed || 3.2;
    const nextX = p2.x + Math.sign(p2.dx) * spd * lookAhead;
    const nextY = p2.y + Math.sign(p2.dy) * spd * lookAhead;
    
    if (checkCollision({ x: nextX, y: nextY }) || (botDecisionCounter > 65 && Math.random() < 0.22)) {
      botDecisionCounter = 0;
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

  p1.x += p1.dx; p1.y += p1.dy;
  p2.x += p2.dx; p2.y += p2.dy;

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

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  ctx.lineWidth = 4;
  ctx.strokeStyle = p1.color;
  ctx.shadowColor = p1.color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i < p1.trail.length; i++) {
    const pt = p1.trail[i]; if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();

  ctx.strokeStyle = p2.color;
  ctx.shadowColor = p2.color;
  ctx.shadowBlur = 10;
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
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : 'GRID DUEL', canvas.width / 2, 30);

  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = p1.color;
  ctx.fillText('P1: [W/A/S/D] or Left Swipe', 30, 30);
  const p2Text = isBot ? 'BOT LVL ' + currentLevel : 'P2: [ARROWS] or Right Swipe';
  ctx.textAlign = 'right';
  ctx.fillStyle = p2.color;
  ctx.fillText(p2Text, canvas.width - 30, 30);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'center';
    ctx.fillText('NEON LIGHTCYCLES 1v1', canvas.width / 2, canvas.height / 2 - 25);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK / SWIPE TO START', canvas.width / 2, canvas.height / 2 + 20);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = winner.includes('CLEARED') || winner.includes('1') ? '#22c55e' : '#f43f5e';
    ctx.textAlign = 'center';
    ctx.fillText(winner, canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '14px monospace'; ctx.fillStyle = '#ffffff';
    const actionText = isBot 
      ? (winner.includes('CLEARED') ? 'CLICK TO ADVANCE TO LEVEL ' + (currentLevel + 1) + ' →' : 'CLICK TO RETRY LEVEL ' + currentLevel + ' ↺')
      : 'CLICK TO REMATCH';
    ctx.fillText(actionText, canvas.width / 2, canvas.height / 2 + 20);
  }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
`
  },
  {
    id: 'curated_2p_slime_volleyball',
    title: 'Neon Slime Volleyball 1v1: Beach Smash',
    genre: '2-Player Physics Volleyball',
    desc: 'High-energy 2-player volleyball physics with jump spikes, touch/drag controls, and infinite level scaling!',
    controls: 'P1: A/D (Move) + W (Jump) or Left Drag/Tap • P2: Left/Right + Up or Right Drag/Tap / Bot',
    code: `
// Neon Slime Volleyball 1v1: Beach Smash
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

const net = { x: canvas.width / 2 - 6, y: canvas.height - 130, w: 12, h: 130 };
const groundY = canvas.height - 30;

const p1 = { x: 140, y: groundY, r: 42, vx: 0, vy: 0, isGrounded: true, color: '#38bdf8' };
const p2 = { x: canvas.width - 140, y: groundY, r: 42, vx: 0, vy: 0, isGrounded: true, color: '#ec4899' };
const ball = { x: 140, y: 160, vx: 0, vy: 0, r: 18, color: '#fbbf24' };
const particles = [];

function applyLevelSettings() {
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    p2.speed = Math.min(7.5, 3.8 + (currentLevel - 1) * 0.45);
    p2.jumpPower = Math.min(14, 10 + (currentLevel - 1) * 0.6);
  } else {
    p2.speed = 6.5;
    p2.jumpPower = 12.5;
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

// Touch controls (drag left/right to move, tap to jump)
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
  ball.vx = (toP1 ? 1 : -1) * 2;
  ball.vy = -2;
}

function handleGameOverClick() {
  if (winner.includes('1') || winner.includes('CLEARED')) {
    currentLevel++;
  }
  score1 = 0;
  score2 = 0;
  gameOver = false;
  winner = '';
  applyLevelSettings();
  serveBall(true);
}

function update() {
  if (!gameStarted || gameOver) return;

  // P1 Movement
  if (keys['KeyA'] || keys['a']) p1.x -= 6.5;
  if (keys['KeyD'] || keys['d']) p1.x += 6.5;
  if ((keys['KeyW'] || keys['w'] || keys['Space'] || keys[' ']) && p1.isGrounded) {
    p1.vy = -13; p1.isGrounded = false;
    if (window.playSound) window.playSound('jump');
  }

  // P2 Movement
  const isBot = !window.MP || window.MP.isBot;
  if (isBot) {
    // Bot AI: predict ball landing
    if (ball.x > net.x) {
      const targetX = ball.x + (ball.vx * 10);
      const spd = p2.speed || 4.5;
      if (p2.x < targetX - 8) p2.x += spd;
      else if (p2.x > targetX + 8) p2.x -= spd;
      if (ball.y > groundY - 140 && Math.abs(ball.x - p2.x) < 45 && p2.isGrounded && Math.random() < 0.75) {
        p2.vy = -(p2.jumpPower || 11); p2.isGrounded = false;
        if (window.playSound) window.playSound('jump');
      }
    } else {
      // Return to resting position
      const restX = canvas.width - 160;
      if (p2.x < restX - 10) p2.x += 3;
      else if (p2.x > restX + 10) p2.x -= 3;
    }
  } else {
    if (keys['ArrowLeft'] || keys['arrowleft']) p2.x -= 6.5;
    if (keys['ArrowRight'] || keys['arrowright']) p2.x += 6.5;
    if ((keys['ArrowUp'] || keys['arrowup'] || keys['Enter'] || keys['enter']) && p2.isGrounded) {
      p2.vy = -13; p2.isGrounded = false;
      if (window.playSound) window.playSound('jump');
    }
  }

  // Slime physics & boundaries
  [p1, p2].forEach(p => {
    p.vy += 0.65; // gravity
    p.y += p.vy;
    if (p.y >= groundY) { p.y = groundY; p.vy = 0; p.isGrounded = true; }
  });

  p1.x = Math.max(p1.r + 10, Math.min(net.x - p1.r, p1.x));
  p2.x = Math.max(net.x + net.w + p2.r, Math.min(canvas.width - p2.r - 10, p2.x));

  // Ball physics
  ball.vy += 0.40; // gravity
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Ball vs Outer Walls
  if (ball.x - ball.r <= 10) { ball.x = 10 + ball.r; ball.vx = Math.abs(ball.vx) * 0.85; }
  if (ball.x + ball.r >= canvas.width - 10) { ball.x = canvas.width - 10 - ball.r; ball.vx = -Math.abs(ball.vx) * 0.85; }
  if (ball.y - ball.r <= 10) { ball.y = 10 + ball.r; ball.vy = Math.abs(ball.vy); }

  // Ball vs Net
  if (ball.x + ball.r >= net.x && ball.x - ball.r <= net.x + net.w && ball.y + ball.r >= net.y) {
    ball.vx *= -0.85;
    if (ball.x < canvas.width / 2) ball.x = net.x - ball.r;
    else ball.x = net.x + net.w + ball.r;
    if (window.playSound) window.playSound('click');
  }

  // Ball vs Slimes (Semi-Circle Collision)
  [p1, p2].forEach(p => {
    const dx = ball.x - p.x;
    const dy = ball.y - p.y;
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

  // Ground Scoring
  if (ball.y + ball.r >= groundY) {
    if (ball.x < canvas.width / 2) {
      score2++;
      if (window.playSound) window.playSound('powerup');
      if (score2 >= winningScore) {
        gameOver = true;
        winner = isBot ? 'COMPUTER WINS THIS ROUND!' : 'PLAYER 2 WINS!';
        if (window.playSound) window.playSound('gameover');
      } else serveBall(true);
    } else {
      score1++;
      if (window.playSound) window.playSound('powerup');
      if (score1 >= winningScore) {
        gameOver = true;
        winner = isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'PLAYER 1 WINS!';
        if (window.playSound) window.playSound('win');
      } else serveBall(false);
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx; pt.y += pt.vy;
    pt.life -= 0.04;
    if (pt.life <= 0) particles.splice(i, 1);
  }
}

function createSparks(x, y, color) {
  for (let i = 0; i < 14; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
      r: Math.random() * 3 + 1, life: 1, color
    });
  }
}

function draw() {
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ground
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
  ctx.strokeRect(0, groundY, canvas.width, canvas.height - groundY);

  // Net
  ctx.fillStyle = '#94a3b8';
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
  ctx.fillRect(net.x, net.y, net.w, net.h);
  ctx.shadowBlur = 0;

  // Slimes (Semi-circles)
  [p1, p2].forEach(p => {
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    // Eye
    const eyeX = p === p1 ? p.x + 16 : p.x - 16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(eyeX, p.y - 18, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(eyeX + (p === p1 ? 2 : -2), p.y - 18, 3, 0, Math.PI * 2); ctx.fill();
  });

  // Ball
  ctx.fillStyle = ball.color;
  ctx.shadowColor = ball.color; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Particles
  for (const pt of particles) {
    ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Score HUD & Level
  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : 'VOLLEYBALL DUEL', canvas.width / 2, 25);

  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(score1, canvas.width / 2 - 80, 60);
  ctx.fillStyle = '#ec4899';
  ctx.fillText(score2, canvas.width / 2 + 80, 60);

  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('P1: [A/D+W] or Left Drag/Tap', 30, 25);
  const p2Title = isBot ? 'BOT LVL ' + currentLevel : 'P2: [ARROWS] or Right Drag/Tap';
  ctx.textAlign = 'right';
  ctx.fillText(p2Title, canvas.width - 30, 25);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('SLIME VOLLEYBALL 1v1', canvas.width / 2, canvas.height / 2 - 25);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK / TAP TO SERVE BALL', canvas.width / 2, canvas.height / 2 + 20);
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

function loop() { update(); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
`
  },
  {
    id: 'curated_2p_speed_chess',
    title: 'Speed Chess 1v1: Cyber Grid',
    genre: '2-Player Board Tactics',
    desc: 'Tactical grid chess duel with full touch & click rules and infinite AI level scaling! Checkmate the enemy King!',
    controls: 'Touch/Click piece to show legal moves • Touch/Click highlighted dot to move (White: P1 • Black: P2 / Bot)',
    code: `
// Speed Chess 1v1: Cyber Grid
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.tabIndex = 0;

const TILE_SIZE = 64;
const BOARD_OFFSET_X = (canvas.width - TILE_SIZE * 8) / 2;
const BOARD_OFFSET_Y = 40;

let currentLevel = 1;
let gameStarted = false;
let turn = 'w';
let selected = null;
let legalMoves = [];
let gameOver = false;
let winner = '';

let board = [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R']
];

const pieceSymbols = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

function isInside(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function isWhitePiece(p) { return p && p === p.toUpperCase(); }
function isBlackPiece(p) { return p && p === p.toLowerCase(); }

function getLegalMovesForPiece(r, c, b) {
  const p = b[r][c];
  if (!p) return [];
  const moves = [];
  const isWhite = isWhitePiece(p);
  const type = p.toUpperCase();

  const addMoveIfValid = (nr, nc) => {
    if (!isInside(nr, nc)) return false;
    const target = b[nr][nc];
    if (!target) { moves.push({ row: nr, col: nc }); return true; }
    if (isWhite && isBlackPiece(target)) { moves.push({ row: nr, col: nc }); return false; }
    if (!isWhite && isWhitePiece(target)) { moves.push({ row: nr, col: nc }); return false; }
    return false;
  };

  const scanRay = (dr, dc) => {
    let nr = r + dr; let nc = c + dc;
    while (isInside(nr, nc)) {
      const target = b[nr][nc];
      if (!target) { moves.push({ row: nr, col: nc }); }
      else {
        if ((isWhite && isBlackPiece(target)) || (!isWhite && isWhitePiece(target))) {
          moves.push({ row: nr, col: nc });
        }
        break;
      }
      nr += dr; nc += dc;
    }
  };

  if (type === 'P') {
    const dir = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;
    if (isInside(r + dir, c) && !b[r + dir][c]) {
      moves.push({ row: r + dir, col: c });
      if (r === startRow && !b[r + dir * 2][c]) {
        moves.push({ row: r + dir * 2, col: c });
      }
    }
    [-1, 1].forEach(dc => {
      const nr = r + dir; const nc = c + dc;
      if (isInside(nr, nc)) {
        const target = b[nr][nc];
        if (target && ((isWhite && isBlackPiece(target)) || (!isWhite && isWhitePiece(target)))) {
          moves.push({ row: nr, col: nc });
        }
      }
    });
  } else if (type === 'N') {
    const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    offsets.forEach(([dr, dc]) => addMoveIfValid(r + dr, c + dc));
  } else if (type === 'B') {
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr, dc]) => scanRay(dr, dc));
  } else if (type === 'R') {
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => scanRay(dr, dc));
  } else if (type === 'Q') {
    [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => scanRay(dr, dc));
  } else if (type === 'K') {
    [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => addMoveIfValid(r + dr, c + dc));
  }

  return moves;
}

canvas.addEventListener('click', e => {
  canvas.focus({ preventScroll: true });
  if (!gameStarted) { gameStarted = true; if (window.playSound) window.playSound('click'); return; }
  if (gameOver) { handleGameOverClick(); return; }

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const col = Math.floor((x - BOARD_OFFSET_X) / TILE_SIZE);
  const row = Math.floor((y - BOARD_OFFSET_Y) / TILE_SIZE);
  if (!isInside(row, col)) return;

  const piece = board[row][col];
  const isWhite = isWhitePiece(piece);

  if (selected) {
    const isMove = legalMoves.some(m => m.row === row && m.col === col);
    if (isMove) {
      executeMove(selected.row, selected.col, row, col);
      selected = null;
      legalMoves = [];
      return;
    }
  }

  if (piece && ((turn === 'w' && isWhite) || (turn === 'b' && !isWhite && (!window.MP || !window.MP.isBot)))) {
    selected = { row, col };
    legalMoves = getLegalMovesForPiece(row, col, board);
    if (window.playSound) window.playSound('click');
  } else {
    selected = null;
    legalMoves = [];
  }
});

function executeMove(fromR, fromC, toR, toC) {
  const captured = board[toR][toC];
  if (captured) {
    if (window.playSound) window.playSound('hit');
  } else {
    if (window.playSound) window.playSound('jump');
  }

  const isBot = !window.MP || window.MP.isBot;
  if (captured === 'k') {
    gameOver = true;
    winner = isBot ? '★ LEVEL ' + currentLevel + ' CLEARED! ★' : 'WHITE (PLAYER 1) WINS!';
    if (window.playSound) window.playSound('win');
  }
  if (captured === 'K') {
    gameOver = true;
    winner = isBot ? 'COMPUTER WINS THIS ROUND!' : 'BLACK (PLAYER 2) WINS!';
    if (window.playSound) window.playSound('gameover');
  }

  board[toR][toC] = board[fromR][fromC];
  board[fromR][fromC] = '';

  if (board[toR][toC] === 'P' && toR === 0) board[toR][toC] = 'Q';
  if (board[toR][toC] === 'p' && toR === 7) board[toR][toC] = 'q';

  turn = turn === 'w' ? 'b' : 'w';

  if (!gameOver && turn === 'b' && isBot) {
    setTimeout(makeBotMove, 450);
  }
}

function makeBotMove() {
  const allBlackMoves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (isBlackPiece(board[r][c])) {
        const moves = getLegalMovesForPiece(r, c, board);
        moves.forEach(m => {
          const target = board[m.row][m.col];
          const isCapture = Boolean(target);
          const isKingCapture = (target === 'K');
          allBlackMoves.push({ fromR: r, fromC: c, toR: m.row, toC: m.col, isCapture, isKingCapture });
        });
      }
    }
  }

  if (allBlackMoves.length === 0) {
    gameOver = true; winner = '★ LEVEL ' + currentLevel + ' CLEARED! ★';
    return;
  }

  const winMove = allBlackMoves.find(m => m.isKingCapture);
  if (winMove) {
    executeMove(winMove.fromR, winMove.fromC, winMove.toR, winMove.toC);
    return;
  }

  const captureProb = Math.min(0.95, 0.20 + (currentLevel - 1) * 0.15);
  const captures = allBlackMoves.filter(m => m.isCapture);
  if (captures.length > 0 && Math.random() < captureProb) {
    const chosen = captures[Math.floor(Math.random() * captures.length)];
    executeMove(chosen.fromR, chosen.fromC, chosen.toR, chosen.toC);
  } else {
    const chosen = allBlackMoves[Math.floor(Math.random() * allBlackMoves.length)];
    executeMove(chosen.fromR, chosen.fromC, chosen.toR, chosen.toC);
  }
}

function handleGameOverClick() {
  if (winner.includes('1') || winner.includes('CLEARED') || winner.includes('WHITE')) {
    currentLevel++;
  }
  board = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
  turn = 'w';
  selected = null;
  legalMoves = [];
  gameOver = false;
  winner = '';
}

function draw() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#334155' : '#1e293b';
      if (selected && selected.row === r && selected.col === c) {
        ctx.fillStyle = '#0284c7';
      }
      ctx.fillRect(BOARD_OFFSET_X + c * TILE_SIZE, BOARD_OFFSET_Y + r * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      const piece = board[r][c];
      if (piece) {
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isWhitePiece(piece) ? '#38bdf8' : '#f43f5e';
        ctx.fillText(pieceSymbols[piece], BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2, BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2 + 4);
      }
    }
  }

  for (const m of legalMoves) {
    const cx = BOARD_OFFSET_X + m.col * TILE_SIZE + TILE_SIZE / 2;
    const cy = BOARD_OFFSET_Y + m.row * TILE_SIZE + TILE_SIZE / 2;
    const target = board[m.row][m.col];
    
    ctx.fillStyle = target ? '#ef4444' : '#22c55e';
    ctx.shadowColor = target ? '#ef4444' : '#22c55e';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, target ? 10 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : 'SPEED CHESS', canvas.width / 2, 20);

  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = turn === 'w' ? '#38bdf8' : '#f43f5e';
  const statusText = turn === 'w' ? 'WHITE TURN (PLAYER 1)' : (isBot ? 'COMPUTER THINKING...' : 'BLACK TURN (PLAYER 2)');
  ctx.fillText(statusText, canvas.width / 2, 35);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('SPEED CHESS 1v1', canvas.width / 2, canvas.height / 2 - 25);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TOUCH / CLICK TO START', canvas.width / 2, canvas.height / 2 + 20);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = winner.includes('CLEARED') || winner.includes('WHITE') ? '#22c55e' : '#f43f5e';
    ctx.fillText(winner, canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    const actionText = isBot 
      ? (winner.includes('CLEARED') ? 'CLICK TO ADVANCE TO LEVEL ' + (currentLevel + 1) + ' →' : 'CLICK TO RETRY LEVEL ' + currentLevel + ' ↺')
      : 'CLICK TO PLAY AGAIN';
    ctx.fillText(actionText, canvas.width / 2, canvas.height / 2 + 25);
  }
}

function loop() { draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
`
  },
  {
    id: 'curated_2p_wizard_duel',
    title: 'Wizard Spellfire 1v1: Arcane Duel',
    genre: '2-Player Arcane Combat',
    desc: 'Battle of wizards with elemental spellcasting, shields, jump levitation, split touch controls, and infinite level scaling!',
    controls: 'P1: A/D (Move) + W (Levitate) + Space (Spell) / Left Touch • P2: Arrows + Enter / Right Touch / Bot',
    code: `
// Wizard Spellfire 1v1: Arcane Duel
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.tabIndex = 0;

let currentLevel = 1;
let gameStarted = false;
let gameOver = false;
let winner = '';

const groundY = canvas.height - 50;

const p1 = { x: 120, y: groundY - 30, w: 32, h: 48, vx: 0, vy: 0, hp: 100, maxHp: 100, color: '#38bdf8', cooldown: 0, shield: 0, isGrounded: true };
const p2 = { x: canvas.width - 120, y: groundY - 30, w: 32, h: 48, vx: 0, vy: 0, hp: 75, maxHp: 75, color: '#a855f7', cooldown: 0, shield: 0, isGrounded: true };

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

// Split Touch Controls
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
  gameOver = false;
  winner = '';
  applyLevelSettings();
}

function castSpell(wizard, dir, isP1) {
  if (wizard.cooldown > 0) return;
  wizard.cooldown = 18;
  spells.push({
    x: wizard.x + dir * 25,
    y: wizard.y - 10,
    vx: dir * 9,
    vy: (Math.random() - 0.5) * 1.5,
    r: 9,
    color: wizard.color,
    isP1
  });
  if (window.playSound) window.playSound('shoot');
}

let botCastTimer = 0;

function update() {
  if (!gameStarted || gameOver) return;

  // P1 Controls
  if (keys['KeyA'] || keys['a']) p1.vx = -5.5;
  else if (keys['KeyD'] || keys['d']) p1.vx = 5.5;
  else p1.vx *= 0.82;

  if ((keys['KeyW'] || keys['w']) && p1.isGrounded) {
    p1.vy = -12.5; p1.isGrounded = false;
    if (window.playSound) window.playSound('jump');
  }
  if (keys['Space'] || keys[' ']) castSpell(p1, 1, true);

  // P2 Controls (Bot or Arrows)
  const isBot = !window.MP || window.MP.isBot;
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

  // Physics
  [p1, p2].forEach(p => {
    p.vy += 0.55;
    p.x += p.vx;
    p.y += p.vy;
    if (p.cooldown > 0) p.cooldown--;
    if (p.y >= groundY - p.h / 2) { p.y = groundY - p.h / 2; p.vy = 0; p.isGrounded = true; }
  });

  p1.x = Math.max(30, Math.min(canvas.width / 2 - 30, p1.x));
  p2.x = Math.max(canvas.width / 2 + 30, Math.min(canvas.width - 30, p2.x));

  // Spells
  for (let i = spells.length - 1; i >= 0; i--) {
    const s = spells[i];
    s.x += s.vx; s.y += s.vy;
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

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx; pt.y += pt.vy;
    pt.life -= 0.04;
    if (pt.life <= 0) particles.splice(i, 1);
  }
}

function createSparks(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
      r: Math.random() * 3 + 1, life: 1, color
    });
  }
}

function draw() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ground Arena Platform
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();

  // Draw Wizards
  [p1, p2].forEach(p => {
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color; ctx.shadowBlur = 15;
    
    // Robe body
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.h / 2);
    ctx.lineTo(p.x - p.w / 2, p.y + p.h / 2);
    ctx.lineTo(p.x + p.w / 2, p.y + p.h / 2);
    ctx.closePath();
    ctx.fill();

    // Wizard Hat
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.h / 2 - 18);
    ctx.lineTo(p.x - 14, p.y - p.h / 2);
    ctx.lineTo(p.x + 14, p.y - p.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Draw Spells
  for (const s of spells) {
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Draw Particles
  for (const pt of particles) {
    ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Level & HUD
  const isBot = !window.MP || window.MP.isBot;
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'center';
  ctx.fillText(isBot ? '★ LEVEL ' + currentLevel + ' ★' : 'ARCANE SPELLFIRE', canvas.width / 2, 25);

  drawHealthBar(30, 25, p1.hp, p1.maxHp, p1.color, 'P1: WASD+Space / Left Touch');
  const p2Title = isBot ? 'BOT LVL ' + currentLevel : 'P2: ARROWS+Enter / Right Touch';
  drawHealthBar(canvas.width - 190, 25, p2.hp, p2.maxHp, p2.color, p2Title);

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('WIZARD SPELLFIRE 1v1', canvas.width / 2, canvas.height / 2 - 25);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK / TOUCH TO START', canvas.width / 2, canvas.height / 2 + 20);
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

function drawHealthBar(x, y, hp, maxHp, color, label) {
  ctx.fillStyle = '#1e293b'; ctx.fillRect(x, y, 160, 14);
  ctx.fillStyle = color; ctx.fillRect(x, y, (Math.max(0, hp) / (maxHp || 100)) * 160, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.strokeRect(x, y, 160, 14);
  ctx.font = '10px monospace'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 5);
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
`
  }
];
