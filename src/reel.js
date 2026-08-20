import { CURATED_GAMES } from './engine/curatedGames.js';

/**
 * Arcade Reel Manager
 * Implements 1-Player discovery feed, strict single-iframe lifecycle,
 * and session-scoped live in-place code refinement.
 */
export class ArcadeReelManager {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.deck = [];
    this.currentIndex = 0;
    this.isRefinerOpen = false;
    this.activeIframes = new Map(); // cardIndex -> iframeElement
    this.initialized = false;
  }

  init() {
    if (this.initialized) {
      setTimeout(() => this.goToCard(0), 50);
      return;
    }
    this.initialized = true;

    // Load curated games into session deck with canonical copies
    this.deck = CURATED_GAMES.map(g => ({
      id: g.id,
      title: g.title,
      genre: g.genre,
      desc: g.desc,
      controls: g.controls,
      canonicalCode: g.code,
      currentCode: g.code, // forked on edit
      isCustom: false,
      chatHistory: []
    }));

    // Append 1 "GENERATE YOUR OWN" card
    this.deck.push({
      id: 'card_generate_special',
      title: 'Generate Your Own Game',
      genre: 'AI Synthesis',
      desc: 'Type any custom game description in natural language and watch the AI synthesize a live playable prototype on the fly.',
      controls: 'Custom Rules & Mechanics',
      isGenerateCard: true
    });

    this.renderDeckUI();
    this.updateCardIframeLifecycle(0);
    this.setupScrollObserver();

    // Keyboard navigation (Arrow Up / Down)
    window.addEventListener('keydown', (e) => {
      const reelPage = document.getElementById('page-reel');
      if (!reelPage || !reelPage.classList.contains('active')) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.nextCard();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.prevCard();
      }
    });
  }

  setupScrollObserver() {
    const container = document.getElementById('reel-container');
    if (!container) return;

    if (this._observer) this._observer.disconnect();

    this._observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
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
      threshold: [0.5]
    });

    document.querySelectorAll('.reel-card').forEach(card => {
      this._observer.observe(card);
    });
  }

  renderDeckUI() {
    const container = document.getElementById('reel-cards-track');
    if (!container) return;

    container.innerHTML = this.deck.map((card, idx) => {
      if (card.isGenerateCard) {
        return `
          <div class="reel-card generate-card-item" id="reel-card-${idx}" data-index="${idx}">
            <div class="reel-card-header">
              <div style="display:flex;align-items:center;gap:10px">
                <span class="reel-badge badge-ai">⚡ AI STUDIO</span>
                <h2 class="reel-card-title">${card.title}</h2>
              </div>
              <div class="reel-card-genre">1-PLAYER LOCKED</div>
            </div>
            <div class="reel-gen-card-body">
              <div class="reel-gen-sparkle">✨</div>
              <h3 style="font-family:var(--pixel-font-title);font-size:16px;color:#fff;margin-bottom:8px">DESCRIBE ANY GAME TO SYNTHESIZE</h3>
              <p style="font-size:13px;color:#94a3b8;max-width:520px;margin-bottom:16px;line-height:1.5">
                Our Ollama LLM will generate pure HTML5 Canvas code with ZzFX sound effects and inject it as a new live card into this discovery reel.
              </p>
              
              <div style="width:100%;max-width:580px;display:flex;flex-direction:column;gap:12px">
                <textarea id="reel-custom-prompt-input" rows="3" placeholder="e.g. 2D underwater submarine shooter where I dodge electric jellyfish and collect glowing sunken treasure with torpedo sound effects..." style="width:100%;padding:14px;border-radius:10px;background:#0f172a;border:2px solid #38bdf8;color:#fff;font-family:monospace;font-size:13px;resize:none"></textarea>
                
                <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
                  <button class="reel-prompt-chip" onclick="setReelPrompt('Cyberpunk motorcycle combat dodging laser barriers and shooting drones')">🏍️ Cyber Moto</button>
                  <button class="reel-prompt-chip" onclick="setReelPrompt('Pixel archery target shooter with moving bullseyes and wind physics')">🏹 Archery Master</button>
                  <button class="reel-prompt-chip" onclick="setReelPrompt('Vertical jumping ninja climbing glowing pagoda towers with grappling hook')">🥷 Tower Climber</button>
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

          <!-- Stage Viewport -->
          <div class="reel-stage" id="reel-stage-${idx}">
            <div class="reel-tap-overlay" id="reel-tap-${idx}" onclick="window.arcadeReel.startCardPlay(${idx})">
              <div class="tap-play-box">
                <div class="tap-play-icon">▶</div>
                <div class="tap-play-text">CLICK TO PLAY</div>
                <div class="tap-play-sub">Enables 8-bit ZzFX audio & controls</div>
              </div>
            </div>
            <div class="reel-iframe-host" id="reel-iframe-host-${idx}">
              <!-- Iframe injected dynamically per lifecycle -->
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
              <div class="chat-bubble ai">Type any feature tweak below (e.g. "add combo multiplier", "make enemies shoot lasers") to update this game in-place!</div>
            </div>
            <div class="refiner-input-row">
              <input type="text" id="reel-tweak-input-${idx}" placeholder="e.g. 'Add a speed boost pickup item'" onkeydown="if(event.key==='Enter') window.arcadeReel.submitRefinement(${idx})">
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

  goToCard(targetIndex) {
    if (targetIndex < 0 || targetIndex >= this.deck.length) return;
    this.currentIndex = targetIndex;

    const container = document.getElementById('reel-container');
    const targetEl = document.getElementById(`reel-card-${targetIndex}`);
    if (container && targetEl) {
      container.scrollTo({
        top: targetEl.offsetTop - 20,
        behavior: 'smooth'
      });
    }

    this.updateCardIndicator();
    this.updateCardIframeLifecycle(targetIndex);
  }

  /**
   * Strict Iframe Lifecycle:
   * 1. Only CURRENT card's iframe is mounted and running.
   * 2. Next card (targetIndex + 1) may be preloaded.
   * 3. Any card with abs(index - targetIndex) > 1 must have its iframe completely removed from DOM.
   */
  updateCardIframeLifecycle(centerIndex) {
    for (let i = 0; i < this.deck.length; i++) {
      if (this.deck[i].isGenerateCard) continue;

      const host = document.getElementById(`reel-iframe-host-${i}`);
      if (!host) continue;

      const dist = Math.abs(i - centerIndex);

      if (dist === 0) {
        // Current Card: Ensure mounted
        if (!host.querySelector('iframe')) {
          this.mountCardIframe(i, false);
        }
      } else if (dist === 1 && i === centerIndex + 1) {
        // Preload next card ahead
        if (!host.querySelector('iframe')) {
          this.mountCardIframe(i, false);
        }
      } else {
        // More than 1 away: Completely remove from DOM to free WebGL / memory
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
            max-width: 100%;
            max-height: 100%;
            aspect-ratio: 4 / 3;
            object-fit: contain;
            background: #111827;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.7);
            cursor: pointer;
            touch-action: none;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
          }
        </style>
        ${scriptTagStart}
          window.onerror = function(msg, url, line, col, err) {
            var errMsg = msg || (err && err.message) || 'Syntax or Runtime Error';
            window.parent.postMessage({ type: 'REEL_GAME_ERROR', cardIndex: ${cardIndex}, error: errMsg + (line ? ' (line ' + line + ')' : '') }, '*');
            return false;
          };

          // Virtual Coordinate Scaler Hook:
          // Maps touch/mouse coordinates transparently to the 800x600 internal canvas grid
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
            if (['mousedown', 'mouseup', 'mousemove', 'click', 'touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointermove'].indexOf(type) !== -1) {
              var wrappedListener = function(e) {
                _scaleEventCoords(e, canvas);
                listener.call(this, e);
              };
              return _origAddEventListener.call(this, type, wrappedListener, options);
            }
            return _origAddEventListener.call(this, type, listener, options);
          };

          // Universal Mobile Touch-to-Keyboard & Swipe Gesture Bridge:
          // Enables immediate touch playability for all keyboard-controlled games
          (function setupUniversalTouchBridge() {
            var startX = 0, startY = 0, startTime = 0;
            function dispatchKey(key, code) {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: key, code: code, bubbles: true }));
              setTimeout(function() {
                window.dispatchEvent(new KeyboardEvent('keyup', { key: key, code: code, bubbles: true }));
              }, 120);
            }

            window.addEventListener('touchstart', function(e) {
              if (e.touches && e.touches[0]) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startTime = Date.now();
              }
            }, { passive: true });

            window.addEventListener('touchend', function(e) {
              if (!e.changedTouches || !e.changedTouches[0]) return;
              var endX = e.changedTouches[0].clientX;
              var endY = e.changedTouches[0].clientY;
              var dx = endX - startX;
              var dy = endY - startY;
              var dt = Date.now() - startTime;
              var absDx = Math.abs(dx);
              var absDy = Math.abs(dy);

              if (dt < 400 && (absDx > 25 || absDy > 25)) {
                // Swipe detected
                if (absDx > absDy) {
                  if (dx > 0) { dispatchKey('ArrowRight', 'ArrowRight'); dispatchKey('d', 'KeyD'); }
                  else { dispatchKey('ArrowLeft', 'ArrowLeft'); dispatchKey('a', 'KeyA'); }
                } else {
                  if (dy > 0) { dispatchKey('ArrowDown', 'ArrowDown'); dispatchKey('s', 'KeyS'); }
                  else { dispatchKey('ArrowUp', 'ArrowUp'); dispatchKey('w', 'KeyW'); }
                }
              } else if (dt < 300 && absDx < 15 && absDy < 15) {
                // Quick Tap -> Space / Shoot / Jump
                dispatchKey(' ', 'Space');
              }
            }, { passive: true });
          })();

          // ZzFX Micro Synthesizer
          window.zzfxX = null;
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
              var key = (type || 'click').toLowerCase();
              var sound = ZZFX_PRESETS[key] || ZZFX_PRESETS.click;
              window.zzfx.apply(null, sound);
            } catch(e) {}
          };
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
        try { iframe.contentWindow?.focus(); } catch (e) {}
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
        iframe.contentWindow?.focus();
        iframe.contentDocument?.getElementById('gameCanvas')?.click();
      } catch (e) {}
    } else {
      this.mountCardIframe(cardIndex, true);
    }
  }

  toggleRefiner(cardIndex) {
    const drawer = document.getElementById(`reel-refiner-drawer-${cardIndex}`);
    if (!drawer) return;
    const isHidden = drawer.classList.contains('hidden');
    document.querySelectorAll('.reel-refiner-drawer').forEach(d => d.classList.add('hidden'));
    if (isHidden) drawer.classList.remove('hidden');
  }

  closeRefiner(cardIndex) {
    const drawer = document.getElementById(`reel-refiner-drawer-${cardIndex}`);
    if (drawer) drawer.classList.add('hidden');
  }

  async submitRefinement(cardIndex) {
    const card = this.deck[cardIndex];
    if (!card) return;

    const input = document.getElementById(`reel-tweak-input-${cardIndex}`);
    const tweakText = input ? input.value.trim() : '';
    if (!tweakText) return;

    if (input) input.value = '';
    this.addCardChatMessage(cardIndex, `🛠️ Tweak: "${tweakText}"`, 'user');

    window.showLoading('Refining Game...', `🧠 Ollama LLM applying: "${tweakText.slice(0, 30)}..." to ${card.title}`);

    try {
      const res = await fetch(`${this.apiBase}/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: card.title + ' - ' + card.desc,
          previousCode: card.currentCode,
          tweakRequest: tweakText
        })
      });
      const data = await res.json();
      window.hideLoading();

      if (data.success && data.code) {
        card.currentCode = data.code; // fork updated
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

    window.showLoading('Synthesizing Game...', `🧠 Ollama LLM synthesizing custom 1-player game for "${promptText.slice(0, 30)}..."`);

    try {
      const res = await fetch(`${this.apiBase}/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: promptText })
      });
      const data = await res.json();
      window.hideLoading();

      if (data.success && data.code) {
        const newCard = {
          id: 'custom_' + Date.now(),
          title: promptText.slice(0, 30) + (promptText.length > 30 ? '...' : ''),
          genre: 'Custom 1P Game',
          desc: promptText,
          controls: 'WASD / Space / Mouse Click & Movement',
          canonicalCode: data.code,
          currentCode: data.code,
          isCustom: true,
          chatHistory: []
        };

        // Insert before the generate card (which is at the end)
        const insertIndex = this.deck.length - 1;
        this.deck.splice(insertIndex, 0, newCard);

        this.renderDeckUI();
        this.goToCard(insertIndex);
        this.startCardPlay(insertIndex);

        // Save to History
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${card.title} - Venator Arcade Standalone Edition</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #090d16;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #fff;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    #game-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 10px;
    }
    canvas {
      width: 100% !important;
      height: auto !important;
      max-width: 800px;
      max-height: 85vh;
      aspect-ratio: 4 / 3;
      object-fit: contain;
      background: #111827;
      border: 3px solid #548b28;
      border-radius: 14px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.8);
      cursor: pointer;
      touch-action: none;
    }
  </style>
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

    window.zzfxX = null;
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
        var key = (type || 'click').toLowerCase();
        var sound = ZZFX_PRESETS[key] || ZZFX_PRESETS.click;
        window.zzfx.apply(null, sound);
      } catch(e) {}
    };
  </script>
</head>
<body>
  <div id="game-container">
    <canvas id="gameCanvas" width="800" height="600"></canvas>
  </div>
  <script>
${card.currentCode}
  </script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${card.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_venator.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
