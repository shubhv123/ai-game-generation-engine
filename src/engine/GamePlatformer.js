import * as THREE from 'three';
import { soundManager } from '../audio.js';
import confetti from 'canvas-confetti';

export class GamePlatformer {
  constructor(threeEngine, translatorState, callbacks) {
    this.engine = threeEngine;
    this.state = translatorState;
    this.callbacks = callbacks;

    this.active = false;
    this.score = 0;
    this.highScore = Number(localStorage.getItem('simplecraft_highscore_platformer') || 0);

    // Player Physics
    this.pos = new THREE.Vector3(0, 3, 0);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.isGrounded = false;
    this.gravity = -24;
    this.moveSpeed = 12;

    // Inputs
    this.keys = {};

    // Platforms & Objects
    this.platforms = [];
    this.coins = [];
    this.trophy = null;
    this.lava = null;

    this.initScene();
    this.bindControls();
  }

  initScene() {
    this.engine.clearGameGroup();
    const theme = (this.state && (this.state.theme || this.state.currentTheme)) || { player: 0x00f0ff, bg: 0x1e1b4b, obstacle: 0xf43f5e, platform: 0x4f46e5, light: 0x38bdf8 };
    this.engine.applyTheme(theme);

    // Camera setup for 3D platformer
    this.engine.camera.position.set(0, 8, 16);

    // 1. Create Player Mesh
    this.createPlayer(theme);

    // 2. Lava Floor Below
    const lavaGeo = new THREE.PlaneGeometry(200, 200);
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.85 });
    this.lava = new THREE.Mesh(lavaGeo, lavaMat);
    this.lava.rotation.x = -Math.PI / 2;
    this.lava.position.y = -6;
    this.engine.gameGroup.add(this.lava);

    // 3. Create Floating Platforms Course
    this.buildCourse(theme);

    this.active = true;
    this.score = 0;
    this.callbacks.onScoreUpdate(this.score, this.highScore);
    this.callbacks.onGuideUpdate("Use [W][A][S][D] or Arrows to Move | [Space] to Jump | Reach the Golden Trophy!");
  }

  createPlayer(theme) {
    this.playerGroup = new THREE.Group();

    // Body
    const geo = new THREE.BoxGeometry(1, 1.4, 1);
    const mat = new THREE.MeshStandardMaterial({ color: theme.player, roughness: 0.3, metalness: 0.5 });
    const body = new THREE.Mesh(geo, mat);
    body.position.y = 0.7;
    body.castShadow = true;
    this.playerGroup.add(body);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.25, 1.0, -0.5);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.25, 1.0, -0.5);
    this.playerGroup.add(eyeL, eyeR);

    // Apply Player Scale Modifier
    const scale = this.state.playerScale || 1.0;
    this.playerGroup.scale.set(scale, scale, scale);

    this.playerGroup.position.copy(this.pos);
    this.engine.gameGroup.add(this.playerGroup);
  }

  buildCourse(theme) {
    const platformData = [
      { x: 0, y: 0, z: 0, w: 8, d: 8, h: 1 },        // Spawn Platform
      { x: 0, y: 1.5, z: -10, w: 5, d: 5, h: 1 },
      { x: -6, y: 3.5, z: -18, w: 4, d: 4, h: 1 },
      { x: 0, y: 5.5, z: -26, w: 5, d: 5, h: 1, moving: true }, // Moving Platform
      { x: 6, y: 7.5, z: -34, w: 4, d: 4, h: 1 },
      { x: 0, y: 9.5, z: -42, w: 4, d: 4, h: 1 },
      { x: -5, y: 11.5, z: -50, w: 4, d: 4, h: 1 },
      { x: 0, y: 13.5, z: -60, w: 7, d: 7, h: 1, isFinal: true } // Trophy Platform!
    ];

    const mat = new THREE.MeshStandardMaterial({ color: theme.platform, roughness: 0.4, metalness: 0.2 });

    platformData.forEach((p, idx) => {
      const geo = new THREE.BoxGeometry(p.w, p.h, p.d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.userData = { ...p, initialX: p.x };

      this.engine.gameGroup.add(mesh);
      this.platforms.push(mesh);

      // Spawn Gold Coins on intermediate platforms
      if (idx > 0 && !p.isFinal) {
        this.spawnCoin(p.x, p.y + 1.2, p.z);
      }

      // Spawn Golden Trophy on final platform
      if (p.isFinal) {
        this.createTrophy(p.x, p.y + 1.2, p.z);
      }
    });
  }

  spawnCoin(x, y, z) {
    const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.1 });
    const coin = new THREE.Mesh(geo, mat);
    coin.rotation.x = Math.PI / 2;
    coin.position.set(x, y, z);
    coin.castShadow = true;

    this.engine.gameGroup.add(coin);
    this.coins.push(coin);
  }

  createTrophy(x, y, z) {
    this.trophyGroup = new THREE.Group();

    // Base
    const baseGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.4, 16);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.1 });
    const base = new THREE.Mesh(baseGeo, goldMat);
    base.position.y = 0.2;
    this.trophyGroup.add(base);

    // Cup Stem
    const stemGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 16);
    const stem = new THREE.Mesh(stemGeo, goldMat);
    stem.position.y = 0.8;
    this.trophyGroup.add(stem);

    // Cup Bowl
    const bowlGeo = new THREE.ConeGeometry(0.9, 1.0, 16);
    const bowl = new THREE.Mesh(bowlGeo, goldMat);
    bowl.rotation.x = Math.PI;
    bowl.position.y = 1.6;
    this.trophyGroup.add(bowl);

    // Glowing Star Ring
    const starGeo = new THREE.TorusGeometry(1.2, 0.08, 16, 32);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.y = 1.6;
    this.trophyGroup.add(star);

    this.trophyGroup.position.set(x, y, z);
    this.engine.gameGroup.add(this.trophyGroup);
  }

  bindControls() {
    this.kd = (e) => {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      this.keys[e.code] = true;
    };
    this.ku = (e) => { this.keys[e.code] = false; };
    window.addEventListener('keydown', this.kd);
    window.addEventListener('keyup', this.ku);
  }

  update(dt) {
    if (!this.active) return;

    const speed = this.moveSpeed * (this.state.speedMultiplier || 1.0);

    // 1. Horizontal Movement (WASD / Arrows)
    let dx = 0;
    let dz = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dz -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dz += 1;

    if (dx !== 0 || dz !== 0) {
      const moveVec = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(speed * dt);
      this.pos.add(moveVec);
    }

    // 2. Jump Input
    if (this.keys['Space'] && this.isGrounded) {
      this.isGrounded = false;
      const jumpPower = 14 * (this.state.jumpMultiplier || 1.0);
      this.vel.y = jumpPower;
      soundManager.playJump();
    }

    // 3. Gravity Physics
    const g = this.gravity * (this.state.gravityMultiplier || 1.0);
    this.vel.y += g * dt;
    this.pos.y += this.vel.y * dt;

    // 4. Platform Collision Checking
    this.isGrounded = false;
    const playerRadius = 0.5;

    this.platforms.forEach(plat => {
      const pData = plat.userData;
      
      // Moving Platform logic
      if (pData.moving) {
        plat.position.x = pData.initialX + Math.sin(Date.now() * 0.002) * 5;
      }

      const halfW = pData.w / 2 + playerRadius;
      const halfD = pData.d / 2 + playerRadius;

      if (Math.abs(this.pos.x - plat.position.x) < halfW &&
          Math.abs(this.pos.z - plat.position.z) < halfD) {
        
        const topY = plat.position.y + pData.h / 2;
        if (this.pos.y >= topY - 0.2 && this.pos.y <= topY + 0.4 && this.vel.y <= 0) {
          this.pos.y = topY;
          this.vel.y = 0;
          this.isGrounded = true;

          // If platform is moving, move player with it!
          if (pData.moving) {
            this.pos.x += Math.cos(Date.now() * 0.002) * 5 * dt * 0.002;
          }
        }
      }
    });

    this.playerGroup.position.copy(this.pos);

    // Smooth Camera Follow
    this.engine.camera.position.x += (this.pos.x - this.engine.camera.position.x) * 5 * dt;
    this.engine.camera.position.y += (this.pos.y + 6 - this.engine.camera.position.y) * 5 * dt;
    this.engine.camera.position.z += (this.pos.z + 14 - this.engine.camera.position.z) * 5 * dt;
    this.engine.camera.lookAt(this.pos.x, this.pos.y + 1, this.pos.z);

    // 5. Coin Pickups
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.rotation.z += 3 * dt;

      if (coin.position.distanceTo(this.pos) < 1.2) {
        soundManager.playCoin();
        this.score += 100;
        this.callbacks.onScoreUpdate(this.score, this.highScore);
        this.engine.gameGroup.remove(coin);
        this.coins.splice(i, 1);
      }
    }

    // 6. Rotate Golden Trophy
    if (this.trophyGroup) {
      this.trophyGroup.rotation.y += 1.5 * dt;

      // Win Condition: Reaching Trophy!
      if (this.trophyGroup.position.distanceTo(this.pos) < 1.8) {
        this.victory();
        return;
      }
    }

    // 7. Lava Floor Fall Game Over
    if (this.pos.y < -4 && !this.state.invincible) {
      this.gameOver();
    }
  }

  victory() {
    this.active = false;
    soundManager.playWin();
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });

    this.score += 500;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('simplecraft_highscore_platformer', this.highScore);
    }

    this.callbacks.onGameOver({
      title: "🏆 VICTORY! TROPHY CLAIMED!",
      subtitle: `You conquered all platforms with ${this.score} pts!`,
      score: this.score,
      highScore: this.highScore
    });
  }

  gameOver() {
    this.active = false;
    soundManager.playExplosion();

    this.callbacks.onGameOver({
      title: "🔥 FELL INTO LAVA!",
      subtitle: "Watch your step on floating platforms!",
      score: this.score,
      highScore: this.highScore
    });
  }

  destroy() {
    this.active = false;
    window.removeEventListener('keydown', this.kd);
    window.removeEventListener('keyup', this.ku);
  }
}
