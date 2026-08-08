# ⚔️ Venator Arcade — AI-Powered Game Discovery & Generation Platform

**Venator Arcade** is an AI platform where users describe any game idea in natural language (e.g. *"a cozy farming sim where I plant seeds and water crops"*) and the platform delivers two key features:
1. **AI Game Discovery & Recommendations**: Intelligent semantic matching across a 200+ RAWG game dataset and live web search.
2. **Live AI Custom Game Code Synthesis**: Generates full, executable HTML5 Canvas 2D JavaScript games on the spot via **Ollama Cloud LLM**, complete with a **Live AI Refinement Chat Console** to update game mechanics live while playing!

---

## 🌟 Core Features

- **🎮 Natural Language Game Discovery**: Parses free-text prompts to extract genre, platform, difficulty, mood, and gameplay mechanics.
- **⚡ Custom AI Code Synthesis**: Uses Ollama Cloud (`gemma4:31b` primary, `nemotron-3-nano:30b` fallback) to synthesize working HTML5 Canvas game code dynamically.
- **💬 Live AI Code Refinement Chat**: Iteratively tweak game rules in real time (e.g. *"add cows that give milk"*, *"make day/night cycle"*) and re-synthesize code directly inside the running iframe sandbox.
- **🌲 Birch Forest Pixel Theme**: Birch Canopy Green palette (`#407a1e`), Press Start 2P & Pixelify Sans typography, custom **Minecraft Diamond Sword Cursor**, and an immersive game launcher hero.
- **🕹️ Built-in Archetype Game Engines**: Pre-built 2D and 3D WebGL game templates (Space Shooter, Brick Breaker, Neon Snake, Pacman, Tank Combat, 2D Runner, Highway Runner 3D, Chess 3D, Kart Racer).

---

## 🛠️ Technology Stack

- **Frontend**: Vite SPA, HTML5 2D Canvas API, Three.js (WebGL 3D Engine), Custom Sandboxed Iframe.
- **Backend**: Node.js, Express.js REST API (Port `3001`).
- **AI Engine**: Ollama Cloud API (`https://ollama.com`), Google Gemini / Nemotron models.
- **Dataset**: Kaggle RAWG Video Games Dataset (200 top-rated titles).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3001
OLLAMA_API_KEY=your_ollama_cloud_api_key
RAWG_API_KEY=your_optional_rawg_api_key
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Application
Run both the Vite frontend and Express backend concurrently:
```bash
npm run dev:all
```

- **Frontend App**: `http://localhost:5173/`
- **Backend API**: `http://localhost:3001/`

---

## 📡 API Endpoints Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/recommend` | `POST` | Semantic search & game recommendations for free-text prompt |
| `/api/generate-code` | `POST` | Synthesizes custom 2D Canvas JS game code & handles live tweaks |
| `/api/history` | `GET` / `DELETE` | Retrieves or clears user search and game synthesis session history |
| `/health` | `GET` | Server health check status |

---

## 📄 License
MIT License. Built with ❤️ for AI Game Generation.