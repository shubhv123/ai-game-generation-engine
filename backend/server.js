import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import apiRoutes from './routes/apiRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// Serve static frontend assets in production build if available
const publicPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(publicPath));

// Start Server locally if not running as Vercel serverless function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🎮 AI Game Generation & Discovery Server Running!`);
    console.log(`   API Endpoint : http://localhost:${PORT}/api/recommend`);
    console.log(`   Health Check : http://localhost:${PORT}/health`);
    console.log(`   Ollama Cloud : ${process.env.OLLAMA_BASE_URL || 'https://ollama.com'}`);
    console.log(`==================================================\n`);
  });
}

export default app;
