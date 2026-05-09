// ============================================
//   DATA MANAGER - Telegram Storage
//   Data disimpan di pinned message channel
// ============================================

const config = require('./config');

const BOT_TOKEN = process.env.BOT_TOKEN || config.BOT_TOKEN;
const STORAGE_CHAT_ID = process.env.STORAGE_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const DEFAULT_DATA = {
  videos: { asia: [], lokal: [], barat: [] },
  ads: {
    smart_link: '',
    social_bar: '',
    popunder: '',
    native_banner: '',
    banner_468x60: '',
    banner_160x300: '',
    banner_160x600: '',
    banner_320x50: '',
    banner_300x250: '',
    banner_728x90: ''
  }
};

// ── Helper: Panggil Telegram API ──────────────────────────
async function tg(method, params = {}) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram [${method}]: ${json.description}`);
  return json.result;
}

// ── Helper: Ambil pinned message dari channel ─────────────
async function getPinnedMessage() {
  const chat = await tg('getChat', { chat_id: STORAGE_CHAT_ID });
  return chat.pinned_message || null;
}

// ── ensureDataFile: Pastikan storage siap ────────────────
async function ensureDataFile() {
  try {
    if (!STORAGE_CHAT_ID) {
      console.error('❌ STORAGE_CHAT_ID belum diset di env Railway!');
      return;
    }
    const pinned = await getPinnedMessage();
    if (!pinned) {
      // Belum ada data → buat pesan baru & pin
      const msg = await tg('sendMessage', {
        chat_id: STORAGE_CHAT_ID,
        text: JSON.stringify(DEFAULT_DATA)
      });
      await tg('pinChatMessage', {
        chat_id: STORAGE_CHAT_ID,
        message_id: msg.message_id,
        disable_notification: true
      });
      console.log('✅ Telegram storage dibuat baru (pesan di-pin)');
    } else {
      console.log('✅ Telegram storage ditemukan');
    }
  } catch (err) {
    console.error('❌ Gagal inisialisasi storage:', err.message);
  }
}

// ── readData: Baca dari pinned message ───────────────────
async function readData() {
  try {
    const pinned = await getPinnedMessage();
    if (!pinned || !pinned.text) {
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    const data = JSON.parse(pinned.text);
    // Merge dengan default agar key tidak hilang
    return {
      videos: { ...DEFAULT_DATA.videos, ...data.videos },
      ads: { ...DEFAULT_DATA.ads, ...data.ads }
    };
  } catch (err) {
    console.error('❌ Gagal membaca data:', err.message);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

// ── writeData: Edit pinned message dengan data baru ──────
async function writeData(data) {
  try {
    const pinned = await getPinnedMessage();
    const jsonStr = JSON.stringify(data);

    if (pinned) {
      // Edit pesan yang sudah ada
      await tg('editMessageText', {
        chat_id: STORAGE_CHAT_ID,
        message_id: pinned.message_id,
        text: jsonStr
      });
    } else {
      // Kalau belum ada, buat & pin baru
      const msg = await tg('sendMessage', {
        chat_id: STORAGE_CHAT_ID,
        text: jsonStr
      });
      await tg('pinChatMessage', {
        chat_id: STORAGE_CHAT_ID,
        message_id: msg.message_id,
        disable_notification: true
      });
    }
    return true;
  } catch (err) {
    console.error('❌ Gagal menulis data:', err.message);
    return false;
  }
}

// ── addVideo ──────────────────────────────────────────────
async function addVideo(category, videoObj) {
  const data = await readData();
  data.videos[category].unshift(videoObj); // Terbaru di depan
  return await writeData(data);
}

// ── deleteVideo ───────────────────────────────────────────
async function deleteVideo(category, videoId) {
  const data = await readData();
  data.videos[category] = data.videos[category].filter(v => v.id !== videoId);
  return await writeData(data);
}

// ── setAd ─────────────────────────────────────────────────
async function setAd(type, code) {
  const data = await readData();
  data.ads[type] = code;
  return await writeData(data);
}

// ── getVideos ─────────────────────────────────────────────
async function getVideos(category) {
  const data = await readData();
  return data.videos[category] || [];
}

// ── getAds ────────────────────────────────────────────────
async function getAds() {
  const data = await readData();
  return data.ads;
}

// ── getStats ──────────────────────────────────────────────
async function getStats() {
  const data = await readData();
  return {
    asia: data.videos.asia.length,
    lokal: data.videos.lokal.length,
    barat: data.videos.barat.length,
    total: data.videos.asia.length + data.videos.lokal.length + data.videos.barat.length,
    ads_set: Object.values(data.ads).filter(v => v && v.trim() !== '').length
  };
}

module.exports = {
  ensureDataFile,
  readData,
  writeData,
  addVideo,
  deleteVideo,
  setAd,
  getVideos,
  getAds,
  getStats
};
