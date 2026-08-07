/**
 * Dynamic parameter synthesizer for game prototypes
 * Translates parsed NLU attributes and user refinement commands into game engine configuration
 */

export const COLOR_PALETTES = {
  CYBERPUNK: { name: 'CYBER DUSK', bg: '#0f172a', primary: '#00f0ff', secondary: '#f43f5e', accent: '#38bdf8', platform: '#4f46e5', text: '#e2e8f0' },
  NEON_GREEN: { name: 'MATRIX EMERALD', bg: '#064e3b', primary: '#10b981', secondary: '#f43f5e', accent: '#6ee7b7', platform: '#047857', text: '#ecfdf5' },
  ZOMBIE_CRIMSON: { name: 'CRIMSON VOID', bg: '#4c0519', primary: '#f43f5e', secondary: '#fbbf24', accent: '#fca5a5', platform: '#881337', text: '#fff1f2' },
  SUNSET_GOLD: { name: 'GOLDEN DUSK', bg: '#451a03', primary: '#fbbf24', secondary: '#d97706', accent: '#fde047', platform: '#78350f', text: '#fef3c7' },
  SYNTHWAVE: { name: 'SYNTHWAVE PURPLE', bg: '#3b0764', primary: '#c084fc', secondary: '#ec4899', accent: '#e9d5ff', platform: '#6b21a8', text: '#faf5ff' },
  DEEP_OCEAN: { name: 'ABYSS BLUE', bg: '#0c4a6e', primary: '#38bdf8', secondary: '#f43f5e', accent: '#7dd3fc', platform: '#0369a1', text: '#f0f9ff' }
};

export function generateGameConfig(parsedAttrs, refinementPrompt = '') {
  const text = `${parsedAttrs.promptText || ''} ${refinementPrompt}`.toLowerCase();
  
  // Base configuration defaults
  let config = {
    archetype: parsedAttrs.archetype || '2D_SHOOTER',
    title: generateTitle(parsedAttrs),
    speedMultiplier: 1.0,
    jumpHeight: 1.0,
    spawnRate: 1.0,
    difficulty: parsedAttrs.difficulty || 'Medium',
    palette: COLOR_PALETTES.CYBERPUNK,
    invincible: false,
    weaponType: 'PLASMA_BLASTER', // PLASMA_BLASTER, SPREAD_LASER, HEAVY_CANNON, RAPID_FIRE
    powerUpsEnabled: true,
    gravity: 1.0,
    lives: 3,
    winScore: 1000,
    controls: 'WASD / Arrow Keys + Spacebar',
    instructions: 'Destroy enemies, dodge hazards, and reach the high score target!'
  };

  // Select theme palette
  if (text.includes('crimson') || text.includes('zombie') || text.includes('red') || text.includes('blood')) {
    config.palette = COLOR_PALETTES.ZOMBIE_CRIMSON;
  } else if (text.includes('matrix') || text.includes('green') || text.includes('emerald')) {
    config.palette = COLOR_PALETTES.NEON_GREEN;
  } else if (text.includes('gold') || text.includes('sunset') || text.includes('yellow')) {
    config.palette = COLOR_PALETTES.SUNSET_GOLD;
  } else if (text.includes('synthwave') || text.includes('purple') || text.includes('retro')) {
    config.palette = COLOR_PALETTES.SYNTHWAVE;
  } else if (text.includes('ocean') || text.includes('blue') || text.includes('water')) {
    config.palette = COLOR_PALETTES.DEEP_OCEAN;
  }

  // Refinement overrides
  if (text.includes('faster') || text.includes('speed up') || text.includes('harder') || text.includes('insane')) {
    config.speedMultiplier = 1.6;
    config.spawnRate = 1.5;
    config.difficulty = 'Hard';
  }
  if (text.includes('slower') || text.includes('easier') || text.includes('relax')) {
    config.speedMultiplier = 0.7;
    config.spawnRate = 0.6;
    config.difficulty = 'Easy';
  }
  if (text.includes('god mode') || text.includes('invincible') || text.includes('shield')) {
    config.invincible = true;
    config.lives = 99;
  }
  if (text.includes('laser') || text.includes('spread') || text.includes('shotgun')) {
    config.weaponType = 'SPREAD_LASER';
  }
  if (text.includes('cannon') || text.includes('rocket') || text.includes('heavy')) {
    config.weaponType = 'HEAVY_CANNON';
  }

  // Specific archetype instructions & controls
  switch (config.archetype) {
    case 'CHESS':
      config.instructions = 'Official Chess Rules: Select a piece to view highlighted legal moves, then click target tile to move or capture.';
      config.controls = 'Mouse Click to Select & Move';
      break;
    case '2D_BRICK':
      config.instructions = 'Physics Brick Breaker: Move paddle with Mouse or WASD to bounce ball into brick grid!';
      config.controls = 'Mouse Move / [A][D] Keys';
      break;
    case '2D_SNAKE':
      config.instructions = 'Tron Matrix Snake: Navigate grid using WASD, eat glowing food, and avoid walls or self-collision!';
      config.controls = '[WASD] / Arrow Keys';
      break;
    case '2D_TANK':
      config.instructions = 'Tank Warfare: Drive tank with WASD, rotate turret with mouse aim, and fire heavy shells with Left Click!';
      config.controls = '[WASD] Drive + Mouse Aim & Click';
      break;
    case '2D_JUMPER':
      config.instructions = 'Doodle Jumper: Bounce vertically across cloud platforms, collect jetpacks, and climb to infinity!';
      config.controls = '[A][D] / Left-Right Arrow Keys';
      break;
    case '2D_RUNNER':
    case '3D_RUNNER':
      config.instructions = 'High Speed Runner: Dodge obstacles with Left/Right lane switches and jump over barriers!';
      config.controls = '[A][D] or Arrows to Switch Lanes, [Space] to Jump';
      break;
    case '3D_SHOOTER':
    case '2D_SHOOTER':
      config.instructions = 'Space Plasma Shooter: Aim and blast enemy ships, collect health/shield power-ups, survive enemy waves!';
      config.controls = '[WASD] Move + Spacebar / Left Click Fire';
      break;
  }

  return config;
}

function generateTitle(attrs) {
  const genre = attrs.genre || 'Arcade';
  const mood = attrs.moodTheme || 'Cyber';
  const dimension = attrs.dimension || '2D';
  
  const prefixes = ['Neon', 'Hyper', 'Cyber', 'Quantum', 'Vector', 'Apex', 'Starlight', 'Vortex', 'Shadow', 'Infinity'];
  const nouns = ['Blaster', 'Breaker', 'Runner', 'Protocol', 'Overdrive', 'Tactics', 'Odyssey', 'Matrix', 'Ascent', 'Siege'];
  
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];

  return `${p} ${n} ${dimension} (${genre})`;
}
