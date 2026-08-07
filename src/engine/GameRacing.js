import * as THREE from 'three';
import { soundManager } from '../audio.js';
import confetti from 'canvas-confetti';

export class GameRacing {
  constructor(threeEngine, translatorState, callbacks) {
    this.engine = threeEngine;
    this.state = translatorState;
    this.callbacks = callbacks;

    this.active = false;
    this.score = 0;
    this.highScore = Number(localStorage.getItem('simplecraft_highscore_racing') || 0);

    // Car position & Steering
    this.carX = 0;
    this.speed = 22;

    // Lists
    this.trafficCars = [];
    this.boosts = [];
    this.scenery = [];

    this.spawnTimer = 0;
    this.boostTimer = 0;

    this.initScene();
    this.bindControls();
  }

  initScene() {
    this.engine.clearGameGroup();
    const theme = (this.state && (this.state.theme || this.state.currentTheme)) || { player: 0x00f0ff, bg: 0x1e1b4b, obstacle: 0xf43f5e, platform: 0x4f46e5, light: 0x38bdf8 };
    this.engine.applyTheme(theme);

    // Camera setup for racing (Behind the car chase cam)
    this.engine.camera.position.set(0, 5.0, 10);
    this.engine.camera.lookAt(0, 1.5, -15);

    // Highway Road (Slate 800 - vibrant, visible!)
    const roadGeo = new THREE.PlaneGeometry(16, 200);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.5
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -80;
    road.receiveShadow = true;
    this.engine.gameGroup.add(road);

    // Highway Lane Dividers (Glowing Lines)
    [-3.8, 0, 3.8].forEach(x => {
      const lineGeo = new THREE.PlaneGeometry(0.25, 200);
      const lineMat = new THREE.MeshBasicMaterial({ color: theme.player, transparent: true, opacity: 0.8 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.02, -80);
      this.engine.gameGroup.add(line);
    });

    // Create Side Street Lights
    for (let z = 0; z > -180; z -= 20) {
      this.createLightPole(-9, z, theme);
      this.createLightPole(9, z, theme);
    }

    // Player Neon Sports Car
    this.createPlayerCar(theme);

    this.active = true;
    this.score = 0;
    this.callbacks.onScoreUpdate(this.score, this.highScore);
    this.callbacks.onGuideUpdate("Use [←] / [→] or [A] / [D] to Steer Car | Hold [W] / [↑] for Nitro Boost!");
  }

  createPlayerCar(theme) {
    this.carGroup = new THREE.Group();

    // Car Body Chassis
    const chassisGeo = new THREE.BoxGeometry(1.8, 0.8, 3.6);
    const chassisMat = new THREE.MeshStandardMaterial({ color: theme.player, roughness: 0.1, metalness: 0.8 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    this.carGroup.add(chassis);

    // Car Cabin Glass
    const cabinGeo = new THREE.BoxGeometry(1.4, 0.6, 1.8);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.0, -0.2);
    this.carGroup.add(cabin);

    // Headlights (Bright Glowing Cyan)
    [-0.65, 0.65].forEach(x => {
      const lightGeo = new THREE.BoxGeometry(0.35, 0.2, 0.1);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(x, 0.5, -1.81);
      this.carGroup.add(light);
    });

    // Taillights (Glowing Red)
    [-0.65, 0.65].forEach(x => {
      const lightGeo = new THREE.BoxGeometry(0.35, 0.2, 0.1);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(x, 0.5, 1.81);
      this.carGroup.add(light);
    });

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.35, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.5 });
    [
      [-0.95, 0.38, -1.1], [0.95, 0.38, -1.1],
      [-0.95, 0.38, 1.1], [0.95, 0.38, 1.1]
    ].forEach(p => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...p);
      this.carGroup.add(wheel);
    });

    // Nitro Thruster Flame
    const flameGeo = new THREE.ConeGeometry(0.4, 1.2, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 });
    this.nitroFlame = new THREE.Mesh(flameGeo, flameMat);
    this.nitroFlame.rotation.x = -Math.PI / 2;
    this.nitroFlame.position.set(0, 0.5, 2.4);
    this.carGroup.add(this.nitroFlame);

    // Scale Modifier
    const scale = this.state.playerScale || 1.0;
    this.carGroup.scale.set(scale, scale, scale);

    this.carGroup.position.set(0, 0, 0);
    this.engine.gameGroup.add(this.carGroup);
  }

  createLightPole(x, z, theme) {
    const poleGroup = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 7), mat);
    pole.position.set(x, 3.5, z);
    poleGroup.add(pole);

    const lampGeo = new THREE.BoxGeometry(1.2, 0.2, 0.4);
    const lampMat = new THREE.MeshBasicMaterial({ color: theme.player });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(x > 0 ? x - 0.5 : x + 0.5, 7, z);
    poleGroup.add(lamp);

    this.scenery.push(poleGroup);
    this.engine.gameGroup.add(poleGroup);
  }

  bindControls() {
    this.keys = {};
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

  spawnTraffic() {
    const lanes = [-5.5, -1.8, 1.8, 5.5];
    const x = lanes[Math.floor(Math.random() * lanes.length)];
    const z = -130;
    const theme = this.state.theme;

    const geo = new THREE.BoxGeometry(1.8, 0.9, 3.5);
    const mat = new THREE.MeshStandardMaterial({ color: theme.obstacle, roughness: 0.2, metalness: 0.5 });
    const traffic = new THREE.Mesh(geo, mat);
    traffic.position.set(x, 0.5, z);
    traffic.castShadow = true;

    this.engine.gameGroup.add(traffic);
    this.trafficCars.push(traffic);
  }

  spawnNitroBoost() {
    const lanes = [-5.5, -1.8, 1.8, 5.5];
    const x = lanes[Math.floor(Math.random() * lanes.length)];
    const z = -130;

    const geo = new THREE.OctahedronGeometry(0.7);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const boost = new THREE.Mesh(geo, mat);
    boost.position.set(x, 1.0, z);

    this.engine.gameGroup.add(boost);
    this.boosts.push(boost);
  }

  update(dt) {
    if (!this.active) return;

    // Steering
    let targetSteer = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) targetSteer = -6.5;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) targetSteer = 6.5;

    this.carX += (targetSteer - this.carX) * 8 * dt;
    this.carGroup.position.x = this.carX;
    this.carGroup.rotation.z = - (this.carX - targetSteer) * 0.05;

    // Nitro Boost
    let currentSpeed = this.speed * (this.state.speedMultiplier || 1.0);
    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      currentSpeed *= 1.6;
      this.nitroFlame.material.opacity = 0.9;
    } else {
      this.nitroFlame.material.opacity = 0;
    }

    // Traffic Cars
    const spawnRate = 1.0 / (this.state.spawnRateMultiplier || 1.0);
    this.spawnTimer += dt;
    if (this.spawnTimer > spawnRate) {
      this.spawnTimer = 0;
      this.spawnTraffic();
    }

    this.boostTimer += dt;
    if (this.boostTimer > 2.0) {
      this.boostTimer = 0;
      this.spawnNitroBoost();
    }

    // Update Traffic
    for (let i = this.trafficCars.length - 1; i >= 0; i--) {
      const car = this.trafficCars[i];
      car.position.z += currentSpeed * dt;

      // Collision
      if (Math.abs(car.position.z - this.carGroup.position.z) < 2.8 &&
          Math.abs(car.position.x - this.carGroup.position.x) < 1.4) {
        
        if (!this.state.invincible) {
          this.gameOver();
          return;
        }
      }

      if (car.position.z > 15) {
        this.engine.gameGroup.remove(car);
        this.trafficCars.splice(i, 1);
      }
    }

    // Update Boosts
    for (let i = this.boosts.length - 1; i >= 0; i--) {
      const b = this.boosts[i];
      b.position.z += currentSpeed * dt;
      b.rotation.y += 4 * dt;

      if (Math.abs(b.position.z - this.carGroup.position.z) < 2.0 &&
          Math.abs(b.position.x - this.carGroup.position.x) < 1.4) {
        
        soundManager.playCoin();
        this.score += 150;
        this.callbacks.onScoreUpdate(this.score, this.highScore);
        this.engine.gameGroup.remove(b);
        this.boosts.splice(i, 1);
        continue;
      }

      if (b.position.z > 15) {
        this.engine.gameGroup.remove(b);
        this.boosts.splice(i, 1);
      }
    }

    // Scenery scroll
    this.scenery.forEach(p => {
      p.position.z += currentSpeed * dt;
      if (p.position.z > 15) p.position.z -= 180;
    });

    // Score increment
    this.score += Math.round(currentSpeed * dt);
    this.callbacks.onScoreUpdate(this.score, this.highScore);
  }

  gameOver() {
    this.active = false;
    soundManager.playExplosion();

    let isNewHigh = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('simplecraft_highscore_racing', this.highScore);
      isNewHigh = true;
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    this.callbacks.onGameOver({
      title: isNewHigh ? "🏆 NEW SPEED RECORD!" : "💥 HIGHWAY CRASH!",
      subtitle: isNewHigh ? `Incredible driving! ${this.score} pts!` : "You crashed into oncoming traffic!",
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
