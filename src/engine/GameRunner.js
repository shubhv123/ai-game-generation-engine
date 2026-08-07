import * as THREE from 'three';
import { soundManager } from '../audio.js';
import confetti from 'canvas-confetti';

export class GameRunner {
  constructor(threeEngine, translatorState, callbacks) {
    this.engine = threeEngine;
    this.state = translatorState;
    this.callbacks = callbacks;

    this.active = false;
    this.score = 0;
    this.highScore = Number(localStorage.getItem('simplecraft_highscore_runner') || 0);

    // Lanes setup: Left (-3.5), Center (0), Right (3.5)
    this.lanes = [-3.5, 0, 3.5];
    this.currentLaneIndex = 1; // Start in center lane
    this.targetX = 0;

    // Physics
    this.playerY = 0.8;
    this.jumpVelocity = 0;
    this.gravity = -28;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;

    // Objects
    this.playerGroup = null;
    this.obstacles = [];
    this.coins = [];
    this.particles = [];
    this.sceneryObjects = [];

    // Spawning timers
    this.spawnTimer = 0;
    this.coinTimer = 0;
    this.baseSpeed = 16;

    this.initScene();
    this.bindControls();
  }

  initScene() {
    this.engine.clearGameGroup();
    const theme = (this.state && (this.state.theme || this.state.currentTheme)) || { player: 0x00f0ff, bg: 0x1e1b4b, obstacle: 0xf43f5e, platform: 0x4f46e5, light: 0x38bdf8 };
    this.engine.applyTheme(theme);

    // Camera setup for runner
    this.engine.camera.position.set(0, 5.5, 9);
    this.engine.camera.lookAt(0, 2, -15);

    // Ground Road (High Contrast Slate 800)
    const roadGeo = new THREE.PlaneGeometry(14, 200);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.5
    });
    this.road = new THREE.Mesh(roadGeo, roadMat);
    this.road.rotation.x = -Math.PI / 2;
    this.road.position.z = -80;
    this.road.receiveShadow = true;
    this.engine.gameGroup.add(this.road);

    // Lane Markers (Glowing lines)
    [-1.75, 1.75].forEach(xPos => {
      const lineGeo = new THREE.PlaneGeometry(0.15, 200);
      const lineMat = new THREE.MeshBasicMaterial({
        color: theme.player,
        transparent: true,
        opacity: 0.6
      });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(xPos, 0.01, -80);
      this.engine.gameGroup.add(line);
    });

    // Create Side Arches/Pillars
    for (let z = -10; z > -180; z -= 15) {
      this.createArch(z, theme);
    }

    // Create 3D Player Avatar
    this.createPlayer(theme);

    this.active = true;
    this.score = 0;
    this.callbacks.onScoreUpdate(this.score, this.highScore);
    this.callbacks.onGuideUpdate("Use [←] / [→] to Switch Lanes | [Space] to Jump | [↓] to Slide!");
  }

  createPlayer(theme) {
    this.playerGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.9, 1.2, 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: theme.player,
      roughness: 0.2,
      metalness: 0.5
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    this.playerGroup.add(body);

    // Visor Head
    const headGeo = new THREE.BoxGeometry(0.7, 0.6, 0.6);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.1
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.4, 0);
    head.castShadow = true;
    this.playerGroup.add(head);

    // Visor Light
    const visorGeo = new THREE.BoxGeometry(0.65, 0.2, 0.2);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.45, -0.25);
    this.playerGroup.add(visor);

    // Hover Shadow Ring
    const shadowGeo = new THREE.RingGeometry(0.2, 0.6, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    this.playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.playerShadow.rotation.x = Math.PI / 2;
    this.playerShadow.position.y = 0.02;
    this.engine.gameGroup.add(this.playerShadow);

    // Apply Player Scale Modifier
    const scale = this.state.playerScale || 1.0;
    this.playerGroup.scale.set(scale, scale, scale);

    this.playerGroup.position.set(0, this.playerY, 0);
    this.engine.gameGroup.add(this.playerGroup);
  }

  createArch(zPos, theme) {
    const archGroup = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: theme.platform, roughness: 0.5 });
    
    // Left Pillar
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 0.8), mat);
    left.position.set(-6.5, 4, zPos);
    archGroup.add(left);

    // Right Pillar
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 0.8), mat);
    right.position.set(6.5, 4, zPos);
    archGroup.add(right);

    // Cross Beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.8, 0.8), mat);
    beam.position.set(0, 8, zPos);
    archGroup.add(beam);

    // Neon Light Strip
    const neonGeo = new THREE.BoxGeometry(13.8, 0.2, 0.2);
    const neonMat = new THREE.MeshBasicMaterial({ color: theme.player });
    const neon = new THREE.Mesh(neonGeo, neonMat);
    neon.position.set(0, 7.5, zPos);
    archGroup.add(neon);

    this.sceneryObjects.push(archGroup);
    this.engine.gameGroup.add(archGroup);
  }

  bindControls() {
    this.keyDownHandler = (e) => {
      if (!this.active) return;

      // Ignore key events if user is typing in prompt or live modifier input box!
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (this.currentLaneIndex > 0) {
          this.currentLaneIndex--;
          this.targetX = this.lanes[this.currentLaneIndex];
        }
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (this.currentLaneIndex < 2) {
          this.currentLaneIndex++;
          this.targetX = this.lanes[this.currentLaneIndex];
        }
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!this.isJumping) {
          this.isJumping = true;
          const jumpPower = 13.5 * (this.state.jumpMultiplier || 1.0);
          this.jumpVelocity = jumpPower;
          soundManager.playJump();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        if (!this.isSliding) {
          this.isSliding = true;
          this.slideTimer = 0.6;
          this.playerGroup.scale.y = 0.5 * (this.state.playerScale || 1.0);
        }
      }
    };

    window.addEventListener('keydown', this.keyDownHandler);
  }

  spawnObstacle() {
    const laneIndex = Math.floor(Math.random() * 3);
    const x = this.lanes[laneIndex];
    const z = -120;
    const type = Math.random() < 0.6 ? 'LOW' : 'HIGH'; // Low barrier or High overhead laser

    const theme = this.state.theme;
    let obsMesh;

    if (type === 'LOW') {
      const geo = new THREE.BoxGeometry(2.4, 1.4, 1.2);
      const mat = new THREE.MeshStandardMaterial({ color: theme.obstacle, roughness: 0.3, metalness: 0.3 });
      obsMesh = new THREE.Mesh(geo, mat);
      obsMesh.position.set(x, 0.7, z);
      obsMesh.userData = { type: 'LOW', width: 2.4, height: 1.4, depth: 1.2 };
    } else {
      // High laser barrier
      const geo = new THREE.BoxGeometry(2.4, 1.2, 0.8);
      const mat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.1 });
      obsMesh = new THREE.Mesh(geo, mat);
      obsMesh.position.set(x, 2.5, z);
      obsMesh.userData = { type: 'HIGH', width: 2.4, height: 1.2, depth: 0.8 };
    }

    obsMesh.castShadow = true;
    this.engine.gameGroup.add(obsMesh);
    this.obstacles.push(obsMesh);
  }

  spawnCoin() {
    const laneIndex = Math.floor(Math.random() * 3);
    const x = this.lanes[laneIndex];
    const z = -120;

    const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.1 });
    const coin = new THREE.Mesh(geo, mat);
    coin.rotation.x = Math.PI / 2;
    coin.position.set(x, 1.2, z);
    coin.castShadow = true;

    this.engine.gameGroup.add(coin);
    this.coins.push(coin);
  }

  update(dt) {
    if (!this.active) return;

    const effectiveSpeed = this.baseSpeed * (this.state.speedMultiplier || 1.0);

    // 1. Player Lane Switching Lerp
    this.playerGroup.position.x += (this.targetX - this.playerGroup.position.x) * 12 * dt;
    this.playerShadow.position.x = this.playerGroup.position.x;

    // 2. Jump & Gravity Physics
    if (this.isJumping) {
      const g = this.gravity * (this.state.gravityMultiplier || 1.0);
      this.playerY += this.jumpVelocity * dt;
      this.jumpVelocity += g * dt;

      if (this.playerY <= 0.8) {
        this.playerY = 0.8;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    }
    this.playerGroup.position.y = this.playerY;

    // 3. Slide Timer
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        const scale = this.state.playerScale || 1.0;
        this.playerGroup.scale.y = scale;
      }
    }

    // 4. Move Obstacles & Check Collisions
    const spawnRate = 1.2 / (this.state.spawnRateMultiplier || 1.0);
    this.spawnTimer += dt;
    if (this.spawnTimer > spawnRate) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    this.coinTimer += dt;
    if (this.coinTimer > 0.8) {
      this.coinTimer = 0;
      this.spawnCoin();
    }

    // Update Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.position.z += effectiveSpeed * dt;

      // Collision Detection
      if (Math.abs(obs.position.z - this.playerGroup.position.z) < 1.0) {
        if (Math.abs(obs.position.x - this.playerGroup.position.x) < 1.2) {
          
          let hit = false;
          if (obs.userData.type === 'LOW' && this.playerY < 1.6) {
            hit = true;
          } else if (obs.userData.type === 'HIGH' && !this.isSliding && this.playerY > 1.2) {
            hit = true;
          }

          if (hit && !this.state.invincible) {
            this.gameOver();
            return;
          }
        }
      }

      // Cleanup
      if (obs.position.z > 15) {
        this.engine.gameGroup.remove(obs);
        this.obstacles.splice(i, 1);
      }
    }

    // Update Coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.position.z += effectiveSpeed * dt;
      coin.rotation.z += 3 * dt;

      if (Math.abs(coin.position.z - this.playerGroup.position.z) < 1.2 &&
          Math.abs(coin.position.x - this.playerGroup.position.x) < 1.2 &&
          Math.abs(coin.position.y - this.playerY) < 1.5) {
        
        soundManager.playCoin();
        this.score += 50;
        this.callbacks.onScoreUpdate(this.score, this.highScore);

        this.engine.gameGroup.remove(coin);
        this.coins.splice(i, 1);
        continue;
      }

      if (coin.position.z > 15) {
        this.engine.gameGroup.remove(coin);
        this.coins.splice(i, 1);
      }
    }

    // Scenery Infinite Scroll
    this.sceneryObjects.forEach(arch => {
      arch.position.z += effectiveSpeed * dt;
      if (arch.position.z > 15) {
        arch.position.z -= 180;
      }
    });

    // Score progression
    this.score += Math.round(effectiveSpeed * dt);
    this.callbacks.onScoreUpdate(this.score, this.highScore);
  }

  gameOver() {
    this.active = false;
    soundManager.playExplosion();

    let isNewHigh = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('simplecraft_highscore_runner', this.highScore);
      isNewHigh = true;
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    this.callbacks.onGameOver({
      title: isNewHigh ? "🏆 NEW HIGH SCORE!" : "💥 CRASH!",
      subtitle: isNewHigh ? `Unstoppable! You scored ${this.score} pts!` : "You hit a high-speed obstacle!",
      score: this.score,
      highScore: this.highScore
    });
  }

  destroy() {
    this.active = false;
    window.removeEventListener('keydown', this.keyDownHandler);
  }
}
