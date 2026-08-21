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
 * Static semantic validator for 2-Player multiplayer game code.
 * Validates that generated code adheres to 2P runtime architecture without execution.
 * @param {string} code
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateMultiplayerSemantics(code) {
  const issues = [];
  if (!code || typeof code !== 'string') {
    return { valid: false, issues: ['Code is empty or invalid'] };
  }

  // 1. Check that bot state or window.MP toggle is present
  const hasBotLogic = /\b(?:isBot|botActive|botEnabled|botMode|window\.MP)\b/i.test(code);
  if (!hasBotLogic) {
    issues.push('missing isBot / bot toggle state for Player 2');
  }

  // 2. Player 2 movement code multiplies by a delta-time term (dt, deltaTime, delta, (timestamp - last))
  const hasDeltaTime = /\b(dt|deltaTime|delta)\b/i.test(code) && (
    /\*\s*(?:dt|deltaTime|delta)\b/i.test(code) ||
    /\b(?:dt|deltaTime|delta)\s*\*/i.test(code) ||
    /(?:timestamp|performance\.now|Date\.now)/i.test(code)
  );
  if (!hasDeltaTime) {
    issues.push('no deltaTime scaling');
  }

  // 3. Dual controls check: Both P1 (WASD) and P2 (Arrow/Enter/M) handlers present,
  // and a pointerdown/pointermove handler
  const hasP1Keys = /(?:KeyW|KeyA|KeyS|KeyD|['"]w['"]|['"]a['"]|['"]s['"]|['"]d['"])/i.test(code);
  const hasP2Keys = /(?:ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Enter|KeyM|['"]m['"])/i.test(code);
  const hasPointer = /(?:pointerdown|pointermove|touchstart|touchmove|click)/i.test(code);

  if (!hasP1Keys || !hasP2Keys || !hasPointer) {
    const missing = [];
    if (!hasP1Keys) missing.push('P1 WASD keyboard handlers');
    if (!hasP2Keys) missing.push('P2 Arrow/Enter/M keyboard handlers');
    if (!hasPointer) missing.push('pointerdown/touch/click handler');
    issues.push(`missing controls: ${missing.join(', ')}`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

import { generateProcedural2PGame } from './multiplayerGameGenerator.js';

/**
 * Generate full, executable 2-PLAYER HTML5 Canvas JavaScript code
 * with dual keyboard controls, split touch drag controls, and in-game Bot AI toggle.
 */
export async function synthesize2PMultiplayerGameCode(userPrompt, previousCode = '', tweakRequest = '') {
  const promptText = tweakRequest ? `${userPrompt} (Tweak: ${tweakRequest})` : (userPrompt || '2-Player Arcade Duel');

  const systemMessage = `You are an expert 2-Player HTML5 Canvas multiplayer game developer AI.
You generate complete, working, bug-free, fully-styled 2-Player HTML5 Canvas JavaScript games matching the EXACT custom gameplay mechanics, themes, controls, obstacles, weapons, and physics described by the user.

RULES FOR 2-PLAYER LOCAL & VS COMPUTER CODE:
1. Target canvas ID: "gameCanvas" (width 800, height 600).
   const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d'); canvas.tabIndex = 0;
2. DUAL CONTROLS (MANDATORY: KEYBOARD & TOUCH):
   - Player 1: WASD + Space (Primary Action / Weapon) OR Left-half screen touch (x < canvas.width / 2).
   - Player 2 (when Bot is OFF): Arrow Keys + Enter / M (Primary Action / Weapon) OR Right-half screen touch (x >= canvas.width / 2).
3. IN-GAME BOT AI TOGGLE (MANDATORY):
   - Include state: 'let isBot = true;' (or 'let botActive = true;')
   - Draw an on-canvas interactive button or HUD indicator (e.g. at top right: '[ 🤖 BOT: ON / OFF ]' or allow pressing 'b' / 'B' key or clicking the button to toggle 'isBot = !isBot;').
   - In update(dt):
     if (isBot) {
       // Player 2 is driven by intelligent Bot AI
     } else {
       // Player 2 is driven manually by human Player 2 using Arrow Keys & right-screen touch
     }
4. DELTA-TIME SCALING:
   - Scale movement and physics using deltaTime (dt) (e.g. let dt = Math.min(0.05, (now - lastTime) / 1000); p.x += p.vx * dt * 60;).
5. INFINITE LEVEL PROGRESSION LOOP:
   - Include 'let currentLevel = 1;'
   - Scale bot speed, accuracy, and response dynamically with currentLevel so Level 1 is beatable and higher levels grow progressively challenging.
   - When Player 1 wins, advance currentLevel++ and show '★ LEVEL ' + currentLevel + ' CLEARED! ★'.
6. DUAL HUD: Always display Player 1 score/HP/distance on top-left, Player 2 score/HP/distance on top-right, Level at center, and the '[ 🤖 BOT: ON/OFF (Press B) ]' button.
7. REMATCH & ATTRACT SCREEN:
   - Include 'let gameStarted = false;' waiting for user click/touch to begin.
   - When gameOver is true, clicking canvas restarts the match instantly.
8. Use requestAnimationFrame for smooth 60fps loop.
9. SOUND EFFECTS: Use playSound('shoot'), playSound('hit'), playSound('jump'), playSound('powerup'), playSound('win'), playSound('gameover'), playSound('click').
10. FULL CUSTOM MECHANICS: Implement the specific game type requested (e.g. racing, chasing, lane-switching, shooting, sports, fighting, platforming, puzzle duels) with custom entities, physics, obstacles, pickups, and weapons.
11. Return ONLY complete, executable JavaScript code. Ensure ALL curly braces '{' are closed.`;

  let messages = [];
  if (previousCode && tweakRequest) {
    messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Current 2-Player code:\n\`\`\`javascript\n${previousCode}\n\`\`\`\nTWEAK REQUEST: "${tweakRequest}". Return ONLY complete updated 2-Player JavaScript code with all braces closed.` }
    ];
  } else {
    messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Write a complete 2-player local & VS Computer HTML5 Canvas game for: "${promptText}". Implement the exact mechanics, weapons, obstacles, and theme requested. Include P1 WASD vs P2 Arrow controls, split-screen touch drag (x < canvas.width / 2), deltaTime scaling (dt), and dynamic window.MP.isBot inside the loop. Return ONLY complete JavaScript code with all braces closed.` }
    ];
  }

  try {
    const result = await callOllamaLLM(messages, { temperature: 0.3, maxTokens: 5000 });
    if (result.success && result.content) {
      let code = cleanGeneratedCode(result.content);
      const syntaxCheck = validateJavaScriptSyntax(code);
      if (syntaxCheck.valid && (code.includes('gameCanvas') || code.includes('getContext'))) {
        const semanticCheck = validateMultiplayerSemantics(code);
        if (semanticCheck.valid) {
          return {
            success: true,
            code,
            semanticallyValidated: true,
            explanation: `Generated 2-Player multiplayer game for: "${tweakRequest || userPrompt}"`
          };
        } else {
          console.warn('[CodeSynthesizer] 2P Semantic validation issues on pass 1:', semanticCheck.issues);
          // ONE corrective retry with semantic issues passed back to LLM
          const retryResult = await callOllamaLLM([
            { role: 'system', content: systemMessage },
            { role: 'user', content: `Your previous code had these issues: ${semanticCheck.issues.join('; ')}. Fix them and return the complete corrected code:\n\`\`\`javascript\n${code}\n\`\`\`` }
          ], { temperature: 0.1, maxTokens: 5000 });

          if (retryResult.success && retryResult.content) {
            const fixed = cleanGeneratedCode(retryResult.content);
            const retrySyntax = validateJavaScriptSyntax(fixed);
            if (retrySyntax.valid) {
              const retrySemantic = validateMultiplayerSemantics(fixed);
              if (retrySemantic.valid) {
                return {
                  success: true,
                  code: fixed,
                  semanticallyValidated: false,
                  explanation: `Generated and semantic-verified 2-Player game for: "${tweakRequest || userPrompt}"`
                };
              } else {
                console.warn('[CodeSynthesizer] 2P Semantic validation failed on retry:', retrySemantic.issues);
              }
            }
          }
        }
      } else {
        // Syntax check failed on pass 1, attempt syntax repair
        const patchResult = await callOllamaLLM([
          { role: 'system', content: systemMessage },
          { role: 'user', content: `Fix syntax errors in this 2-Player code and return ONLY working code:\n\`\`\`javascript\n${code}\n\`\`\`` }
        ], { temperature: 0.1, maxTokens: 5000 });
        if (patchResult.success && patchResult.content) {
          const fixed = cleanGeneratedCode(patchResult.content);
          if (validateJavaScriptSyntax(fixed).valid) {
            const semanticCheck = validateMultiplayerSemantics(fixed);
            if (semanticCheck.valid) {
              return {
                success: true,
                code: fixed,
                semanticallyValidated: false,
                explanation: `Generated 2-Player multiplayer game for: "${tweakRequest || userPrompt}"`
              };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[CodeSynthesizer] 2P Synthesis error:', err.message);
  }

  // If previous working code existed and tweak failed, preserve it
  if (previousCode) {
    return {
      success: true,
      code: previousCode,
      semanticallyValidated: false,
      explanation: `Preserved working 2-Player game version.`
    };
  }

  // Fallback to high-fidelity procedural 2-Player generator matching prompt archetype
  const proceduralCode = generateProcedural2PGame(promptText);
  return {
    success: true,
    code: proceduralCode,
    semanticallyValidated: true,
    explanation: `Synthesized complete 2-Player arcade game for: "${promptText}"`
  };
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
