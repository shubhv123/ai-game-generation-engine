/**
 * RAWG Video Games Database API Client Service
 */

const RAWG_API_KEY = process.env.RAWG_API_KEY || ''; // Optional user/free key

export async function fetchRawgGames(searchQuery, limit = 5) {
  if (!searchQuery) return [];

  // RAWG public search endpoint fallback
  const url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}&page_size=${limit}`;

  try {
    if (!RAWG_API_KEY) {
      console.log('[RAWG Service] No RAWG_API_KEY provided; skipping remote RAWG fetch.');
      return [];
    }

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[RAWG Service] RAWG API responded with status ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map(game => ({
      id: `rawg-${game.id}`,
      title: game.name,
      genre: game.genres?.map(g => g.name).join(' / ') || 'Action',
      tags: [...(game.tags?.slice(0, 6).map(t => t.slug.toLowerCase()) || []), game.name.toLowerCase()],
      platform: game.platforms?.map(p => p.platform.name) || ['PC'],
      description: `Rating: ${game.rating}/5. Released ${game.released || 'N/A'}. Genres: ${game.genres?.map(g => g.name).join(', ')}.`,
      rating: game.rating || 4.5,
      imageUrl: game.background_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80',
      playUrl: `https://rawg.io/games/${game.slug}`,
      source: 'RAWG API'
    }));
  } catch (err) {
    console.error('[RAWG Service] Fetch error:', err.message);
    return [];
  }
}
