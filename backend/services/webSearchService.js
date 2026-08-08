/**
 * Live Web Search Fallback Service
 * Uses DuckDuckGo HTML endpoint to search for video games if local/RAWG API returns few results
 */

export async function searchWebGamesFallback(userQuery) {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(userQuery + ' video game release review')}`;
  
  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      console.warn(`[WebSearchService] DuckDuckGo returned status ${res.status}`);
      return [];
    }

    const htmlText = await res.text();
    const results = [];

    // Extract title & snippets using regex from DDG HTML response
    const linkRegex = /<a class="result__url" href="([^"]+)".*?>\s*(.*?)\s*<\/a>[\s\S]*?<a class="result__snippet".*?>\s*([\s\S]*?)\s*<\/a>/g;
    let match;
    let count = 0;

    while ((match = linkRegex.exec(htmlText)) !== null && count < 3) {
      const rawUrl = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      const snippet = match[3].replace(/<[^>]+>/g, '').trim();

      if (title && snippet) {
        count++;
        results.push({
          id: `web-search-${count}`,
          title: cleanWebTitle(title),
          genre: 'Web Discovery Game',
          tags: ['web search', 'online match', 'game title'],
          platform: ['PC', 'Web', 'Console'],
          description: snippet,
          rating: 4.5,
          imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80',
          playUrl: rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl,
          source: 'Live Web Search'
        });
      }
    }

    return results;
  } catch (err) {
    console.error('[WebSearchService] Search error:', err.message);
    return [];
  }
}

function cleanWebTitle(raw) {
  return raw.replace(/ - Wikipedia| - Steam| - IGN| - YouTube| - Official Site/gi, '').trim();
}
