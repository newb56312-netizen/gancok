// ============================================
//   KUCING OFFICIAL - EXPRESS SERVER
// ============================================

const express = require('express');
const path = require('path');
const config = require('./config');
const db = require('./dataManager');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API: Get videos by category ──────────────────────────
app.get('/api/videos/:category', async (req, res) => {
  const { category } = req.params;
  if (!['asia', 'lokal', 'barat'].includes(category)) {
    return res.status(400).json({ error: 'Kategori tidak valid' });
  }
  const videos = await db.getVideos(category);
  res.json({ videos });
});

// ── API: Get all ad codes ─────────────────────────────────
app.get('/api/ads', async (req, res) => {
  const ads = await db.getAds();
  res.json({ ads });
});

// ── API: Get stats (for bot) ──────────────────────────────
app.get('/api/stats', async (req, res) => {
  const stats = await db.getStats();
  res.json(stats);
});

// ── Serve website ─────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer() {
  const PORT = config.PORT;
  app.listen(PORT, () => {
    console.log(`🌐 Server berjalan di port ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
  });
}

module.exports = { app, startServer };
