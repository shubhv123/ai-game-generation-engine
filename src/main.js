import { ThreeEngine } from './engine/ThreeEngine.js';
import { semanticClassifier } from './magicTranslator.js';
import { GameRunner } from './engine/GameRunner.js';
import { GamePlatformer } from './engine/GamePlatformer.js';
import { GameShooter } from './engine/GameShooter.js';
import { GameRacing } from './engine/GameRacing.js';
import { GameMaze } from './engine/GameMaze.js';
import { GameChess3D } from './engine/GameChess.js';
import { Game2DEngine } from './engine/Game2D.js';
import { soundManager } from './audio.js';
import { AIGameDiscoveryEngine } from './gameDatabase.js';

class InfiniteArcadeApp {
  constructor() {
    this.webglCanvas = document.getElementById('webgl-canvas');
    this.canvas2D = document.getElementById('canvas-2d');
    this.container3DCard = document.getElementById('container-3d-card');
    this.container2DCard = document.getElementById('container-2d-card');
    
    // Dedicated 3D Three.js Engine on #webgl-canvas
    this.engine = new ThreeEngine(this.webglCanvas);
    this.currentGameInstance = null;
    this.activeStudioTab = '3D'; // '3D' or '2D'

    this.scoreElement = document.getElementById('canvas-score');
    this.highScoreElement = document.getElementById('canvas-highscore');
    this.healthContainer = document.getElementById('hud-health-container');
    this.healthBar = document.getElementById('hud-health-bar');
    this.controlsGuideText = document.getElementById('controls-guide-text');

    this.hudGameType = document.getElementById('hud-game-type');
    this.discoveryDeck = document.getElementById('discovery-deck');

    this.overlayModal = document.getElementById('overlay-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.modalSubtitle = document.getElementById('modal-subtitle');
    this.modalFinalScore = document.getElementById('modal-final-score');
    this.modalHighScore = document.getElementById('modal-high-score');

    this.tab3D = document.getElementById('tab-3d');
    this.tab2D = document.getElementById('tab-2d');
    this.btnGenerateText = document.getElementById('btn-generate-text');

    // Generating Overlay elements
    this.generatingModal = document.getElementById('generating-modal');
    this.genPromptText = document.getElementById('gen-prompt-text');
    this.genProgressBar = document.getElementById('gen-progress-bar');

    // Library Modal
    this.libraryModal = document.getElementById('library-modal');

    this.bindEvents();
    
    // Launch default game on startup
    this.compileAndLaunchGame("a multiplayer shooting game with futuristic weapons", false);
    this.startLoop();
  }

  bindEvents() {
    // 1. Studio Dimension Tabs (3D vs 2D)
    this.tab3D.addEventListener('click', () => {
      this.switchStudioTab('3D');
    });

    this.tab2D.addEventListener('click', () => {
      this.switchStudioTab('2D');
    });

    // Top Navigation Links
    document.getElementById('nav-home')?.addEventListener('click', () => this.switchStudioTab('3D'));
    document.getElementById('nav-discovery')?.addEventListener('click', () => {
      const promptInput = document.getElementById('prompt-input');
      promptInput.focus();
    });
    document.getElementById('nav-3d')?.addEventListener('click', () => this.switchStudioTab('3D'));
    document.getElementById('nav-2d')?.addEventListener('click', () => this.switchStudioTab('2D'));

    // Header Search Bar
    const headerSearchBar = document.getElementById('header-search-bar');
    if (headerSearchBar) {
      headerSearchBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const text = headerSearchBar.value.trim();
          if (text) {
            document.getElementById('prompt-input').value = text;
            this.compileAndLaunchGame(text, true);
          }
        }
      });
    }

    document.getElementById('btn-header-generate')?.addEventListener('click', () => {
      const promptInput = document.getElementById('prompt-input');
      const text = promptInput.value.trim() || "a 2D puzzle game with increasing difficulty";
      this.compileAndLaunchGame(text, true);
    });

    // 2. Library Modal Drawer
    document.getElementById('btn-open-library').addEventListener('click', () => {
      this.libraryModal.classList.remove('hidden');
    });

    document.getElementById('btn-close-library').addEventListener('click', () => {
      this.libraryModal.classList.add('hidden');
    });

    document.querySelectorAll('.btn-lib-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.libraryPreset;
        this.libraryModal.classList.add('hidden');

        if (preset.includes('2d') && this.activeStudioTab !== '2D') {
          this.switchStudioTab('2D');
        } else if (!preset.includes('2d') && this.activeStudioTab !== '3D') {
          this.switchStudioTab('3D');
        }

        const promptInput = document.getElementById('prompt-input');
        promptInput.value = preset;
        if (document.activeElement) document.activeElement.blur();
        this.compileAndLaunchGame(preset, true);
      });
    });

    // 3. Generate Game button & Prompt Textarea
    const promptInput = document.getElementById('prompt-input');
    const btnGenerate = document.getElementById('btn-generate');

    const handleCompile = () => {
      let text = promptInput.value.trim();
      if (!text) {
        text = this.activeStudioTab === '3D' ? "a multiplayer shooting game with futuristic weapons" : "a 2D puzzle game with increasing difficulty";
        promptInput.value = text;
      }
      
      if (document.activeElement) document.activeElement.blur();
      this.compileAndLaunchGame(text, true);
    };

    btnGenerate.addEventListener('click', handleCompile);
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleCompile();
      }
    });

    // 4. Director Chat Bar Form & Quick Modifiers
    const modifierForm = document.getElementById('modifier-form');
    const modifierInput = document.getElementById('modifier-input');

    modifierForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = modifierInput.value.trim();
      if (text) {
        this.applyDirectorTweak(text);
        modifierInput.value = '';
        if (document.activeElement) document.activeElement.blur();
      }
    });

    document.querySelectorAll('.btn-mod').forEach(btn => {
      btn.addEventListener('click', () => {
        const mod = btn.dataset.mod;
        this.applyDirectorTweak(mod);
        if (document.activeElement) document.activeElement.blur();
      });
    });

    // 5. Canvas Focus on Click
    [this.webglCanvas, this.canvas2D].forEach(canvas => {
      canvas.addEventListener('click', () => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          document.activeElement.blur();
        }
      });
    });

    // 6. Canvas Action Buttons
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('btn-modal-restart').addEventListener('click', () => {
      this.hideModal();
      this.restartGame();
    });

    // Fullscreen Toggle
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Audio Toggle
    const btnAudio = document.getElementById('btn-audio-toggle');
    const iconOn = document.getElementById('icon-sound-on');
    const iconOff = document.getElementById('icon-sound-off');

    btnAudio.addEventListener('click', () => {
      const isMuted = soundManager.toggleMute();
      if (isMuted) {
        iconOn.classList.add('hidden');
        iconOff.classList.remove('hidden');
      } else {
        iconOn.classList.remove('hidden');
        iconOff.classList.add('hidden');
        soundManager.init();
      }
    });
  }

  switchStudioTab(tab) {
    this.activeStudioTab = tab;
    const promptInput = document.getElementById('prompt-input');

    if (tab === '3D') {
      this.container3DCard.classList.remove('hidden');
      this.container2DCard.classList.add('hidden');

      this.tab3D.className = "tab-btn px-4 py-1.5 rounded-full bg-[#1b4d3e] text-white shadow-sm transition";
      this.tab2D.className = "tab-btn px-4 py-1.5 rounded-full text-slate-600 hover:text-slate-900 transition";
      
      this.btnGenerateText.textContent = "⚡ DISCOVER & INSTANT GENERATE 3D GAME";
      promptInput.placeholder = 'e.g. "a multiplayer shooting game with futuristic weapons", "3d subway surfers", "chess 3d"...';
      
      this.compileAndLaunchGame("a multiplayer shooting game with futuristic weapons", true);
    } else {
      this.container2DCard.classList.remove('hidden');
      this.container3DCard.classList.add('hidden');

      this.tab2D.className = "tab-btn px-4 py-1.5 rounded-full bg-[#1b4d3e] text-white shadow-sm transition";
      this.tab3D.className = "tab-btn px-4 py-1.5 rounded-full text-slate-600 hover:text-slate-900 transition";

      this.btnGenerateText.textContent = "⚡ DISCOVER & INSTANT GENERATE 2D GAME";
      promptInput.placeholder = 'e.g. "a 2D puzzle game with increasing difficulty", "2d snake game", "2d pacman"...';

      this.compileAndLaunchGame("a 2D puzzle game with increasing difficulty", true);
    }
  }

  renderDiscoveryDeck(promptText) {
    if (!this.discoveryDeck) return;

    const matches = AIGameDiscoveryEngine.searchAndRecommend(promptText);
    this.discoveryDeck.innerHTML = '';

    matches.forEach(game => {
      const card = document.createElement('div');
      card.className = "bg-white p-3 rounded-2xl border border-slate-200 hover:border-[#2d6a4f] transition shadow-sm flex flex-col justify-between gap-1.5 group";

      card.innerHTML = `
        <div class="flex items-start justify-between gap-1">
          <div>
            <h4 class="text-xs font-extrabold text-[#1b4d3e] group-hover:text-[#2d6a4f] transition">${game.title}</h4>
            <p class="text-[10px] text-slate-400 font-medium">${game.genre}</p>
          </div>
          <span class="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#d8f3dc] text-[#1b4d3e]">
            🎯 ${game.matchPercent}% Match
          </span>
        </div>
        <p class="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-medium">
          ${game.description}
        </p>
        <div class="flex items-center justify-between pt-1 border-t border-slate-100">
          <span class="text-[10px] text-slate-400 font-medium">${game.platform}</span>
          <button data-discovery-preset="${game.tags.join(' ')}" class="btn-play-discovery px-3 py-1 rounded-full bg-[#1b4d3e] hover:bg-[#2d6a4f] text-white font-extrabold text-[10px] shadow-sm transition active:scale-95">
            ⚡ Play Custom AI Game
          </button>
        </div>
      `;

      this.discoveryDeck.appendChild(card);
    });

    // Bind click events on discovery cards
    this.discoveryDeck.querySelectorAll('.btn-play-discovery').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.dataset.discoveryPreset;
        const promptInput = document.getElementById('prompt-input');
        promptInput.value = preset;
        this.compileAndLaunchGame(preset, true);
      });
    });
  }

  compileAndLaunchGame(promptText, showLoadingAnimation = true) {
    this.hideModal();

    if (showLoadingAnimation) {
      this.showGenerationLoading(promptText, () => {
        this.executeGameLaunch(promptText);
      });
    } else {
      this.executeGameLaunch(promptText);
    }
  }

  showGenerationLoading(promptText, onComplete) {
    this.genPromptText.textContent = `"${promptText}"`;
    this.generatingModal.classList.remove('hidden');

    let percent = 0;
    const duration = this.activeStudioTab === '2D' ? 250 : 350;
    const intervalTime = 20;
    const increment = 100 / (duration / intervalTime);

    if (this.genInterval) clearInterval(this.genInterval);

    this.genInterval = setInterval(() => {
      percent += increment;
      if (percent >= 100) {
        percent = 100;
        clearInterval(this.genInterval);
        
        this.genProgressBar.style.width = "100%";
        onComplete();

        if (this.currentGameInstance && this.currentGameInstance.engine) {
          this.engine.render();
        } else if (this.currentGameInstance && this.currentGameInstance.render) {
          this.currentGameInstance.render();
        }

        requestAnimationFrame(() => {
          this.generatingModal.classList.add('hidden');
        });
        return;
      }

      this.genProgressBar.style.width = `${percent}%`;
    }, intervalTime);
  }

  executeGameLaunch(promptText) {
    // Perfect Cleanup & Disposal
    if (this.currentGameInstance) {
      this.currentGameInstance.destroy();
      this.currentGameInstance = null;
    }

    // Render Search Recommendations Deck
    this.renderDiscoveryDeck(promptText);

    const config = semanticClassifier.classifyPrompt(promptText, this.activeStudioTab);
    this.lastPrompt = promptText;

    this.updateStatusTelemetry();

    const callbacks = {
      onScoreUpdate: (score, highScore) => {
        this.scoreElement.textContent = score;
        this.highScoreElement.textContent = highScore;
      },
      onGuideUpdate: (guideText) => {
        this.controlsGuideText.textContent = guideText;
      },
      onHealthUpdate: (hp) => {
        this.healthBar.style.width = `${hp}%`;
      },
      onGameOver: (details) => {
        this.showModal(details);
      }
    };

    let modeName = config.perspective;

    if (config.is2D) {
      if (config.gameModeKey === '2D_SHOOTER' || config.gameModeKey === '2D_TANK') {
        this.healthContainer.classList.remove('hidden');
        this.healthContainer.classList.add('flex');
      } else {
        this.healthContainer.classList.add('hidden');
        this.healthContainer.classList.remove('flex');
      }
      this.hudGameType.textContent = `02. ${modeName}`;
      this.currentGameInstance = new Game2DEngine(this.canvas2D, semanticClassifier, callbacks, config.gameModeKey);
    } else {
      if (config.gameModeKey === 'CHESS') {
        this.healthContainer.classList.add('hidden');
        this.hudGameType.textContent = "01. 3D CHESS STRATEGY";
        this.currentGameInstance = new GameChess3D(this.engine, semanticClassifier, callbacks);
      } else if (config.gameModeKey === 'RUNNER') {
        this.healthContainer.classList.add('hidden');
        this.hudGameType.textContent = "01. 3D RUNNER CHASE";
        this.currentGameInstance = new GameRunner(this.engine, semanticClassifier, callbacks);
      } else if (config.gameModeKey === 'PLATFORMER') {
        this.healthContainer.classList.add('hidden');
        this.hudGameType.textContent = "01. 3D PLATFORMER";
        this.currentGameInstance = new GamePlatformer(this.engine, semanticClassifier, callbacks);
      } else if (config.gameModeKey === 'SHOOTER') {
        this.healthContainer.classList.remove('hidden');
        this.healthContainer.classList.add('flex');
        this.hudGameType.textContent = "01. TOP-DOWN SHOOTER";
        this.currentGameInstance = new GameShooter(this.engine, semanticClassifier, callbacks);
      } else if (config.gameModeKey === 'RACING') {
        this.healthContainer.classList.add('hidden');
        this.hudGameType.textContent = "01. TURBO RACING";
        this.currentGameInstance = new GameRacing(this.engine, semanticClassifier, callbacks);
      } else if (config.gameModeKey === 'MAZE') {
        this.healthContainer.classList.add('hidden');
        this.hudGameType.textContent = "01. 3D MAZE EXPLORER";
        this.currentGameInstance = new GameMaze(this.engine, semanticClassifier, callbacks);
      } else {
        this.healthContainer.classList.add('hidden');
        this.hudGameType.textContent = "01. 3D RUNNER CHASE";
        this.currentGameInstance = new GameRunner(this.engine, semanticClassifier, callbacks);
      }
    }
  }

  applyDirectorTweak(modText) {
    const result = semanticClassifier.interpretLiveTweak(modText);
    if (result.success) {
      if (this.currentGameInstance && this.currentGameInstance.engine) {
        this.engine.applyTheme(result.state.theme);
      }
    }
  }

  restartGame() {
    if (this.lastPrompt) {
      this.compileAndLaunchGame(this.lastPrompt, true);
    }
  }

  updateStatusTelemetry() {}

  showModal(details) {
    this.modalTitle.textContent = details.title;
    this.modalSubtitle.textContent = details.subtitle;
    this.modalFinalScore.textContent = details.score;
    this.modalHighScore.textContent = details.highScore;
    this.overlayModal.classList.remove('hidden');
  }

  hideModal() {
    this.overlayModal.classList.add('hidden');
  }

  startLoop() {
    let lastTime = performance.now();
    const animate = (now) => {
      requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (this.currentGameInstance && this.currentGameInstance.active) {
        this.currentGameInstance.update(dt);
      }

      // Only render 3D WebGL engine if active game is 3D
      if (this.currentGameInstance && this.currentGameInstance.engine) {
        this.engine.render();
      }
    };
    requestAnimationFrame(animate);
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new InfiniteArcadeApp();
});
