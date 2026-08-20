/**
 * Curated Single-Player Arcade Game Library
 * Complete, unminified, self-contained HTML5 Canvas source code with ZzFX sound engine.
 */

export const CURATED_GAMES = [
  {
    id: 'curated_space_invaders',
    title: 'Space Defender: Cyber Beetle Invaders',
    genre: 'Retro Shooter',
    desc: 'Defend the orbital neon matrix from descending waves of cyber beetles. Shoot plasma bolts and collect floating score orbs.',
    controls: 'A/D or Left/Right: Move • Space or Left Click: Shoot',
    code: `
// Space Defender: Cyber Beetle Invaders
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let level = 1;
let gameOver = false;
let victory = false;

const player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 70,
  w: 50,
  h: 24,
  speed: 7,
  color: '#38bdf8'
};

const bullets = [];
const particles = [];
const beetles = [];
const stars = [];

// Starfield Background
for (let i = 0; i < 70; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 1.5 + 0.5
  });
}

function initWave() {
  beetles.length = 0;
  const rows = 3 + Math.min(level, 3);
  const cols = 8;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      beetles.push({
        x: 80 + c * 80,
        y: 60 + r * 48,
        w: 42,
        h: 28,
        hp: 1,
        color: r === 0 ? '#f43f5e' : (r === 1 ? '#a855f7' : '#22c55e'),
        points: (rows - r) * 10
      });
    }
  }
}
initWave();

let beetleDir = 1;
let beetleSpeed = 1.2;
let beetleStepDown = 0;

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') {
    e.preventDefault();
    fireBullet();
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

canvas.addEventListener('click', () => {
  fireBullet();
});

// Mobile Touch & Mouse Drag Controls
function handlePointerMove(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
  if (typeof clientX === 'number') {
    player.x = (clientX - rect.left) * scaleX - player.w / 2;
    player.x = Math.max(10, Math.min(canvas.width - player.w - 10, player.x));
  }
}
canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handlePointerMove(e); }, { passive: false });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handlePointerMove(e); fireBullet(); }, { passive: false });

let lastShoot = 0;
function fireBullet() {
  if (gameOver) {
    score = 0;
    level = 1;
    gameOver = false;
    victory = false;
    player.x = canvas.width / 2 - 25;
    initWave();
    return;
  }
  const now = performance.now();
  if (now - lastShoot < 200) return;
  lastShoot = now;

  bullets.push({
    x: player.x + player.w / 2 - 3,
    y: player.y,
    w: 6,
    h: 16,
    speed: 10,
    color: '#facc15'
  });
  if (window.playSound) playSound('laser');
}

function createExplosion(x, y, color, count = 16) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * 4 + 1;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      size: Math.random() * 4 + 2,
      color: color,
      life: 1.0,
      decay: Math.random() * 0.04 + 0.02
    });
  }
}

function gameLoop() {
  // Update Starfield
  for (const s of stars) {
    s.y += s.speed;
    if (s.y > canvas.height) s.y = 0;
  }

  if (!gameOver) {
    // Player Controls
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;
    player.x = Math.max(10, Math.min(canvas.width - player.w - 10, player.x));

    // Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y -= b.speed;
      if (b.y < -20) {
        bullets.splice(i, 1);
        continue;
      }

      // Check bullet vs beetles
      for (let j = beetles.length - 1; j >= 0; j--) {
        const bg = beetles[j];
        if (b.x + b.w > bg.x && b.x < bg.x + bg.w && b.y < bg.y + bg.h && b.y + b.h > bg.y) {
          bullets.splice(i, 1);
          createExplosion(bg.x + bg.w / 2, bg.y + bg.h / 2, bg.color, 18);
          score += bg.points;
          beetles.splice(j, 1);
          if (window.playSound) playSound('explosion');
          break;
        }
      }
    }

    // Update Beetles Swarm
    let hitEdge = false;
    for (const bg of beetles) {
      bg.x += beetleDir * beetleSpeed;
      if (bg.x <= 20 || bg.x + bg.w >= canvas.width - 20) {
        hitEdge = true;
      }
      if (bg.y + bg.h >= player.y) {
        gameOver = true;
        if (window.playSound) playSound('gameover');
      }
    }

    if (hitEdge) {
      beetleDir *= -1;
      for (const bg of beetles) {
        bg.y += 18;
      }
    }

    // Check Wave Victory
    if (beetles.length === 0) {
      level++;
      beetleSpeed += 0.3;
      if (window.playSound) playSound('win');
      initWave();
    }
  }

  // Update Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Render Background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render Stars
  for (const s of stars) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }

  // Render Beetles
  for (const bg of beetles) {
    ctx.fillStyle = bg.color;
    ctx.beginPath();
    ctx.roundRect(bg.x, bg.y, bg.w, bg.h, [6]);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(bg.x + 8, bg.y + 6, 6, 8);
    ctx.fillRect(bg.x + bg.w - 14, bg.y + 6, 6, 8);
  }

  // Render Bullets
  for (const b of bullets) {
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
  }

  // Render Player
  ctx.fillStyle = player.color;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(player.x + player.w / 2, player.y);
  ctx.lineTo(player.x + player.w, player.y + player.h);
  ctx.lineTo(player.x, player.y + player.h);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Render Particles
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1.0;
  }

  // Render HUD
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('SCORE: ' + score, 24, 36);

  ctx.fillStyle = '#38bdf8';
  ctx.fillText('WAVE: ' + level, canvas.width - 130, 36);

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText('Press SPACE or CLICK to Restart', canvas.width / 2, canvas.height / 2 + 25);
    ctx.textAlign = 'left';
  }

  requestAnimationFrame(gameLoop);
}
gameLoop();
`
  },
  {
    id: 'curated_neon_katana',
    title: 'Cyber Katana: Shadow Slicer',
    genre: 'Mouse Slash Action',
    desc: 'Hold left click and drag your cursor to draw a glowing katana slice line. Cut flying cyber ninjas and rubies, avoid skull bombs.',
    controls: 'Hold Left Click & Drag Mouse to Slash',
    code: `
// Cyber Katana: Shadow Slicer
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let combo = 0;
let lives = 3;
let gameOver = false;

const targets = [];
const particles = [];
const slashTrail = [];
let isSlashing = false;

function spawnTarget() {
  if (gameOver) return;
  const isBomb = Math.random() < 0.18;
  const isGem = !isBomb && Math.random() < 0.35;
  const x = 100 + Math.random() * (canvas.width - 200);
  const vx = (Math.random() - 0.5) * 4;
  const vy = -(Math.random() * 4 + 11);

  targets.push({
    x: x,
    y: canvas.height + 20,
    vx: vx,
    vy: vy,
    radius: isBomb ? 22 : (isGem ? 18 : 24),
    type: isBomb ? 'bomb' : (isGem ? 'gem' : 'ninja'),
    color: isBomb ? '#ef4444' : (isGem ? '#ec4899' : '#06b6d4'),
    sliced: false,
    rotation: 0,
    rotSpeed: (Math.random() - 0.5) * 0.1
  });
}

setInterval(spawnTarget, 900);

canvas.addEventListener('mousedown', (e) => {
  if (gameOver) {
    score = 0;
    combo = 0;
    lives = 3;
    gameOver = false;
    targets.length = 0;
    return;
  }
  isSlashing = true;
  slashTrail.length = 0;
  addTrailPoint(e);
});

canvas.addEventListener('mousemove', (e) => {
  if (!isSlashing) return;
  addTrailPoint(e);
  checkSliceCollisions();
});

window.addEventListener('mouseup', () => {
  isSlashing = false;
  slashTrail.length = 0;
});

function addTrailPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  slashTrail.push({
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
    life: 1.0
  });
  if (slashTrail.length > 14) slashTrail.shift();
}

function checkSliceCollisions() {
  if (slashTrail.length < 2) return;
  const p1 = slashTrail[slashTrail.length - 2];
  const p2 = slashTrail[slashTrail.length - 1];

  for (const t of targets) {
    if (t.sliced) continue;
    const dist = distToSegment(t.x, t.y, p1.x, p1.y, p2.x, p2.y);
    if (dist < t.radius + 6) {
      t.sliced = true;
      if (t.type === 'bomb') {
        createExplosion(t.x, t.y, '#ef4444', 30);
        lives = 0;
        gameOver = true;
        if (window.playSound) playSound('gameover');
      } else if (t.type === 'gem') {
        combo++;
        score += 50 * combo;
        createExplosion(t.x, t.y, '#ec4899', 20);
        if (window.playSound) playSound('coin');
      } else {
        combo++;
        score += 20 * combo;
        createExplosion(t.x, t.y, '#06b6d4', 20);
        if (window.playSound) playSound('hit');
      }
    }
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1)**2 + (y2 - y1)**2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1)*(x2 - x1) + (py - y1)*(y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t*(x2 - x1)), py - (y1 + t*(y2 - y1)));
}

function createExplosion(x, y, color, count = 16) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * 6 + 1;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      size: Math.random() * 4 + 2,
      color: color,
      life: 1.0,
      decay: Math.random() * 0.04 + 0.02
    });
  }
}

function gameLoop() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Update & Draw Targets
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    t.x += t.vx;
    t.y += t.vy;
    t.vy += 0.28; // Gravity
    t.rotation += t.rotSpeed;

    if (t.y > canvas.height + 60 && !t.sliced) {
      if (t.type === 'ninja') {
        lives--;
        combo = 0;
        if (lives <= 0) {
          gameOver = true;
          if (window.playSound) playSound('gameover');
        }
      }
      targets.splice(i, 1);
      continue;
    } else if (t.y > canvas.height + 60) {
      targets.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.rotation);
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    if (t.type === 'gem') {
      ctx.moveTo(0, -t.radius);
      ctx.lineTo(t.radius, 0);
      ctx.lineTo(0, t.radius);
      ctx.lineTo(-t.radius, 0);
      ctx.closePath();
    } else {
      ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.type === 'bomb' ? '💣' : (t.type === 'gem' ? '💎' : '🥷'), 0, 0);
    ctx.restore();
  }

  // Slash Blade Trail
  if (slashTrail.length > 1) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(slashTrail[0].x, slashTrail[0].y);
    for (let i = 1; i < slashTrail.length; i++) {
      ctx.lineTo(slashTrail[i].x, slashTrail[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Update Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1.0;
  }

  // HUD
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('SCORE: ' + score, 24, 38);

  ctx.fillStyle = combo > 1 ? '#ec4899' : '#94a3b8';
  ctx.fillText('COMBO: ' + combo + 'x', 24, 68);

  ctx.fillStyle = '#ef4444';
  ctx.fillText('LIVES: ' + '❤️'.repeat(Math.max(0, lives)), canvas.width - 170, 38);

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText('Click anywhere to slash again', canvas.width / 2, canvas.height / 2 + 25);
    ctx.textAlign = 'left';
  }

  requestAnimationFrame(gameLoop);
}
gameLoop();
`
  },
  {
    id: 'curated_neon_breaker',
    title: 'Hyper Brick: Neon Breaker',
    genre: 'Arcade Classic',
    desc: 'Classic neon brick breaker with physics bounce angles, multi-colored brick tiers, and score multipliers.',
    controls: 'Mouse Movement or Left/Right Arrow Keys: Move Paddle',
    code: `
// Hyper Brick: Neon Breaker
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let lives = 3;
let gameOver = false;

const paddle = {
  w: 110,
  h: 18,
  x: canvas.width / 2 - 55,
  y: canvas.height - 45,
  color: '#38bdf8'
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height - 70,
  radius: 8,
  vx: 5,
  vy: -5,
  speed: 6.5,
  color: '#facc15'
};

const bricks = [];
const rows = 5;
const cols = 9;
const brickW = 74;
const brickH = 26;
const padding = 10;
const offsetTop = 60;
const offsetLeft = 24;

const colors = ['#f43f5e', '#fb923c', '#facc15', '#22c55e', '#06b6d4'];

function initBricks() {
  bricks.length = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      bricks.push({
        x: offsetLeft + c * (brickW + padding),
        y: offsetTop + r * (brickH + padding),
        w: brickW,
        h: brickH,
        color: colors[r % colors.length],
        active: true,
        points: (rows - r) * 20
      });
    }
  }
}
initBricks();

function handlePaddleMove(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
  if (typeof clientX === 'number') {
    paddle.x = (clientX - rect.left) * scaleX - paddle.w / 2;
    paddle.x = Math.max(10, Math.min(canvas.width - paddle.w - 10, paddle.x));
  }
}
canvas.addEventListener('mousemove', handlePaddleMove);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handlePaddleMove(e); }, { passive: false });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handlePaddleMove(e); }, { passive: false });

canvas.addEventListener('click', () => {
  if (gameOver) {
    score = 0;
    lives = 3;
    gameOver = false;
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 70;
    ball.vx = 5;
    ball.vy = -5;
    initBricks();
  }
});

function gameLoop() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameOver) {
    // Move Ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall Collisions
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
      ball.vx *= -1;
      if (window.playSound) playSound('jump');
    }
    if (ball.y - ball.radius <= 0) {
      ball.vy *= -1;
      if (window.playSound) playSound('jump');
    }

    // Paddle Collision
    if (ball.y + ball.radius >= paddle.y && ball.y - ball.radius <= paddle.y + paddle.h &&
        ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
      const hitOffset = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.vx = hitOffset * 7;
      ball.vy = -Math.abs(ball.vy);
      if (window.playSound) playSound('laser');
    }

    // Brick Collisions
    let allCleared = true;
    for (const b of bricks) {
      if (!b.active) continue;
      allCleared = false;
      if (ball.x + ball.radius > b.x && ball.x - ball.radius < b.x + b.w &&
          ball.y + ball.radius > b.y && ball.y - ball.radius < b.y + b.h) {
        b.active = false;
        ball.vy *= -1;
        score += b.points;
        if (window.playSound) playSound('explosion');
        break;
      }
    }

    if (allCleared) {
      initBricks();
      ball.speed += 1;
      if (window.playSound) playSound('win');
    }

    // Ball Out of Bounds
    if (ball.y > canvas.height + 20) {
      lives--;
      if (lives <= 0) {
        gameOver = true;
        if (window.playSound) playSound('gameover');
      } else {
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 70;
        ball.vx = 5;
        ball.vy = -5;
        if (window.playSound) playSound('hit');
      }
    }
  }

  // Draw Bricks
  for (const b of bricks) {
    if (!b.active) continue;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, [4]);
    ctx.fill();
    ctx.strokeStyle = '#ffffff33';
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }

  // Draw Paddle
  ctx.fillStyle = paddle.color;
  ctx.shadowColor = paddle.color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, [8]);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw Ball
  ctx.fillStyle = ball.color;
  ctx.shadowColor = ball.color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw HUD
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('SCORE: ' + score, 24, 36);

  ctx.fillStyle = '#ef4444';
  ctx.fillText('BALLS: ' + '🟡 '.repeat(Math.max(0, lives)), canvas.width - 170, 36);

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText('Click to Play Again', canvas.width / 2, canvas.height / 2 + 25);
    ctx.textAlign = 'left';
  }

  requestAnimationFrame(gameLoop);
}
gameLoop();
`
  },
  {
    id: 'curated_neon_snake',
    title: 'Neon Snake: Matrix Byte',
    genre: 'Grid Strategy',
    desc: 'Collect glowing power bytes, grow your tail, and avoid walls and collisions in this fast-paced neon grid classic.',
    controls: 'WASD or Arrow Keys: Change Direction',
    code: `
// Neon Snake: Matrix Byte
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRID = 24;
const COLS = Math.floor(canvas.width / GRID);
const ROWS = Math.floor(canvas.height / GRID);

let snake = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }];
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let food = { x: 18, y: 12 };
let score = 0;
let gameOver = false;
let speed = 90; // ms per tick

function spawnFood() {
  while (true) {
    const fx = Math.floor(Math.random() * (COLS - 2)) + 1;
    const fy = Math.floor(Math.random() * (ROWS - 2)) + 1;
    if (!snake.some(s => s.x === fx && s.y === fy)) {
      food = { x: fx, y: fy };
      break;
    }
  }
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'KeyW'].includes(e.code) && dir.y === 0) nextDir = { x: 0, y: -1 };
  else if (['ArrowDown', 'KeyS'].includes(e.code) && dir.y === 0) nextDir = { x: 0, y: 1 };
  else if (['ArrowLeft', 'KeyA'].includes(e.code) && dir.x === 0) nextDir = { x: -1, y: 0 };
  else if (['ArrowRight', 'KeyD'].includes(e.code) && dir.x === 0) nextDir = { x: 1, y: 0 };
  else if (e.code === 'Space' && gameOver) {
    resetGame();
  }
});

canvas.addEventListener('click', () => {
  if (gameOver) resetGame();
});

// Mobile Touch Swipe & Tap Controls
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
  if (gameOver) { resetGame(); return; }
  if (e.touches && e.touches[0]) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
  if (!e.changedTouches || !e.changedTouches[0]) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > 20 || absDy > 20) {
    if (absDx > absDy) {
      if (dx > 0 && dir.x === 0) nextDir = { x: 1, y: 0 };
      else if (dx < 0 && dir.x === 0) nextDir = { x: -1, y: 0 };
    } else {
      if (dy > 0 && dir.y === 0) nextDir = { x: 0, y: 1 };
      else if (dy < 0 && dir.y === 0) nextDir = { x: 0, y: -1 };
    }
  }
}, { passive: true });

function resetGame() {
  snake = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  gameOver = false;
  spawnFood();
}

let lastTick = 0;
function gameLoop(time) {
  if (!gameOver && time - lastTick > speed) {
    lastTick = time;
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      gameOver = true;
      if (window.playSound) playSound('gameover');
    }

    // Body collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      gameOver = true;
      if (window.playSound) playSound('gameover');
    }

    if (!gameOver) {
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        if (window.playSound) playSound('coin');
        spawnFood();
      } else {
        snake.pop();
      }
    }
  }

  // Draw
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  for (let x = 0; x < canvas.width; x += GRID) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += GRID) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Draw Food
  ctx.fillStyle = '#ec4899';
  ctx.shadowColor = '#ec4899';
  ctx.shadowBlur = 14;
  ctx.fillRect(food.x * GRID + 3, food.y * GRID + 3, GRID - 6, GRID - 6);
  ctx.shadowBlur = 0;

  // Draw Snake
  for (let i = 0; i < snake.length; i++) {
    const s = snake[i];
    ctx.fillStyle = i === 0 ? '#22c55e' : '#16a34a';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = i === 0 ? 10 : 0;
    ctx.beginPath();
    ctx.roundRect(s.x * GRID + 2, s.y * GRID + 2, GRID - 4, GRID - 4, [4]);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // HUD
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('SCORE: ' + score, 24, 36);

  ctx.fillStyle = '#22c55e';
  ctx.fillText('LENGTH: ' + snake.length, canvas.width - 140, 36);

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText('Press SPACE or CLICK to Restart', canvas.width / 2, canvas.height / 2 + 25);
    ctx.textAlign = 'left';
  }

  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
`
  },
  {
    id: 'curated_tank_combat',
    title: 'Neon Armor: Tank Mayhem',
    genre: 'Top-Down Combat',
    desc: 'Command an armored tank in an underground arena. Ricochet shells off steel barriers to eliminate enemy drone turrets.',
    controls: 'WASD: Move • Mouse: Aim Turret • Left Click / Space: Fire Shells',
    code: `
// Neon Armor: Tank Mayhem
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let wave = 1;
let gameOver = false;

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 18,
  speed: 4,
  angle: 0,
  hp: 100,
  maxHp: 100
};

let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
const bullets = [];
const enemyBullets = [];
const enemies = [];
const particles = [];

function spawnWave() {
  enemies.length = 0;
  const count = 3 + wave;
  for (let i = 0; i < count; i++) {
    const edge = Math.floor(Math.random() * 4);
    let ex = 0, ey = 0;
    if (edge === 0) { ex = Math.random() * canvas.width; ey = 40; }
    else if (edge === 1) { ex = canvas.width - 40; ey = Math.random() * canvas.height; }
    else if (edge === 2) { ex = Math.random() * canvas.width; ey = canvas.height - 40; }
    else { ex = 40; ey = Math.random() * canvas.height; }

    enemies.push({
      x: ex,
      y: ey,
      radius: 16,
      hp: 2,
      lastShoot: performance.now() + Math.random() * 1000,
      color: '#ef4444'
    });
  }
}
spawnWave();

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') fireShell();
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mousePos = {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
});

canvas.addEventListener('click', () => {
  if (gameOver) {
    score = 0;
    wave = 1;
    player.hp = 100;
    gameOver = false;
    spawnWave();
  } else {
    fireShell();
  }
});

let lastShoot = 0;
function fireShell() {
  const now = performance.now();
  if (now - lastShoot < 220) return;
  lastShoot = now;

  const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
  bullets.push({
    x: player.x + Math.cos(angle) * 24,
    y: player.y + Math.sin(angle) * 24,
    vx: Math.cos(angle) * 8.5,
    vy: Math.sin(angle) * 8.5,
    bounces: 2
  });
  if (window.playSound) playSound('laser');
}

function createExplosion(x, y, color, count = 16) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * 5 + 1;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      size: Math.random() * 4 + 2,
      color: color,
      life: 1.0,
      decay: Math.random() * 0.04 + 0.02
    });
  }
}

function gameLoop() {
  if (!gameOver) {
    // Move Player
    if (keys['KeyW'] || keys['ArrowUp']) player.y -= player.speed;
    if (keys['KeyS'] || keys['ArrowDown']) player.y += player.speed;
    if (keys['KeyA'] || keys['ArrowLeft']) player.x -= player.speed;
    if (keys['KeyD'] || keys['ArrowRight']) player.x += player.speed;

    player.x = Math.max(player.radius + 10, Math.min(canvas.width - player.radius - 10, player.x));
    player.y = Math.max(player.radius + 10, Math.min(canvas.height - player.radius - 10, player.y));

    // Update Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      if (b.x < 10 || b.x > canvas.width - 10) { b.vx *= -1; b.bounces--; }
      if (b.y < 10 || b.y > canvas.height - 10) { b.vy *= -1; b.bounces--; }

      if (b.bounces < 0) {
        bullets.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = enemies.length - 1; j >= 0; j--) {
        const en = enemies[j];
        if (Math.hypot(b.x - en.x, b.y - en.y) < en.radius + 4) {
          en.hp--;
          bullets.splice(i, 1);
          createExplosion(en.x, en.y, '#ef4444', 12);
          if (en.hp <= 0) {
            enemies.splice(j, 1);
            score += 100;
            if (window.playSound) playSound('explosion');
          } else {
            if (window.playSound) playSound('hit');
          }
          break;
        }
      }
    }

    // Update Enemies & Enemy Bullets
    const now = performance.now();
    for (const en of enemies) {
      // Aim at player
      const angle = Math.atan2(player.y - en.y, player.x - en.x);
      en.x += Math.cos(angle) * 1.4;
      en.y += Math.sin(angle) * 1.4;

      if (now - en.lastShoot > 2200) {
        en.lastShoot = now;
        enemyBullets.push({
          x: en.x,
          y: en.y,
          vx: Math.cos(angle) * 5,
          vy: Math.sin(angle) * 5
        });
      }
    }

    // Update Enemy Bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      eb.x += eb.vx;
      eb.y += eb.vy;

      if (eb.x < 0 || eb.x > canvas.width || eb.y < 0 || eb.y > canvas.height) {
        enemyBullets.splice(i, 1);
        continue;
      }

      if (Math.hypot(eb.x - player.x, eb.y - player.y) < player.radius + 4) {
        enemyBullets.splice(i, 1);
        player.hp -= 20;
        createExplosion(player.x, player.y, '#38bdf8', 10);
        if (player.hp <= 0) {
          gameOver = true;
          if (window.playSound) playSound('gameover');
        } else {
          if (window.playSound) playSound('hit');
        }
      }
    }

    if (enemies.length === 0) {
      wave++;
      player.hp = Math.min(player.maxHp, player.hp + 30);
      if (window.playSound) playSound('win');
      spawnWave();
    }
  }

  // Draw
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Enemies
  for (const en of enemies) {
    ctx.fillStyle = en.color;
    ctx.beginPath();
    ctx.arc(en.x, en.y, en.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Bullets
  ctx.fillStyle = '#facc15';
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#f43f5e';
  for (const eb of enemyBullets) {
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Player Tank
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw Turret Barrel
  const aimAngle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(aimAngle) * 24, player.y + Math.sin(aimAngle) * 24);
  ctx.stroke();

  // Draw Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1.0;
  }

  // HUD
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('SCORE: ' + score, 24, 36);

  ctx.fillStyle = '#38bdf8';
  ctx.fillText('WAVE: ' + wave, 24, 62);

  ctx.fillStyle = player.hp > 40 ? '#22c55e' : '#ef4444';
  ctx.fillText('HP: ' + player.hp + '%', canvas.width - 130, 36);

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MISSION FAILED', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText('Click anywhere to deploy again', canvas.width / 2, canvas.height / 2 + 25);
    ctx.textAlign = 'left';
  }

  requestAnimationFrame(gameLoop);
}
gameLoop();
`
  },
  {
    id: 'curated_flappy_glide',
    title: 'Gravity Glide: Neon Cyber Bird',
    genre: 'Physics Runner',
    desc: 'Tap or press Space to flap cyber wings. Glide through high-voltage quantum gates and rack up high scores.',
    controls: 'Spacebar or Left Click: Flap Wings & Gain Altitude',
    code: `
// Gravity Glide: Neon Cyber Bird
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let highScore = 0;
let gameOver = false;

const bird = {
  x: 120,
  y: canvas.height / 2,
  radius: 16,
  vy: 0,
  gravity: 0.42,
  jump: -7.5,
  color: '#facc15'
};

const pipes = [];
const pipeWidth = 64;
const pipeGap = 160;
let pipeTimer = 0;

function spawnPipe() {
  const minTop = 60;
  const maxTop = canvas.height - pipeGap - 60;
  const topH = Math.floor(Math.random() * (maxTop - minTop)) + minTop;
  pipes.push({
    x: canvas.width + 10,
    top: topH,
    bottom: topH + pipeGap,
    passed: false
  });
}

function flap() {
  if (gameOver) {
    bird.y = canvas.height / 2;
    bird.vy = 0;
    score = 0;
    pipes.length = 0;
    gameOver = false;
    return;
  }
  bird.vy = bird.jump;
  if (window.playSound) playSound('jump');
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    flap();
  }
});

canvas.addEventListener('click', flap);
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  flap();
}, { passive: false });

function gameLoop() {
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameOver) {
    bird.vy += bird.gravity;
    bird.y += bird.vy;

    // Floor & Ceiling Collision
    if (bird.y + bird.radius >= canvas.height - 20 || bird.y - bird.radius <= 0) {
      gameOver = true;
      if (window.playSound) playSound('gameover');
    }

    // Pipes Spawn & Update
    pipeTimer++;
    if (pipeTimer % 95 === 0) spawnPipe();

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= 3.2;

      // Score
      if (!p.passed && p.x + pipeWidth < bird.x) {
        p.passed = true;
        score++;
        highScore = Math.max(highScore, score);
        if (window.playSound) playSound('coin');
      }

      // Collision Check
      if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + pipeWidth) {
        if (bird.y - bird.radius < p.top || bird.y + bird.radius > p.bottom) {
          gameOver = true;
          if (window.playSound) playSound('gameover');
        }
      }

      if (p.x + pipeWidth < -20) pipes.splice(i, 1);
    }
  }

  // Draw Pipes
  for (const p of pipes) {
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 10;
    // Top Pipe
    ctx.fillRect(p.x, 0, pipeWidth, p.top);
    // Bottom Pipe
    ctx.fillRect(p.x, p.bottom, pipeWidth, canvas.height - p.bottom);
    ctx.shadowBlur = 0;
  }

  // Draw Ground
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

  // Draw Bird
  ctx.fillStyle = bird.color;
  ctx.shadowColor = bird.color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Eye & Wing
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(bird.x + 4, bird.y - 6, 4, 4);
  ctx.fillStyle = '#fb923c';
  ctx.fillRect(bird.x + 12, bird.y - 2, 8, 5);

  // HUD
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('SCORE: ' + score, 24, 38);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px monospace';
  ctx.fillText('BEST: ' + highScore, canvas.width - 120, 38);

  if (gameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CRASHED!', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText('Press SPACE or CLICK to Glide Again', canvas.width / 2, canvas.height / 2 + 25);
    ctx.textAlign = 'left';
  }

  requestAnimationFrame(gameLoop);
}
gameLoop();
`
  }
];
