import { ThreeEngine } from '/src/engine/ThreeEngine.js';
import { semanticClassifier } from '/src/magicTranslator.js';
import { GameRunner } from '/src/engine/GameRunner.js';
import { GamePlatformer } from '/src/engine/GamePlatformer.js';
import { GameShooter } from '/src/engine/GameShooter.js';
import { GameRacing } from '/src/engine/GameRacing.js';
import { GameMaze } from '/src/engine/GameMaze.js';
import { GameChess3D } from '/src/engine/GameChess.js';
import { Game2DEngine } from '/src/engine/Game2D.js';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api'
  : '/api';

// ============================================
//   App State
// ============================================
window._app = {
  currentPage: 'home',
  currentGame: null,
  threeEngine: null,
  activeStudioTab: '2D',
  selectedArchetype: 'CUSTOM_AI',
  lastSearchPrompt: '',
  lastSearchResult: null,
  historyOpen: false,
  isBackendOnline: false,
};

// ============================================
//   NAVIGATION
// ============================================
window.navigateTo = function(page) {
  const app = window._app;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  app.currentPage = page;

  if (page === 'generate') {
    setTimeout(() => {
      if (!app.threeEngine) {
        app.threeEngine = new ThreeEngine(document.getElementById('webgl-canvas'));
      }
    }, 100);
    checkBackend();
  }
};

window.homeCardClick = function(prompt) {
  window.navigateTo('search');
  setTimeout(() => {
    document.getElementById('search-main-input').value = prompt;
    window.doSearch();
  }, 100);
};

// ============================================
//   BACKEND
// ============================================
async function checkBackend() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    window._app.isBackendOnline = res.ok;
  } catch {
    try {
      const res2 = await fetch('/health');
      window._app.isBackendOnline = res2.ok;
    } catch {
      window._app.isBackendOnline = false;
    }
  }
  updateBackendBadge();
}

function updateBackendBadge() {
  const badge = document.getElementById('gen-backend-badge');
  if (!badge) return;
  if (window._app.isBackendOnline) {
    badge.textContent = '🟢 AI Online';
    badge.style.background = 'rgba(52,211,153,0.15)';
    badge.style.color = '#34d399';
  } else {
    badge.textContent = '🟡 Local Mode';
    badge.style.background = 'rgba(251,191,36,0.15)';
    badge.style.color = '#fbbf24';
  }
}

// ============================================
//   SEARCH
// ============================================
window.setSearchAndGo = function(prompt) {
  document.getElementById('search-main-input').value = prompt;
  window.doSearch();
};

window.doSearch = async function(page = 1) {
  const input = document.getElementById('search-main-input');
  const prompt = (input ? input.value.trim() : '') || window._app.lastSearchPrompt;
  if (!prompt) return;

  window._app.lastSearchPrompt = prompt;
  window._app.currentSearchPage = page;

  if (page === 1) {
    window.showLoading('Searching...', `🧠 AI parsing: "${prompt.slice(0, 40)}..."`);
  }

  const resultsArea = document.getElementById('search-results-area');
  const emptyState = document.getElementById('search-empty-state');
  const ctaBanner = document.getElementById('generate-cta-banner');

  if (emptyState) emptyState.classList.add('hidden');
  if (ctaBanner) ctaBanner.classList.add('hidden');
  if (resultsArea) {
    resultsArea.innerHTML = `
      <div class="results-header">
        <div class="results-title">Finding matches for Page ${page}...</div>
      </div>
      <div class="results-grid">
        ${Array(6).fill('<div class="skeleton skeleton-card"></div>').join('')}
      </div>`;
    
    if (page > 1) {
      resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  try {
    let data = null;
    try {
      const res = await fetch(`${API_BASE}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, page, limit: 6 })
      });
      if (res.ok) data = await res.json();
      window._app.isBackendOnline = true;
    } catch (e) {
      window._app.isBackendOnline = false;
    }

    window.hideLoading();
    window._app.lastSearchResult = data;

    if (data && data.success) {
      renderSearchResults(data);
    } else {
      renderSearchResultsFallback(prompt);
    }
  } catch (err) {
    window.hideLoading();
    renderSearchResultsFallback(prompt);
  }

  saveToHistory(prompt);
};

window.goToSearchPage = function(targetPage) {
  window.doSearch(targetPage);
};

function renderSearchResults(data) {
  const { recommendations, prompt, pagination } = data;
  const resultsArea = document.getElementById('search-results-area');
  const ctaBanner = document.getElementById('generate-cta-banner');

  const currentPage = pagination?.currentPage || 1;
  const totalPages = pagination?.totalPages || 1;
  const totalMatches = pagination?.totalMatches || recommendations.length;
  const hasNext = pagination?.hasNext || false;
  const hasPrev = pagination?.hasPrev || false;
  const startIndex = pagination?.startIndex || 1;
  const endIndex = pagination?.endIndex || recommendations.length;

  if (resultsArea) {
    resultsArea.innerHTML = `
      <div class="results-header">
        <div class="results-title">AI Recommendations for "${prompt}"</div>
        <div class="results-count">${totalMatches} matches (Page ${currentPage}/${totalPages})</div>
      </div>
      <div class="results-grid" id="recs-grid"></div>
      
      ${totalPages > 1 ? `
        <div class="pagination-bar">
          <button class="pixel-page-btn ${!hasPrev ? 'disabled' : ''}" 
                  ${hasPrev ? `onclick="goToSearchPage(${currentPage - 1})"` : 'disabled'}>
            ◀ PREV
          </button>
          
          <div class="pixel-page-info">
            <span>PAGE ${currentPage} OF ${totalPages}</span>
            <span style="font-size:9px;color:rgba(255,255,255,0.7)">Showing ${startIndex}–${endIndex} of ${totalMatches} games</span>
          </div>
          
          <button class="pixel-page-btn ${!hasNext ? 'disabled' : ''}" 
                  ${hasNext ? `onclick="goToSearchPage(${currentPage + 1})"` : 'disabled'}>
            NEXT ▶
          </button>
        </div>
      ` : ''}
    `;

    const grid = document.getElementById('recs-grid');
    recommendations.forEach((game, i) => {
      const matchColor = game.matchPercentage >= 90 ? '#34d399' : game.matchPercentage >= 75 ? '#60a5fa' : '#fbbf24';
      const platformStr = Array.isArray(game.platform) ? game.platform.join(' · ') : (game.platform || 'PC');
      const card = document.createElement('div');
      card.className = 'result-card fade-in';
      card.style.animationDelay = `${i * 60}ms`;
      card.innerHTML = `
        <div class="result-card-body">
          <div class="result-card-title">${game.title}</div>
          <div class="result-card-genre">${game.genre}</div>
          <div class="result-card-rationale">"${game.rationale || game.description}"</div>
          <div class="result-card-footer">
            <span class="result-match" style="background:${matchColor}22;color:${matchColor};border:1px solid ${matchColor}44">${game.matchPercentage}% MATCH</span>
            <span style="font-size:10px;font-weight:700;color:#64748b">${platformStr}</span>
            ${game.playUrl ? `<a class="result-visit" href="${game.playUrl}" target="_blank" style="font-family:var(--pixel-font-title);font-size:9px;color:var(--pixel-blue)">VISIT →</a>` : ''}
          </div>
        </div>`;
      grid.appendChild(card);
    });
  }

  if (ctaBanner) {
    ctaBanner.classList.remove('hidden');
    document.getElementById('cta-scope-gen')?.classList.remove('hidden');
    document.getElementById('cta-scope-rec')?.classList.add('hidden');
    const ctaTitle = document.getElementById('cta-title');
    const ctaDesc = document.getElementById('cta-desc');
    const genBtn = document.getElementById('btn-generate-from-search');
    if (ctaTitle) ctaTitle.textContent = `Try a playable version of this?`;
    if (ctaDesc) ctaDesc.textContent = `Generate a browser-playable game inspired by "${prompt}" — we'll build the closest prototype we can.`;
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.textContent = '⚡ Generate Game';
    }
  }
}

function renderSearchResultsFallback(prompt) {
  const resultsArea = document.getElementById('search-results-area');
  if (resultsArea) {
    resultsArea.innerHTML = `
      <div class="results-header">
        <div class="results-title">Results for "${prompt}"</div>
        <div class="results-count" style="background:rgba(251,191,36,0.1);color:#fbbf24;border:1px solid rgba(251,191,36,0.2)">🟡 Local Mode</div>
      </div>
      <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:16px;padding:20px;font-size:13px;color:rgba(255,255,255,0.5);display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <span style="font-size:20px">🟡</span>
        <span>AI backend offline. Start with <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px">npm run dev:backend</code> for full recommendations.</span>
      </div>`;
  }

  const ctaBanner = document.getElementById('generate-cta-banner');
  if (ctaBanner) {
    ctaBanner.classList.remove('hidden');
    document.getElementById('cta-scope-gen')?.classList.remove('hidden');
    document.getElementById('cta-scope-rec')?.classList.add('hidden');
    const ctaTitle = document.getElementById('cta-title');
    const ctaDesc = document.getElementById('cta-desc');
    const genBtn = document.getElementById('btn-generate-from-search');
    if (ctaTitle) ctaTitle.textContent = 'Try a playable version of this?';
    if (ctaDesc) ctaDesc.textContent = `Generate a browser prototype inspired by "${prompt}".`;
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.textContent = '⚡ Generate Game';
    }
  }
}

window.generateFromSearch = function() {
  const prompt = window._app.lastSearchPrompt;
  const data = window._app.lastSearchResult;

  if (data && data.archetype && data.archetype !== 'REC_ONLY') {
    preselectArchetype(data.archetype);
  }

  window.navigateTo('generate');

  const ctx = document.getElementById('gen-from-search-ctx');
  const ctxText = document.getElementById('gen-from-search-text');
  if (prompt && ctx && ctxText) {
    ctxText.textContent = `"${prompt}"`;
    ctx.classList.remove('hidden');
    document.getElementById('gen-custom-prompt').value = prompt;
  }
};

// ============================================
//   GENERATE PAGE — CONTROLS
// ============================================
window._app.selectedArchetype = 'CUSTOM_AI';
window._app.activeStudioTab = '2D';

window.setDim = function(dim) {
  window._app.activeStudioTab = dim;
  document.getElementById('dim-3d').classList.toggle('active', dim === '3D');
  document.getElementById('dim-2d').classList.toggle('active', dim === '2D');
  updateArchetypeGrid(dim);
};

function updateArchetypeGrid(dim) {
  const grid = document.getElementById('archetype-grid');
  if (!grid) return;
  if (dim === '3D') {
    grid.innerHTML = `
      <button class="archetype-btn selected" data-key="CUSTOM_AI" onclick="selectArchetype(this)" style="grid-column: span 2; background: linear-gradient(135deg, rgba(147,51,234,0.2) 0%, rgba(79,70,229,0.2) 100%); border-color: rgba(168,85,247,0.4); color: #e9d5ff">
        <span>✨</span>
        <strong style="font-size:12px;color:#fff">Custom AI LLM Game</strong>
        <span style="font-size:9px;color:rgba(255,255,255,0.5)">Farmer Sim, Custom Rules, Full LLM Synthesis</span>
      </button>
      <button class="archetype-btn" data-key="RUNNER" onclick="selectArchetype(this)"><span>🏃</span>Highway Runner</button>
      <button class="archetype-btn" data-key="SHOOTER" onclick="selectArchetype(this)"><span>🔫</span>3D Shooter</button>
      <button class="archetype-btn" data-key="CHESS" onclick="selectArchetype(this)"><span>♟️</span>Chess 3D</button>
      <button class="archetype-btn" data-key="MAZE" onclick="selectArchetype(this)"><span>🏯</span>Maze</button>
      <button class="archetype-btn" data-key="PLATFORMER" onclick="selectArchetype(this)"><span>🪄</span>Platformer</button>
      <button class="archetype-btn" data-key="RACING" onclick="selectArchetype(this)"><span>🏎️</span>Kart Racer</button>`;
    window._app.selectedArchetype = 'CUSTOM_AI';
  } else {
    grid.innerHTML = `
      <button class="archetype-btn selected" data-key="CUSTOM_AI" onclick="selectArchetype(this)" style="grid-column: span 2; background: linear-gradient(135deg, rgba(147,51,234,0.2) 0%, rgba(79,70,229,0.2) 100%); border-color: rgba(168,85,247,0.4); color: #e9d5ff">
        <span>✨</span>
        <strong style="font-size:12px;color:#fff">Custom AI LLM Game</strong>
        <span style="font-size:9px;color:rgba(255,255,255,0.5)">Farmer Sim, Custom Rules, Full LLM Synthesis</span>
      </button>
      <button class="archetype-btn" data-key="2D_SHOOTER" onclick="selectArchetype(this)"><span>🚀</span>Space Shooter</button>
      <button class="archetype-btn" data-key="2D_BRICK" onclick="selectArchetype(this)"><span>🟥</span>Brick Breaker</button>
      <button class="archetype-btn" data-key="2D_SNAKE" onclick="selectArchetype(this)"><span>🐍</span>Neon Snake</button>
      <button class="archetype-btn" data-key="2D_PACMAN" onclick="selectArchetype(this)"><span>🟡</span>Pacman</button>
      <button class="archetype-btn" data-key="2D_TANK" onclick="selectArchetype(this)"><span>🪖</span>Tank Combat</button>
      <button class="archetype-btn" data-key="2D_JUMPER" onclick="selectArchetype(this)"><span>☁️</span>Doodle Jumper</button>
      <button class="archetype-btn" data-key="2D_RUNNER" onclick="selectArchetype(this)"><span>🏃</span>2D Runner</button>
      <button class="archetype-btn" data-key="2D_CHESS" onclick="selectArchetype(this)"><span>♟️</span>Chess 2D</button>`;
    window._app.selectedArchetype = 'CUSTOM_AI';
  }
}

window.selectArchetype = function(btn) {
  document.querySelectorAll('.archetype-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  window._app.selectedArchetype = btn.dataset.key;
};

function preselectArchetype(archetype) {
  const is3D = !archetype.startsWith('2D') && archetype !== '2D_CHESS';
  if (is3D) {
    window.setDim('3D');
  } else {
    window.setDim('2D');
  }

  setTimeout(() => {
    const btn = document.querySelector(`[data-key="${archetype}"]`);
    if (btn) window.selectArchetype(btn);
    window._app.selectedArchetype = archetype;
  }, 50);
}

// ============================================
//   GAME LAUNCH & CUSTOM CODE SYNTHESIS
// ============================================
window.launchGame = async function() {
  const archetype = window._app.selectedArchetype;
  const customPrompt = document.getElementById('gen-custom-prompt').value.trim();

  if (archetype === 'CUSTOM_AI' || customPrompt) {
    const promptToUse = customPrompt || 'Farmer Life Simulator';
    window.showLoading('Synthesizing Code...', `🧠 Ollama LLM writing game code for "${promptToUse.slice(0, 30)}..."`);

    try {
      const res = await fetch(`${API_BASE}/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: promptToUse })
      });
      const data = await res.json();
      window.hideLoading();

      if (data.success && data.code) {
        window._app.lastCustomCode = data.code;
        window._app.lastCustomPrompt = promptToUse;
        window._app.lastArchetype = 'CUSTOM_AI';

        renderCustomIframe(data.code);
        addChatMessage(`✨ AI generated custom game code for "${promptToUse}"`, 'ai');
        const guideEl = document.getElementById('controls-guide-text');
        if (guideEl) guideEl.textContent = `🎮 Custom LLM Game: "${promptToUse}"`;
      }
    } catch (e) {
      window.hideLoading();
      console.error('[LaunchCustomGame] Error:', e);
    }
  } else {
    window.showLoading('Generating...', `⚡ Building ${archetype.replace(/_/g,' ')} prototype...`);
    setTimeout(() => {
      window.hideLoading();
      spawnGame(archetype, customPrompt);
    }, 800);
  }
};

function sanitizeCodeForIframe(raw) {
  if (!raw) return '';
  let clean = raw.trim();
  if (clean.includes('```')) {
    const match = clean.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
    if (match && match[1]) clean = match[1].trim();
    else clean = clean.replace(/```(?:javascript|js)?/gi, '').replace(/```/g, '').trim();
  }
  return clean.replace(/^(?:javascript|js)\s*\n/i, '').replace(/^(?:javascript|js)\s+/i, '').trim();
}

function renderCustomIframe(code) {
  const iframe = document.getElementById('custom-game-iframe');
  const webglCanvas = document.getElementById('webgl-canvas');
  const canvas2D = document.getElementById('canvas-2d');
  const placeholder = document.getElementById('canvas-placeholder');

  if (window._app.currentGame) {
    window._app.currentGame.destroy();
    window._app.currentGame = null;
  }

  if (placeholder) placeholder.style.display = 'none';
  if (webglCanvas) webglCanvas.style.display = 'none';
  if (canvas2D) canvas2D.style.display = 'none';
  if (iframe) iframe.style.display = 'block';

  const cleanCode = sanitizeCodeForIframe(code);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  const scriptTagStart = '<script>';
  const scriptTagEnd = '<\/script>';
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 0; background: #0f172a; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
        canvas { background: #1e293b; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); cursor: pointer; }
      </style>
    </head>
    <body>
      <canvas id="gameCanvas" width="800" height="600"></canvas>
      ${scriptTagStart}
        window.onerror = function(msg, url, line) {
          window.parent.postMessage({ type: 'GAME_ERROR', error: msg + ' (line ' + line + ')' }, '*');
        };
        try {
          ${cleanCode}
        } catch(err) {
          console.error("Custom Game Code Execution Error:", err);
          window.parent.postMessage({ type: 'GAME_ERROR', error: err.message }, '*');
        }
      ${scriptTagEnd}
    </body>
    </html>
  `);
  doc.close();
}

window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'GAME_ERROR') {
    console.warn('[IframeGameError]', e.data.error);
    addChatMessage(`⚠️ Runtime Error: ${e.data.error}`, 'ai');
  }
});

window.sendCustomTweak = async function() {
  const input = document.getElementById('ai-tweak-chat-input');
  const tweakText = input ? input.value.trim() : '';
  if (!tweakText) return;

  if (input) input.value = '';
  addChatMessage(`🛠️ Tweak: "${tweakText}"`, 'user');

  const basePrompt = window._app.lastCustomPrompt || 'Farmer Life Simulator';
  const prevCode = window._app.lastCustomCode || '';

  window.showLoading('Updating Code...', `🧠 Ollama LLM refactoring game with: "${tweakText.slice(0, 30)}..."`);

  try {
    const res = await fetch(`${API_BASE}/generate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: basePrompt,
        previousCode: prevCode,
        tweakRequest: tweakText
      })
    });
    const data = await res.json();
    window.hideLoading();

    if (data.success && data.code) {
      window._app.lastCustomCode = data.code;
      renderCustomIframe(data.code);
      addChatMessage(`✅ Applied tweak: "${tweakText}"`, 'ai');
    }
  } catch (err) {
    window.hideLoading();
    addChatMessage(`⚠️ Failed to apply tweak. Re-trying...`, 'ai');
  }
};

function addChatMessage(msg, sender='ai') {
  const area = document.getElementById('ai-chat-messages');
  if (!area) return;
  const div = document.createElement('div');
  div.style.padding = '4px 8px';
  div.style.borderRadius = '6px';
  div.style.background = sender === 'user' ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.06)';
  div.style.color = sender === 'user' ? '#e9d5ff' : '#cbd5e1';
  div.style.fontWeight = '600';
  div.textContent = msg;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function spawnGame(archetype, customPrompt = '') {
  const iframe = document.getElementById('custom-game-iframe');
  if (iframe) iframe.style.display = 'none';

  if (window._app.currentGame) {
    window._app.currentGame.destroy();
    window._app.currentGame = null;
  }

  const is2D = archetype.startsWith('2D') || archetype === '2D_CHESS';
  const webglCanvas = document.getElementById('webgl-canvas');
  const canvas2D = document.getElementById('canvas-2d');
  const placeholder = document.getElementById('canvas-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  if (is2D) {
    if (webglCanvas) webglCanvas.style.display = 'none';
    if (canvas2D) canvas2D.style.display = 'block';
  } else {
    if (canvas2D) canvas2D.style.display = 'none';
    if (webglCanvas) webglCanvas.style.display = 'block';
  }

  const callbacks = {
    onScoreUpdate: (s, h) => {
      const scoreEl = document.getElementById('canvas-score');
      const highEl = document.getElementById('canvas-highscore');
      if (scoreEl) scoreEl.textContent = s;
      if (highEl) highEl.textContent = h;
    },
    onGuideUpdate: (g) => {
      const guideEl = document.getElementById('controls-guide-text');
      if (guideEl) guideEl.textContent = g;
    },
    onHealthUpdate: (hp) => {
      const bar = document.getElementById('hud-health-bar');
      if (bar) {
        bar.style.width = `${hp}%`;
        bar.className = hp < 30 ? 'hp-red' : (hp < 60 ? 'hp-yellow' : 'hp-green');
      }
    },
    onGameOver: (d) => showGameOver(d)
  };

  const hpEl = document.getElementById('hud-health-container');
  const needsHP = ['2D_SHOOTER','2D_TANK','SHOOTER'].includes(archetype);
  if (hpEl) hpEl.classList.toggle('visible', needsHP);

  const prompt = customPrompt || archetype.toLowerCase().replace(/_/g, ' ');
  if (is2D) {
    const modeKey = archetype === '2D_CHESS' ? '2D_CHESS' : archetype;
    window._app.currentGame = new Game2DEngine(canvas2D, semanticClassifier, callbacks, modeKey);
  } else {
    if (!window._app.threeEngine) {
      window._app.threeEngine = new ThreeEngine(webglCanvas);
    }
    const engine = window._app.threeEngine;
    const gameMap = {
      'RUNNER': () => new GameRunner(engine, semanticClassifier, callbacks),
      'SHOOTER': () => new GameShooter(engine, semanticClassifier, callbacks),
      'CHESS': () => new GameChess3D(engine, semanticClassifier, callbacks),
      'MAZE': () => new GameMaze(engine, semanticClassifier, callbacks),
      'PLATFORMER': () => new GamePlatformer(engine, semanticClassifier, callbacks),
      'RACING': () => new GameRacing(engine, semanticClassifier, callbacks),
    };
    const factory = gameMap[archetype] || gameMap['RUNNER'];
    window._app.currentGame = factory();
  }

  window._app.lastArchetype = archetype;
  window._app.lastCustomPrompt = customPrompt;
}

window.applyTweak = function(mod) {
  if (window._app.currentGame) {
    const result = semanticClassifier.interpretLiveTweak(mod);
    if (result.success && window._app.threeEngine && !window._app.activeStudioTab?.startsWith('2D')) {
      window._app.threeEngine.applyTheme(result.state.theme);
    }
  }
  const promptInput = document.getElementById('gen-custom-prompt');
  if (promptInput) promptInput.value = mod;
};

window.restartCurrentGame = function() {
  if (window._app.lastArchetype === 'CUSTOM_AI' && window._app.lastCustomCode) {
    renderCustomIframe(window._app.lastCustomCode);
  } else if (window._app.lastArchetype) {
    spawnGame(window._app.lastArchetype, window._app.lastCustomPrompt || '');
  }
};

window.toggleFullscreen = function() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
};

// ============================================
//   GAME LOOP
// ============================================
let lastTime = performance.now();
function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  const game = window._app.currentGame;
  if (game && game.active) game.update(dt);
  if (game && game.engine && window._app.threeEngine) window._app.threeEngine.render();
}
requestAnimationFrame(gameLoop);

// ============================================
//   LOADING OVERLAY
// ============================================
let _loadInterval = null;
window.showLoading = function(title, sub) {
  const overlay = document.getElementById('loading-overlay');
  const textEl = document.getElementById('loading-text');
  const subEl = document.getElementById('loading-sub');
  const bar = document.getElementById('loading-progress');

  if (textEl) textEl.textContent = title;
  if (subEl) subEl.textContent = sub;
  if (bar) bar.style.width = '0%';
  if (overlay) overlay.classList.add('show');

  let p = 0;
  if (_loadInterval) clearInterval(_loadInterval);
  _loadInterval = setInterval(() => {
    p = Math.min(p + 4, 92);
    if (bar) bar.style.width = p + '%';
  }, 80);
};

window.hideLoading = function() {
  if (_loadInterval) clearInterval(_loadInterval);
  const bar = document.getElementById('loading-progress');
  const overlay = document.getElementById('loading-overlay');
  if (bar) bar.style.width = '100%';
  setTimeout(() => {
    if (overlay) overlay.classList.remove('show');
    if (bar) bar.style.width = '0%';
  }, 200);
};

// ============================================
//   GAME OVER MODAL
// ============================================
function showGameOver(details) {
  const titleEl = document.getElementById('modal-title');
  const subEl = document.getElementById('modal-sub');
  const scoreEl = document.getElementById('modal-final-score');
  const highEl = document.getElementById('modal-high-score');
  const modal = document.getElementById('game-over-modal');

  if (titleEl) titleEl.textContent = details.title;
  if (subEl) subEl.textContent = details.subtitle;
  if (scoreEl) scoreEl.textContent = details.score;
  if (highEl) highEl.textContent = details.highScore;
  if (modal) modal.classList.add('show');
}

window.hideGameOver = function() {
  const modal = document.getElementById('game-over-modal');
  if (modal) modal.classList.remove('show');
};

// ============================================
//   SESSION HISTORY
// ============================================
window.toggleHistoryDrawer = function() {
  const drawer = document.getElementById('history-drawer');
  const backdrop = document.getElementById('history-backdrop');
  if (!drawer) return;
  const isOpen = drawer.style.right === '0px';
  drawer.style.right = isOpen ? '-360px' : '0px';
  if (backdrop) backdrop.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) loadHistoryDrawer();
};

async function loadHistoryDrawer() {
  const listEl = document.getElementById('history-list');
  if (listEl) listEl.innerHTML = '<div style="font-size:12px;color:rgba(255,255,255,0.3);padding:16px;text-align:center">Loading...</div>';
  try {
    const res = await fetch(`${API_BASE}/history`);
    const { history } = await res.json();
    renderHistoryList(history);
  } catch {
    renderHistoryList(getLocalHistory());
  }
}

function renderHistoryList(history) {
  const listEl = document.getElementById('history-list');
  if (!listEl) return;
  if (!history || !history.length) {
    listEl.innerHTML = '<div style="font-size:12px;color:rgba(255,255,255,0.3);padding:24px;text-align:center"><div style="font-size:32px;margin-bottom:8px">🕹️</div>No history yet. Search for a game!</div>';
    return;
  }
  listEl.innerHTML = history.map(h => {
    const safePrompt = (h.prompt || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    return `
      <div onclick="window.replayHistory('${safePrompt}')"
        style="padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);margin-bottom:8px;cursor:pointer;transition:all 0.2s"
        onmouseover="this.style.background='rgba(255,255,255,0.07)'"
        onmouseout="this.style.background='rgba(255,255,255,0.03)'">
        <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.75);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">"${h.prompt}"</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:10px;color:rgba(255,255,255,0.3)">${new Date(h.timestamp).toLocaleTimeString()}</span>
          <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;${h.isGeneratable ? 'background:rgba(52,211,153,0.12);color:#34d399' : 'background:rgba(251,191,36,0.12);color:#fbbf24'}">${h.isGeneratable ? '⚡ Gen' : '📚 Rec'}</span>
        </div>
      </div>`;
  }).join('');
}

window.replayHistory = function(prompt) {
  window.toggleHistoryDrawer();
  window.navigateTo('search');
  setTimeout(() => {
    const input = document.getElementById('search-main-input');
    if (input) input.value = prompt;
    window.doSearch();
  }, 150);
};

window.clearHistory = async function() {
  try { await fetch(`${API_BASE}/history`, { method: 'DELETE' }); } catch {}
  clearLocalHistory();
  renderHistoryList([]);
};

function getLocalHistory() {
  try { return JSON.parse(localStorage.getItem('ia_history') || '[]'); } catch { return []; }
}

function saveToHistory(prompt) {
  try {
    const h = getLocalHistory();
    h.unshift({ prompt, timestamp: new Date().toISOString(), isGeneratable: true });
    localStorage.setItem('ia_history', JSON.stringify(h.slice(0, 20)));
  } catch {}
}

function clearLocalHistory() {
  try { localStorage.removeItem('ia_history'); } catch {}
}

window.toggleCanvasFullscreen = function() {
  const container = document.getElementById('canvas-wrap');
  if (!container) return;

  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    } else if (container.msRequestFullscreen) {
      container.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
};

// Check backend status and attach listeners on module load
document.addEventListener('DOMContentLoaded', () => {
  checkBackend();
  const searchInput = document.getElementById('search-main-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.doSearch();
    });
  }
});
