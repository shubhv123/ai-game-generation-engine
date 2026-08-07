// Infinite Arcade Engine - All-in-One 2D Canvas Engine Modules (High-DPI Retina Scaled)
import { soundManager } from '../audio.js';
import confetti from 'canvas-confetti';
import { ChessRules } from './GameChess.js';

export class Game2DEngine {
  constructor(canvasElement, translatorState, callbacks, mode = '2D_SHOOTER') {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.state = translatorState;
    this.callbacks = callbacks;
    this.mode = mode;

    this.active = false;
    this.score = 0;
    this.highScore = Number(localStorage.getItem(`simplecraft_highscore_2d_${mode}`) || 0);
    this.health = 100;

    this.keys = {};
    this.mouse = { x: 400, y: 300 };

    this.resizeCanvas();
    this.initGameMode();
    this.bindControls();
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    let w = parent ? parent.clientWidth : this.canvas.clientWidth;
    let h = parent ? parent.clientHeight : this.canvas.clientHeight;

    if (!w || w === 0) w = window.innerWidth - 490;
    if (!h || h === 0) h = window.innerHeight;

    this.width = Math.max(320, w);
    this.height = Math.max(320, h);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  initGameMode() {
    this.active = true;
    this.score = 0;
    this.health = 100;
    this.particles = [];
    this.projectiles = [];
    this.entities = [];
    this.coins = [];

    this.callbacks.onScoreUpdate(this.score, this.highScore);

    if (this.mode === '2D_CHESS') {
      this.callbacks.onGuideUpdate("Click White Piece to Select • Click Highlighted Tile to Move by Official Rules!");
      this.chessBoard = ChessRules.createInitialBoard();
      this.turn = 'white';
      this.selectedSquare = null;
      this.validMoves = [];
      this.calculateChessBounds();

    } else if (this.mode === '2D_SHOOTER') {
      this.callbacks.onHealthUpdate(this.health);
      this.callbacks.onGuideUpdate("Use [A]/[D] or Arrows to Move | Mouse/Space to Shoot Lasers!");
      this.player = { x: this.width / 2, y: this.height - 60, w: 40, h: 40 };

    } else if (this.mode === '2D_JETPACK') {
      this.callbacks.onGuideUpdate("Press [Space] or Click to Thrust Jetpack | Dodge Obstacle Pillars!");
      this.player = { x: 120, y: this.height / 2, vy: 0, w: 32, h: 32 };
      this.pillars = [];
      this.spawnTimer = 0;

    } else if (this.mode === '2D_BRICK') {
      this.callbacks.onGuideUpdate("Move Mouse or [A]/[D] to Control Paddle | Break All Bricks!");
      this.paddle = { x: this.width / 2 - 60, y: this.height - 40, w: 120, h: 16 };
      this.ball = { x: this.width / 2, y: this.height - 70, vx: 5, vy: -5, r: 10 };
      this.buildBricks();

    } else if (this.mode === '2D_SNAKE') {
      this.callbacks.onGuideUpdate("Use [W][A][S][D] or Arrows to Steer Snake | Eat Food to Grow!");
      this.gridSize = 20;
      this.snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
      ];
      this.dir = { x: 1, y: 0 };
      this.spawnFood();
      this.moveTimer = 0;

    } else if (this.mode === '2D_TANK') {
      this.callbacks.onHealthUpdate(this.health);
      this.callbacks.onGuideUpdate("Use [WASD] to Move Tank | Mouse to Aim | Click / Space to Fire Shells!");
      this.tank = { x: this.width / 2, y: this.height / 2, angle: 0, r: 20 };
      this.targets = [];

    } else if (this.mode === '2D_JUMPER') {
      this.callbacks.onGuideUpdate("Use [A]/[D] or Arrows to Move | Bounce Up Infinite Floating Platforms!");
      this.player = { x: this.width / 2, y: this.height - 150, vy: -12, vx: 0, r: 16 };
      this.buildPlatforms();

    } else if (this.mode === '2D_PACMAN') {
      this.callbacks.onGuideUpdate("Use [WASD] or Arrows to Move | Eat Dots & Avoid Ghosts!");
      this.pacman = { x: this.width / 2, y: this.height / 2 + 60, r: 16, dirX: 0, dirY: 0 };
      this.ghosts = [
        { x: this.width / 2 - 60, y: 120, vx: 3, vy: 0, color: '#f43f5e' },
        { x: this.width / 2 + 60, y: 120, vx: -3, vy: 0, color: '#38bdf8' }
      ];
      this.dots = [];
      this.buildPacmanDots();

    } else {
      this.callbacks.onGuideUpdate("Use [Space] or [W] to Jump | Collect Coins & Avoid Spikes!");
      this.player = { x: 100, y: this.height - 100, vy: 0, w: 32, h: 48, grounded: true };
      this.obstacles = [];
      this.spawnTimer = 0;
    }
  }

  calculateChessBounds() {
    // Perfectly centered board pushed down below top HUD
    const maxBoardSize = Math.min(this.width - 60, this.height - 140);
    const boardSize = Math.max(280, maxBoardSize);
    this.tileSize = boardSize / 8;
    this.offsetX = (this.width - boardSize) / 2;
    this.offsetY = (this.height - boardSize) / 2 + 25;
  }

  spawnFood() {
    const cols = Math.floor(this.width / this.gridSize) - 2;
    const rows = Math.floor(this.height / this.gridSize) - 2;
    this.food = {
      x: Math.floor(Math.random() * cols) + 1,
      y: Math.floor(Math.random() * rows) + 1
    };
  }

  buildBricks() {
    this.bricks = [];
    const rows = 5;
    const cols = 9;
    const padding = 10;
    const w = (this.width - 80 - (cols - 1) * padding) / cols;
    const h = 24;
    const colors = ['#00f0ff', '#38bdf8', '#a855f7', '#ec4899', '#fbbf24'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 40 + c * (w + padding);
        const y = 60 + r * (h + padding);
        this.bricks.push({ x, y, w, h, color: colors[r % colors.length], alive: true });
      }
    }
  }

  buildPlatforms() {
    this.platforms = [];
    for (let i = 0; i < 8; i++) {
      this.platforms.push({
        x: Math.random() * (this.width - 100) + 20,
        y: this.height - i * 90 - 40,
        w: 90,
        h: 14
      });
    }
  }

  buildPacmanDots() {
    this.dots = [];
    for (let r = 100; r < this.height - 100; r += 45) {
      for (let c = 80; c < this.width - 80; c += 45) {
        this.dots.push({ x: c, y: r, alive: true });
      }
    }
  }

  bindControls() {
    this.kd = (e) => {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      this.keys[e.code] = true;

      if (this.mode === '2D_SNAKE') {
        if ((e.code === 'KeyW' || e.code === 'ArrowUp') && this.dir.y === 0) this.dir = { x: 0, y: -1 };
        if ((e.code === 'KeyS' || e.code === 'ArrowDown') && this.dir.y === 0) this.dir = { x: 0, y: 1 };
        if ((e.code === 'KeyA' || e.code === 'ArrowLeft') && this.dir.x === 0) this.dir = { x: -1, y: 0 };
        if ((e.code === 'KeyD' || e.code === 'ArrowRight') && this.dir.x === 0) this.dir = { x: 1, y: 0 };
      }

      if (e.code === 'Space') {
        if (this.mode === '2D_JETPACK') {
          this.player.vy = -8.5 * (this.state.jumpMultiplier || 1.0);
          soundManager.playJump();
        } else if (this.mode === '2D_RUNNER' && this.player.grounded) {
          this.player.vy = -14 * (this.state.jumpMultiplier || 1.0);
          this.player.grounded = false;
          soundManager.playJump();
        } else if (this.mode === '2D_SHOOTER' || this.mode === '2D_TANK') {
          this.fire2DProjectile();
        }
      }
    };
    this.ku = (e) => { this.keys[e.code] = false; };
    this.mm = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    };
    this.md = (e) => {
      if (!this.active) return;

      if (this.mode === '2D_CHESS') {
        const c = Math.floor((this.mouse.x - this.offsetX) / this.tileSize);
        const r = Math.floor((this.mouse.y - this.offsetY) / this.tileSize);
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          this.handle2DChessClick(r, c);
        }
      } else if (this.mode === '2D_JETPACK') {
        this.player.vy = -8.5 * (this.state.jumpMultiplier || 1.0);
        soundManager.playJump();
      } else if (this.mode === '2D_SHOOTER' || this.mode === '2D_TANK') {
        this.fire2DProjectile();
      }
    };

    window.addEventListener('keydown', this.kd);
    window.addEventListener('keyup', this.ku);
    this.canvas.addEventListener('mousemove', this.mm);
    this.canvas.addEventListener('mousedown', this.md);
  }

  handle2DChessClick(r, c) {
    if (this.turn !== 'white') return;
    const piece = this.chessBoard[r][c];

    if (piece && ChessRules.isWhite(piece)) {
      this.selectedSquare = [r, c];
      this.validMoves = ChessRules.getLegalMoves(r, c, this.chessBoard);
      soundManager.playJump();
      return;
    }

    if (this.selectedSquare) {
      const [sR, sC] = this.selectedSquare;
      const isLegal = this.validMoves.some(([mR, mC]) => mR === r && mC === c);

      if (isLegal) {
        this.execute2DChessMove(sR, sC, r, c);
        this.selectedSquare = null;
        this.validMoves = [];

        if (this.active && this.turn === 'black') {
          setTimeout(() => this.make2DAIMove(), 400);
        }
      } else {
        this.selectedSquare = null;
        this.validMoves = [];
      }
    }
  }

  execute2DChessMove(fromR, fromC, toR, toC) {
    const movingPiece = this.chessBoard[fromR][fromC];
    const targetPiece = this.chessBoard[toR][toC];

    if (targetPiece) {
      soundManager.playExplosion();
      this.score += 100;
      this.callbacks.onScoreUpdate(this.score, 0);
    } else {
      soundManager.playCoin();
    }

    this.chessBoard[toR][toC] = movingPiece;
    this.chessBoard[fromR][fromC] = null;

    if (movingPiece === 'P' && toR === 0) this.chessBoard[toR][toC] = 'Q';
    if (movingPiece === 'p' && toR === 7) this.chessBoard[toR][toC] = 'q';

    const nextIsWhite = this.turn === 'white' ? false : true;
    this.turn = nextIsWhite ? 'white' : 'black';

    const enemyLegals = ChessRules.getAllLegalMoves(this.chessBoard, nextIsWhite);
    const inCheck = ChessRules.isKingInCheck(this.chessBoard, nextIsWhite);

    if (enemyLegals.length === 0) {
      if (inCheck) {
        this.gameOver(nextIsWhite ? "💥 CHECKMATE! BLACK WINS!" : "🏆 CHECKMATE! WHITE WINS!");
      } else {
        this.gameOver("🤝 STALEMATE! DRAW!");
      }
    } else if (inCheck) {
      soundManager.playJump();
      this.callbacks.onGuideUpdate(`⚠️ CHECK! ${nextIsWhite ? "White" : "Black"} King under attack!`);
    } else {
      this.callbacks.onGuideUpdate(`${this.turn === 'white' ? "White's Turn" : "Black AI's Turn"}`);
    }
  }

  make2DAIMove() {
    const legals = ChessRules.getAllLegalMoves(this.chessBoard, false);
    if (legals.length === 0) return;

    const captures = legals.filter(m => this.chessBoard[m.to[0]][m.to[1]]);
    const move = captures.length > 0
      ? captures[Math.floor(Math.random() * captures.length)]
      : legals[Math.floor(Math.random() * legals.length)];

    this.execute2DChessMove(move.from[0], move.from[1], move.to[0], move.to[1]);
  }

  fire2DProjectile() {
    soundManager.playLaser();
    if (this.mode === '2D_TANK') {
      const dx = this.mouse.x - this.tank.x;
      const dy = this.mouse.y - this.tank.y;
      const angle = Math.atan2(dy, dx);
      this.projectiles.push({
        x: this.tank.x + Math.cos(angle) * 25,
        y: this.tank.y + Math.sin(angle) * 25,
        vx: Math.cos(angle) * 12,
        vy: Math.sin(angle) * 12,
        r: 5
      });
    } else {
      this.projectiles.push({
        x: this.player.x,
        y: this.player.y - 20,
        vx: 0,
        vy: -12,
        r: 4
      });
    }
  }

  update(dt) {
    if (!this.active) return;
    this.resizeCanvas();

    const speed = (this.state.speedMultiplier || 1.0);

    if (this.mode === '2D_CHESS') {
      this.calculateChessBounds();
    } else if (this.mode === '2D_SNAKE') {
      this.moveTimer += dt;
      if (this.moveTimer > 0.12 / speed) {
        this.moveTimer = 0;
        const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
        const cols = Math.floor(this.width / this.gridSize);
        const rows = Math.floor(this.height / this.gridSize);

        if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
          if (!this.state.invincible) { this.gameOver(); return; }
        }

        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
          soundManager.playCoin();
          this.score += 100;
          this.callbacks.onScoreUpdate(this.score, this.highScore);
          this.spawnFood();
        } else {
          this.snake.pop();
        }
      }

    } else if (this.mode === '2D_TANK') {
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.tank.x -= 6 * speed;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) this.tank.x += 6 * speed;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) this.tank.y -= 6 * speed;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) this.tank.y += 6 * speed;

      this.tank.x = Math.max(30, Math.min(this.width - 30, this.tank.x));
      this.tank.y = Math.max(30, Math.min(this.height - 30, this.tank.y));

      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > this.width || p.y < 0 || p.y > this.height) this.projectiles.splice(i, 1);
      }

      this.spawnTimer = (this.spawnTimer || 0) + dt;
      if (this.spawnTimer > 1.2 / (this.state.spawnRateMultiplier || 1.0)) {
        this.spawnTimer = 0;
        this.entities.push({
          x: Math.random() * (this.width - 100) + 50,
          y: Math.random() * (this.height - 200) + 50,
          r: 18,
          hp: 2
        });
      }

      for (let i = this.entities.length - 1; i >= 0; i--) {
        const e = this.entities[i];
        for (let j = this.projectiles.length - 1; j >= 0; j--) {
          const p = this.projectiles[j];
          if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r) {
            soundManager.playExplosion();
            this.create2DExplosion(e.x, e.y, '#f43f5e');
            this.score += 150;
            this.callbacks.onScoreUpdate(this.score, this.highScore);
            this.entities.splice(i, 1);
            this.projectiles.splice(j, 1);
            break;
          }
        }
      }

    } else if (this.mode === '2D_JUMPER') {
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.player.vx = -7 * speed;
      else if (this.keys['KeyD'] || this.keys['ArrowRight']) this.player.vx = 7 * speed;
      else this.player.vx = 0;

      this.player.x += this.player.vx;
      if (this.player.x < 0) this.player.x = this.width;
      if (this.player.x > this.width) this.player.x = 0;

      const g = 0.5 * (this.state.gravityMultiplier || 1.0);
      this.player.vy += g;
      this.player.y += this.player.vy;

      if (this.player.vy > 0) {
        this.platforms.forEach(p => {
          if (this.player.x > p.x && this.player.x < p.x + p.w &&
              this.player.y + this.player.r >= p.y && this.player.y + this.player.r <= p.y + p.h + 10) {
            soundManager.playJump();
            this.player.vy = -13 * (this.state.jumpMultiplier || 1.0);
            this.score += 50;
            this.callbacks.onScoreUpdate(this.score, this.highScore);
          }
        });
      }

      if (this.player.y < this.height / 2) {
        const diff = this.height / 2 - this.player.y;
        this.player.y = this.height / 2;
        this.platforms.forEach(p => {
          p.y += diff;
          if (p.y > this.height) {
            p.y = 0;
            p.x = Math.random() * (this.width - 100) + 20;
          }
        });
      }

      if (this.player.y > this.height + 40 && !this.state.invincible) {
        this.gameOver();
      }

    } else if (this.mode === '2D_PACMAN') {
      let dx = 0, dy = 0;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx = -5 * speed;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) dx = 5 * speed;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) dy = -5 * speed;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) dy = 5 * speed;

      this.pacman.x = Math.max(20, Math.min(this.width - 20, this.pacman.x + dx));
      this.pacman.y = Math.max(20, Math.min(this.height - 20, this.pacman.y + dy));

      let remainingDots = 0;
      this.dots.forEach(d => {
        if (d.alive) {
          remainingDots++;
          if (Math.hypot(d.x - this.pacman.x, d.y - this.pacman.y) < 18) {
            d.alive = false;
            soundManager.playCoin();
            this.score += 20;
            this.callbacks.onScoreUpdate(this.score, this.highScore);
          }
        }
      });

      if (remainingDots === 0) { this.victory(); return; }

      this.ghosts.forEach(g => {
        g.x += g.vx * speed;
        if (g.x < 50 || g.x > this.width - 50) g.vx *= -1;

        if (Math.hypot(g.x - this.pacman.x, g.y - this.pacman.y) < 24 && !this.state.invincible) {
          this.gameOver();
        }
      });

    } else if (this.mode === '2D_SHOOTER') {
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.player.x -= 8 * speed;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) this.player.x += 8 * speed;
      this.player.x = Math.max(30, Math.min(this.width - 30, this.player.x));

      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.y += p.vy;
        if (p.y < -10) this.projectiles.splice(i, 1);
      }

      this.spawnTimer = (this.spawnTimer || 0) + dt;
      if (this.spawnTimer > 0.8 / (this.state.spawnRateMultiplier || 1.0)) {
        this.spawnTimer = 0;
        this.entities.push({
          x: Math.random() * (this.width - 60) + 30,
          y: -20,
          vy: (3 + Math.random() * 3) * speed,
          w: 30,
          h: 30
        });
      }

      for (let i = this.entities.length - 1; i >= 0; i--) {
        const e = this.entities[i];
        e.y += e.vy;

        for (let j = this.projectiles.length - 1; j >= 0; j--) {
          const p = this.projectiles[j];
          if (Math.abs(p.x - e.x) < e.w && Math.abs(p.y - e.y) < e.h) {
            soundManager.playExplosion();
            this.create2DExplosion(e.x, e.y, '#f43f5e');
            this.score += 100;
            this.callbacks.onScoreUpdate(this.score, this.highScore);
            this.entities.splice(i, 1);
            this.projectiles.splice(j, 1);
            break;
          }
        }

        if (e && Math.abs(e.x - this.player.x) < 30 && Math.abs(e.y - this.player.y) < 30) {
          soundManager.playExplosion();
          this.create2DExplosion(e.x, e.y, '#ef4444');
          this.entities.splice(i, 1);

          if (!this.state.invincible) {
            this.health = Math.max(0, this.health - 25);
            this.callbacks.onHealthUpdate(this.health);
            if (this.health <= 0) this.gameOver();
          }
        }

        if (e && e.y > this.height + 20) this.entities.splice(i, 1);
      }

    } else if (this.mode === '2D_JETPACK') {
      const g = 0.4 * (this.state.gravityMultiplier || 1.0);
      this.player.vy += g;
      this.player.y += this.player.vy;

      this.spawnTimer += dt;
      if (this.spawnTimer > 1.8 / speed) {
        this.spawnTimer = 0;
        const gapY = Math.random() * (this.height - 240) + 120;
        const gapH = 150;
        this.pillars.push({
          x: this.width + 40,
          topH: gapY - gapH / 2,
          botY: gapY + gapH / 2,
          w: 60,
          passed: false
        });
      }

      for (let i = this.pillars.length - 1; i >= 0; i--) {
        const p = this.pillars[i];
        p.x -= 4 * speed;

        if (this.player.x + 16 > p.x && this.player.x - 16 < p.x + p.w) {
          if (this.player.y - 16 < p.topH || this.player.y + 16 > p.botY) {
            if (!this.state.invincible) { this.gameOver(); return; }
          }
        }

        if (!p.passed && p.x < this.player.x) {
          p.passed = true;
          soundManager.playCoin();
          this.score += 50;
          this.callbacks.onScoreUpdate(this.score, this.highScore);
        }

        if (p.x < -80) this.pillars.splice(i, 1);
      }

      if ((this.player.y < 0 || this.player.y > this.height) && !this.state.invincible) {
        this.gameOver();
      }

    } else if (this.mode === '2D_BRICK') {
      this.paddle.x = this.mouse.x - this.paddle.w / 2;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.paddle.x -= 10 * speed;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) this.paddle.x += 10 * speed;
      this.paddle.x = Math.max(0, Math.min(this.width - this.paddle.w, this.paddle.x));

      this.ball.x += this.ball.vx * speed;
      this.ball.y += this.ball.vy * speed;

      if (this.ball.x < 15 || this.ball.x > this.width - 15) this.ball.vx *= -1;
      if (this.ball.y < 15) this.ball.vy *= -1;

      if (this.ball.y + this.ball.r >= this.paddle.y &&
          this.ball.x >= this.paddle.x && this.ball.x <= this.paddle.x + this.paddle.w && this.ball.vy > 0) {
        soundManager.playJump();
        this.ball.vy *= -1;
      }

      let remainingBricks = 0;
      this.bricks.forEach(b => {
        if (b.alive) {
          remainingBricks++;
          if (this.ball.x + this.ball.r > b.x && this.ball.x - this.ball.r < b.x + b.w &&
              this.ball.y + this.ball.r > b.y && this.ball.y - this.ball.r < b.y + b.h) {
            
            soundManager.playCoin();
            this.create2DExplosion(b.x + b.w / 2, b.y + b.h / 2, b.color);
            b.alive = false;
            this.ball.vy *= -1;
            this.score += 100;
            this.callbacks.onScoreUpdate(this.score, this.highScore);
          }
        }
      });

      if (remainingBricks === 0) { this.victory(); return; }
      if (this.ball.y > this.height + 20 && !this.state.invincible) { this.gameOver(); }

    } else {
      const g = 0.6 * (this.state.gravityMultiplier || 1.0);
      this.player.vy += g;
      this.player.y += this.player.vy;

      const groundY = this.height - 80;
      if (this.player.y >= groundY) {
        this.player.y = groundY;
        this.player.vy = 0;
        this.player.grounded = true;
      }

      this.spawnTimer += dt;
      if (this.spawnTimer > 1.5 / speed) {
        this.spawnTimer = 0;
        this.obstacles.push({ x: this.width + 30, y: groundY + 16, w: 30, h: 32 });
      }

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.x -= 6 * speed;

        if (Math.abs(obs.x - this.player.x) < 25 && Math.abs(obs.y - this.player.y) < 30) {
          if (!this.state.invincible) { this.gameOver(); return; }
        }

        if (obs.x < -40) {
          this.obstacles.splice(i, 1);
          this.score += 50;
          this.callbacks.onScoreUpdate(this.score, this.highScore);
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    this.render();
  }

  create2DExplosion(x, y, color) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        color,
        life: 0.4
      });
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);

    // Deep Obsidian Backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#050811');
    bgGrad.addColorStop(1, '#090f1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.mode === '2D_CHESS') {
      const unicodePieces = {
        'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
      };

      // Board Outer Metallic Glow Border
      const bX = this.offsetX - 6;
      const bY = this.offsetY - 6;
      const bSize = this.tileSize * 8 + 12;

      ctx.fillStyle = '#064e3b';
      ctx.fillRect(bX, bY, bSize, bSize);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(bX, bY, bSize, bSize);

      // Draw 8x8 Board
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const x = this.offsetX + c * this.tileSize;
          const y = this.offsetY + r * this.tileSize;
          const isWhiteTile = (r + c) % 2 === 0;

          // High Contrast Cyberpunk Emerald & Obsidian Tiles
          ctx.fillStyle = isWhiteTile ? '#064e3b' : '#090f1a';
          ctx.fillRect(x, y, this.tileSize, this.tileSize);

          ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, this.tileSize, this.tileSize);

          // Highlight Selected Piece Square
          if (this.selectedSquare && this.selectedSquare[0] === r && this.selectedSquare[1] === c) {
            ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
            ctx.fillRect(x, y, this.tileSize, this.tileSize);
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
          }

          // Highlight Valid Target Square Dot
          if (this.validMoves.some(([mR, mC]) => mR === r && mC === c)) {
            const isCapture = !!this.chessBoard[r][c];
            ctx.fillStyle = isCapture ? 'rgba(244, 63, 94, 0.75)' : 'rgba(16, 185, 129, 0.75)';
            ctx.beginPath();
            ctx.arc(x + this.tileSize / 2, y + this.tileSize / 2, this.tileSize / 4, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw Unicode Piece Symbol with Glowing Font
          const p = this.chessBoard[r][c];
          if (p) {
            ctx.font = `bold ${Math.floor(this.tileSize * 0.75)}px "Plus Jakarta Sans", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (ChessRules.isWhite(p)) {
              ctx.fillStyle = '#00f0ff';
              ctx.shadowColor = '#00f0ff';
              ctx.shadowBlur = 10;
            } else {
              ctx.fillStyle = '#f43f5e';
              ctx.shadowColor = '#f43f5e';
              ctx.shadowBlur = 10;
            }

            ctx.fillText(unicodePieces[p] || p, x + this.tileSize / 2, y + this.tileSize / 2);
            ctx.shadowBlur = 0; // Reset shadow blur
          }
        }
      }

      // Turn Label Overlay below board
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillStyle = '#10b981';
      ctx.textAlign = 'center';
      ctx.fillText(`CURRENT TURN: ${this.turn.toUpperCase()}`, this.width / 2, this.offsetY + this.tileSize * 8 + 25);

    } else if (this.mode === '2D_SNAKE') {
      ctx.fillStyle = '#00f0ff';
      this.snake.forEach(seg => {
        ctx.fillRect(seg.x * this.gridSize, seg.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
      });
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);

    } else if (this.mode === '2D_TANK') {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(this.tank.x, this.tank.y, this.tank.r, 0, Math.PI * 2);
      ctx.fill();

      const angle = Math.atan2(this.mouse.y - this.tank.y, this.mouse.x - this.tank.x);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(this.tank.x, this.tank.y);
      ctx.lineTo(this.tank.x + Math.cos(angle) * 30, this.tank.y + Math.sin(angle) * 30);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      this.projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#f43f5e';
      this.entities.forEach(e => {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      });

    } else if (this.mode === '2D_JUMPER') {
      ctx.fillStyle = '#00f0ff';
      this.platforms.forEach(p => {
        ctx.fillRect(p.x, p.y, p.w, p.h);
      });
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.mode === '2D_PACMAN') {
      ctx.fillStyle = '#fbbf24';
      this.dots.forEach(d => {
        if (d.alive) {
          ctx.beginPath();
          ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(this.pacman.x, this.pacman.y, this.pacman.r, 0, Math.PI * 2);
      ctx.fill();
      this.ghosts.forEach(g => {
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 16, 0, Math.PI * 2);
        ctx.fill();
      });

    } else if (this.mode === '2D_SHOOTER') {
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y - 20);
      ctx.lineTo(this.player.x - 20, this.player.y + 15);
      ctx.lineTo(this.player.x + 20, this.player.y + 15);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#00f0ff';
      this.projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#f43f5e';
      this.entities.forEach(e => {
        ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      });

    } else if (this.mode === '2D_JETPACK') {
      ctx.fillStyle = '#3b82f6';
      this.pillars.forEach(p => {
        ctx.fillRect(p.x, 0, p.w, p.topH);
        ctx.fillRect(p.x, p.botY, p.w, this.height - p.botY);
      });

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 16, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.mode === '2D_BRICK') {
      this.bricks.forEach(b => {
        if (b.alive) {
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
      });

      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
      ctx.fill();

    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, this.height - 80, this.width, 80);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, this.height - 80, this.width, 80);

      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(this.player.x - 16, this.player.y - 48, 32, 48);

      ctx.fillStyle = '#f43f5e';
      this.obstacles.forEach(o => {
        ctx.fillRect(o.x - 15, o.y - 32, o.w, o.h);
      });
    }

    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    });
  }

  victory() {
    this.active = false;
    soundManager.playWin();
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(`simplecraft_highscore_2d_${this.mode}`, this.highScore);
    }

    this.callbacks.onGameOver({
      title: "🏆 STAGE VICTORY!",
      subtitle: `Masterful arcade gameplay with ${this.score} pts!`,
      score: this.score,
      highScore: this.highScore
    });
  }

  gameOver(title = null) {
    this.active = false;
    soundManager.playExplosion();

    let isNewHigh = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(`simplecraft_highscore_2d_${this.mode}`, this.highScore);
      isNewHigh = true;
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    this.callbacks.onGameOver({
      title: title || (isNewHigh ? "🏆 NEW ARCADE RECORD!" : "💥 GAME OVER!"),
      subtitle: isNewHigh ? `Incredible score! ${this.score} pts!` : "Better luck on your next run!",
      score: this.score,
      highScore: this.highScore
    });
  }

  destroy() {
    this.active = false;
    window.removeEventListener('keydown', this.kd);
    window.removeEventListener('keyup', this.ku);
    this.canvas.removeEventListener('mousemove', this.mm);
    this.canvas.removeEventListener('mousedown', this.md);
  }
}
