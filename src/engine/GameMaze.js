import * as THREE from 'three';
import { soundManager } from '../audio.js';
import confetti from 'canvas-confetti';

export class GameMaze {
  constructor(threeEngine, translatorState, callbacks) {
    this.engine = threeEngine;
    this.state = translatorState;
    this.callbacks = callbacks;

    this.active = false;
    this.score = 0;
    this.highScore = Number(localStorage.getItem('simplecraft_highscore_maze') || 0);

    this.pos = new THREE.Vector3(0, 0.8, 0);
    this.keys = {};

    this.walls = [];
    this.gems = [];
    this.mines = [];
    this.portal = null;

    this.initScene();
    this.bindControls();
  }

  initScene() {
    this.engine.clearGameGroup();
    const theme = (this.state && (this.state.theme || this.state.currentTheme)) || { player: 0x00f0ff, bg: 0x1e1b4b, obstacle: 0xf43f5e, platform: 0x4f46e5, light: 0x38bdf8 };
    this.engine.applyTheme(theme);

    // Camera setup for Top-Down / 3/4 Perspective Maze view
    this.engine.camera.position.set(0, 24, 16);
    this.engine.camera.lookAt(0, 0, 0);

    // 1. Floor Grid
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.engine.gameGroup.add(floor);

    // Grid lines
    const gridHelper = new THREE.GridHelper(60, 20, theme.player, 0x334155);
    gridHelper.position.y = 0.01;
    this.engine.gameGroup.add(gridHelper);

    // 2. Build 3D Maze Corridor Walls
    this.buildMazeWalls(theme);

    // 3. Player Submarine / Explorer Sphere
    this.createPlayer(theme);

    this.active = true;
    this.score = 0;
    this.callbacks.onScoreUpdate(this.score, this.highScore);
    this.callbacks.onGuideUpdate("Use [W][A][S][D] or Arrow Keys to Navigate Maze | Collect Gems & Reach Portal!");
  }

  buildMazeWalls(theme) {
    // Maze wall layout grid (1 = Wall, 0 = Path, 2 = Gem, 3 = Mine, 9 = Portal)
    const mazeGrid = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,2,0,1,0,2,0,0,0,2,0,1],
      [1,0,1,0,1,0,1,1,1,0,1,0,1],
      [1,2,1,0,0,0,3,0,1,0,1,2,1],
      [1,0,1,1,1,1,1,0,1,0,1,0,1],
      [1,0,0,0,2,0,1,0,0,0,0,0,1],
      [1,1,1,0,1,0,1,1,1,1,1,0,1],
      [1,2,0,0,1,0,0,0,3,0,1,2,1],
      [1,0,1,1,1,1,1,0,1,0,1,0,1],
      [1,0,2,0,3,0,0,0,1,0,0,9,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    const wallMat = new THREE.MeshStandardMaterial({ color: theme.platform, roughness: 0.3, metalness: 0.5 });

    const rows = mazeGrid.length;
    const cols = mazeGrid[0].length;
    const tileSize = 4;
    const offsetX = - (cols * tileSize) / 2 + tileSize / 2;
    const offsetZ = - (rows * tileSize) / 2 + tileSize / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = mazeGrid[r][c];
        const x = offsetX + c * tileSize;
        const z = offsetZ + r * tileSize;

        if (type === 1) {
          const geo = new THREE.BoxGeometry(tileSize, 2.5, tileSize);
          const wall = new THREE.Mesh(geo, wallMat);
          wall.position.set(x, 1.25, z);
          wall.castShadow = true;
          wall.receiveShadow = true;
          wall.userData = { halfSize: tileSize / 2 };
          this.engine.gameGroup.add(wall);
          this.walls.push(wall);
        } else if (type === 2) {
          this.spawnGem(x, z);
        } else if (type === 3) {
          this.spawnMine(x, z);
        } else if (type === 9) {
          this.createPortal(x, z);
        }
      }
    }
  }

  createPlayer(theme) {
    this.playerGroup = new THREE.Group();

    // Explorer Sphere Body
    const geo = new THREE.SphereGeometry(0.8, 16, 16);
    const mat = new THREE.MeshStandardMaterial({ color: theme.player, roughness: 0.2, metalness: 0.8 });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.y = 0.8;
    sphere.castShadow = true;
    this.playerGroup.add(sphere);

    // Glowing Sensor Eye
    const eyeGeo = new THREE.SphereGeometry(0.3, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.8, -0.6);
    this.playerGroup.add(eye);

    // Start position at maze entrance (-20, 0.8, -16)
    this.pos.set(-20, 0.8, -16);
    this.playerGroup.position.copy(this.pos);

    this.engine.gameGroup.add(this.playerGroup);
  }

  spawnGem(x, z) {
    const geo = new THREE.OctahedronGeometry(0.5);
    const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const gem = new THREE.Mesh(geo, mat);
    gem.position.set(x, 1.0, z);

    this.engine.gameGroup.add(gem);
    this.gems.push(gem);
  }

  spawnMine(x, z) {
    const geo = new THREE.DodecahedronGeometry(0.6);
    const mat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const mine = new THREE.Mesh(geo, mat);
    mine.position.set(x, 1.0, z);
    mine.userData = { initialY: 1.0, offset: Math.random() * 5 };

    this.engine.gameGroup.add(mine);
    this.mines.push(mine);
  }

  createPortal(x, z) {
    this.portalGroup = new THREE.Group();

    const ringGeo = new THREE.TorusGeometry(1.2, 0.15, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    this.portalGroup.add(ring);

    const coreGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.2;
    this.portalGroup.add(core);

    this.portalGroup.position.set(x, 0, z);
    this.engine.gameGroup.add(this.portalGroup);
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

    const speed = 14 * (this.state.speedMultiplier || 1.0);

    // WASD Movement
    let dx = 0;
    let dz = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dz -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dz += 1;

    if (dx !== 0 || dz !== 0) {
      const move = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(speed * dt);
      const nextPos = this.pos.clone().add(move);

      // Wall Collision Check
      let collision = false;
      const r = 0.7; // player radius

      for (let i = 0; i < this.walls.length; i++) {
        const wall = this.walls[i];
        const halfSize = wall.userData.halfSize;

        if (Math.abs(nextPos.x - wall.position.x) < halfSize + r &&
            Math.abs(nextPos.z - wall.position.z) < halfSize + r) {
          collision = true;
          break;
        }
      }

      if (!collision) {
        this.pos.copy(nextPos);
      }
    }

    this.playerGroup.position.copy(this.pos);

    // Smooth Camera Follow
    this.engine.camera.position.x += (this.pos.x - this.engine.camera.position.x) * 6 * dt;
    this.engine.camera.position.z += (this.pos.z + 14 - this.engine.camera.position.z) * 6 * dt;
    this.engine.camera.lookAt(this.pos.x, 0, this.pos.z);

    // Collect Gems
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      gem.rotation.y += 3 * dt;

      if (gem.position.distanceTo(this.pos) < 1.2) {
        soundManager.playCoin();
        this.score += 100;
        this.callbacks.onScoreUpdate(this.score, this.highScore);

        this.engine.gameGroup.remove(gem);
        this.gems.splice(i, 1);
      }
    }

    // Bobbing Mines
    for (let i = 0; i < this.mines.length; i++) {
      const mine = this.mines[i];
      mine.position.y = mine.userData.initialY + Math.sin(Date.now() * 0.004 + mine.userData.offset) * 0.4;

      if (mine.position.distanceTo(this.pos) < 1.2) {
        if (!this.state.invincible) {
          this.gameOver();
          return;
        }
      }
    }

    // Check Exit Portal Victory
    if (this.portalGroup && this.portalGroup.position.distanceTo(this.pos) < 1.5) {
      this.victory();
    }
  }

  victory() {
    this.active = false;
    soundManager.playWin();
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });

    this.score += 500;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('simplecraft_highscore_maze', this.highScore);
    }

    this.callbacks.onGameOver({
      title: "🏆 MAZE ESCAPED!",
      subtitle: `You solved the 3D maze with ${this.score} pts!`,
      score: this.score,
      highScore: this.highScore
    });
  }

  gameOver() {
    this.active = false;
    soundManager.playExplosion();

    this.callbacks.onGameOver({
      title: "💥 MINE EXPLOSION!",
      subtitle: "Watch out for sea mines inside maze corridors!",
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
