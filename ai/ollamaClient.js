import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.OLLAMA_BASE_URL || 'https://ollama.com';
const API_KEY = process.env.OLLAMA_API_KEY;

// Primary and fallback models available in Ollama Cloud
const PRIMARY_MODEL = 'gemma4:31b';
const FALLBACK_MODEL = 'nemotron-3-nano:30b';

/**
 * Call Ollama Cloud LLM endpoint using OpenAI compatibility format
 */
export async function callOllamaLLM(messages, options = {}) {
  const model = options.model || PRIMARY_MODEL;
  const temperature = options.temperature ?? 0.3;
  const endpoint = `${BASE_URL}/v1/chat/completions`;

  if (!API_KEY) {
    console.warn('[OllamaClient] Warning: OLLAMA_API_KEY is not set in environment.');
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature,
        max_tokens: options.maxTokens || 3500
      }),
      signal: AbortSignal.timeout(options.timeout || 50000)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[OllamaClient] API HTTP ${res.status} with model ${model}:`, errorText);
      
      // If primary model failed and model wasn't explicitly forced, try fallback model
      if (model === PRIMARY_MODEL) {
        console.log(`[OllamaClient] Retrying with fallback model ${FALLBACK_MODEL}...`);
        return await callOllamaLLM(messages, { ...options, model: FALLBACK_MODEL });
      }
      throw new Error(`Ollama Cloud API error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return {
      success: true,
      model: model,
      content: content
    };
  } catch (err) {
    console.error(`[OllamaClient] Fetch exception for ${model}:`, err.message);
    if (model === PRIMARY_MODEL) {
      console.log(`[OllamaClient] Retrying with fallback model ${FALLBACK_MODEL} after exception...`);
      return await callOllamaLLM(messages, { ...options, model: FALLBACK_MODEL });
    }
    return {
      success: false,
      error: err.message
    };
  }
}
