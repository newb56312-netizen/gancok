// ============================================
//   DATA MANAGER - Baca/Tulis data.json
// ============================================

const fs = require('fs-extra');
const path = require('path');
const config = require('./config');

const DATA_PATH = config.DATA_PATH;

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

async function ensureDataFile() {
  try {
    await fs.ensureDir(path.dirname(DATA_PATH));
    const exists = await fs.pathExists(DATA_PATH);
    if (!exists) {
      await fs.writeJson(DATA_PATH, DEFAULT_DATA, { spaces: 2 });
      console.log('✅ data.json dibuat baru di:', DATA_PATH);
    }
  } catch (err) {
    console.error('❌ Gagal inisialisasi data.json:', err.message);
  }
}

async function readData() {
  try {
    await ensureDataFile();
    const data = await fs.readJson(DATA_PATH);
    // Merge with defaults to handle missing keys
    return {
      videos: { ...DEFAULT_DATA.videos, ...data.videos },
      ads: { ...DEFAULT_DATA.ads, ...data.ads }
    };
  } catch (err) {
    console.error('❌ Gagal membaca data:', err.message);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

async function writeData(data) {
  try {
    await fs.writeJson(DATA_PATH, data, { spaces: 2 });
    return true;
  } catch (err) {
    console.error('❌ Gagal menulis data:', err.message);
    return false;
  }
}

async function addVideo(category, videoObj) {
  const data = await readData();
  data.videos[category].unshift(videoObj); // Terbaru di depan
  return await writeData(data);
}

async function deleteVideo(category, videoId) {
  const data = await readData();
  data.videos[category] = data.videos[category].filter(v => v.id !== videoId);
  return await writeData(data);
}

async function setAd(type, code) {
  const data = await readData();
  data.ads[type] = code;
  return await writeData(data);
}

async function getVideos(category) {
  const data = await readData();
  return data.videos[category] || [];
}

async function getAds() {
  const data = await readData();
  return data.ads;
}

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
