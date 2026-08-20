import confetti from 'canvas-confetti';
import { soundManager } from '/src/audio.js';
import { ThreeEngine } from '/src/engine/ThreeEngine.js';
import { semanticClassifier } from '/src/magicTranslator.js';
import { GameRunner } from '/src/engine/GameRunner.js';
import { GamePlatformer } from '/src/engine/GamePlatformer.js';
import { GameShooter } from '/src/engine/GameShooter.js';
import { GameRacing } from '/src/engine/GameRacing.js';
import { GameMaze } from '/src/engine/GameMaze.js';
import { GameChess3D } from '/src/engine/GameChess.js';
import { Game2DEngine } from '/src/engine/Game2D.js';
import { ArcadeReelManager } from '/src/reel.js';

window.soundManager = soundManager;

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.') || window.location.hostname.startsWith('172.'))
  ? `http://${window.location.hostname}:3001/api`
  : '/api';

window.arcadeReel = new ArcadeReelManager(API_BASE);

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

  if (page === 'reel') {
    window.arcadeReel.init();
    checkBackend();
  } else if (page === 'generate') {
    setTimeout(() => {
      if (!app.threeEngine) {
        app.threeEngine = new ThreeEngine(document.getElementById('webgl-canvas'));
      }
    }, 100);
    checkBackend();
  }
};

window.setReelPrompt = function(prompt) {
  const input = document.getElementById('reel-custom-prompt-input');
  if (input) input.value = prompt;
};

window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'REEL_GAME_ERROR') {
    console.warn('[ReelGameError]', e.data.error, 'on card', e.data.cardIndex);
    if (window.arcadeReel) {
      window.arcadeReel.addCardChatMessage(
        e.data.cardIndex,
        `⚠️ Runtime issue: "${e.data.error}". Click [🛠️ REFINE] to patch or [⏪ REVERT] to restore original.`,
        'ai'
      );
    }
  }
});

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
        const shortPrompt = promptToUse.length > 38 ? promptToUse.slice(0, 38) + '...' : promptToUse;
        if (guideEl) {
          guideEl.textContent = `🎮 Custom: "${shortPrompt}"`;
          guideEl.title = `Custom Game: "${promptToUse}"`;
        }
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
  const scriptTagStart = '<script>';
  const scriptTagEnd = '<\/script>';
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 0; background: #0f172a; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
        canvas { background: #1e293b; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); cursor: pointer; }
      </style>
      ${scriptTagStart}
        // Pre-Registered Global Error Trappers (Catches Syntax & Parse Errors in second script)
        window.onerror = function(msg, url, line, col, err) {
          var errMsg = msg || (err && err.message) || 'Syntax or Runtime Error';
          window.parent.postMessage({ type: 'GAME_ERROR', error: errMsg + (line ? ' (line ' + line + ')' : '') }, '*');
          return false;
        };
        window.addEventListener('unhandledrejection', function(e) {
          var reason = e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled Error';
          window.parent.postMessage({ type: 'GAME_ERROR', error: reason }, '*');
        });

        // ZzFX Micro Sound Synthesizer (MIT License - Frank Force)
        window.zzfxX = window.zzfxX || null;
        var zzfxR = 44100;
        function _getZzfxCtx() {
          if (!window.zzfxX) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) window.zzfxX = new AC();
          }
          if (window.zzfxX && window.zzfxX.state === 'suspended') window.zzfxX.resume();
          return window.zzfxX;
        }

        ['click', 'mousedown', 'keydown', 'touchstart'].forEach(function(evt) {
          window.addEventListener(evt, function() { _getZzfxCtx(); }, { once: true, passive: true });
        });

        window.zzfx = function() {
          var t = Array.prototype.slice.call(arguments);
          var ctx = _getZzfxCtx();
          if (!ctx) return null;
          var p = zzfxG.apply(null, t);
          var src = ctx.createBufferSource();
          var buf = ctx.createBuffer(1, p.length, zzfxR);
          buf.getChannelData(0).set(p);
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start();
          return src;
        };

        function zzfxG(q,k,c,e,t,u,j,v,m,r,s,h,w,x,y,z,A,l,B,C) {
          q=q===undefined?1:q; k=k===undefined?.05:k; c=c===undefined?220:c; e=e===undefined?0:e; t=t===undefined?0:t; u=u===undefined?.1:u; j=j===undefined?0:j; v=v===undefined?1:v; m=m===undefined?0:m; r=r===undefined?0:r; s=s===undefined?0:s; h=h===undefined?0:h; w=w===undefined?0:w; x=x===undefined?0:x; y=y===undefined?0:y; z=z===undefined?0:z; A=A===undefined?0:A; l=l===undefined?1:l; B=B===undefined?0:B; C=C===undefined?0:C;
          var b=2*Math.PI,H=v*=(500*b)/zzfxR/zzfxR,J=(1-k)*zzfxR|0,D=c*=((1+2*e*Math.random()-e)*b)/zzfxR,p=[],E=0,n=0,a=0,G=1,d=0,F=0,g=0,N=0,P=0;
          t=t*zzfxR|0;u=u*zzfxR|0;j=j*zzfxR|0;A=A*zzfxR|0;B=B*zzfxR|0;m*=(500*b)/zzfxR**3;x*=b/zzfxR;s*=b/zzfxR;h=h*zzfxR|0;w=w*zzfxR|0;z=z*zzfxR|0;C*=b/zzfxR;
          for(var K=t+u+j+A+B|0,L=0;L<K;++L){
            ++N>=h&&(N=0,d=2*Math.random()-1);d&&(G=d>0?1:-1);
            p[L]=(L<t?L/t:L<t+u?1-(L-t)/u*(1-y):L<t+u+j?y:L<K-B?(K-B-L)/A*y:0)*(L<t+u+j+A?Math.sin(F):1)*(L<t+u?(1-k)+k*Math.cos(L/J*b):1)*Math.sin(a);
            a+=D+=v+=m;F+=x;g+=s;P+=C;q&&(p[L]=p[L]*q);
          }
          return p;
        }

        var ZZFX_PRESETS = {
          laser: [1.2,0,850,.03,.25,.5,1,1.2,0,-9.4,0,0,0,.1,0,0,0,.6,.04,0],
          shoot: [1.2,0,850,.03,.25,.5,1,1.2,0,-9.4,0,0,0,.1,0,0,0,.6,.04,0],
          bullet: [1.2,0,850,.03,.25,.5,1,1.2,0,-9.4,0,0,0,.1,0,0,0,.6,.04,0],
          explosion: [1.5,0,25,.04,0,.4,4,1.9,0,.1,0,0,.05,0,0,0,0,0,-.01,0],
          hit: [1.4,0,80,.01,.05,.15,1,1.2,-9,0,0,0,0,.1,0,0,0,.5,0,0],
          coin: [1.2,0,537,.02,.02,.22,1,1.59,-6.9,.5,0,0,0,1,0,.1,0,0,0,0],
          pickup: [1.2,0,537,.02,.02,.22,1,1.59,-6.9,.5,0,0,0,1,0,.1,0,0,0,0],
          jump: [1.3,0,140,.01,.1,.2,1,1.5,-4.4,0,0,0,0,.2,0,0,0,-.04,0,0],
          powerup: [1.2,0,250,.01,.05,.2,1,1.1,-7,0,0,0,0,.1,0,0,0,.4,0,0],
          gameover: [1.5,0,120,.05,.1,.3,1,1.1,-10,0,0,0,0,.1,0,0,0,.7,0,0],
          win: [1.3,0,523,.05,.05,.35,1,1.3,-5,0,0,0,0,.1,0,0,0,.6,0,0],
          click: [0.8,0,300,0,.02,.02,0,1.5,-10,0,0,0,0,0,0,0,0,0,0,0]
        };

        window.playSound = function(type) {
          try {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: 'PLAY_SOUND', sfx: type }, '*');
            }
            var key = (type || 'click').toLowerCase();
            var sound = ZZFX_PRESETS[key] || ZZFX_PRESETS.click;
            window.zzfx.apply(null, sound);
          } catch(e) {}
        };

        // Render loop heartbeat watchdog
        window._renderedFrames = 0;
        var _origRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(cb) {
          window._renderedFrames++;
          return _origRAF(cb);
        };
        setTimeout(function() {
          if (window._renderedFrames === 0) {
            window.parent.postMessage({ type: 'GAME_ERROR', error: 'Game loop failed to render frames' }, '*');
          }
        }, 1500);
      ${scriptTagEnd}
    </head>
    <body>
      <canvas id="gameCanvas" width="800" height="600"></canvas>
      ${scriptTagStart}
${cleanCode}
      ${scriptTagEnd}
    </body>
    </html>
  `;

  // Use srcdoc for clean isolation and reliable instant reloads
  iframe.srcdoc = fullHtml;
}

window.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'GAME_ERROR') {
    console.warn('[IframeGameError]', e.data.error);
    window._app.lastBrokenCode = window._app.lastCustomCode;
    window._app.lastErrorMessage = e.data.error;
    addChatMessage(`⚠️ Runtime Issue: "${e.data.error}" — Click [🛠️ AUTO-FIX] or [⏪ REVERT] in the HUD above!`, 'ai');
  } else if (e.data.type === 'PLAY_SOUND') {
    soundManager.init();
    const sfx = (e.data.sfx || 'coin').toLowerCase();
    if (sfx === 'coin' || sfx === 'point' || sfx === 'score' || sfx === 'harvest') soundManager.playCoin();
    else if (sfx === 'jump' || sfx === 'bounce') soundManager.playJump();
    else if (sfx === 'laser' || sfx === 'shoot' || sfx === 'bullet') soundManager.playLaser();
    else if (sfx === 'explosion' || sfx === 'destroy' || sfx === 'kill') soundManager.playExplosion();
    else if (sfx === 'powerup') soundManager.playPowerup();
    else if (sfx === 'hit' || sfx === 'damage') soundManager.playHit();
    else if (sfx === 'win' || sfx === 'victory') soundManager.playWin();
    else if (sfx === 'gameover' || sfx === 'die' || sfx === 'death') soundManager.playGameOver();
    else if (sfx === 'click') soundManager.playClick();
  }
});

window.toggleAppAudio = function() {
  const isEnabled = soundManager.toggleSFX();
  const btns = document.querySelectorAll('.btn-audio-sfx-toggle');
  btns.forEach(btn => {
    btn.textContent = isEnabled ? '🔊 SFX ON' : '🔇 SFX OFF';
    btn.style.opacity = isEnabled ? '1' : '0.6';
  });
  if (isEnabled) soundManager.playClick();
};

window.toggleAppBGM = function() {
  const isPlaying = soundManager.toggleBGM();
  const btns = document.querySelectorAll('.btn-audio-bgm-toggle');
  btns.forEach(btn => {
    btn.textContent = isPlaying ? '🎵 BGM ON' : '🎵 BGM OFF';
    btn.style.background = isPlaying ? '#15803d' : '';
    btn.style.color = isPlaying ? '#fff' : '';
  });
  if (isPlaying) soundManager.playCoin();
};

window.sendCustomTweak = async function() {
  const input = document.getElementById('ai-tweak-chat-input');
  const tweakText = input ? input.value.trim() : '';
  if (!tweakText) return;

  if (input) input.value = '';
  addChatMessage(`🛠️ Tweak: "${tweakText}"`, 'user');

  // Save current working code snapshot before applying tweak
  if (window._app.lastCustomCode) {
    window._app.lastWorkingCode = window._app.lastCustomCode;
  }

  const basePrompt = window._app.lastCustomPrompt || 'Custom Canvas Game';
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
    } else {
      addChatMessage(`⚠️ Refinement issue. You can revert or try a different prompt.`, 'ai');
    }
  } catch (err) {
    window.hideLoading();
    addChatMessage(`⚠️ Network error while generating tweak.`, 'ai');
  }
};

/**
 * 1-Click Self-Healing AI Auto-Repair:
 * Sends the broken runtime code and error stack to the LLM to patch the bug live.
 */
window.autoRepairCurrentGame = async function() {
  const brokenCode = window._app.lastBrokenCode || window._app.lastCustomCode;
  const errorDetails = window._app.lastErrorMessage || 'Runtime error or blank canvas';
  const userPrompt = window._app.lastCustomPrompt || 'Custom Canvas Game';

  if (!brokenCode) {
    addChatMessage(`⚠️ No custom game code available to repair.`, 'ai');
    return;
  }

  window.showLoading('Self-Healing in Progress...', `🧠 Ollama AI debugging and patching: "${errorDetails.slice(0, 40)}..."`);

  try {
    const res = await fetch(`${API_BASE}/auto-repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brokenCode: brokenCode,
        errorDetails: errorDetails,
        userPrompt: userPrompt
      })
    });
    const data = await res.json();
    window.hideLoading();

    if (data.success && data.code) {
      window._app.lastCustomCode = data.code;
      window._app.lastWorkingCode = data.code;
      renderCustomIframe(data.code);

      // Trigger victory fanfare & confetti
      if (window.soundManager) window.soundManager.playWin();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });

      addChatMessage(`✨ 🛠️ AI Self-Healing Complete: Bug successfully patched!`, 'ai');
    } else {
      addChatMessage(`⚠️ AI Debugger could not fully patch this error automatically. You can click [⏪ REVERT] to restore your last working game, or submit a new refinement tweak.`, 'ai');
    }
  } catch (err) {
    window.hideLoading();
    addChatMessage(`⚠️ Network error during auto-repair. You can click [⏪ REVERT] to restore your last working game.`, 'ai');
  }
};

/**
 * Revert to previous working game version
 */
window.revertToLastWorkingGame = function() {
  if (window._app.lastWorkingCode) {
    window._app.lastCustomCode = window._app.lastWorkingCode;
    renderCustomIframe(window._app.lastWorkingCode);
    if (window.soundManager) window.soundManager.playCoin();
    addChatMessage(`⏪ Restored previous working game version!`, 'ai');
  } else {
    addChatMessage(`⚠️ No previous version saved yet. Click START GAME to generate fresh.`, 'ai');
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
    listEl.innerHTML = '<div style="font-size:12px;color:#64748b;padding:32px 16px;text-align:center;font-weight:600"><div style="font-size:36px;margin-bottom:10px">🕹️</div><div style="font-family:var(--pixel-font-title);font-size:11px;color:var(--pixel-blue);margin-bottom:4px">NO HISTORY YET</div>Search or generate a game to record prompts!</div>';
    return;
  }
  listEl.innerHTML = history.map(h => {
    const safePrompt = (h.prompt || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    return `
      <div onclick="window.replayHistory('${safePrompt}')"
        style="padding:12px 14px;border-radius:12px;border:2px solid #e2e8f0;background:#f8fafc;margin-bottom:10px;cursor:pointer;box-shadow:0 3px 0 #cbd5e1;transition:all 0.15s"
        onmouseover="this.style.background='#dcfce7';this.style.borderColor='#86efac';this.style.boxShadow='0 4px 0 #86efac';this.style.transform='translateY(-2px)'"
        onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e2e8f0';this.style.boxShadow='0 3px 0 #cbd5e1';this.style.transform='none'">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.4">"${h.prompt}"</div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:11px;font-weight:600;color:#64748b">🕒 ${new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span style="font-size:9px;font-weight:700;padding:3px 8px;border-radius:6px;${h.isGeneratable ? 'background:#dcfce7;color:#15803d;border:1px solid #86efac' : 'background:#fef3c7;color:#b45309;border:1px solid #fcd34d'}">${h.isGeneratable ? '⚡ GENERATED' : '📚 SEARCH'}</span>
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

window.exportCurrentGame = function() {
  const customCode = window._app.lastCustomCode;
  const customPrompt = window._app.lastCustomPrompt || 'Venator Game';
  const archetype = window._app.selectedArchetype || '2D_SHOOTER';

  let standaloneHtml = '';
  let gameTitle = customPrompt.replace(/["']/g, '');

  if (customCode) {
    const cleanCode = sanitizeCodeForIframe(customCode);
    standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${gameTitle} — Venator Arcade Standalone Edition</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090d16;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      width: 100vw;
      overflow: hidden;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    #game-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 10px;
    }
    #gameCanvas {
      background: #0f172a;
      border: 4px solid #407a1e;
      border-radius: 16px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 0 2px rgba(101, 163, 13, 0.3);
      width: 100% !important;
      height: auto !important;
      max-width: 800px;
      max-height: 80vh;
      aspect-ratio: 4 / 3;
      object-fit: contain;
      cursor: pointer;
      touch-action: none;
    }
    .game-hud {
      margin-top: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 800px;
      max-width: 95vw;
      padding: 10px 18px;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      font-size: 13px;
      color: #94a3b8;
    }
    .game-hud strong { color: #84cc16; }
    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      background: #407a1e;
      color: #fff;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div id="game-wrapper">
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    <div class="game-hud">
      <div>🎮 <strong>${gameTitle}</strong></div>
      <div class="badge">STANDALONE EDITION</div>
      <div>⚔️ Built with <strong>Venator Arcade</strong></div>
    </div>
  </div>
  <script>
    // Virtual Coordinate Scaler Hook:
    function _scaleEventCoords(e, canvas) {
      if (!canvas) return;
      var rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      var touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
      if (touch && typeof touch.clientX === 'number') {
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        var sx = (touch.clientX - rect.left) * scaleX;
        var sy = (touch.clientY - rect.top) * scaleY;
        try {
          Object.defineProperty(e, 'offsetX', { get: function() { return sx; }, configurable: true });
          Object.defineProperty(e, 'offsetY', { get: function() { return sy; }, configurable: true });
          Object.defineProperty(e, 'canvasX', { get: function() { return sx; }, configurable: true });
          Object.defineProperty(e, 'canvasY', { get: function() { return sy; }, configurable: true });
        } catch(err) {}
      }
    }

    var _origAddEventListener = HTMLCanvasElement.prototype.addEventListener;
    HTMLCanvasElement.prototype.addEventListener = function(type, listener, options) {
      var canvas = this;
      if (['mousedown', 'mouseup', 'mousemove', 'click', 'touchstart', 'touchmove', 'touchend'].indexOf(type) !== -1) {
        var wrappedListener = function(e) {
          _scaleEventCoords(e, canvas);
          listener.call(this, e);
        };
        return _origAddEventListener.call(this, type, wrappedListener, options);
      }
      return _origAddEventListener.call(this, type, listener, options);
    };

    // ZzFX Micro Sound Synthesizer (MIT License - Frank Force)
    let zzfxX = null;
    const zzfxR = 44100;
    function _getZzfxCtx() {
      if (!zzfxX) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) zzfxX = new AC();
      }
      if (zzfxX && zzfxX.state === 'suspended') zzfxX.resume();
      return zzfxX;
    }

    ['click', 'mousedown', 'keydown', 'touchstart'].forEach(e => {
      window.addEventListener(e, () => _getZzfxCtx(), { once: true, passive: true });
    });

    window.zzfx = (...t) => {
      const ctx = _getZzfxCtx();
      if (!ctx) return null;
      const p = zzfxG(...t);
      const src = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, p.length, zzfxR);
      buf.getChannelData(0).set(p);
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
      return src;
    };

    function zzfxG(q=1,k=.05,c=220,e=0,t=0,u=.1,j=0,v=1,m=0,r=0,s=0,h=0,w=0,x=0,y=0,z=0,A=0,l=1,B=0,C=0) {
      let b=2*Math.PI,H=v*=(500*b)/zzfxR/zzfxR,J=(1-k)*zzfxR|0,D=c*=((1+2*e*Math.random()-e)*b)/zzfxR,p=[],E=0,n=0,a=0,G=1,d=0,F=0,g=0,N=0,P=0;
      t=t*zzfxR|0;u=u*zzfxR|0;j=j*zzfxR|0;A=A*zzfxR|0;B=B*zzfxR|0;m*=(500*b)/zzfxR**3;x*=b/zzfxR;s*=b/zzfxR;h=h*zzfxR|0;w=w*zzfxR|0;z=z*zzfxR|0;C*=b/zzfxR;
      for(let K=t+u+j+A+B|0,L=0;L<K;++L){
        ++N>=h&&(N=0,d=2*Math.random()-1);d&&(G=d>0?1:-1);
        p[L]=(L<t?L/t:L<t+u?1-(L-t)/u*(1-y):L<t+u+j?y:L<K-B?(K-B-L)/A*y:0)*(L<t+u+j+A?Math.sin(F):1)*(L<t+u?(1-k)+k*Math.cos(L/J*b):1)*Math.sin(a);
        a+=D+=v+=m;F+=x;g+=s;P+=C;q&&(p[L]=p[L]*q);
      }
      return p;
    }

    const ZZFX_PRESETS = {
      laser: [1.2,0,850,.03,.25,.5,1,1.2,0,-9.4,0,0,0,.1,0,0,0,.6,.04,0],
      shoot: [1.2,0,850,.03,.25,.5,1,1.2,0,-9.4,0,0,0,.1,0,0,0,.6,.04,0],
      bullet: [1.2,0,850,.03,.25,.5,1,1.2,0,-9.4,0,0,0,.1,0,0,0,.6,.04,0],
      explosion: [1.5,0,25,.04,0,.4,4,1.9,0,.1,0,0,.05,0,0,0,0,0,-.01,0],
      hit: [1.4,0,80,.01,.05,.15,1,1.2,-9,0,0,0,0,.1,0,0,0,.5,0,0],
      coin: [1.2,0,537,.02,.02,.22,1,1.59,-6.9,.5,0,0,0,1,0,.1,0,0,0,0],
      pickup: [1.2,0,537,.02,.02,.22,1,1.59,-6.9,.5,0,0,0,1,0,.1,0,0,0,0],
      jump: [1.3,0,140,.01,.1,.2,1,1.5,-4.4,0,0,0,0,.2,0,0,0,-.04,0,0],
      powerup: [1.2,0,250,.01,.05,.2,1,1.1,-7,0,0,0,0,.1,0,0,0,.4,0,0],
      gameover: [1.5,0,120,.05,.1,.3,1,1.1,-10,0,0,0,0,.1,0,0,0,.7,0,0],
      win: [1.3,0,523,.05,.05,.35,1,1.3,-5,0,0,0,0,.1,0,0,0,.6,0,0],
      click: [0.8,0,300,0,.02,.02,0,1.5,-10,0,0,0,0,0,0,0,0,0,0,0]
    };

    window.playSound = function(type) {
      try {
        const key = (type || 'click').toLowerCase();
        const sound = ZZFX_PRESETS[key] || ZZFX_PRESETS.click;
        window.zzfx(...sound);
      } catch(e) {}
    };

    try {
      ${cleanCode}
    } catch(err) {
      console.error("Game error:", err);
      alert("Game encountered an issue: " + err.message);
    }
  <\/script>
</body>
</html>`;
  } else {
    gameTitle = archetype.replace(/_/g, ' ');
    standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${gameTitle} — Venator Arcade Standalone</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f172a; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
    canvas { background: #000; border: 4px solid #407a1e; border-radius: 12px; }
  </style>
</head>
<body>
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  <div style="margin-top: 12px; color: #84cc16; font-weight: bold;">⚔️ ${gameTitle} — Built with Venator Arcade</div>
</body>
</html>`;
  }

  // Trigger browser download
  const cleanFileName = (gameTitle || 'venator-game').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanFileName || 'venator-game'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Confetti effect & in-app chat announcement
  try {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });
  } catch(e) {}

  addChatMessage(`💾 Exported standalone file: "${cleanFileName}.html" (Ready for itch.io, mobile, or offline play!)`, 'ai');
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
