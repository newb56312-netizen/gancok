// ============================================
//   KUCING OFFICIAL - KONFIGURASI UTAMA
// ============================================

module.exports = {
  // Token bot dari @BotFather
  BOT_TOKEN: '8720885324:AAElR-QXZcfn07cTSIUcJ-m3tv515o_ELjM',

  // ID Telegram admin (cek via @userinfobot)
  ADMIN_ID: 8599403759,

  // ID atau username channel telegram untuk notifikasi video baru
  // Contoh: '@kucing_official_channel' atau '-100xxxxxxxxxx'
  CHANNEL_ID: '@saluranblue',

  // URL website kamu di Railway (ganti setelah deploy)
  WEB_URL: 'https://web-production-ca8da.up.railway.app',

  // Foto thumbnail bot
  BOT_PHOTO: 'https://files.catbox.moe/m16o6m.jpg',

  // Path data storage (Railway Volume di-mount di /app/data)
  DATA_PATH: process.env.DATA_PATH || '/app/data/data.json',

  // Port server
  PORT: process.env.PORT || 3000
};
