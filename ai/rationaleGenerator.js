import { callOllamaLLM } from './ollamaClient.js';

/**
 * Generate a clear, concise rationale for why a specific game was recommended
 */
export async function generateRecommendationRationale(userPrompt, gameTitle, gameGenre, matchedTags) {
  const prompt = `Explain in 1-2 engaging sentences why "${gameTitle}" (${gameGenre}) is a top recommendation for a user asking for: "${userPrompt}". Focus on features like ${matchedTags.join(', ')}. Keep it under 35 words.`;

  const messages = [
    { role: 'system', content: 'You are a concise video game reviewer.' },
    { role: 'user', content: prompt }
  ];

  const result = await callOllamaLLM(messages, { temperature: 0.4, maxTokens: 80 });

  if (result.success && result.content) {
    return result.content.trim().replace(/^"|"$/g, '');
  }

  // Fallback template-based rationale
  return `Recommended because it perfectly delivers on ${matchedTags.slice(0, 3).join(', ')} with high-octane ${gameGenre} gameplay.`;
}
