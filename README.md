# ⚔️ Venator Arcade — AI-Powered Game Discovery & Code Generation Engine

**Venator Arcade** is an end-to-end AI platform where users describe any game concept in natural language (e.g. *"a multiplayer shooting game with futuristic weapons"*, *"a cozy farming sim where I plant seeds and water crops"*), and the system responds with two core capabilities:
1. **AI Game Discovery & Semantic Recommendations**: Querying a 200+ RAWG game dataset, LLM direct inference, live RAWG API search, and web fallback matching.
2. **On-the-Spot AI Custom Game Code Synthesis**: Generating complete, playable, bug-free HTML5 Canvas 2D JavaScript games live in browser via **Ollama Cloud LLM**, complete with a **Live AI Refinement Chat Console** for real-time iterative code tweaks.

---

## 🛠️ Environment Configuration (`.env`)

The project requires only two environment variables in your `.env` file:

```env
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=your_ollama_api_key
```

- `OLLAMA_BASE_URL`: Base URL for Ollama Cloud API endpoint (`https://ollama.com`).
- `OLLAMA_API_KEY`: API key for accessing Ollama Cloud LLM models (`gemma4:31b` primary, `nemotron-3-nano:30b` fallback).

---

## 🌟 Key Features & Architecture

### 1. Natural Language Intent & Attribute Parsing
- Parses free-text user prompts into structured game metadata (genre, platform, singleplayer/multiplayer, mechanics, difficulty, art style, mood).
- Handles vague prompts gracefully by applying sensible defaults or inferring archetype matches.

### 2. Multi-Tier Recommendation Engine
- **Tier 1 (Local RAWG Dataset)**: High-speed semantic search over 200+ curated video games.
- **Tier 2 (Ollama Cloud Direct Match)**: LLM semantic reasoning for niche or complex queries.
- **Tier 3 (RAWG Live API)**: Direct external query fallback.
- **Tier 4 (DuckDuckGo Web Search)**: Real-time web discovery for obscure title references.

### 3. Custom AI Game Synthesis & Live Refinement
- **LLM Code Synthesizer (`ai/codeSynthesizer.js`)**: Generates pure, executable HTML5 2D Canvas JavaScript code.
- **Automated Code Cleaner (`cleanGeneratedCode`)**: Strips markdown backticks, standalone headers, and language labels (`javascript`, `js`) to prevent execution breakage inside iframe sandboxes.
- **Live AI Refinement Chat Console**: Send live chat prompts (e.g. *"add cows that give milk when clicked"*, *"make crops grow faster"*) to re-synthesize and refactor game code in real time while playing.

### 4. Birch Forest Pixel UI & Diamond Sword Theme
- **Birch Forest Palette**: Birch Canopy Green (`#407a1e`), Sunlit Leaf Green (`#65a30d`), and Birch Trunk White accents extracted from hand-painted artwork.
- **Minecraft Diamond Sword Cursor**: Custom SVG pixel diamond sword pointer cursor active across all UI elements.
- **Typography**: Google Fonts `'Press Start 2P'` (retro block titles) & `'Pixelify Sans'` (body font).
- **Immersive Launcher Hero**: Modern game launcher layout with top project metrics, bold titles, moss-green `[ ▶ START GAME ]` CTA, and CRT scanlines.

---

## 📁 Repository Directory Structure

```
ai-game-generation-engine/
├── .env                       # Environment configuration (OLLAMA_BASE_URL & OLLAMA_API_KEY)
├── index.html                 # Main Single Page Application HTML & Birch Forest CSS theme
├── package.json               # Node dependencies & concurrently scripts
├── public/
│   └── minecraft-bg.png       # Birch Forest hand-painted background artwork
├── ai/                        # AI & LLM Engine Modules
│   ├── ollamaClient.js        # Ollama Cloud API connector (gemma4:31b & nemotron-3-nano:30b)
│   ├── codeSynthesizer.js     # LLM Canvas game code synthesis & code sanitizer
│   ├── attributeParser.js     # Structured attribute extractor from natural language prompts
│   ├── llmRecommender.js      # LLM recommendation reasoning engine
│   ├── rationaleGenerator.js  # Match percentage & rationale text generator
│   └── gameCodeGenerator.js   # Archetype template generator
├── backend/                   # Node.js / Express Backend (Port 3001)
│   ├── server.js              # Server entry point & CORS configuration
│   ├── database/
│   │   └── gameDatabase.js    # 200+ RAWG video games dataset export
│   ├── routes/
│   │   └── apiRoutes.js       # REST endpoints (/api/recommend, /api/generate-code, /api/history)
│   └── services/
│       ├── semanticSearch.js  # Multi-tier recommendation orchestrator
│       ├── rawgService.js     # External RAWG API service
│       ├── webSearchService.js# Web search fallback service
│       └── historyStore.js    # Session history storage service
└── src/                       # Frontend SPA Logic & Game Engines
    ├── main.js                # SPA routing, iframe lifecycle, search & AI chat event handlers
    ├── magicTranslator.js     # Semantic intent classifier for live tweaks
    ├── audio.js               # Retro Web Audio API sound synthesizer
    └── engine/                # Built-in Game Engines
        ├── ThreeEngine.js     # Three.js 3D WebGL Engine
        ├── Game2D.js          # HTML5 2D Canvas Engine
        ├── GameRunner.js      # Highway Runner 3D
        ├── GameShooter.js     # 3D Shooter Engine
        ├── GameChess.js       # 3D Chess Engine
        ├── GameMaze.js        # 3D Maze Engine
        ├── GamePlatformer.js  # 3D Platformer Engine
        └── GameRacing.js      # 3D Kart Racer Engine
```

---

## 📡 REST API Specifications

### 1. Game Recommendations (`POST /api/recommend`)
**Request Body**:
```json
{
  "prompt": "cozy farming sim where I can plant seeds and water crops"
}
```
**Response**:
```json
{
  "success": true,
  "recommendations": [
    {
      "title": "Stardew Valley",
      "genre": "Simulation / RPG",
      "platform": ["PC", "Switch", "Mobile"],
      "matchPercentage": 98,
      "rationale": "Perfect match for cozy farming, planting seeds, and crop management."
    }
  ],
  "isGeneratable": true,
  "archetype": "CUSTOM_AI"
}
```

### 2. Custom AI Code Synthesis & Refinement (`POST /api/generate-code`)
**Request Body**:
```json
{
  "userPrompt": "farmer life simulator where i plant seeds, plants grow and we reach next levels",
  "previousCode": "",
  "tweakRequest": ""
}
```
**Response**:
```json
{
  "success": true,
  "code": "const canvas = document.getElementById('gameCanvas');\nconst ctx = canvas.getContext('2d');...",
  "explanation": "Generated custom game code for: farmer life simulator..."
}
```

### 3. Session History (`GET /api/history` | `DELETE /api/history`)
- `GET`: Retrieves up to 20 recent user search & generation sessions.
- `DELETE`: Clears session history store.

### 4. Health Check (`GET /health`)
- `GET`: Returns `{ "status": "online", "timestamp": "..." }`.

---

## 🚀 Quick Start & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Ensure `.env` exists in the root folder with:
```env
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=your_ollama_api_key_here
```

### 3. Run Platform
Launch both Vite frontend (Port `5173`) and Express backend (Port `3001`) concurrently:
```bash
npm run dev:all
```

- **Frontend App**: `http://localhost:5173/`
- **Backend Server**: `http://localhost:3001/`

---

## 📄 License
MIT License. Built with ❤️ for AI Game Generation.