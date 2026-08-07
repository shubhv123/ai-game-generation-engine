import { GAME_DATABASE } from '../database/gameDatabase.js';
import { fetchRawgGames } from './rawgService.js';
import { searchWebGamesFallback } from './webSearchService.js';
import { generateRecommendationRationale } from '../../ai/rationaleGenerator.js';
import { generateLLMRecommendations } from '../../ai/llmRecommender.js';

/**
 * Semantic search & ranking over game catalog.
 * 
 * Tiered Strategy:
 *  1. Score every local DB game — if any score ≥ MIN_GOOD_SCORE, use them
 *  2. If local is weak → ask the LLM directly to recommend real games (primary fallback)
 *  3. If LLM is offline/fails → try RAWG API
 *  4. If RAWG also fails → DuckDuckGo web search
 *  5. Last resort: show top-rated local games with disclaimer
 */
export async function searchAndRankGames(userPrompt, parsedAttrs, userPreferences = {}) {
  const promptText = (userPrompt || '').toLowerCase().trim();

  // Build token set
  const rawTokens = promptText.split(/[\s,]+/).filter(t => t.length > 2);
  const mechanicTokens = Array.isArray(parsedAttrs.mechanics)
    ? parsedAttrs.mechanics.map(m => m.toLowerCase()) : [];
  const genreToken = (parsedAttrs.genre || '').toLowerCase();
  const moodToken  = (parsedAttrs.moodTheme || '').toLowerCase();
  const artToken   = (parsedAttrs.artStyle  || '').toLowerCase();
  const allTokens  = [...new Set([...rawTokens, ...mechanicTokens, genreToken, moodToken, artToken].filter(Boolean))];
  const STOP = new Set(['the','and','with','that','for','like','some','have','this','can','are','game','games','play','want','need','where']);
  const searchTokens = allTokens.filter(t => !STOP.has(t) && t.length > 2);

  // ----- Score local DB games -----
  function scoreGame(game) {
    let score = 0;
    const matchedTags = new Set();
    const genreLow  = (game.genre || '').toLowerCase();
    const descLow   = (game.description || '').toLowerCase();
    const titleLow  = (game.title || '').toLowerCase();
    const tagsLow   = (game.tags || []).map(t => t.toLowerCase());

    if (genreToken && genreLow.includes(genreToken)) { score += 40; matchedTags.add(genreToken); }

    for (const token of searchTokens) {
      if (titleLow.includes(token))  { score += 30; matchedTags.add(token); }
      if (tagsLow.some(t => t.includes(token))) { score += 20; matchedTags.add(token); }
      if (genreLow.includes(token))  { score += 15; matchedTags.add(token); }
      if (descLow.includes(token))   { score += 8;  matchedTags.add(token); }
    }
    for (const m of mechanicTokens) {
      const allText = `${genreLow} ${descLow} ${titleLow} ${tagsLow.join(' ')}`;
      if (allText.includes(m)) { score += 12; matchedTags.add(m); }
    }
    if (moodToken && `${genreLow} ${descLow}`.includes(moodToken)) { score += 10; matchedTags.add(moodToken); }
    if (artToken  && `${genreLow} ${descLow}`.includes(artToken))  { score += 8;  matchedTags.add(artToken);  }
    if (Array.isArray(userPreferences.favoriteGenres)) {
      if (userPreferences.favoriteGenres.some(fg => genreLow.includes(fg.toLowerCase()))) score += 10;
    }

    const matchPercentage = score === 0 ? 0 : Math.min(97, Math.round(42 + (score / 120) * 55));
    return { ...game, score, matchPercentage, matchedTagsArray: Array.from(matchedTags) };
  }

  let localScored = GAME_DATABASE.map(scoreGame);
  localScored.sort((a, b) => b.score - a.score || b.rating - a.rating);

  const MIN_GOOD_SCORE = 25;
  const goodLocal = localScored.filter(g => g.score >= MIN_GOOD_SCORE);
  const bestLocalScore = localScored[0]?.score ?? 0;

  let finalResults = [];

  if (goodLocal.length >= 4) {
    // Local DB is sufficient
    console.log(`[SemanticSearch] Good local matches (${goodLocal.length}), using local DB.`);
    finalResults = goodLocal.slice(0, 6);
  } else {
    // --- Primary fallback: Ask LLM to recommend real games ---
    console.log(`[SemanticSearch] Local matches thin (best=${bestLocalScore}), asking LLM for recommendations...`);
    const llmRecs = await generateLLMRecommendations(userPrompt, parsedAttrs);
    
    if (llmRecs.length >= 3) {
      console.log(`[SemanticSearch] LLM returned ${llmRecs.length} recommendations.`);
      // Merge LLM results with any good local hits
      const seen = new Set(llmRecs.map(g => g.title.toLowerCase()));
      const remainingLocal = goodLocal.filter(g => !seen.has(g.title.toLowerCase()));
      finalResults = [...llmRecs, ...remainingLocal].slice(0, 6);
    } else {
      // --- Secondary fallback: RAWG API ---
      console.log(`[SemanticSearch] LLM failed, trying RAWG...`);
      const rawgGames = await fetchRawgGames(userPrompt, 6);
      
      if (rawgGames.length >= 2) {
        const rawgScored = rawgGames.map(g => ({ ...g, score: 60, matchPercentage: 78, matchedTagsArray: searchTokens.slice(0, 3) }));
        const seen = new Set(rawgScored.map(g => g.title.toLowerCase()));
        const remainingLocal = goodLocal.filter(g => !seen.has(g.title.toLowerCase()));
        finalResults = [...rawgScored, ...remainingLocal].slice(0, 6);
      } else {
        // --- Tertiary fallback: DuckDuckGo web search ---
        console.log(`[SemanticSearch] RAWG empty, trying web search...`);
        const webResults = await searchWebGamesFallback(promptText + ' video game');
        const webScored = webResults.map(g => ({ ...g, score: 50, matchPercentage: 70, matchedTagsArray: searchTokens.slice(0, 2) }));
        const seen = new Set(webScored.map(g => g.title.toLowerCase()));
        const remainingLocal = goodLocal.filter(g => !seen.has(g.title.toLowerCase()));
        finalResults = [...webScored, ...remainingLocal].slice(0, 6);
      }
      
      // If still empty after all fallbacks, use top rated local
      if (finalResults.length === 0) {
        console.log('[SemanticSearch] All sources exhausted. Returning top-rated local games.');
        finalResults = localScored.slice(0, 4).map(g => ({ ...g, matchPercentage: 45, matchedTagsArray: [] }));
      }
    }
  }

  // Deduplicate by title
  const seen = new Set();
  finalResults = finalResults.filter(g => {
    const key = (g.title || '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);

  // Generate rationale only for non-LLM results (LLM results already have rationale)
  const resultsWithRationale = await Promise.all(
    finalResults.map(async (game) => {
      // LLM-generated results already have rationale
      const rationale = game.rationale ||
        await generateRecommendationRationale(
          userPrompt,
          game.title,
          game.genre,
          game.matchedTagsArray?.length > 0 ? game.matchedTagsArray : [genreToken || 'games']
        );

      return {
        id: game.id,
        title: game.title,
        genre: game.genre,
        tags: game.tags || [],
        platform: game.platform,
        description: game.description || rationale,
        rating: game.rating,
        imageUrl: game.imageUrl,
        playUrl: game.playUrl,
        matchPercentage: game.matchPercentage,
        rationale,
        generatableEquivalent: game.generatableEquivalent || null,
        source: game.source || 'Curated Database'
      };
    })
  );

  return resultsWithRationale;
}
