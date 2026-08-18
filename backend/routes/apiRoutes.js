import express from 'express';
import { parsePromptAttributes, GENERATABLE_ARCHETYPES } from '../../ai/attributeParser.js';
import { generateGameConfig } from '../../ai/gameCodeGenerator.js';
import { synthesizeCustomGameCode } from '../../ai/codeSynthesizer.js';
import { searchAndRankGames } from '../services/semanticSearch.js';
import { HistoryStore } from '../services/historyStore.js';

const router = express.Router();

/**
 * POST /api/recommend
 * Input: { prompt: string, preferences?: object }
 * Output: { attributes, recommendations, isGeneratable, scopeExplanation }
 */
router.post('/recommend', async (req, res) => {
  try {
    const { prompt, page = 1, limit = 6 } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Valid prompt text is required' });
    }

    const userPrefs = req.body.preferences || HistoryStore.getPreferences();

    // 1. Natural Language Attribute Extraction using Ollama Cloud LLM
    const attributes = await parsePromptAttributes(prompt);

    // 2. Query Game DB + RAWG + Web search fallback & Rank results with Pagination
    const searchResult = await searchAndRankGames(prompt, attributes, userPrefs, page, limit);
    const recommendations = searchResult.recommendations || [];
    const pagination = searchResult.pagination || {
      currentPage: 1,
      totalPages: 1,
      totalMatches: recommendations.length,
      limit: 6,
      hasNext: false,
      hasPrev: false,
      startIndex: 1,
      endIndex: recommendations.length
    };

    // 3. ALWAYS synthesize a game config — never block the user from generating
    // The archetype might be REC_ONLY from LLM, but we override it with a sensible default
    // so the user can always attempt to generate a prototype.
    if (!attributes.archetype || attributes.archetype === 'REC_ONLY') {
      // Pick best-fit archetype from genre keywords
      const t = prompt.toLowerCase();
      if (t.includes('chess'))  attributes.archetype = 'CHESS';
      else if (t.includes('puzzle') || t.includes('brick')) attributes.archetype = '2D_BRICK';
      else if (t.includes('snake') || t.includes('tron'))   attributes.archetype = '2D_SNAKE';
      else if (t.includes('tank') || t.includes('combat'))  attributes.archetype = '2D_TANK';
      else if (t.includes('runner') || t.includes('subway') || t.includes('dash')) attributes.archetype = '3D_RUNNER';
      else if (t.includes('shoot') || t.includes('weapon') || t.includes('gun')) attributes.archetype = '2D_SHOOTER';
      else if (t.includes('maze') || t.includes('dungeon')) attributes.archetype = '3D_MAZE';
      else if (t.includes('race') || t.includes('car') || t.includes('kart'))  attributes.archetype = 'RACING';
      else if (t.includes('platform') || t.includes('jump')) attributes.archetype = 'PLATFORMER';
      else attributes.archetype = '2D_SHOOTER'; // universal fallback
    }
    // Force isGeneratable true — it's the user's choice, not ours
    attributes.isGeneratable = true;
    attributes.scopeExplanation = `Generating a ${attributes.archetype.replace(/_/g,' ')} prototype based on your description.`;

    const gameConfig = generateGameConfig(attributes);

    // 4. Record entry in session history
    HistoryStore.addHistoryEntry({
      prompt: prompt,
      archetype: attributes.archetype,
      isGeneratable: true,
      attributes: attributes,
      gameConfig: gameConfig
    });

    res.json({
      success: true,
      prompt: prompt,
      attributes: attributes,
      isGeneratable: true,
      archetype: attributes.archetype,
      scopeExplanation: attributes.scopeExplanation,
      gameConfig: gameConfig,
      recommendations: recommendations,
      pagination: pagination
    });
  } catch (error) {
    console.error('[API /recommend] Error:', error);
    res.status(500).json({ error: 'Failed to process recommendation request', details: error.message });
  }
});

/**
 * POST /api/generate
 * Input: { attributes, refinementPrompt?: string }
 * Output: { gameConfig }
 */
router.post('/generate', async (req, res) => {
  try {
    const { attributes, refinementPrompt } = req.body;
    const baseAttrs = attributes || await parsePromptAttributes(refinementPrompt || '2D Arcade Shooter');
    
    const gameConfig = generateGameConfig(baseAttrs, refinementPrompt || '');

    res.json({
      success: true,
      refinementPrompt: refinementPrompt || '',
      gameConfig: gameConfig
    });
  } catch (error) {
    console.error('[API /generate] Error:', error);
    res.status(500).json({ error: 'Failed to synthesize game configuration', details: error.message });
  }
});

/**
 * POST /api/generate-code
 * Input: { userPrompt: string, previousCode?: string, tweakRequest?: string }
 * Output: { success: true, code: string, explanation: string }
 */
router.post('/generate-code', async (req, res) => {
  try {
    const { userPrompt, previousCode, tweakRequest } = req.body;
    if (!userPrompt && !tweakRequest) {
      return res.status(400).json({ error: 'userPrompt or tweakRequest is required' });
    }

    const result = await synthesizeCustomGameCode(userPrompt, previousCode, tweakRequest);
    res.json(result);
  } catch (error) {
    console.error('[API /generate-code] Error:', error);
    res.status(500).json({ error: 'Failed to generate custom game code', details: error.message });
  }
});

/**
 * GET /api/history & DELETE /api/history
 */
router.get('/history', (req, res) => {
  const history = HistoryStore.getHistory();
  res.json({ success: true, history });
});

router.delete('/history', (req, res) => {
  const cleared = HistoryStore.clearHistory();
  res.json({ success: true, history: cleared });
});

/**
 * GET /api/user/preferences & POST /api/user/preferences
 */
router.get('/user/preferences', (req, res) => {
  const prefs = HistoryStore.getPreferences();
  res.json({ success: true, preferences: prefs });
});

router.post('/user/preferences', (req, res) => {
  const updated = HistoryStore.savePreferences(req.body);
  res.json({ success: true, preferences: updated });
});

/**
 * GET /api/scope-info
 * Returns system scope boundaries (which genres/complexities are generatable vs rec-only)
 */
router.get('/scope-info', (req, res) => {
  res.json({
    generatableArchetypes: [
      { id: '2D_SHOOTER', name: '2D Retro Space Arcade', description: 'Space shooting, Galaga style, laser blasters & powerups' },
      { id: '2D_BRICK', name: '2D Brick Breaker', description: 'Arkanoid physics puzzle with paddle bounce & brick destruction' },
      { id: '2D_RUNNER', name: '2D Jetpack Runner', description: 'Side scrolling obstacle dodge & height score' },
      { id: '2D_SNAKE', name: '2D Tron Matrix Snake', description: 'Grid vector movement, food collection & tail growth' },
      { id: '2D_TANK', name: '2D Tank Warfare Combat', description: 'Tank driving, mouse turret aim & heavy shell explosions' },
      { id: '2D_JUMPER', name: '2D Doodle Jumper', description: 'Vertical cloud platform bouncing & infinite ascent' },
      { id: '2D_PACMAN', name: '2D Pacman Dot Chaser', description: 'Maze navigation, pellet collection & ghost dodging' },
      { id: 'CHESS', name: '2D/3D Official Chess', description: 'Official rule validation, move highlighting & checkmate detection' },
      { id: '3D_RUNNER', name: '3D Highway Runner', description: '3-lane high-speed 3D obstacle avoidance' },
      { id: '3D_SHOOTER', name: '3D Zombie Survival Shooter', description: '360 top-down twin stick zombie survival' },
      { id: '3D_MAZE', name: '3D Dungeon Maze Exploration', description: 'Perspective maze navigation & exit finding' }
    ],
    recommendationOnlyTypes: [
      { name: 'AAA Open World Games', example: 'Cyberpunk 2077, GTA V, Witcher 3' },
      { name: 'Complex Action RPGs', example: 'Elden Ring, Skyrim, Dark Souls' },
      { name: 'Massive Multiplayer Online (MMORPG)', example: 'World of Warcraft, Final Fantasy XIV' }
    ]
  });
});

export default router;
