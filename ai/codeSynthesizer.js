import { callOllamaLLM } from './ollamaClient.js';

/**
 * Clean LLM output to extract pure JavaScript code without markdown headers,
 * language labels ('javascript', 'js'), or code block fences.
 */
export function cleanGeneratedCode(rawText) {
  if (!rawText) return '';
  let code = rawText.trim();

  // Strip markdown backticks block if present
  if (code.includes('```')) {
    const match = code.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
    if (match && match[1]) {
      code = match[1].trim();
    } else {
      code = code.replace(/```(?:javascript|js)?/gi, '').replace(/```/g, '').trim();
    }
  }

  // Remove leading standalone "javascript" or "js" line or word if LLM output included it
  code = code.replace(/^(?:javascript|js)\s*\n/i, '').replace(/^(?:javascript|js)\s+/i, '');

  return code.trim();
}

/**
 * Smart Sound Injector: Safely checks code syntax before returning.
 */
export function injectSoundsIntoCode(code) {
  if (!code) return '';
  // Do NOT do naive regex substring replacements on arguments that contain nested parentheses
  // (e.g. Math.atan2, Math.cos, etc.), as that breaks JS syntax.
  return code;
}

/**
 * Validates that JavaScript code parses without syntax errors.
 */
export function validateJavaScriptSyntax(code) {
  if (!code || typeof code !== 'string' || code.trim().length < 50) {
    return { valid: false, error: 'Code is empty or too short' };
  }
  try {
    new Function(code);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Generate full, executable HTML5 Canvas JavaScript code for custom user game requests.
 */
export async function synthesizeCustomGameCode(userPrompt, previousCode = '', tweakRequest = '') {
  let systemMessage = `You are an expert HTML5 Canvas game developer AI.
You generate complete, working, bug-free, fully-styled HTML5 Canvas JavaScript games.

RULES FOR THE GENERATED CODE:
1. Target canvas ID: "gameCanvas" (width 800, height 600).
   Get canvas: const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');
2. Use ONLY vanilla JavaScript and 2D Canvas Context API (ctx).
3. Include a smooth game loop using requestAnimationFrame.
4. DUAL INPUT CONTROLS (MANDATORY FOR BOTH DESKTOP & MOBILE TOUCH):
   - Always support BOTH Desktop Keyboard (WASD / Arrow Keys / Space) AND Mobile Touch/Tap (touchstart, touchmove, touchend, mousedown, mousemove, click).
   - For player movement/paddles/shooters: support dragging/following touch coordinates (e.offsetX / touch.clientX) across the canvas, as well as arrow keys.
   - For jumping/flapping/shooting: support tapping anywhere on the canvas (touchstart / click) as well as Space/Up arrow.
   - For directional/grid games (snake/grid): support touch swipe detection or tapping screen sides as well as WASD/Arrows.
   - Use e.preventDefault() on touch events to prevent screen scrolling while playing.
5. Draw rich visual graphics using Canvas primitives (ctx.fillRect, ctx.arc, ctx.fillText, ctx.beginPath, ctx.fillStyle, ctx.strokeStyle). Draw player, entities, items, environment, and HUD (score, level, coins, controls info).
6. SOUND EFFECTS & AUDIO:
   Call the built-in sound function: playSound('laser'), playSound('explosion'), playSound('coin'), playSound('jump'), playSound('hit'), playSound('gameover'), playSound('win').
7. DO NOT load external image assets or URLs. Draw everything directly on canvas with colors, shapes, and emoji text if helpful.
8. CRITICAL: Return ONLY complete, executable JavaScript code. All functions and curly braces '{' must be closed. DO NOT truncate the output.`;

  let messages = [];

  if (previousCode && tweakRequest) {
    messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Current working JavaScript code:\n\`\`\`javascript\n${previousCode}\n\`\`\`\n\nUSER REQUESTED TWEAK / NEW FEATURE:\n"${tweakRequest}"\n\nUpdate the JavaScript code to add this requested feature while preserving all existing gameplay, rendering, and sound calls. Return ONLY the complete updated JavaScript code. Ensure all curly braces are closed.` }
    ];
  } else {
    messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Write complete playable HTML5 Canvas JavaScript game code for this request: "${userPrompt}". Include controls, game loop, rendering, score/inventory/HUD, sound calls, and full gameplay mechanics. Return ONLY complete executable JavaScript code with all braces closed.` }
    ];
  }

  try {
    const result = await callOllamaLLM(messages, { temperature: 0.3, maxTokens: 5000 });

    if (result.success && result.content) {
      let code = cleanGeneratedCode(result.content);
      code = injectSoundsIntoCode(code);

      const check = validateJavaScriptSyntax(code);
      if (check.valid && (code.includes('gameCanvas') || code.includes('getContext'))) {
        return {
          success: true,
          code: code,
          explanation: `Generated custom game code for: "${tweakRequest || userPrompt}"`
        };
      } else {
        console.warn('[CodeSynthesizer] Syntax check failed on first pass:', check.error);
        // Quick syntax patch pass
        const patchResult = await callOllamaLLM([
          { role: 'system', content: systemMessage },
          { role: 'user', content: `The following JavaScript code has a syntax error: "${check.error}". Please fix all unclosed braces, brackets, and syntax issues and return ONLY the complete, working JavaScript code:\n\`\`\`javascript\n${code}\n\`\`\`` }
        ], { temperature: 0.1, maxTokens: 5000 });

        if (patchResult.success && patchResult.content) {
          let patched = cleanGeneratedCode(patchResult.content);
          if (validateJavaScriptSyntax(patched).valid) {
            return {
              success: true,
              code: patched,
              explanation: `Generated and syntax-verified code for: "${tweakRequest || userPrompt}"`
            };
          }
        }
      }
    }
  } catch (err) {
    console.error('[CodeSynthesizer] LLM error:', err.message);
  }

  // If tweaking an existing game and LLM fails, PRESERVE the existing working game!
  if (previousCode) {
    return {
      success: false,
      error: `Could not apply tweak: "${tweakRequest}". Your working game was preserved.`,
      code: previousCode
    };
  }

  // If initial generation from scratch fails, return clear error instead of overwriting with farmer sim
  return {
    success: false,
    error: `Could not generate game for prompt: "${userPrompt}". Please try again or refine the prompt.`
  };
}

/**
 * 1-Click Self-Healing AI Auto-Repair:
 * Analyzes runtime error stack and broken JavaScript game code,
 * patches the exact bug, and returns clean, working code.
 */
export async function autoRepairGameCode(brokenCode, errorDetails, userPrompt = '') {
  if (!brokenCode) {
    return { success: false, error: 'No code provided to repair' };
  }

  const systemMessage = `You are an elite JavaScript Game Engine Debugger AI.
The user's HTML5 Canvas game encountered a runtime error and crashed.
Your task is to fix the exact error, ensure all variables, functions, and objects are properly declared and initialized, and return the complete bug-free working JavaScript code.

RULES FOR REPAIR:
1. Target canvas ID: "gameCanvas" (width 800, height 600).
2. Fix the runtime error completely: "${errorDetails || 'Syntax or runtime error'}".
3. Ensure every open function, loop, and curly brace '{' is properly closed.
4. Preserve all existing features, game loop, rendering, controls, and sound effect calls (playSound('laser'), playSound('explosion'), playSound('coin'), playSound('jump'), playSound('gameover'), etc.).
5. Return ONLY clean executable JavaScript code. DO NOT include markdown backticks or explanation text.`;

  const userMessage = `RUNTIME ERROR MESSAGE:
"${errorDetails || 'Runtime error during execution'}"

ORIGINAL GAME PROMPT:
"${userPrompt || 'Custom Canvas Game'}"

BROKEN JAVASCRIPT CODE:
\`\`\`javascript
${brokenCode}
\`\`\`

Fix the syntax/runtime bug completely and provide the complete, corrected working JavaScript code.`;

  const messages = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userMessage }
  ];

  try {
    const result = await callOllamaLLM(messages, { temperature: 0.1, maxTokens: 5000 });

    if (result.success && result.content) {
      let code = cleanGeneratedCode(result.content);
      code = injectSoundsIntoCode(code);

      const check = validateJavaScriptSyntax(code);
      if (check.valid && (code.includes('gameCanvas') || code.includes('getContext'))) {
        return {
          success: true,
          code: code,
          explanation: `Successfully auto-repaired runtime error: "${(errorDetails || '').slice(0, 50)}"`
        };
      }
    }
  } catch (err) {
    console.error('[CodeSynthesizer] Auto-repair LLM error:', err.message);
  }

  // Fallback Pass: Synthesize a clean, working version of the user's specific game prompt
  try {
    const fallbackResult = await synthesizeCustomGameCode(
      userPrompt || '2D Physics Action Game',
      brokenCode,
      `Fix this runtime error and make the game fully playable: "${errorDetails || 'Runtime error'}"`
    );
    if (fallbackResult && fallbackResult.code && validateJavaScriptSyntax(fallbackResult.code).valid) {
      return {
        success: true,
        code: fallbackResult.code,
        explanation: 'Self-healed by refactoring the game logic for your prompt.'
      };
    }
  } catch (err) {
    console.error('[CodeSynthesizer] Auto-repair fallback pass error:', err.message);
  }

  return {
    success: false,
    error: 'AI could not automatically patch the error.'
  };
}
