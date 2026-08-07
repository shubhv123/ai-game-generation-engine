import * as THREE from 'three';
import { soundManager } from '../audio.js';
import confetti from 'canvas-confetti';

export class GameShooter {
  constructor(threeEngine, translatorState, callbacks) {
    this.engine = threeEngine;
    this.state = translatorState;
    this.callbacks = callbacks;

    this.active = false;
    this.score = 0;
    this.highScore = Number(localStorage.getItem('simplecraft_highscore_shooter') || 0);
    this.health = 100;

    // Ship position & movement
    this.shipPos = new THREE.Vector3(0, 0.5, 0);
    this.keys = {};
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Lists
    this.lasers = [];
    this.enemies = [];
    this.particles = [];

    this.spawnTimer = 0;
    this.shootCooldown = 0;

    this.initScene();
    this.bindControls();
  }

  initScene() {
    this.engine.clearGameGroup();
    const theme = (this.state && (this.state.theme || this.state.currentTheme)) || { player: 0x00f0ff, bg: 0x1e1b4b, obstacle: 0xf43f5e, platform: 0x4f46e5, light: 0x38bdf8 };
    this.engine.applyTheme(theme);

    // Optimized Camera setup for Top-Down Shooter (Closer, high visibility)
    this.engine.camera.position.set(0, 14, 9);
    this.engine.camera.lookAt(0, 0, 0);

    // 1. Vibrant Arena Floor Plane
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.6
    });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.engine.gameGroup.add(this.floor);

    // 2. Glowing Neon Grid Overlay
    const gridHelper = new THREE.GridHelper(50, 20, theme.player, 0x334155);
    gridHelper.position.y = 0.02;
    this.engine.gameGroup.add(gridHelper);

    // 3. Boundary Posts
    this.createBoundaryPosts(theme);

    // 4. Starfield
    this.createStarfield();

    // 5. Player Spaceship
    this.createSpaceship(theme);

    this.active = true;
    this.score = 0;
    this.health = 100;

    this.callbacks.onScoreUpdate(this.score, this.highScore);
    this.callbacks.onHealthUpdate(this.health);
    this.callbacks.onGuideUpdate("Use [W][A][S][D] to Move Ship | Move Mouse to Aim | Click / [Space] to Shoot Lasers!");
  }

  createBoundaryPosts(theme) {
    const postMat = new THREE.MeshBasicMaterial({ color: theme.player });
    const bounds = [-24, 24];

    bounds.forEach(x => {
      bounds.forEach(z => {
        const geo = new THREE.CylinderGeometry(0.3, 0.3, 6);
        const post = new THREE.Mesh(geo, postMat);
        post.position.set(x, 3, z);
        this.engine.gameGroup.add(post);
      });
    });
  }

  createStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const count = 250;
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 100;
      pos[i + 1] = Math.random() * 25 + 5;
      pos[i + 2] = (Math.random() - 0.5) * 100;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.9 });
    this.starPoints = new THREE.Points(starGeo, starMat);
    this.engine.gameGroup.add(this.starPoints);
  }

  createSpaceship(theme) {
    this.shipGroup = new THREE.Group();

    // Fuselage Body
    const bodyGeo = new THREE.ConeGeometry(1.4, 3.6, 6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: theme.player, roughness: 0.1, metalness: 0.9 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    this.shipGroup.add(body);

    // Cockpit Canopy (Glowing Cyan)
    const podGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const podMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const pod = new THREE.Mesh(podGeo, podMat);
    pod.position.set(0, 0.5, 0.2);
    this.shipGroup.add(pod);

    // Wings
    const wingGeo = new THREE.BoxGeometry(4.2, 0.2, 1.4);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, 0.1, 0.6);
    this.shipGroup.add(wings);

    // Wingtip Lights
    [-2.1, 2.1].forEach(x => {
      const tipGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(x, 0.1, 0.6);
      this.shipGroup.add(tip);
    });

    // Thruster Flame
    const thrusterGeo = new THREE.ConeGeometry(0.5, 1.0, 8);
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    thruster.rotation.x = -Math.PI / 2;
    thruster.position.set(0, 0.2, 2.0);
    this.shipGroup.add(thruster);

    // Shadow Disc
    const shadowGeo = new THREE.RingGeometry(0.3, 1.0, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    this.shipShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shipShadow.rotation.x = Math.PI / 2;
    this.shipShadow.position.y = 0.03;
    this.engine.gameGroup.add(this.shipShadow);

    // Scale
    const scale = this.state.playerScale || 1.0;
    this.shipGroup.scale.set(scale, scale, scale);

    this.shipGroup.position.copy(this.shipPos);
    this.engine.gameGroup.add(this.shipGroup);
  }

  bindControls() {
    this.kd = (e) => {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        this.fireLaser();
      }
    };
    this.ku = (e) => { this.keys[e.code] = false; };
    this.mm = (e) => {
      const rect = this.engine.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    this.md = (e) => {
      if (this.active) {
        this.fireLaser();
      }
    };

    window.addEventListener('keydown', this.kd);
    window.addEventListener('keyup', this.ku);
    this.engine.canvas.addEventListener('mousemove', this.mm);
    this.engine.canvas.addEventListener('mousedown', this.md);
  }

  fireLaser() {
    if (!this.active || this.shootCooldown > 0) return;
    this.shootCooldown = 0.15;

    soundManager.playLaser();

    // Dual laser bolts
    [-1.4, 1.4].forEach(offset => {
      const geo = new THREE.CylinderGeometry(0.15, 0.15, 1.6);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const laser = new THREE.Mesh(geo, mat);

      laser.rotation.x = Math.PI / 2;
      laser.position.set(this.shipPos.x + offset, 0.5, this.shipPos.z - 1.4);
      laser.rotation.y = this.shipGroup.rotation.y;

      this.engine.gameGroup.add(laser);
      this.lasers.push(laser);
    });
  }

  spawnEnemy() {
    const x = (Math.random() - 0.5) * 32;
    const z = -28;
    const theme = this.state.theme;

    const isAlien = Math.random() < 0.45;
    let enemy;

    if (isAlien) {
      const geo = new THREE.ConeGeometry(1.4, 2.4, 4);
      const mat = new THREE.MeshStandardMaterial({ color: theme.obstacle, roughness: 0.2, metalness: 0.7 });
      enemy = new THREE.Mesh(geo, mat);
      enemy.rotation.x = -Math.PI / 2;
      enemy.userData = { type: 'ALIEN', hp: 2, radius: 1.4, speed: 9 };
    } else {
      // Asteroid
      const geo = new THREE.DodecahedronGeometry(1.5, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
      enemy = new THREE.Mesh(geo, mat);
      enemy.userData = { type: 'ASTEROID', hp: 1, radius: 1.5, speed: 7 };
    }

    enemy.position.set(x, 0.8, z);
    enemy.castShadow = true;

    this.engine.gameGroup.add(enemy);
    this.enemies.push(enemy);
  }

  createExplosion(pos) {
    for (let i = 0; i < 14; i++) {
      const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
      const mat = new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xf43f5e : 0xfbbf24 });
      const p = new THREE.Mesh(geo, mat);

      p.position.copy(pos);
      p.userData = {
        vel: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 14),
        life: 0.4
      };

      this.engine.gameGroup.add(p);
      this.particles.push(p);
    }
  }

  update(dt) {
    if (!this.active) return;

    const speed = 18 * (this.state.speedMultiplier || 1.0);
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    // Movement
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.shipPos.x -= speed * dt;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.shipPos.x += speed * dt;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) this.shipPos.z -= speed * dt;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) this.shipPos.z += speed * dt;

    // Clamp Ship Bounds
    this.shipPos.x = THREE.MathUtils.clamp(this.shipPos.x, -22, 22);
    this.shipPos.z = THREE.MathUtils.clamp(this.shipPos.z, -18, 18);

    this.shipGroup.position.copy(this.shipPos);
    this.shipShadow.position.set(this.shipPos.x, 0.03, this.shipPos.z);

    // Mouse Aiming
    this.raycaster.setFromCamera(this.mouse, this.engine.camera);
    const targetPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.aimPlane, targetPoint);
    if (targetPoint) {
      const angle = Math.atan2(targetPoint.x - this.shipPos.x, -(targetPoint.z - this.shipPos.z));
      this.shipGroup.rotation.y = angle;
    }

    // Move Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.position.z -= 45 * dt;

      if (laser.position.z < -30) {
        this.engine.gameGroup.remove(laser);
        this.lasers.splice(i, 1);
      }
    }

    // Spawn & Move Enemies
    const spawnRate = 0.9 / (this.state.spawnRateMultiplier || 1.0);
    this.spawnTimer += dt;
    if (this.spawnTimer > spawnRate) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const eSpeed = enemy.userData.speed * (this.state.speedMultiplier || 1.0);
      enemy.position.z += eSpeed * dt;
      enemy.rotation.y += 2 * dt;

      // Laser Hit Check
      for (let j = this.lasers.length - 1; j >= 0; j--) {
        const laser = this.lasers[j];
        if (enemy.position.distanceTo(laser.position) < enemy.userData.radius + 0.6) {
          
          enemy.userData.hp--;
          this.engine.gameGroup.remove(laser);
          this.lasers.splice(j, 1);

          if (enemy.userData.hp <= 0) {
            soundManager.playExplosion();
            this.createExplosion(enemy.position);

            this.score += 100;
            this.callbacks.onScoreUpdate(this.score, this.highScore);

            this.engine.gameGroup.remove(enemy);
            this.enemies.splice(i, 1);
            break;
          }
        }
      }

      // Player Collision Check
      if (enemy && enemy.position.distanceTo(this.shipPos) < enemy.userData.radius + 1.1) {
        soundManager.playExplosion();
        this.createExplosion(enemy.position);

        this.engine.gameGroup.remove(enemy);
        this.enemies.splice(i, 1);

        if (!this.state.invincible) {
          this.health = Math.max(0, this.health - 25);
          this.callbacks.onHealthUpdate(this.health);

          if (this.health <= 0) {
            this.gameOver();
            return;
          }
        }
      }

      if (enemy && enemy.position.z > 22) {
        this.engine.gameGroup.remove(enemy);
        this.enemies.splice(i, 1);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.position.addScaledVector(p.userData.vel, dt);
      p.userData.life -= dt;
      if (p.userData.life <= 0) {
        this.engine.gameGroup.remove(p);
        this.particles.splice(i, 1);
      }
    }
  }

  gameOver() {
    this.active = false;
    soundManager.playExplosion();

    let isNewHigh = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('simplecraft_highscore_shooter', this.highScore);
      isNewHigh = true;
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    this.callbacks.onGameOver({
      title: isNewHigh ? "🏆 NEW SPACE RECORD!" : "🚀 SPACESHIP DESTROYED!",
      subtitle: isNewHigh ? `Incredible pilot skills! ${this.score} pts!` : "Your shield was depleted by enemy asteroids!",
      score: this.score,
      highScore: this.highScore
    });
  }

  destroy() {
    this.active = false;
    window.removeEventListener('keydown', this.kd);
    window.removeEventListener('keyup', this.ku);
    this.engine.canvas.removeEventListener('mousemove', this.mm);
    this.engine.canvas.removeEventListener('mousedown', this.md);
  }
}
