# ⚔️ Venator Arcade — AI-Powered Game Discovery & Code Generation Engine

**Venator Arcade** is an end-to-end AI platform where users describe any game concept in natural language (e.g., *"a multiplayer shooting game with futuristic weapons"*, *"a cozy farming sim where I plant seeds and water crops"*), and the system responds with two core capabilities:

1. **AI Game Discovery & Semantic Recommendations**: Querying a curated game database, LLM direct inference, live API search, and web fallback matching.
2. **On-the-Spot AI Custom Game Code Synthesis**: Generating complete, playable, bug-free HTML5 Canvas 2D/WebGL 3D JavaScript games live in browser via **Ollama Cloud LLM**, complete with a **Live AI Refinement Chat Console** for real-time iterative code tweaks and an auto-repair system.

---

## 🌟 Key Features

### 1. Multi-Tier Recommendation Engine
- **Tier 1 (Local DB)**: High-speed semantic search over curated video games.
- **Tier 2 (Ollama LLM)**: LLM semantic reasoning for niche or complex queries.
- **Tier 3 (External API)**: Direct external query fallback for broad searches.
- **Tier 4 (Web Search)**: Real-time web discovery for obscure title references.

### 2. Custom AI Game Synthesis & Live Refinement
- **LLM Code Synthesizer (`ai/codeSynthesizer.js`)**: Generates pure, executable HTML5 2D Canvas and 3D WebGL (Three.js) JavaScript code.
- **Automated Code Cleaner**: Strips markdown backticks, standalone headers, and language labels (`javascript`, `js`) to prevent execution breakage inside iframe sandboxes.
- **Live AI Refinement Chat Console**: Send live chat prompts (e.g. *"add cows that give milk when clicked"*, *"make crops grow faster"*) to re-synthesize and refactor game code in real time while playing.
- **Auto-Repair System**: Automatically diagnoses and patches broken generated code.

### 3. Natural Language Intent & Attribute Parsing
- Parses free-text user prompts into structured game metadata (genre, platform, singleplayer/multiplayer, mechanics, difficulty, art style, mood).
- Handles vague prompts gracefully by applying sensible defaults or inferring archetype matches.

### 4. Birch Forest Pixel UI & Diamond Sword Theme
- **Birch Forest Palette**: Birch Canopy Green (`#407a1e`), Sunlit Leaf Green (`#65a30d`), and Birch Trunk White accents extracted from hand-painted artwork.
- **Minecraft Diamond Sword Cursor**: Custom SVG pixel diamond sword pointer cursor active across all UI elements.
- **Typography**: Google Fonts `'Press Start 2P'` (retro block titles) & `'Pixelify Sans'` (body font).

---

## 🛠️ Tech Stack

- **Frontend**: HTML5 Canvas, WebGL (Three.js), CSS3, Vanilla JavaScript, Vite
- **Backend**: Node.js, Express
- **AI/LLM**: Ollama API integration (e.g., `gemma4:31b`, `nemotron-3-nano:30b` as fallback)
- **Deployment**: Vercel ready (via `vercel.json`)

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/)

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory and add your API keys:

```env
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=your_ollama_api_key_here
```

- `OLLAMA_BASE_URL`: Base URL for Ollama Cloud API endpoint.
- `OLLAMA_API_KEY`: API key for accessing Ollama Cloud LLM models.

### 4. Run Locally
Launch both the Vite frontend (Port `5173`) and Express backend (Port `3001`) concurrently:
```bash
npm run dev:all
```

- **Frontend App**: `http://localhost:5173/`
- **Backend Server**: `http://localhost:3001/`

To run just the frontend or backend:
- Frontend: `npm run dev`
- Backend: `npm run dev:backend`

---

## 📁 Project Architecture

```
venator-arcade/
├── .env                       # Environment configuration
├── index.html                 # Main Single Page Application HTML & CSS theme
├── package.json               # Node dependencies & concurrently scripts
├── vercel.json                # Vercel deployment configuration
├── public/
│   └── minecraft-bg.png       # Birch Forest hand-painted background artwork
├── ai/                        # AI & LLM Engine Modules
│   ├── ollamaClient.js        # Ollama Cloud API connector
│   ├── codeSynthesizer.js     # LLM Canvas game code synthesis & code sanitizer
│   ├── attributeParser.js     # Structured attribute extractor from natural language prompts
│   ├── llmRecommender.js      # LLM recommendation reasoning engine
│   ├── rationaleGenerator.js  # Match percentage & rationale text generator
│   └── gameCodeGenerator.js   # Archetype template generator
├── backend/                   # Node.js / Express Backend (Port 3001)
│   ├── server.js              # Server entry point & CORS configuration
│   ├── database/
│   │   └── gameDatabase.js    # Curated games dataset
│   ├── routes/
│   │   └── apiRoutes.js       # REST endpoints
│   └── services/
│       ├── semanticSearch.js  # Multi-tier recommendation orchestrator
│       ├── rawgService.js     # External API service
│       ├── webSearchService.js# Web search fallback service
│       ├── cacheService.js    # In-memory caching
│       └── historyStore.js    # Session history storage service
└── src/                       # Frontend SPA Logic & Game Engines
    ├── main.js                # SPA routing, iframe lifecycle, search & AI chat event handlers
    ├── magicTranslator.js     # Semantic intent classifier for live tweaks
    ├── audio.js               # Retro Web Audio API sound synthesizer
    ├── reel.js                # Arcade reel manager
    └── engine/                # Built-in Game Engines
        ├── ThreeEngine.js     # Three.js 3D WebGL Engine
        ├── Game2D.js          # HTML5 2D Canvas Engine
        ├── GameRunner.js      # Highway Runner 3D
        ├── GameShooter.js     # 3D Shooter Engine
        ├── GameChess.js       # 3D Chess Engine
        ├── GameMaze.js        # 3D Maze Engine
        ├── GamePlatformer.js  # 3D Platformer Engine
        ├── GameRacing.js      # 3D Kart Racer Engine
        ├── curatedGames.js    # Curated standalone 1P games
        ├── curated2PGames.js  # Curated 2P multiplayer games
        └── multiplayerSDK.js  # 2-Player SDK for VS Bot or Local Multiplayer
```

---

## 📡 API Documentation

### 1. Game Recommendations (`POST /api/recommend`)
Retrieves semantic game recommendations based on natural language prompts.
**Request Body**:
```json
{
  "prompt": "cozy farming sim where I can plant seeds and water crops",
  "page": 1,
  "limit": 6
}
```

### 2. Synthesize New Game Configuration (`POST /api/generate`)
Synthesizes a structured game configuration based on prompt attributes.
**Request Body**:
```json
{
  "attributes": { ... },
  "refinementPrompt": "make it retro themed"
}
```

### 3. Custom AI Code Synthesis & Refinement (`POST /api/generate-code`)
Generates or refines playable HTML5 Canvas code.
**Request Body**:
```json
{
  "userPrompt": "farmer life simulator where i plant seeds",
  "previousCode": "...",
  "tweakRequest": "add cows",
  "playerMode": "1P"
}
```

### 4. Auto-Repair Game Code (`POST /api/auto-repair`)
Automatically attempts to fix syntax or runtime errors in generated code.
**Request Body**:
```json
{
  "brokenCode": "...",
  "errorDetails": "Uncaught ReferenceError: canvas is not defined",
  "userPrompt": "farmer life simulator"
}
```

### 5. Session History
- **`GET /api/history`**: Retrieves recent user search & generation sessions.
- **`DELETE /api/history`**: Clears session history store.

### 6. Cache Stats & Scope Info
- **`GET /api/cache-stats`**: Returns real-time LRU cache telemetry metrics.
- **`GET /api/scope-info`**: Returns system scope boundaries (generatable vs. recommendation-only archetypes).

### 7. Health Check (`GET /health` or `GET /api/health`)
Returns API health status.

---

## ☁️ Deployment

This project is configured for seamless deployment on [Vercel](https://vercel.com/) utilizing the provided `vercel.json`.

1. Push your code to GitHub/GitLab.
2. Import the project in Vercel.
3. Configure Environment Variables in Vercel settings (`OLLAMA_BASE_URL`, `OLLAMA_API_KEY`).
4. Deploy! The `vercel.json` will automatically route `/api/*` requests to the Node.js backend service while serving the Vite frontend for all other routes.

---

## 📄 License
MIT License. Built with ❤️ for AI Game Generation.