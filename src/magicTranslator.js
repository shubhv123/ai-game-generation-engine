// Infinite Arcade Engine - Comprehensive Semantic Classifier with AI Game Discovery Support

export const PERSPECTIVES = {
  THIRD_PERSON_RUNNER: 'Third-Person Chase (Runner / Slope)',
  THIRD_PERSON_RACING: 'Third-Person Chase (Racing / Kart)',
  PLATFORMER_3D: 'Third-Person 3D Platformer (Mario/Parkour)',
  TOP_DOWN_SHOOTER: 'Top-Down 360 Shooter (Zombies/Space/Doom)',
  TOP_DOWN_MAZE: 'Top-Down 3D Maze Exploration',
  GAME_CHESS: '3D Official Chess Strategy Engine',
  GAME_2D_CHESS: '2D Official Chess Strategy Engine',
  GAME_2D_SHOOTER: '2D Retro Space Arcade (Galaga/Invaders)',
  GAME_2D_JETPACK: '2D Jetpack / Flappy Runner',
  GAME_2D_BRICK: '2D Neon Brick Breaker / Arkanoid Puzzle',
  GAME_2D_RUNNER: '2D Side-Scrolling Runner',
  GAME_2D_SNAKE: '2D Neon Snake / Tron Lightcycle',
  GAME_2D_TANK: '2D Tank Warfare Combat',
  GAME_2D_JUMPER: '2D Infinite Doodle Jumper',
  GAME_2D_PACMAN: '2D Pacman Dots Chaser'
};

export const COLOR_THEMES = {
  CYBER: { name: 'CYBER DUSK', bg: 0x1e1b4b, fog: 0x1e1b4b, player: 0x00f0ff, obstacle: 0xf43f5e, platform: 0x4f46e5, light: 0x38bdf8 },
  BLUE: { name: 'DEEP OCEAN BLUE', bg: 0x0369a1, fog: 0x0369a1, player: 0x38bdf8, obstacle: 0xf43f5e, platform: 0x0284c7, light: 0x7dd3fc },
  RED: { name: 'ZOMBIE CRIMSON', bg: 0x831843, fog: 0x831843, player: 0xf43f5e, obstacle: 0xfbbf24, platform: 0x9d174d, light: 0xfca5a5 },
  GREEN: { name: 'EMERALD MATRIX', bg: 0x064e3b, fog: 0x064e3b, player: 0x10b981, obstacle: 0xf43f5e, platform: 0x047857, light: 0x6ee7b7 },
  GOLD: { name: 'GOLDEN SUNSET', bg: 0x78350f, fog: 0x78350f, player: 0xfbbf24, obstacle: 0xd97706, platform: 0xb45309, light: 0xfde047 },
  PURPLE: { name: 'SYNTHWAVE PURPLE', bg: 0x581c87, fog: 0x581c87, player: 0xc084fc, obstacle: 0xec4899, platform: 0x7e22ce, light: 0xe9d5ff },
  DARK: { name: 'VOID NIGHT', bg: 0x0f172a, fog: 0x0f172a, player: 0x38bdf8, obstacle: 0xef4444, platform: 0x334155, light: 0x818cf8 }
};

export class SemanticClassifier {
  constructor() {
    this.resetState();
  }

  get theme() {
    return this.currentTheme || COLOR_THEMES.CYBER;
  }

  resetState() {
    this.speedMultiplier = 1.0;
    this.jumpMultiplier = 1.0;
    this.spawnRateMultiplier = 1.0;
    this.currentTheme = COLOR_THEMES.CYBER;
    this.gravityMultiplier = 1.0;
    this.invincible = false;
    this.playerScale = 1.0;
  }

  classifyPrompt(userPrompt, activeStudioTab = '3D') {
    const text = (userPrompt || '').toLowerCase().trim();
    this.resetState();

    let perspective = PERSPECTIVES.THIRD_PERSON_RUNNER;
    let controlSystem = 'Lane Switching [←][→] & Jump [Space]';
    let environmentFloor = 'Neon Grid Track';
    let spawners = 'Obstacle Barriers & Gold Coins';
    let gameModeKey = 'RUNNER';
    let is2D = activeStudioTab === '2D' || text.includes('2d');

    // CHESS RECOGNITION
    if (text.includes('chess')) {
      if (is2D) {
        perspective = PERSPECTIVES.GAME_2D_CHESS;
        controlSystem = 'Official Chess Rules: Select Piece & Click Highlighted Tile';
        environmentFloor = '2D Checkered Wood Board';
        spawners = 'Captured Enemy Pieces';
        gameModeKey = '2D_CHESS';
      } else {
        perspective = PERSPECTIVES.GAME_CHESS;
        controlSystem = 'Official 3D Chess Rules: Select Piece & Click Highlighted Tile';
        environmentFloor = '3D Checkered Wood Board';
        spawners = 'Captured Enemy Pieces';
        gameModeKey = 'CHESS';
      }
    } else if (is2D) {
      if (text.includes('puzzle') || text.includes('difficulty') || text.includes('logic')) {
        perspective = PERSPECTIVES.GAME_2D_BRICK;
        controlSystem = 'Physics Vector Aim [Mouse] / [A][D]';
        environmentFloor = '2D Escalating Difficulty Grid';
        spawners = 'Destructible Puzzle Bricks';
        gameModeKey = '2D_BRICK';
      } else if (text.includes('snake') || text.includes('tron') || text.includes('slither')) {
        perspective = PERSPECTIVES.GAME_2D_SNAKE;
        controlSystem = 'Grid Vector Steer [WASD] / Arrows';
        environmentFloor = '2D Matrix Grid';
        spawners = 'Glowing Food Pellets';
        gameModeKey = '2D_SNAKE';
      } else if (text.includes('tank') || text.includes('artillery') || text.includes('warfare') || text.includes('combat')) {
        perspective = PERSPECTIVES.GAME_2D_TANK;
        controlSystem = 'Tank Drive [WASD] + Mouse Shell Aim';
        environmentFloor = '2D Battlefield Arena';
        spawners = 'Enemy Turrets & Heavy Shells';
        gameModeKey = '2D_TANK';
      } else if (text.includes('doodle') || text.includes('jumper') || text.includes('jump 2d') || text.includes('bounce tower')) {
        perspective = PERSPECTIVES.GAME_2D_JUMPER;
        controlSystem = 'Side Steer [A][D] + Auto Bounce';
        environmentFloor = '2D Infinite Sky Tower';
        spawners = 'Floating Cloud Platforms';
        gameModeKey = '2D_JUMPER';
      } else if (text.includes('pacman') || text.includes('pac-man') || text.includes('ghost') || text.includes('dots')) {
        perspective = PERSPECTIVES.GAME_2D_PACMAN;
        controlSystem = 'Maze Directional Navigation [WASD]';
        environmentFloor = '2D Maze Corridors';
        spawners = 'Yellow Dots & Patrol Ghosts';
        gameModeKey = '2D_PACMAN';
      } else if (text.includes('jetpack') || text.includes('flappy') || text.includes('bird') || text.includes('thrust') || text.includes('heli')) {
        perspective = PERSPECTIVES.GAME_2D_JETPACK;
        controlSystem = 'Physics Jetpack Thrust [Space]';
        environmentFloor = '2D Skyline Field';
        spawners = 'Obstacle Pillars & Score Points';
        gameModeKey = '2D_JETPACK';
      } else if (text.includes('brick') || text.includes('breaker') || text.includes('pong') || text.includes('bounce') || text.includes('arkanoid')) {
        perspective = PERSPECTIVES.GAME_2D_BRICK;
        controlSystem = 'Paddle Steering Vector [Mouse] / [A][D]';
        environmentFloor = 'Neon Brick Grid';
        spawners = 'Destructible Colored Bricks';
        gameModeKey = '2D_BRICK';
      } else if (text.includes('platformer') || text.includes('side') || text.includes('runner') || text.includes('mario') || text.includes('sonic')) {
        perspective = PERSPECTIVES.GAME_2D_RUNNER;
        controlSystem = 'Jump Physics [Space] / [W]';
        environmentFloor = '2D Side-Scrolling Terrain';
        spawners = 'Hazard Spikes & Points';
        gameModeKey = '2D_RUNNER';
      } else {
        perspective = PERSPECTIVES.GAME_2D_SHOOTER;
        controlSystem = '2D Ship Movement [A][D] + Laser Aim';
        environmentFloor = '2D Retro Starfield Arena';
        spawners = 'Alien Wave Attackers & Lasers';
        gameModeKey = '2D_SHOOTER';
      }
    } else {
      const isZombie = /zombie|survival|horde|undead|apocalypse|doom|halo|call of duty|counter-strike|mech|weapon/i.test(text);
      const isShooter = /shooter|shoot|shooting|multiplayer|futuristic|weapons|gun|fps|space|invader|ship|laser|asteroid|galaxy|alien|war|battle|blaster|star|target|projectile|starfox|invaders/i.test(text);
      const isPlatformer = /platformer|platform|parkour|climb|trophy|mario|crash bandicoot|spyro|roblox|obby|only up|fall guys|human fall flat|minecraft|helix jump|cube surfer|stair run|tower jump/i.test(text);
      const isRacing = /racing|race|car|drive|speed|turbo|highway|formula|asphalt|kart|drift|traffic|vehicle|traffic rider|need for speed|mario kart|moto x3m|police chase/i.test(text);
      const isMaze = /maze|underwater|dungeon|labyrinth|explore|puzzle|pacman 3d|pac-man world|tomb explorer|sea explorer/i.test(text);

      if (isZombie || isShooter) {
        perspective = PERSPECTIVES.TOP_DOWN_SHOOTER;
        controlSystem = 'WASD Hero Vector + Mouse Laser Aiming';
        environmentFloor = (isZombie || text.includes('futuristic')) ? 'Futuristic Arena Grid' : 'Deep Space Arena';
        spawners = 'Plasma Weapons & Target Drones';
        gameModeKey = 'SHOOTER';
      } else if (isPlatformer) {
        perspective = PERSPECTIVES.PLATFORMER_3D;
        controlSystem = '3D Directional WASD + Gravity Jump [Space]';
        environmentFloor = 'Sky Island Archipelago';
        spawners = 'Moving Platforms, Hazard Lava & Gold Trophy Goal';
        gameModeKey = 'PLATFORMER';
      } else if (isRacing) {
        perspective = PERSPECTIVES.THIRD_PERSON_RACING;
        controlSystem = 'Steering Vector [←][→] + Nitro Acceleration [W]';
        environmentFloor = 'High-Speed Asphalt Track';
        spawners = 'Oncoming Traffic Cars & Nitro Canisters';
        gameModeKey = 'RACING';
      } else if (isMaze) {
        perspective = PERSPECTIVES.TOP_DOWN_MAZE;
        controlSystem = 'Free WASD Corridor Navigation';
        environmentFloor = text.includes('underwater') ? 'Underwater Ocean Bed' : '3D Dungeon Grid';
        spawners = 'Laser Barrier Walls & Gem Orbs';
        gameModeKey = 'MAZE';
      } else {
        perspective = PERSPECTIVES.THIRD_PERSON_RUNNER;
        controlSystem = 'Lane Switching [←][→] & Jump [Space]';
        environmentFloor = '3-Lane Highway';
        spawners = 'Red Barriers & Gold Coins';
        gameModeKey = 'RUNNER';
      }
    }

    // Theme detection
    if (text.includes('underwater') || text.includes('water') || text.includes('ocean') || text.includes('blue')) {
      this.currentTheme = COLOR_THEMES.BLUE;
    } else if (text.includes('zombie') || text.includes('red') || text.includes('crimson') || text.includes('doom')) {
      this.currentTheme = COLOR_THEMES.RED;
    } else if (text.includes('matrix') || text.includes('green') || text.includes('emerald')) {
      this.currentTheme = COLOR_THEMES.GREEN;
    } else if (text.includes('gold') || text.includes('yellow') || text.includes('sunset')) {
      this.currentTheme = COLOR_THEMES.GOLD;
    } else if (text.includes('futuristic') || text.includes('neon') || text.includes('synth') || text.includes('purple') || text.includes('cyberpunk')) {
      this.currentTheme = COLOR_THEMES.CYBER;
    } else if (text.includes('dark') || text.includes('night') || text.includes('void')) {
      this.currentTheme = COLOR_THEMES.DARK;
    }

    const logMessage = `[AI Discovery & Engine] Studio: ${is2D ? '2D Canvas' : '3D WebGL'} | Mode: ${perspective}`;

    return {
      is2D,
      gameModeKey,
      perspective,
      controlSystem,
      environmentFloor,
      spawners,
      theme: this.currentTheme,
      speedMultiplier: this.speedMultiplier,
      jumpMultiplier: this.jumpMultiplier,
      spawnRateMultiplier: this.spawnRateMultiplier,
      logMessage
    };
  }

  interpretLiveTweak(commandText) {
    const text = (commandText || '').toLowerCase().trim();
    let modApplied = [];

    if (text.includes('super fast') || text.includes('faster') || text.includes('speed up') || text.includes('fast')) {
      this.speedMultiplier *= 1.6;
      modApplied.push(`⚡ Speed boosted to ${this.speedMultiplier.toFixed(1)}x`);
    }

    if (text.includes('slow down') || text.includes('slower')) {
      this.speedMultiplier = Math.max(0.5, this.speedMultiplier * 0.7);
      modApplied.push(`🐢 Speed slowed to ${this.speedMultiplier.toFixed(1)}x`);
    }

    if (text.includes('low gravity') || text.includes('floaty') || text.includes('moon')) {
      this.gravityMultiplier = 0.4;
      modApplied.push(`🌌 Floaty moon gravity active (0.4x)`);
    } else if (text.includes('heavy jump') || text.includes('high jump') || text.includes('super jump')) {
      this.jumpMultiplier *= 2.0;
      modApplied.push(`🚀 Jump power doubled (${this.jumpMultiplier.toFixed(1)}x)`);
    }

    if (text.includes('neon') || text.includes('cyberpunk') || text.includes('cyber')) {
      this.currentTheme = COLOR_THEMES.CYBER;
      modApplied.push(`🟣 Theme shifted to NEON CYBERPUNK`);
    } else if (text.includes('blue') || text.includes('ocean')) {
      this.currentTheme = COLOR_THEMES.BLUE;
      modApplied.push(`🔵 Theme shifted to DEEP OCEAN BLUE`);
    } else if (text.includes('red') || text.includes('zombie theme')) {
      this.currentTheme = COLOR_THEMES.RED;
      modApplied.push(`🔴 Theme shifted to ZOMBIE CRIMSON`);
    } else if (text.includes('night') || text.includes('dark')) {
      this.currentTheme = COLOR_THEMES.DARK;
      modApplied.push(`🌌 Theme shifted to VOID NIGHT`);
    }

    if (text.includes('more enemies') || text.includes('horde') || text.includes('more obstacles')) {
      this.spawnRateMultiplier *= 1.8;
      modApplied.push(`👾 Enemy spawn rate increased by 1.8x`);
    }

    if (text.includes('infinite health') || text.includes('invincible') || text.includes('god mode')) {
      this.invincible = !this.invincible;
      modApplied.push(this.invincible ? `🛡️ Infinite Health / God Mode ACTIVATED!` : `🛡️ Infinite Health Deactivated`);
    }

    if (modApplied.length === 0) {
      this.speedMultiplier *= 1.25;
      modApplied.push(`⚡ Live Director Tweak: Engine speed boosted to ${this.speedMultiplier.toFixed(1)}x!`);
    }

    return {
      success: true,
      modApplied,
      state: {
        speedMultiplier: this.speedMultiplier,
        jumpMultiplier: this.jumpMultiplier,
        spawnRateMultiplier: this.spawnRateMultiplier,
        theme: this.currentTheme,
        gravityMultiplier: this.gravityMultiplier,
        invincible: this.invincible,
        playerScale: this.playerScale
      }
    };
  }
}

export const semanticClassifier = new SemanticClassifier();
