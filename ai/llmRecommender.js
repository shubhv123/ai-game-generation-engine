import { callOllamaLLM } from './ollamaClient.js';

/**
 * Use the LLM to directly generate a list of real game recommendations
 * for any prompt. This is the primary recommendation engine when the local
 * database doesn't have good matches.
 */
export async function generateLLMRecommendations(userPrompt, parsedAttributes) {
  const systemMessage = `You are a world-class game recommendation expert. 
When the user describes what kind of game they want to play, you ALWAYS recommend real, existing, well-known video games that match their description — whether they are casual mobile games, cozy sims, AAA titles, indie games, browser games, or anything else.

Respond ONLY with a JSON array of exactly 6 game objects. Each object must have these fields:
{
  "title": "Exact game name",
  "genre": "Specific genre",
  "platform": ["PC", "Mobile", "etc"],
  "rating": 4.5,
  "imageUrl": "https://images.unsplash.com/[relevant search term]?w=600&q=80",
  "playUrl": "https://store.steampowered.com or official URL or null",
  "matchPercentage": 92,
  "rationale": "1-sentence explanation of why this game matches the user's request",
  "source": "AI Recommendation"
}

Rules:
- ALWAYS recommend real existing games — never invent fake titles
- matchPercentage should reflect how closely the game matches (60-98%)
- Rank by relevance, most relevant first
- For imageUrl, use Unsplash images: https://images.unsplash.com/photo-[relevant photo id]?w=600&q=80
  Use these Unsplash photo IDs based on genre:
  - Farming/cozy/nature: photo-1416879595882-3373a0480b5b
  - Action/shooter: photo-1542751371-adc38448a05e
  - Racing: photo-1568702846914-96b305d2aaeb
  - Puzzle: photo-1611996575749-79a3a250f948
  - RPG/fantasy: photo-1551103782-8ab07afd45c1
  - Sports: photo-1535131749006-b7f58c99034b
  - Horror/dark: photo-1550745165-9bc0b252726f
  - Space/sci-fi: photo-1538481199705-c710c4e965fc
  - Strategy/chess: photo-1529699211952-734e80c4d42b
  - Casual/mobile: photo-1512941937669-90a1b58e7e9c
  - Adventure/exploration: photo-1518791841217-8f162f1912da
- Respond with ONLY the JSON array, no markdown, no explanation`;

  const messages = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: `User wants: "${userPrompt}"` }
  ];

  try {
    const result = await callOllamaLLM(messages, { temperature: 0.4, maxTokens: 2000 });

    if (result.success && result.content) {
      let cleaned = result.content
        .replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      }

      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Sanitize and normalize each result
        return parsed.map((g, i) => ({
          id: `llm-rec-${i}`,
          title: g.title || 'Unknown Game',
          genre: g.genre || 'Game',
          tags: [],
          platform: Array.isArray(g.platform) ? g.platform : [g.platform || 'PC'],
          description: g.rationale || '',
          rating: parseFloat(g.rating) || 4.5,
          imageUrl: g.imageUrl || 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80',
          playUrl: g.playUrl || null,
          matchPercentage: Math.min(98, Math.max(50, parseInt(g.matchPercentage) || 75)),
          rationale: g.rationale || '',
          source: 'AI Recommendation',
          generatableEquivalent: null
        }));
      }
    }
  } catch (err) {
    console.error('[LLMRecommender] Failed to generate or parse LLM recommendations:', err.message);
  }

  return [];
}
