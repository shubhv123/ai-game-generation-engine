// Infinite Arcade Engine - AI Game Discovery & Search Recommendations Engine

export const GAME_DATABASE = [
  {
    id: "cyberpunk-2077",
    title: "Cyberpunk 2077",
    genre: "Shooter / Sci-Fi RPG",
    tags: ["multiplayer", "shooting", "futuristic", "weapons", "cyberpunk", "open world", "action"],
    platform: "PC, PS5, Xbox Series X",
    description: "An open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour, and body modification.",
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80"
  },
  {
    id: "halo-infinite",
    title: "Halo Infinite",
    genre: "Multiplayer Shooter",
    tags: ["multiplayer", "shooting", "futuristic", "weapons", "sci-fi", "fps", "battle"],
    platform: "PC, Xbox Series X",
    description: "The legendary Master Chief returns with futuristic plasma weapons and high-octane arena multiplayer warfare.",
    rating: 4.7,
    imageUrl: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&q=80"
  },
  {
    id: "doom-eternal",
    title: "Doom Eternal",
    genre: "Fast-Paced FPS Shooter",
    tags: ["shooting", "futuristic", "weapons", "fps", "action", "demons", "gore", "fast"],
    platform: "PC, PS5, Switch",
    description: "Conquer demons across dimensions with high-speed plasma blasters, shoulder-mounted flamethrowers, and heavy weaponry.",
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80"
  },
  {
    id: "portal-2",
    title: "Portal 2",
    genre: "2D / 3D Physics Puzzle",
    tags: ["2d", "3d", "puzzle", "increasing difficulty", "physics", "brain", "sci-fi", "logic"],
    platform: "PC, Switch, Xbox",
    description: "Mind-bending physics puzzle game featuring portal guns, momentum challenges, and escalating mechanical test chambers.",
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80"
  },
  {
    id: "monument-valley",
    title: "Monument Valley",
    genre: "2D Isometric Puzzle",
    tags: ["2d", "puzzle", "increasing difficulty", "relaxing", "geometry", "art", "brain"],
    platform: "Mobile, PC",
    description: "Guide a silent princess through surreal, impossible optical illusion architectural puzzles of increasing difficulty.",
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80"
  },
  {
    id: "baba-is-you",
    title: "Baba Is You",
    genre: "2D Logic Puzzle",
    tags: ["2d", "puzzle", "increasing difficulty", "logic", "indie", "brain", "words"],
    platform: "PC, Switch, Mobile",
    description: "A revolutionary 2D puzzle game where the rules you play by are present as blocks you can interact with.",
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=80"
  },
  {
    id: "mario-kart-8",
    title: "Mario Kart 8 Deluxe",
    genre: "Multiplayer Racing",
    tags: ["racing", "race", "car", "multiplayer", "kart", "drift", "speed", "items"],
    platform: "Nintendo Switch",
    description: "High-speed anti-gravity racing across vibrant tracks with nitro power-ups, shells, and competitive multiplayer.",
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&q=80"
  },
  {
    id: "subway-surfers",
    title: "Subway Surfers",
    genre: "Endless 3D Runner",
    tags: ["runner", "subway", "surfer", "endless", "dodge", "speed", "3d"],
    platform: "Mobile, Web",
    description: "Dash as fast as you can through 3-lane train tracks, dodging oncoming barriers and collecting gold coins.",
    rating: 4.7,
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80"
  },
  {
    id: "chess-com",
    title: "Chess.com / Lichess",
    genre: "Official Strategy Board Game",
    tags: ["chess", "strategy", "board", "puzzle", "tactics", "2d", "3d", "multiplayer"],
    platform: "Web, Mobile, PC",
    description: "Play official chess against players worldwide or master AI bots with strict rule validation, checkmate puzzles, and analysis.",
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&q=80"
  }
];

export class AIGameDiscoveryEngine {
  static searchAndRecommend(userPrompt) {
    const text = (userPrompt || '').toLowerCase().trim();
    if (!text) return GAME_DATABASE.slice(0, 4);

    const tokens = text.split(/\s+/);

    const scored = GAME_DATABASE.map(game => {
      let score = 0;
      game.tags.forEach(tag => {
        if (text.includes(tag)) score += 15;
        tokens.forEach(tok => {
          if (tag.includes(tok) || tok.includes(tag)) score += 8;
        });
      });

      // Extra bonus for genre match
      if (text.includes('shoot') && game.tags.includes('shooting')) score += 20;
      if (text.includes('puzzle') && game.tags.includes('puzzle')) score += 20;
      if (text.includes('race') || text.includes('racing')) score += 20;
      if (text.includes('chess') && game.tags.includes('chess')) score += 30;

      const matchPercent = Math.min(99, Math.max(72, Math.round(70 + score)));

      return {
        ...game,
        score,
        matchPercent
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4);
  }
}
