import { callOllamaLLM } from './ollamaClient.js';

/**
 * Clean LLM output to extract pure JavaScript code without markdown headers,
 * language labels ('javascript', 'js'), or code block fences.
 */
export function cleanGeneratedCode(rawText) {
  if (!rawText) return '';
  let code = rawText.trim();

  // Strip markdown backticks block if present
  if (code.includes('```')) {
    const match = code.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
    if (match && match[1]) {
      code = match[1].trim();
    } else {
      code = code.replace(/```(?:javascript|js)?/gi, '').replace(/```/g, '').trim();
    }
  }

  // Remove leading standalone "javascript" or "js" line or word if LLM output included it
  code = code.replace(/^(?:javascript|js)\s*\n/i, '').replace(/^(?:javascript|js)\s+/i, '');

  return code.trim();
}

/**
 * Smart Sound Injector: Automatically ensures that shooting, collisions,
 * pickups, jumps, and game-over events have appropriate playSound() calls
 * if the LLM forgot to include them.
 */
export function injectSoundsIntoCode(code) {
  if (!code) return '';
  let updated = code;

  // 1. Inject playSound('laser') when bullets/projectiles/lasers are pushed
  if (!updated.includes("playSound('laser')") && !updated.includes('playSound("laser")')) {
    updated = updated.replace(/((?:bullets|projectiles|lasers|shots|missiles)\.push\s*\([^)]+\);)/gi, "$1 if (window.playSound) playSound('laser');");
  }

  // 2. Inject playSound('explosion') when enemies/asteroids/targets are destroyed or spliced
  if (!updated.includes("playSound('explosion')") && !updated.includes('playSound("explosion")')) {
    updated = updated.replace(/((?:enemies|asteroids|targets|monsters|aliens|invaders|zombies|rocks|meteors)\.splice\s*\([^)]+\);)/gi, "$1 if (window.playSound) playSound('explosion');");
  }

  // 3. Inject playSound('coin') when coins/food/gems are collected or score increases
  if (!updated.includes("playSound('coin')") && !updated.includes('playSound("coin")')) {
    updated = updated.replace(/((?:coins|gems|stars|items|fruits|food|plants|crops)\.splice\s*\([^)]+\);)/gi, "$1 if (window.playSound) playSound('coin');");
  }

  // 4. Inject playSound('jump') on player jump logic
  if (!updated.includes("playSound('jump')") && !updated.includes('playSound("jump")')) {
    updated = updated.replace(/(player\.vy\s*=\s*-[0-9.]+;)/gi, "$1 if (window.playSound) playSound('jump');");
  }

  // 5. Inject playSound('gameover') on game over flag
  if (!updated.includes("playSound('gameover')") && !updated.includes('playSound("gameover")')) {
    updated = updated.replace(/(gameOver\s*=\s*true;)/gi, "$1 if (window.playSound) playSound('gameover');");
  }

  return updated;
}

/**
 * Generate full, executable HTML5 Canvas JavaScript code for custom user game requests.
 */
export async function synthesizeCustomGameCode(userPrompt, previousCode = '', tweakRequest = '') {
  let systemMessage = `You are an expert HTML5 Canvas game developer AI.
You generate complete, working, bug-free, fully-styled HTML5 Canvas JavaScript games.

RULES FOR THE GENERATED CODE:
1. Target canvas ID: "gameCanvas" (width 800, height 600).
   Get canvas: const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');
2. Use ONLY vanilla JavaScript and 2D Canvas Context API (ctx).
3. Include a smooth game loop using requestAnimationFrame.
4. Support keyboard controls (WASD / Arrow Keys / Space) and Mouse click/movement handlers.
5. Draw rich visual graphics using Canvas primitives (ctx.fillRect, ctx.arc, ctx.fillText, ctx.beginPath, ctx.fillStyle, ctx.strokeStyle). Draw player, entities, items, environment, and HUD (score, level, coins, controls info).
6. SOUND EFFECTS & AUDIO (MANDATORY):
   You MUST call the built-in global sound function:
   - When firing a bullet/laser/projectile: playSound('laser');
   - When an enemy/meteor/asteroid is hit or dies: playSound('explosion');
   - When collecting a coin/gem/fruit/crop or gaining score: playSound('coin');
   - When jumping/bouncing: playSound('jump');
   - When taking damage or colliding: playSound('hit');
   - When player loses / game over: playSound('gameover');
   - When winning or clearing a wave: playSound('win');
   Example:
     function shoot() {
       bullets.push({ x: player.x, y: player.y, vx: 5, vy: 0 });
       playSound('laser');
     }
     if (bulletHitsEnemy) {
       enemies.splice(i, 1);
       score += 10;
       playSound('explosion');
     }
7. DO NOT load external image assets or URLs. Draw everything directly on canvas with colors, shapes, and emoji text if helpful.
8. Return ONLY clean JavaScript code. DO NOT wrap with HTML tags. DO NOT prefix with words like "javascript" or markdown explanations.`;

  let messages = [];

  if (previousCode && tweakRequest) {
    messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Current working JavaScript code:\n\`\`\`javascript\n${previousCode}\n\`\`\`\n\nUSER REQUESTED TWEAK / NEW FEATURE:\n"${tweakRequest}"\n\nUpdate the JavaScript code to add this requested feature while preserving all existing functionality and sound calls (playSound('laser'), playSound('explosion'), playSound('coin'), etc.). Return ONLY the complete updated JavaScript code.` }
    ];
  } else {
    messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Write complete playable HTML5 Canvas JavaScript game code for this request: "${userPrompt}". Include controls, game loop, rendering, score/inventory/HUD, sound calls (playSound('laser'), playSound('explosion'), playSound('coin'), etc.), and full gameplay mechanics.` }
    ];
  }

  try {
    const result = await callOllamaLLM(messages, { temperature: 0.3, maxTokens: 4000 });

    if (result.success && result.content) {
      let code = cleanGeneratedCode(result.content);
      code = injectSoundsIntoCode(code);

      if (code && (code.includes('gameCanvas') || code.includes('getContext') || code.includes('requestAnimationFrame') || code.includes('function') || code.includes('const'))) {
        return {
          success: true,
          code: code,
          explanation: `Generated custom game code with sound effects for: "${tweakRequest || userPrompt}"`
        };
      }
    }
  } catch (err) {
    console.error('[CodeSynthesizer] LLM error:', err.message);
  }

  // Fallback interactive game engine if LLM fails
  return {
    success: true,
    code: getFallbackFarmerSimulatorCode(tweakRequest || userPrompt),
    explanation: 'Using fallback interactive canvas game engine with sound effects.'
  };
}

function getFallbackFarmerSimulatorCode(promptText) {
  return `
// Custom AI Game Engine: Farmer Life Simulator with Sound FX
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let money = 50;
let seeds = 5;
let cropsHarvested = 0;
let level = 1;
let xp = 0;
let selectedTool = 'plant'; // plant, water, harvest

// 4x4 Farm Plots
const plots = [];
const GRID_SIZE = 4;
const PLOT_W = 90;
const PLOT_H = 90;
const START_X = 140;
const START_Y = 120;

for (let r = 0; r < GRID_SIZE; r++) {
  for (let c = 0; c < GRID_SIZE; c++) {
    plots.push({
      x: START_X + c * (PLOT_W + 16),
      y: START_Y + r * (PLOT_H + 16),
      w: PLOT_W,
      h: PLOT_H,
      state: 'empty', // empty, planted, watered, ready
      growth: 0,
      cropType: 'wheat'
    });
  }
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  // Tool Selection Buttons
  if (my >= 520 && my <= 565) {
    if (mx >= 40 && mx <= 140) { selectedTool = 'plant'; if (window.playSound) playSound('click'); return; }
    if (mx >= 160 && mx <= 260) { selectedTool = 'water'; if (window.playSound) playSound('click'); return; }
    if (mx >= 280 && mx <= 380) { selectedTool = 'harvest'; if (window.playSound) playSound('click'); return; }
    if (mx >= 400 && mx <= 520) {
      if (money >= 15) {
        money -= 15;
        seeds += 3;
        if (window.playSound) playSound('coin');
      } else {
        if (window.playSound) playSound('hit');
      }
      return;
    }
  }

  // Plot Interaction
  for (const plot of plots) {
    if (mx >= plot.x && mx <= plot.x + plot.w && my >= plot.y && my <= plot.y + plot.h) {
      if (selectedTool === 'plant' && plot.state === 'empty' && seeds > 0) {
        seeds--;
        plot.state = 'planted';
        plot.growth = 0;
        if (window.playSound) playSound('coin');
      } else if (selectedTool === 'water' && plot.state === 'planted') {
        plot.state = 'watered';
        if (window.playSound) playSound('jump');
      } else if (selectedTool === 'harvest' && plot.state === 'ready') {
        plot.state = 'empty';
        plot.growth = 0;
        cropsHarvested++;
        money += 25;
        xp += 15;
        if (xp >= level * 50) {
          level++;
          if (window.playSound) playSound('win');
        } else {
          if (window.playSound) playSound('coin');
        }
      }
      break;
    }
  }
});

let lastTime = performance.now();
function gameLoop() {
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Update crop growth
  for (const plot of plots) {
    if (plot.state === 'watered') {
      plot.growth += dt * 0.35;
      if (plot.growth >= 1) {
        plot.state = 'ready';
      }
    }
  }

  // Draw Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Header HUD
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(20, 20, canvas.width - 40, 65);
  ctx.strokeStyle = '#407a1e';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, canvas.width - 40, 65);

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('💰 $' + money, 40, 58);

  ctx.fillStyle = '#86efac';
  ctx.fillText('🌱 Seeds: ' + seeds, 160, 58);

  ctx.fillStyle = '#38bdf8';
  ctx.fillText('🌾 Harvests: ' + cropsHarvested, 300, 58);

  ctx.fillStyle = '#c084fc';
  ctx.fillText('⭐ Lvl ' + level, 470, 58);

  // Draw Plots
  for (const plot of plots) {
    if (plot.state === 'empty') ctx.fillStyle = '#543d2b';
    else if (plot.state === 'planted') ctx.fillStyle = '#3b281c';
    else if (plot.state === 'watered') ctx.fillStyle = '#1e3a8a';
    else if (plot.state === 'ready') ctx.fillStyle = '#ca8a04';

    ctx.fillRect(plot.x, plot.y, plot.w, plot.h);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);

    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = plot.x + plot.w / 2;
    const cy = plot.y + plot.h / 2;

    if (plot.state === 'empty') ctx.fillText('🟫', cx, cy);
    else if (plot.state === 'planted') ctx.fillText('🌱', cx, cy);
    else if (plot.state === 'watered') ctx.fillText('🌿', cx, cy);
    else if (plot.state === 'ready') ctx.fillText('🌾', cx, cy);
  }

  // Draw Bottom Toolbar
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  function drawBtn(x, label, active, bg) {
    ctx.fillStyle = active ? '#407a1e' : (bg || '#334155');
    ctx.fillRect(x, 520, 100, 45);
    ctx.strokeStyle = active ? '#84cc16' : '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 520, 100, 45);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(label, x + 10, 547);
  }

  drawBtn(40, '🌱 Plant', selectedTool === 'plant');
  drawBtn(160, '💧 Water', selectedTool === 'water');
  drawBtn(280, '🌾 Harvest', selectedTool === 'harvest');
  drawBtn(400, '🛒 Buy $15', false, '#059669');

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.fillText('Click plots with selected tool to farm', 540, 547);

  requestAnimationFrame(gameLoop);
}

gameLoop();
`;
}
