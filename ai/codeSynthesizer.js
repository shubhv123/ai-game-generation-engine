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
6. DO NOT load external image assets or URLs. Draw everything directly on canvas with colors, shapes, and emoji text if helpful.
7. Return ONLY clean JavaScript code. DO NOT wrap with HTML tags. DO NOT prefix with words like "javascript" or markdown explanations.`;

  let messages = [];

  if (previousCode && tweakRequest) {
    messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Current working JavaScript code:\n\`\`\`javascript\n${previousCode}\n\`\`\`\n\nUSER REQUESTED TWEAK / NEW FEATURE:\n"${tweakRequest}"\n\nUpdate the JavaScript code to add this requested feature while preserving all existing functionality. Return ONLY the complete updated JavaScript code.` }
    ];
  } else {
    messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Write complete playable HTML5 Canvas JavaScript game code for this request: "${userPrompt}". Include controls, game loop, rendering, score/inventory/HUD, and full gameplay mechanics.` }
    ];
  }

  try {
    const result = await callOllamaLLM(messages, { temperature: 0.3, maxTokens: 4000 });

    if (result.success && result.content) {
      let code = cleanGeneratedCode(result.content);

      if (code && (code.includes('gameCanvas') || code.includes('getContext') || code.includes('requestAnimationFrame') || code.includes('function') || code.includes('const'))) {
        return {
          success: true,
          code: code,
          explanation: `Generated custom game code for: "${tweakRequest || userPrompt}"`
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
    explanation: 'Using fallback interactive canvas game engine.'
  };
}

function getFallbackFarmerSimulatorCode(promptText) {
  return `
// Custom AI Game Engine: Farmer Life Simulator
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
const START_X = 220;
const START_Y = 130;

for (let r = 0; r < GRID_SIZE; r++) {
  for (let c = 0; c < GRID_SIZE; c++) {
    plots.push({
      x: START_X + c * (PLOT_W + 15),
      y: START_Y + r * (PLOT_H + 15),
      state: 'empty', // empty, planted, watered, grown
      growth: 0
    });
  }
}

// Mouse Handler
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  // Farm Plots click
  plots.forEach(p => {
    if (mx >= p.x && mx <= p.x + PLOT_W && my >= p.y && my <= p.y + PLOT_H) {
      if (selectedTool === 'plant' && p.state === 'empty' && seeds > 0) {
        p.state = 'planted';
        p.growth = 0;
        seeds--;
      } else if (selectedTool === 'water' && p.state === 'planted') {
        p.state = 'watered';
      } else if (selectedTool === 'harvest' && p.state === 'grown') {
        p.state = 'empty';
        cropsHarvested++;
        money += 30;
        xp += 20;
        if (xp >= level * 50) {
          level++;
          xp = 0;
          seeds += 3;
        }
      }
    }
  });

  // Tool buttons
  if (my >= 520 && my <= 570) {
    if (mx >= 40 && mx <= 150) selectedTool = 'plant';
    if (mx >= 160 && mx <= 270) selectedTool = 'water';
    if (mx >= 280 && mx <= 390) selectedTool = 'harvest';
    if (mx >= 400 && mx <= 530 && money >= 15) { seeds += 2; money -= 15; }
  }
});

// Automatic Growth Loop
setInterval(() => {
  plots.forEach(p => {
    if (p.state === 'watered') {
      p.growth += 20;
      if (p.growth >= 100) {
        p.state = 'grown';
      }
    }
  });
}, 800);

function gameLoop() {
  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header Banner
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, 90);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('🌾 Farmer Life Simulator', 30, 40);

  // Stats HUD
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('💰 Money: $' + money, 30, 72);
  ctx.fillStyle = '#34d399';
  ctx.fillText('🌱 Seeds: ' + seeds, 160, 72);
  ctx.fillStyle = '#60a5fa';
  ctx.fillText('🌽 Harvested: ' + cropsHarvested, 270, 72);
  ctx.fillStyle = '#c084fc';
  ctx.fillText('⭐ Level: ' + level + ' (' + xp + '/' + (level * 50) + ' XP)', 420, 72);

  // Farm Plots
  plots.forEach(p => {
    ctx.lineWidth = 2;
    if (p.state === 'empty') {
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#92400e';
    } else if (p.state === 'planted') {
      ctx.fillStyle = '#a16207';
      ctx.strokeStyle = '#ca8a04';
    } else if (p.state === 'watered') {
      ctx.fillStyle = '#1e3a8a';
      ctx.strokeStyle = '#3b82f6';
    } else if (p.state === 'grown') {
      ctx.fillStyle = '#15803d';
      ctx.strokeStyle = '#22c55e';
    }

    ctx.fillRect(p.x, p.y, PLOT_W, PLOT_H);
    ctx.strokeRect(p.x, p.y, PLOT_W, PLOT_H);

    if (p.state === 'planted') {
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(p.x + PLOT_W/2, p.y + PLOT_H/2, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.state === 'watered') {
      ctx.fillStyle = '#93c5fd';
      ctx.font = '11px sans-serif';
      ctx.fillText('💧 ' + p.growth + '%', p.x + 18, p.y + PLOT_H/2 + 4);
    } else if (p.state === 'grown') {
      ctx.font = '36px sans-serif';
      ctx.fillText('🌽', p.x + 24, p.y + 58);
    }
  });

  // Toolbar Footer
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 510, canvas.width, 90);

  function drawBtn(x, text, isSelected, bg='#334155') {
    ctx.fillStyle = isSelected ? '#a855f7' : bg;
    ctx.fillRect(x, 525, 110, 44);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(text, x + 14, 552);
  }

  drawBtn(40, '🌱 Plant', selectedTool === 'plant');
  drawBtn(160, '💧 Water', selectedTool === 'water');
  drawBtn(280, '🌾 Harvest', selectedTool === 'harvest');
  drawBtn(400, '🛒 Buy Seed $15', false, '#059669');

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.fillText('Click plots to interact with selected tool', 540, 552);

  requestAnimationFrame(gameLoop);
}

gameLoop();
`;
}
