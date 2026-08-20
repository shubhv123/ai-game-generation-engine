import { callOllamaLLM } from './ollamaClient.js';
import { attributeCache, recordCacheHit, recordCacheMiss } from '../backend/services/cacheService.js';

// Archetypes that can be dynamically rendered as playable web prototypes
export const GENERATABLE_ARCHETYPES = [
  '2D_SHOOTER',      // Space shooter, Galaga/Invaders, plasma blaster
  '2D_BRICK',        // Brick breaker, Arkanoid, physics puzzle
  '2D_RUNNER',       // Side scrolling runner, jetpack
  '2D_SNAKE',        // Neon grid snake, Tron lightcycle
  '2D_TANK',         // Tank combat, artillery war
  '2D_JUMPER',       // Doodle jumper, vertical bounce
  '2D_PACMAN',       // Pacman maze dot chaser
  'CHESS',           // 2D/3D Official Chess Strategy Engine
  '3D_RUNNER',       // 3D Slope / Highway infinite runner
  '3D_SHOOTER',      // 3D Top-down zombie shooter
  '3D_MAZE'          // 3D Maze runner exploration
];

/**
 * Extract structured attributes from free-text user prompt
 */
export async function parsePromptAttributes(userPrompt) {
  const promptText = (userPrompt || '').trim();

  if (!promptText) {
    return getFallbackAttributes('Default Arcade Exploration');
  }

  // 1. Check in-memory Attribute Cache
  const cacheKey = `attr:${promptText.toLowerCase()}`;
  if (attributeCache.has(cacheKey)) {
    recordCacheHit();
    return attributeCache.get(cacheKey);
  }
  recordCacheMiss();

  const systemMessage = `You are an expert game developer and game taxonomy parser.
Parse the user's natural language game request into a valid JSON object with the following fields:
{
  "entities": ["list", "of", "literal", "proper", "nouns", "subjects", "character", "animals", "or", "specific", "items", "e.g.", "chameleon"],
  "hardConstraints": {
    "platform": "N64 | Nintendo 64 | PS1 | SNES | PC | Switch | Xbox | null",
    "year": "e.g. 1997 or 90s or null",
    "franchise": "specific game franchise if mentioned or null"
  },
  "genre": "Shooter | Puzzle | Runner | Platformer | Racing | Strategy | RPG | Fighting | Arcade | Adventure",
  "dimension": "2D | 3D",
  "platform": "PC | Console | Mobile | Web | Cross-Platform | Nintendo 64 | PlayStation",
  "multiplayer": true or false,
  "mechanics": ["list", "of", "core", "mechanics"],
  "difficulty": "Easy | Medium | Hard | Increasing",
  "artStyle": "Pixel | Cyberpunk | Minimalist | Low-Poly | Retro Neon | Fantasy | Realistic",
  "moodTheme": "Action | Relaxing | Sci-Fi | Dark | Futuristic | Casual | Playful",
  "archetype": "2D_SHOOTER | 2D_BRICK | 2D_RUNNER | 2D_SNAKE | 2D_TANK | 2D_JUMPER | 2D_PACMAN | CHESS | 3D_RUNNER | 3D_SHOOTER | 3D_MAZE | REC_ONLY",
  "isGeneratable": true or false,
  "scopeExplanation": "Short explanation of whether this is generatable as a playable web prototype or recommendation-only"
}

Rules:
- CRITICAL: Always capture specific nouns/characters (e.g. "chameleon", "subway", "ninja", "cat", "vampire", "tank") into the "entities" array!
- If the user specifies an explicit platform (e.g. "N64", "Nintendo 64", "PS2", "Game Boy"), set hardConstraints.platform!
- Respond ONLY with pure JSON. Do not include markdown code block syntax if possible, or format strictly as JSON.
- If request matches 2D/3D arcade/puzzle/runner/shooter/chess, set archetype appropriately and isGeneratable = true.
- If request is a complex AAA game, open-world RPG, or massive multiplayer (e.g. GTA, Witcher 3, Cyberpunk 2077), set archetype = "REC_ONLY" and isGeneratable = false.`;

  const messages = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: `User Prompt: "${promptText}"` }
  ];

  const llmResult = await callOllamaLLM(messages, { temperature: 0.2 });

  if (llmResult.success && llmResult.content) {
    try {
      // Clean potential JSON markdown blocks ```json ... ```
      let cleaned = llmResult.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(cleaned);

      // Sanitize fields
      parsed.entities = Array.isArray(parsed.entities) ? parsed.entities.filter(Boolean) : [];
      parsed.hardConstraints = parsed.hardConstraints || {};
      parsed.isGeneratable = Boolean(parsed.isGeneratable && parsed.archetype !== 'REC_ONLY');
      parsed.promptText = promptText;
      attributeCache.set(cacheKey, parsed);
      return parsed;
    } catch (parseError) {
      console.warn('[AttributeParser] Failed to parse JSON from LLM response, invoking rule engine fallback:', parseError.message);
    }
  }

  // Fallback rule-based parsing if LLM is unavailable or returned non-JSON
  const fallback = getFallbackAttributes(promptText);
  attributeCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Deterministic rule-based fallback parser
 */
export function getFallbackAttributes(text) {
  const t = text.toLowerCase();
  
  // Extract explicit platform constraints
  let platformConstraint = null;
  if (t.includes('n64') || t.includes('nintendo 64')) platformConstraint = 'Nintendo 64';
  else if (t.includes('ps1') || t.includes('playstation 1') || t.includes('psx')) platformConstraint = 'PlayStation';
  else if (t.includes('ps2') || t.includes('playstation 2')) platformConstraint = 'PlayStation 2';
  else if (t.includes('snes') || t.includes('super nintendo')) platformConstraint = 'SNES';
  else if (t.includes('gameboy') || t.includes('game boy') || t.includes('gba')) platformConstraint = 'Game Boy';
  else if (t.includes('switch')) platformConstraint = 'Nintendo Switch';

  // Extract entity keywords (filter common stopwords)
  const STOPWORDS = new Set(['a','an','the','game','where','you','play','as','on','in','with','for','of','and','to','is','like']);
  const words = t.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
  const entities = words.filter(w => !['n64', 'nintendo', 'playstation', 'game', 'play', '2d', '3d'].includes(w));

  let genre = 'Arcade';
  let dimension = t.includes('2d') ? '2D' : (t.includes('3d') ? '3D' : '2D');
  let platform = platformConstraint || (t.includes('mobile') ? 'Mobile' : (t.includes('console') ? 'Console' : 'PC / Web'));
  let multiplayer = t.includes('multiplayer') || t.includes('coop') || t.includes('pvp') || t.includes('multi-player');
  let difficulty = t.includes('hard') ? 'Hard' : (t.includes('easy') ? 'Easy' : (t.includes('increasing') || t.includes('escalat') ? 'Increasing' : 'Medium'));
  let artStyle = t.includes('cyber') ? 'Retro Neon' : (t.includes('pixel') ? 'Pixel' : (t.includes('minimal') ? 'Minimalist' : 'Cyberpunk'));
  let moodTheme = t.includes('relax') ? 'Relaxing' : (t.includes('future') || t.includes('weapon') ? 'Sci-Fi' : 'Action');
  let mechanics = [];

  let archetype = '2D_SHOOTER';
  let isGeneratable = true;

  // Keyword mapping for archetypes
  if (t.includes('chess')) {
    archetype = 'CHESS';
    genre = 'Strategy';
    mechanics = ['board strategy', 'turn based', 'piece movements'];
  } else if (t.includes('brick') || t.includes('arkanoid') || t.includes('puzzle') || t.includes('logic')) {
    archetype = '2D_BRICK';
    genre = 'Puzzle';
    dimension = '2D';
    mechanics = ['paddle bounce', 'brick destruction', 'escalating difficulty'];
  } else if (t.includes('snake') || t.includes('tron') || t.includes('slither')) {
    archetype = '2D_SNAKE';
    genre = 'Arcade';
    dimension = '2D';
    mechanics = ['grid vector movement', 'food collection', 'tail growth'];
  } else if (t.includes('tank') || t.includes('artillery') || t.includes('warfare')) {
    archetype = '2D_TANK';
    genre = 'Action / Warfare';
    dimension = '2D';
    mechanics = ['turret rotation', 'shell physics', 'enemy arena'];
  } else if (t.includes('doodle') || t.includes('jumper') || t.includes('bounce tower')) {
    archetype = '2D_JUMPER';
    genre = 'Platformer';
    dimension = '2D';
    mechanics = ['vertical bounce', 'floating platforms', 'height score'];
  } else if (t.includes('pacman') || t.includes('pac-man') || t.includes('dot chaser')) {
    archetype = '2D_PACMAN';
    genre = 'Arcade';
    dimension = '2D';
    mechanics = ['maze navigation', 'pellet collection', 'ghost dodging'];
  } else if (t.includes('runner') || t.includes('infinite run') || t.includes('subway') || t.includes('slope')) {
    if (dimension === '3D' || t.includes('3d')) {
      archetype = '3D_RUNNER';
      dimension = '3D';
    } else {
      archetype = '2D_RUNNER';
      dimension = '2D';
    }
    genre = 'Endless Runner';
    mechanics = ['lane switching', 'obstacle avoidance', 'speed scaling'];
  } else if (t.includes('zombie') || t.includes('shooter 3d') || t.includes('top down 3d')) {
    archetype = '3D_SHOOTER';
    genre = 'Shooter';
    dimension = '3D';
    mechanics = ['360 twin-stick aim', 'horde survival', 'laser weapons'];
  } else if (t.includes('maze') || t.includes('labyrinth') || t.includes('dungeon')) {
    archetype = '3D_MAZE';
    genre = 'Exploration';
    dimension = '3D';
    mechanics = ['first person / top down view', 'key collection', 'exit navigation'];
  } else if (t.includes('shooter') || t.includes('shooting') || t.includes('laser') || t.includes('weapons') || t.includes('space')) {
    archetype = '2D_SHOOTER';
    genre = 'Shooter';
    dimension = '2D';
    mechanics = ['plasma blasters', 'laser fire', 'enemy waves'];
  } else if (t.includes('open world') || t.includes('rpg') || t.includes('gta') || t.includes('witcher') || t.includes('skyrim') || t.includes('elden ring')) {
    archetype = 'REC_ONLY';
    genre = 'Open World RPG / AAA';
    isGeneratable = false;
    mechanics = ['open world exploration', 'deep narrative', 'character customization'];
  }

  const scopeExplanation = isGeneratable
    ? `Matches playable browser archetype [${archetype}]. Interactive prototype generated!`
    : `High complexity AAA / Open World request. Recommending existing curated game titles.`;

  return {
    entities,
    hardConstraints: {
      platform: platformConstraint,
      year: null,
      franchise: null
    },
    genre,
    dimension,
    platform,
    multiplayer,
    mechanics,
    difficulty,
    artStyle,
    moodTheme,
    archetype,
    isGeneratable,
    scopeExplanation,
    promptText: text
  };
}
