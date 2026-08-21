import { CURATED_GAMES } from './engine/curatedGames.js';
import { CURATED_2P_GAMES } from './engine/curated2PGames.js';
import { getMultiplayerInjectSnippet } from './engine/multiplayerSDK.js';

/**
 * Arcade Reel Manager
 * Supports 1-Player Solo & 2-Player Local/VS Computer discovery feeds,
 * strict single-iframe lifecycle, and live AI game generation & refinement.
 */
export class ArcadeReelManager {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.playerMode = '1P'; // '1P' | '2P'
    this.deck = [];
    this.currentIndex = 0;
    this.isRefinerOpen = false;
    this.activeIframes = new Map();
    this.initialized = false;
  }

  init(mode = '1P') {
    this.playerMode = mode;
    this.initialized = true;
    this.updateNavbarButtons(mode);

    this.loadDeckForMode(this.playerMode);
    this.renderDeckUI();
    this.updateCardIframeLifecycle(0);
    this.setupScrollObserver();
  }

  updateNavbarButtons(mode) {
    const targetMode = mode || this.playerMode || '1P';
    const btn1p = document.getElementById('reel-mode-1p');
    const btn2p = document.getElementById('reel-mode-2p');
    if (btn1p) btn1p.classList.toggle('active', targetMode === '1P');
    if (btn2p) btn2p.classList.toggle('active', targetMode === '2P');
    document.querySelectorAll('.reel-mode-1p-btn').forEach(b => b.classList.toggle('active', targetMode === '1P'));
    document.querySelectorAll('.reel-mode-2p-btn').forEach(b => b.classList.toggle('active', targetMode === '2P'));
  }

  setPlayerMode(mode) {
    this.updateNavbarButtons(mode);
    if (this.playerMode === mode && this.deck.length > 0) return;
    this.playerMode = mode;

    this.loadDeckForMode(mode);
    this.renderDeckUI();
    this.goToCard(0);
    this.updateCardIframeLifecycle(0);
  }

  loadDeckForMode(mode) {
    const is2P = mode === '2P';
    const sourceGames = is2P ? CURATED_2P_GAMES : CURATED_GAMES;

    this.deck = sourceGames.map((g) => ({
      id: g.id,
      title: g.title,
      genre: g.genre,
      desc: g.desc,
      controls: g.controls,
      canonicalCode: g.code,
      currentCode: g.code,
      isCustom: false,
      is2P: is2P,
      mpMode: 'bot', // 'bot' | 'local'
      chatHistory: []
    }));

    // Append Generator Card (Card 7)
    this.deck.push({
      id: is2P ? 'card_generate_2p_special' : 'card_generate_special',
      title: is2P ? 'Generate 2-Player Game' : 'Generate Your Own Game',
      genre: is2P ? '2P AI Synthesis' : 'AI Synthesis',
      desc: is2P
        ? 'Describe any 2-player game. AI will synthesize dual keyboard/touch controls and VS Computer bot mode!'
        : 'Type any custom game description in natural language and watch the AI synthesize a live playable prototype.',
      controls: is2P ? 'P1: WASD vs P2: Arrows / Bot AI' : 'Custom Rules & Mechanics',
      isGenerateCard: true,
      is2P: is2P
    });
  }

  setupScrollObserver() {
    const container = document.getElementById('reel-container');
    if (!container) return;

    if (this._observer) this._observer.disconnect();

    this._observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          const idx = parseInt(entry.target.getAttribute('data-index'), 10);
          if (!isNaN(idx) && idx !== this.currentIndex) {
            this.currentIndex = idx;
            this.updateCardIndicator();
            this.updateCardIframeLifecycle(idx);
          }
        }
      });
    }, {
      root: container,
      threshold: [0.4]
    });

    document.querySelectorAll('.reel-card').forEach(card => {
      this._observer.observe(card);
    });
  }

  renderDeckUI() {
    const container = document.getElementById('reel-cards-track');
    if (!container) return;

    const is2PMode = this.playerMode === '2P';

    container.innerHTML = this.deck.map((card, idx) => {
      if (card.isGenerateCard) {
        return `
          <div class="reel-card generate-card-item" id="reel-card-${idx}" data-index="${idx}">
            <div class="reel-card-header">
              <div style="display:flex;align-items:center;gap:10px">
                <span class="reel-badge badge-ai">${is2PMode ? '👥 2P GAME AI STUDIO' : '⚡ 1P AI STUDIO'}</span>
                <h2 class="reel-card-title">${card.title}</h2>
              </div>
              <div class="reel-card-genre">${is2PMode ? '2-PLAYER / VS BOT' : '1-PLAYER SOLO'}</div>
            </div>
            <div class="reel-gen-card-body">
              <div class="reel-gen-sparkle">✨</div>
              <h3 style="font-family:var(--pixel-font-title);font-size:16px;color:#fff;margin-bottom:8px">
                ${is2PMode ? 'DESCRIBE ANY 2-PLAYER GAME TO SYNTHESIZE' : 'DESCRIBE ANY GAME TO SYNTHESIZE'}
              </h3>
              <p style="font-size:13px;color:#94a3b8;max-width:540px;margin-bottom:16px;line-height:1.5">
                ${is2PMode 
                  ? 'Our AI will generate complete dual controls (P1 WASD vs P2 Arrows) and responsive VS Computer Bot AI!' 
                  : 'Our Ollama LLM will generate pure HTML5 Canvas code with ZzFX sound effects and inject it as a new live card.'}
              </p>
              
              <div style="width:100%;max-width:580px;display:flex;flex-direction:column;gap:12px">
                <textarea id="reel-custom-prompt-input" rows="3" placeholder="${is2PMode ? 'e.g. 2-player wizard duel where players shoot fireballs and block with magic shields...' : 'e.g. 2D underwater submarine shooter where I dodge electric jellyfish...'}" style="width:100%;padding:14px;border-radius:10px;background:#0f172a;border:2px solid #38bdf8;color:#fff;font-family:monospace;font-size:13px;resize:none"></textarea>
                
                <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
                  ${is2PMode ? `
                    <button class="reel-prompt-chip" onclick="setReelPrompt('2-player air hockey duel with glowing pucks and power smashes')">🏓 Neon Air Hockey</button>
                    <button class="reel-prompt-chip" onclick="setReelPrompt('2-player wizard magic duel shooting fire and ice spells')">🧙‍♂️ Wizard Duel</button>
                    <button class="reel-prompt-chip" onclick="setReelPrompt('2-player sumo bumper clash with bouncing physics')">🔴 Sumo Clash</button>
                  ` : `
                    <button class="reel-prompt-chip" onclick="setReelPrompt('Cyberpunk motorcycle combat dodging laser barriers')">🏍️ Cyber Moto</button>
                    <button class="reel-prompt-chip" onclick="setReelPrompt('Pixel archery target shooter with moving bullseyes')">🏹 Archery Master</button>
                    <button class="reel-prompt-chip" onclick="setReelPrompt('Vertical jumping ninja climbing pagoda towers')">🥷 Tower Climber</button>
                  `}
                </div>

                <button class="btn-moss-start glow-pulse-green" id="btn-reel-synth" onclick="window.arcadeReel.synthesizeFromReel()" style="padding:12px 24px;font-size:13px;margin-top:6px">
                  ⚡ SYNTHESIZE & ADD TO REEL
                </button>
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="reel-card" id="reel-card-${idx}" data-index="${idx}">
          <!-- Card Header -->
          <div class="reel-card-header">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span class="reel-badge badge-arcade">${card.genre.toUpperCase()}</span>
              <span class="reel-badge" style="background:#0f172a;color:#cbd5e1;border-color:#334155">${idx + 1} / ${this.deck.length}</span>
              <h2 class="reel-card-title">${card.title}</h2>
            </div>
            <div class="reel-controls-hint">🕹️ ${card.controls}</div>
          </div>

          ${card.is2P && !card.isCustom ? `
          <!-- 2-Player Mode Selector Bar (Curated Games) -->
          <div class="reel-mp-bar" id="reel-mp-bar-${idx}" style="display:flex;align-items:center;gap:8px;background:#0f172a;border-bottom:2px solid #1e293b;padding:6px 14px;font-family:var(--pixel-font-title);font-size:9px">
            <span style="color:#94a3b8">PLAY MODE:</span>
            <button class="mp-mode-btn ${card.mpMode === 'bot' ? 'active' : ''}" id="mp-btn-bot-${idx}" onclick="window.arcadeReel.setCardMPMode(${idx}, 'bot')" style="padding:4px 10px;border-radius:4px;border:1px solid #38bdf8;background:${card.mpMode === 'bot' ? '#38bdf8' : 'transparent'};color:${card.mpMode === 'bot' ? '#0f172a' : '#38bdf8'};cursor:pointer">🤖 VS COMPUTER</button>
            <button class="mp-mode-btn ${card.mpMode === 'local' ? 'active' : ''}" id="mp-btn-local-${idx}" onclick="window.arcadeReel.setCardMPMode(${idx}, 'local')" style="padding:4px 10px;border-radius:4px;border:1px solid #22c55e;background:${card.mpMode === 'local' ? '#22c55e' : 'transparent'};color:${card.mpMode === 'local' ? '#0f172a' : '#22c55e'};cursor:pointer">👥 LOCAL 2-PLAYER</button>
          </div>
          ` : ''}

          <!-- Stage Viewport -->
          <div class="reel-stage" id="reel-stage-${idx}">
            <div class="reel-tap-overlay" id="reel-tap-${idx}" onclick="window.arcadeReel.startCardPlay(${idx})">
              <div class="tap-play-box">
                <div class="tap-play-icon">▶</div>
                <div class="tap-play-text">CLICK TO PLAY</div>
                <div class="tap-play-sub">${card.is2P ? 'P1: WASD • P2: Arrows / Bot' : 'Enables 8-bit ZzFX audio & controls'}</div>
              </div>
            </div>
            <div class="reel-iframe-host" id="reel-iframe-host-${idx}">
              <!-- Iframe injected dynamically -->
            </div>
          </div>

          <!-- Bottom Action Bar -->
          <div class="reel-action-bar">
            <div style="display:flex;gap:6px;align-items:center">
              <button class="btn-retro-bevel btn-refine-toggle" onclick="window.arcadeReel.toggleRefiner(${idx})" title="Live AI Code Refiner">
                🛠️ REFINE WITH AI
              </button>
              <button class="btn-retro-bevel" onclick="window.arcadeReel.revertCardToCanonical(${idx})" title="Reset back to original source">
                ⏪ REVERT TO ORIGINAL
              </button>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <button class="btn-retro-bevel" onclick="window.arcadeReel.exportCard(${idx})" title="Download standalone HTML file" style="background:#facc15;color:#0f172a;border-color:#ca8a04">
                💾 EXPORT
              </button>
              <button class="btn-retro-bevel" onclick="window.arcadeReel.toggleFullscreen(${idx})">
                ⛶ FULLSCREEN
              </button>
            </div>
          </div>

          <!-- Inline AI Refinement Drawer (Pixel Window) -->
          <div class="reel-refiner-drawer hidden" id="reel-refiner-drawer-${idx}">
            <div class="refiner-drawer-header">
              <div style="font-family:var(--pixel-font-title);font-size:10px;color:#fff;text-shadow:1px 1px 0 var(--pixel-blue-dark)">LIVE AI CODE REFINER • ${card.title}</div>
              <div class="win-close-btn" style="width:20px;height:20px;font-size:9px" onclick="event.stopPropagation(); window.arcadeReel.closeRefiner(${idx})">✕</div>
            </div>
            <div class="refiner-chat-messages" id="reel-chat-messages-${idx}">
              <div class="chat-bubble ai">Type any feature tweak below (e.g. "make paddles 2x faster", "add missile pickups") to update this game in-place!</div>
            </div>
            <div class="refiner-input-row">
              <input type="text" id="reel-tweak-input-${idx}" placeholder="e.g. 'Make player 1 faster'" onkeydown="if(event.key==='Enter') window.arcadeReel.submitRefinement(${idx})">
              <button class="btn-moss-start" style="padding:6px 14px;font-size:10px" onclick="window.arcadeReel.submitRefinement(${idx})">
                REFINE →
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.updateCardIndicator();
    setTimeout(() => this.setupScrollObserver(), 50);
  }

  setCardMPMode(cardIndex, mode) {
    const card = this.deck[cardIndex];
    if (!card) return;

    card.mpMode = mode;

    // Update UI button highlights
    const btnBot = document.getElementById(`mp-btn-bot-${cardIndex}`);
    const btnLocal = document.getElementById(`mp-btn-local-${cardIndex}`);

    if (btnBot) {
      btnBot.style.background = mode === 'bot' ? '#38bdf8' : 'transparent';
      btnBot.style.color = mode === 'bot' ? '#0f172a' : '#38bdf8';
    }
    if (btnLocal) {
      btnLocal.style.background = mode === 'local' ? '#22c55e' : 'transparent';
      btnLocal.style.color = mode === 'local' ? '#0f172a' : '#22c55e';
    }

    // Hide tap overlay and focus iframe
    const tapOverlay = document.getElementById(`reel-tap-${cardIndex}`);
    if (tapOverlay) tapOverlay.style.display = 'none';

    // Notify iframe
    const host = document.getElementById(`reel-iframe-host-${cardIndex}`);
    const iframe = host?.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'MP_SET_MODE', mode }, '*');
      setTimeout(() => {
        try { iframe.contentWindow?.focus({ preventScroll: true }); } catch (e) {}
      }, 50);

      // Verify that the injected MP SDK processed the mode change
      setTimeout(() => {
        try {
          const ackCount = iframe.contentWindow?.MP?.modeChangeAckCount;
          if (typeof ackCount === 'number' && ackCount === 0) {
            window.postMessage({
              type: 'REEL_GAME_ERROR',
              cardIndex,
              error: 'Game code is not reading window.MP — bot toggle had no effect'
            }, '*');
          }
        } catch (e) {}
      }, 300);
    }
  }

  updateCardIndicator() {
    const ind = document.getElementById('reel-nav-indicator');
    if (ind) {
      ind.textContent = `CARD ${this.currentIndex + 1} / ${this.deck.length}`;
    }
  }

  nextCard() {
    if (this.currentIndex < this.deck.length - 1) {
      this.goToCard(this.currentIndex + 1);
    }
  }

  prevCard() {
    if (this.currentIndex > 0) {
      this.goToCard(this.currentIndex - 1);
    }
  }

  goToCard(index) {
    if (index < 0 || index >= this.deck.length) return;
    const cardEl = document.getElementById(`reel-card-${index}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.currentIndex = index;
      this.updateCardIndicator();
      this.updateCardIframeLifecycle(index);
    }
  }

  updateCardIframeLifecycle(centerIndex) {
    for (let i = 0; i < this.deck.length; i++) {
      if (this.deck[i].isGenerateCard) continue;

      const host = document.getElementById(`reel-iframe-host-${i}`);
      if (!host) continue;

      const dist = Math.abs(i - centerIndex);

      if (dist === 0) {
        if (!host.querySelector('iframe')) {
          this.mountCardIframe(i, false);
        }
      } else if (dist === 1 && i === centerIndex + 1) {
        if (!host.querySelector('iframe')) {
          this.mountCardIframe(i, false);
        }
      } else {
        host.innerHTML = '';
        const tapOverlay = document.getElementById(`reel-tap-${i}`);
        if (tapOverlay) tapOverlay.style.display = 'flex';
      }
    }
  }

  mountCardIframe(cardIndex, autoFocus = false) {
    const card = this.deck[cardIndex];
    if (!card || card.isGenerateCard) return;

    const host = document.getElementById(`reel-iframe-host-${cardIndex}`);
    if (!host) return;

    host.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.className = 'reel-game-iframe';
    iframe.id = `iframe-game-${cardIndex}`;

    const scriptTagStart = '<script>';
    const scriptTagEnd = '<\/script>';

    const mpSnippet = card.is2P ? getMultiplayerInjectSnippet(card.mpMode || 'bot') : '';

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            width: 100%;
            height: 100%;
            background: #090d16;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
          }
          #game-wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
          }
          canvas {
            width: 100% !important;
            height: 100% !important;
            max-width: 800px;
            max-height: 600px;
            aspect-ratio: 4/3;
            object-fit: contain;
            border-radius: 12px;
            background: #0f172a;
            box-shadow: 0 10px 30px rgba(0,0,0,0.6);
            display: block;
          }
        </style>
        ${scriptTagStart}
          ${mpSnippet}

          window.onerror = function(msg, url, line, col, err) {
            var errMsg = msg || (err && err.message) || 'Syntax or Runtime Error';
            window.parent.postMessage({ type: 'REEL_GAME_ERROR', cardIndex: ${cardIndex}, error: errMsg + (line ? ' (line ' + line + ')' : '') }, '*');
            return false;
          };

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
              var key = (type || 'click').toLowerCase();
              var sound = ZZFX_PRESETS[key] || ZZFX_PRESETS.click;
              window.zzfx.apply(null, sound);
            } catch(e) {}
          };

          // Render loop heartbeat watchdog
          window._renderedFrames = 0;
          var _origRAF = window.requestAnimationFrame;
          window.requestAnimationFrame = function(cb) {
            window._renderedFrames = (window._renderedFrames || 0) + 1;
            return _origRAF.call(window, cb);
          };
          setTimeout(function() {
            if (!window._renderedFrames || window._renderedFrames === 0) {
              window.parent.postMessage({
                type: 'REEL_GAME_ERROR',
                cardIndex: ${cardIndex},
                error: 'Game loop failed to render frames'
              }, '*');
            }
          }, 1500);
        ${scriptTagEnd}
      </head>
      <body>
        <div id="game-wrapper">
          <canvas id="gameCanvas" width="800" height="600"></canvas>
        </div>
        ${scriptTagStart}
${card.currentCode}
        ${scriptTagEnd}
      </body>
      </html>
    `;

    iframe.srcdoc = fullHtml;
    host.appendChild(iframe);

    if (autoFocus) {
      const tapOverlay = document.getElementById(`reel-tap-${cardIndex}`);
      if (tapOverlay) tapOverlay.style.display = 'none';
      setTimeout(() => {
        try { iframe.contentWindow?.focus({ preventScroll: true }); } catch (e) {}
      }, 100);
    }
  }

  startCardPlay(cardIndex) {
    const tapOverlay = document.getElementById(`reel-tap-${cardIndex}`);
    if (tapOverlay) tapOverlay.style.display = 'none';

    const host = document.getElementById(`reel-iframe-host-${cardIndex}`);
    const iframe = host?.querySelector('iframe');
    if (iframe) {
      try {
        iframe.contentWindow?.focus({ preventScroll: true });
        iframe.contentDocument?.getElementById('gameCanvas')?.focus({ preventScroll: true });
      } catch (e) {}
    }
  }

  toggleRefiner(cardIndex) {
    const drawer = document.getElementById(`reel-refiner-drawer-${cardIndex}`);
    if (!drawer) return;
    const isHidden = drawer.classList.contains('hidden');
    drawer.classList.toggle('hidden', !isHidden);
    if (isHidden) {
      const input = document.getElementById(`reel-tweak-input-${cardIndex}`);
      if (input) setTimeout(() => input.focus(), 100);
    }
  }

  closeRefiner(cardIndex) {
    const drawer = document.getElementById(`reel-refiner-drawer-${cardIndex}`);
    if (drawer) drawer.classList.add('hidden');
  }

  async submitRefinement(cardIndex) {
    const card = this.deck[cardIndex];
    const input = document.getElementById(`reel-tweak-input-${cardIndex}`);
    const tweakText = input ? input.value.trim() : '';
    if (!tweakText || !card) return;

    this.addCardChatMessage(cardIndex, tweakText, 'user');
    input.value = '';

    window.showLoading('Refining Game...', `🧠 Ollama LLM applying: "${tweakText.slice(0, 30)}..." to ${card.title}`);

    try {
      const res = await fetch(`${this.apiBase}/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: card.title + ' - ' + card.desc,
          previousCode: card.currentCode,
          tweakRequest: tweakText,
          playerMode: card.is2P ? '2P' : '1P'
        })
      });
      const data = await res.json();
      window.hideLoading();

      if (data.success && data.code) {
        card.currentCode = data.code;
        this.mountCardIframe(cardIndex, true);
        this.addCardChatMessage(cardIndex, `✅ Successfully applied tweak: "${tweakText}"`, 'ai');
      } else {
        this.addCardChatMessage(cardIndex, `⚠️ Could not apply tweak. Preserved working version.`, 'ai');
      }
    } catch (err) {
      window.hideLoading();
      this.addCardChatMessage(cardIndex, `⚠️ Network error while refining game.`, 'ai');
    }
  }

  revertCardToCanonical(cardIndex) {
    const card = this.deck[cardIndex];
    if (!card) return;

    card.currentCode = card.canonicalCode;
    this.mountCardIframe(cardIndex, true);
    this.addCardChatMessage(cardIndex, `⏪ Restored original canonical game source!`, 'ai');
  }

  addCardChatMessage(cardIndex, msg, sender = 'ai') {
    const area = document.getElementById(`reel-chat-messages-${cardIndex}`);
    if (!area) return;
    const div = document.createElement('div');
    div.className = `chat-bubble ${sender}`;
    div.textContent = msg;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  async synthesizeFromReel() {
    const promptInput = document.getElementById('reel-custom-prompt-input');
    const promptText = promptInput ? promptInput.value.trim() : '';
    if (!promptText) return;

    const is2P = this.playerMode === '2P';
    window.showLoading('Synthesizing Game...', `🧠 Ollama LLM synthesizing custom ${is2P ? '2-player' : '1-player'} game for "${promptText.slice(0, 30)}..."`);

    try {
      const res = await fetch(`${this.apiBase}/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: promptText,
          playerMode: is2P ? '2P' : '1P'
        })
      });
      const data = await res.json();
      window.hideLoading();

      if (data.success && data.code) {
        const newCard = {
          id: 'custom_' + Date.now(),
          title: promptText.slice(0, 30) + (promptText.length > 30 ? '...' : ''),
          genre: is2P ? 'Custom 2P Game' : 'Custom 1P Game',
          desc: promptText,
          controls: is2P ? 'P1: WASD vs P2: Arrows / Bot AI' : 'WASD / Space / Mouse Click & Movement',
          canonicalCode: data.code,
          currentCode: data.code,
          isCustom: true,
          is2P: is2P,
          mpMode: 'bot',
          chatHistory: []
        };

        const insertIndex = this.deck.length - 1;
        this.deck.splice(insertIndex, 0, newCard);

        this.renderDeckUI();
        this.goToCard(insertIndex);
        this.startCardPlay(insertIndex);

        if (window.saveToHistory) window.saveToHistory(promptText);
      } else {
        alert(data.error || 'Failed to synthesize custom game code. Please try again!');
      }
    } catch (err) {
      window.hideLoading();
      alert('Network error while synthesizing custom game.');
    }
  }

  exportCard(cardIndex) {
    const card = this.deck[cardIndex];
    if (!card || card.isGenerateCard) return;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${card.title} - Venator Arcade</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f172a; color: #fff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 12px; }
    h1 { font-size: 20px; color: #38bdf8; margin-bottom: 4px; }
    p { font-size: 12px; color: #94a3b8; margin-bottom: 12px; }
    canvas { max-width: 800px; max-height: 600px; width: 100%; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); background: #090d16; }
  </style>
</head>
<body>
  <h1>${card.title}</h1>
  <p>${card.controls}</p>
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  <script>
${card.currentCode}
  <\/script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${card.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_venator.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  toggleFullscreen(cardIndex) {
    const host = document.getElementById(`reel-stage-${cardIndex}`);
    if (!host) return;
    if (!document.fullscreenElement) {
      host.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  }
}
