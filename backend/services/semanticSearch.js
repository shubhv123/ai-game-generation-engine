import { GAME_DATABASE } from '../database/gameDatabase.js';
import { fetchRawgGames } from './rawgService.js';
import { searchWebGamesFallback } from './webSearchService.js';
import { generateRecommendationRationale } from '../../ai/rationaleGenerator.js';
import { generateLLMRecommendations } from '../../ai/llmRecommender.js';
import { searchCache, rationaleCache, recordCacheHit, recordCacheMiss } from './cacheService.js';

/**
 * Semantic search & ranking over game catalog with Pagination and In-Memory LRU Caching.
 * 
 * Strategy:
 *  1. Check `searchCache` for exact query:page:limit match -> Instant < 1ms response.
 *  2. If miss, search & score entire catalog/fallbacks.
 *  3. Slice requested page.
 *  4. Check `rationaleCache` per game -> Avoid redundant LLM calls.
 *  5. Cache completed payload into `searchCache`.
 */
export async function searchAndRankGames(userPrompt, parsedAttrs = {}, userPreferences = {}, page = 1, limit = 6) {
  const promptText = (userPrompt || '').toLowerCase().trim();
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 6);

  // 1. Check Page-Level In-Memory Cache
  const cacheKey = `search:${promptText}:${pageNum}:${pageSize}`;
  if (searchCache.has(cacheKey)) {
    recordCacheHit();
    console.log(`[Cache Hit] Serving Page ${pageNum} for "${promptText}" instantly from LRU cache (< 1ms).`);
    return searchCache.get(cacheKey);
  }
  recordCacheMiss();

  // Build token set & entity constraints
  const rawTokens = promptText.split(/[\s,]+/).filter(t => t.length > 2);
  const mechanicTokens = Array.isArray(parsedAttrs.mechanics)
    ? parsedAttrs.mechanics.map(m => m.toLowerCase()) : [];
  const genreToken = (parsedAttrs.genre || '').toLowerCase();
  const moodToken  = (parsedAttrs.moodTheme || '').toLowerCase();
  const artToken   = (parsedAttrs.artStyle  || '').toLowerCase();
  
  // Multiplayer / Co-op Intent Detection
  const isMultiplayerRequested = /\b(2-player|2 player|two player|2p|co-op|coop|couch co-op|couch coop|multiplayer|party|1v1|pvp|local co-op|local coop|local multiplayer|shared keyboard|split screen|split-screen|versus|battle friends)\b/i.test(promptText) || Boolean(parsedAttrs.isMultiplayer) || parsedAttrs.playerMode === '2P' || (Array.isArray(parsedAttrs.tags) && parsedAttrs.tags.some(t => /multiplayer|co-op|coop|party/i.test(t)));
  const isCouchOrLocalRequested = /\b(couch|local co-op|local coop|couch co-op|couch coop|party|shared keyboard|same screen|split screen|split-screen|one keyboard)\b/i.test(promptText);
  const isKeyboardRequested = /\b(keyboard|one keyboard|shared keyboard|pc|mac|steam)\b/i.test(promptText);
  const isSingleplayerRequested = /\b(singleplayer|single-player|single player|solo|solo campaign|story rich single)\b/i.test(promptText) && !isMultiplayerRequested;

  // Extract primary entities and hard platform constraints
  const GENERIC_EXCLUSIONS = new Set(['keyboard', 'mouse', 'controller', 'friend', 'friends', 'player', 'players', 'couch', 'party', 'game', 'games', 'play', 'screen', 'pc', 'console', 'mobile']);
  const entities = (Array.isArray(parsedAttrs.entities) ? parsedAttrs.entities : [])
    .map(e => String(e).toLowerCase().trim())
    .filter(e => e && !GENERIC_EXCLUSIONS.has(e));
  const platformConstraint = (parsedAttrs.hardConstraints?.platform || parsedAttrs.platform || '').toLowerCase();

  const allTokens  = [...new Set([...rawTokens, ...mechanicTokens, genreToken, moodToken, artToken, ...entities].filter(Boolean))];
  const STOP = new Set(['the','and','with','that','for','like','some','have','this','can','are','game','games','play','want','need','where','which','friend','keyboard','couch','player','players','one','two']);
  const searchTokens = allTokens.filter(t => !STOP.has(t) && t.length > 2);

  // ----- Score local DB games -----
  function scoreGame(game) {
    let score = 0;
    const matchedTags = new Set();
    const genreLow  = (game.genre || '').toLowerCase();
    const descLow   = (game.description || '').toLowerCase();
    const titleLow  = (game.title || '').toLowerCase();
    const tagsLow   = (game.tags || []).map(t => t.toLowerCase());
    const platformLow = Array.isArray(game.platform)
      ? game.platform.map(p => p.toLowerCase()).join(' ')
      : (game.platform || '').toLowerCase();

    // Check true multiplayer & local/couch capabilities
    const supportsKeyboard = platformLow.includes('pc') || platformLow.includes('mac') || platformLow.includes('linux') || platformLow.includes('windows');
    const hasLocalCoopTag = tagsLow.some(t => t.includes('local co-op') || t.includes('local multiplayer') || t.includes('split screen') || t.includes('shared screen') || t.includes('party') || t.includes('shared keyboard'));
    const hasLocalCoopDesc = descLow.includes('local co-op') || descLow.includes('couch') || descLow.includes('split screen') || descLow.includes('split-screen') || descLow.includes('shared screen') || descLow.includes('same screen') || descLow.includes('party game') || descLow.includes('one keyboard') || descLow.includes('co-op platformer') || descLow.includes('co-op puzzle');
    const isLocalCoopGame = (hasLocalCoopTag || hasLocalCoopDesc) && (!isKeyboardRequested || supportsKeyboard);

    const hasMultiplayerTag = tagsLow.some(t => t.includes('multiplayer') || t.includes('co-op') || t.includes('coop') || t.includes('local multiplayer') || t.includes('split screen') || t.includes('party') || t.includes('shared screen'));
    const hasMultiplayerDesc = descLow.includes('multiplayer') || descLow.includes('co-op') || descLow.includes('coop') || descLow.includes('couch') || descLow.includes('2-player') || descLow.includes('two player') || descLow.includes('party game') || descLow.includes('split screen') || descLow.includes('shared keyboard');
    const isMultiplayerGame = isLocalCoopGame || hasMultiplayerTag || hasMultiplayerDesc;
    const isStrictlySingleplayer = tagsLow.includes('singleplayer') && !isMultiplayerGame;

    let hasEntityMatch = false;

    // 0. Multiplayer / Couch Co-op Strict Intent Scoring
    if (isCouchOrLocalRequested) {
      if (isLocalCoopGame) {
        score += 350; // Super high priority for genuine couch/local/party co-op
        matchedTags.add('couch co-op');
      } else if (isMultiplayerGame) {
        score += 100;
        matchedTags.add('multiplayer');
      } else {
        score -= 400; // Heavily penalize non-couch/singleplayer games
      }
    } else if (isMultiplayerRequested) {
      if (isMultiplayerGame) {
        score += 260; // Massive boost for genuine multiplayer/co-op games
        matchedTags.add('2-player / co-op');
      } else if (isStrictlySingleplayer) {
        score -= 350; // Heavy penalty for strictly singleplayer titles
      }
    } else if (isSingleplayerRequested) {
      if (isStrictlySingleplayer) {
        score += 60;
        matchedTags.add('singleplayer');
      }
    }

    // 1. Literal Entity Match (Highest Priority)
    for (const ent of entities) {
      if (titleLow.includes(ent)) {
        score += 150;
        hasEntityMatch = true;
        matchedTags.add(ent);
      } else if (tagsLow.some(t => t.includes(ent)) || descLow.includes(ent)) {
        score += 90;
        hasEntityMatch = true;
        matchedTags.add(ent);
      }
    }

    // 2. Hard Platform & Keyboard Constraint Match
    if (isKeyboardRequested) {
      if (platformLow.includes('pc') || platformLow.includes('mac') || platformLow.includes('linux') || platformLow.includes('windows')) {
        score += 80;
        matchedTags.add('PC / Keyboard');
      } else if (!platformLow.includes('pc')) {
        score -= 200; // Penalize console-only exclusives when user asked for keyboard play
      }
    }

    if (platformConstraint) {
      const isN64 = platformConstraint.includes('n64') || platformConstraint.includes('nintendo 64');
      if (isN64 && (platformLow.includes('n64') || platformLow.includes('nintendo 64'))) {
        score += 80;
        matchedTags.add('n64');
      } else if (platformLow.includes(platformConstraint)) {
        score += 60;
        matchedTags.add(platformConstraint);
      }
    }

    // 3. Taxonomy matches
    if (genreToken && genreLow.includes(genreToken)) { score += 30; matchedTags.add(genreToken); }

    for (const token of searchTokens) {
      if (titleLow.includes(token))  { score += 25; matchedTags.add(token); }
      if (tagsLow.some(t => t.includes(token))) { score += 15; matchedTags.add(token); }
      if (genreLow.includes(token))  { score += 10; matchedTags.add(token); }
      if (descLow.includes(token))   { score += 6;  matchedTags.add(token); }
    }
    for (const m of mechanicTokens) {
      const allText = `${genreLow} ${descLow} ${titleLow} ${tagsLow.join(' ')}`;
      if (allText.includes(m)) { score += 10; matchedTags.add(m); }
    }
    if (moodToken && `${genreLow} ${descLow}`.includes(moodToken)) { score += 8; matchedTags.add(moodToken); }
    if (artToken  && `${genreLow} ${descLow}`.includes(artToken))  { score += 6; matchedTags.add(artToken);  }
    if (Array.isArray(userPreferences.favoriteGenres)) {
      if (userPreferences.favoriteGenres.some(fg => genreLow.includes(fg.toLowerCase()))) score += 8;
    }

    let matchPercentage = 0;
    if (score <= 0) {
      matchPercentage = 25;
    } else {
      matchPercentage = Math.min(98, Math.round(42 + (score / 160) * 55));
      if (isMultiplayerRequested && isStrictlySingleplayer) {
        matchPercentage = Math.min(30, matchPercentage);
      }
    }

    return {
      ...game,
      score,
      matchPercentage,
      matchedTagsArray: Array.from(matchedTags),
      hasEntityMatch,
      isMultiplayerGame,
      isLocalCoopGame
    };
  }

  let localScored = GAME_DATABASE.map(scoreGame);
  localScored.sort((a, b) => b.score - a.score || b.rating - a.rating);

  const MIN_GOOD_SCORE = 25;
  // If couch/local co-op was requested, strictly require local co-op capabilities
  const goodLocal = localScored.filter(g => g.score >= MIN_GOOD_SCORE && (
    (!isCouchOrLocalRequested || g.isLocalCoopGame) &&
    (!isMultiplayerRequested || g.isMultiplayerGame)
  ));
  const bestLocalScore = goodLocal[0]?.score ?? 0;

  // Entity Guard: Check entity match coverage
  const hasLocalEntityMatch = entities.length === 0 || goodLocal.some(g => g.hasEntityMatch);
  // Co-op Guard: Ensure local DB has at least 4 true couch/local co-op games
  const hasCouchCoverage = !isCouchOrLocalRequested || goodLocal.filter(g => g.isLocalCoopGame).length >= 4;
  const hasMultiplayerCoverage = !isMultiplayerRequested || goodLocal.filter(g => g.isMultiplayerGame).length >= 4;

  let allMatchedResults = [];

  if (goodLocal.length >= 4 && hasLocalEntityMatch && hasCouchCoverage && hasMultiplayerCoverage) {
    // Local DB has plenty of high-quality matching games
    console.log(`[SemanticSearch] Found ${goodLocal.length} good local matches in DB with tag coverage.`);
    allMatchedResults = goodLocal;
  } else {
    // --- Primary fallback: Ask LLM to recommend real games matching the specific intent/co-op mode ---
    console.log(`[SemanticSearch] Local matches insufficient (best=${bestLocalScore}, entity=${hasLocalEntityMatch}, couch=${hasCouchCoverage}), querying LLM for real-world recommendations...`);
    const llmRecs = await generateLLMRecommendations(userPrompt, { ...parsedAttrs, isMultiplayer: isMultiplayerRequested });
    
    if (llmRecs.length >= 3) {
      console.log(`[SemanticSearch] LLM returned ${llmRecs.length} targeted recommendations.`);
      const seen = new Set(llmRecs.map(g => g.title.toLowerCase()));
      const remainingLocal = goodLocal.filter(g => !seen.has(g.title.toLowerCase()));
      allMatchedResults = [...llmRecs, ...remainingLocal];
    } else {
      // --- Secondary fallback: RAWG API ---
      console.log(`[SemanticSearch] LLM fallback thin, querying RAWG API with prompt...`);
      const rawgQuery = entities.length > 0 ? `${entities.join(' ')} ${platformConstraint || ''}`.trim() : userPrompt;
      const rawgGames = await fetchRawgGames(rawgQuery || userPrompt, 12);
      
      if (rawgGames.length >= 2) {
        const rawgScored = rawgGames.map(g => ({ ...g, score: 75, matchPercentage: 88, matchedTagsArray: [...entities, platformConstraint].filter(Boolean) }));
        const seen = new Set(rawgScored.map(g => g.title.toLowerCase()));
        const remainingLocal = goodLocal.filter(g => !seen.has(g.title.toLowerCase()));
        allMatchedResults = [...rawgScored, ...remainingLocal];
      } else {
        console.log(`[SemanticSearch] RAWG empty, trying web search...`);
        const webResults = await searchWebGamesFallback(promptText + ' video game');
        const webScored = webResults.map(g => ({ ...g, score: 50, matchPercentage: 70, matchedTagsArray: searchTokens.slice(0, 2) }));
        const seen = new Set(webScored.map(g => g.title.toLowerCase()));
        const remainingLocal = goodLocal.filter(g => !seen.has(g.title.toLowerCase()));
        allMatchedResults = [...webScored, ...remainingLocal];
      }
      
      if (allMatchedResults.length === 0) {
        console.log('[SemanticSearch] All sources exhausted. Returning top-rated local games.');
        allMatchedResults = (isMultiplayerRequested ? localScored.filter(g => g.isMultiplayerGame) : localScored)
          .slice(0, 24).map(g => ({ ...g, matchPercentage: 45, matchedTagsArray: [] }));
      }
    }
  }

  // Deduplicate all matches by title
  const seenTitles = new Set();
  allMatchedResults = allMatchedResults.filter(g => {
    const key = (g.title || '').toLowerCase().trim();
    if (!key || seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  const totalMatches = allMatchedResults.length;
  const totalPages = Math.max(1, Math.ceil(totalMatches / pageSize));
  const validPage = Math.max(1, Math.min(pageNum, totalPages));

  // Slice ONLY the games for the requested page
  const startIndex = (validPage - 1) * pageSize;
  const pageSlice = allMatchedResults.slice(startIndex, startIndex + pageSize);

  console.log(`[SemanticSearch] Serving Page ${validPage}/${totalPages} (${pageSlice.length} games of ${totalMatches} total). Generating AI rationales on-demand...`);

  // Generate AI rationales ONLY for the current page slice on-demand (using LRU cache)
  const resultsWithRationale = await Promise.all(
    pageSlice.map(async (game) => {
      const rationaleKey = `rationale:${promptText}:${(game.title || '').toLowerCase()}`;
      let rationale = game.rationale;

      if (!rationale) {
        if (rationaleCache.has(rationaleKey)) {
          rationale = rationaleCache.get(rationaleKey);
        } else {
          rationale = await generateRecommendationRationale(
            userPrompt,
            game.title,
            game.genre,
            game.matchedTagsArray?.length > 0 ? game.matchedTagsArray : [genreToken || 'games']
          );
          if (rationale) {
            rationaleCache.set(rationaleKey, rationale);
          }
        }
      }

      return {
        id: game.id || `game_${Math.random().toString(36).substr(2, 9)}`,
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

  const payload = {
    recommendations: resultsWithRationale,
    pagination: {
      currentPage: validPage,
      totalPages,
      totalMatches,
      limit: pageSize,
      hasNext: validPage < totalPages,
      hasPrev: validPage > 1,
      startIndex: startIndex + 1,
      endIndex: Math.min(startIndex + pageSlice.length, totalMatches)
    }
  };

  // Cache the complete page payload for instant future pagination & re-queries
  searchCache.set(cacheKey, payload);

  return payload;
}
