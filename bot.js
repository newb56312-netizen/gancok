// ============================================
//   KUCING OFFICIAL - TELEGRAM BOT
// ============================================

const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const db = require('./dataManager');

const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// ── State management per user ─────────────────────────────
// { userId: { state, data, lastMsgIds: [] } }
const userStates = {};

const STATES = {
  IDLE: 'idle',
  WAITING_VIDEY_LINK: 'waiting_videy_link',
  WAITING_THUMBNAIL: 'waiting_thumbnail',
  WAITING_TITLE: 'waiting_title',
  WAITING_AD_CODE: 'waiting_ad_code'
};

const AD_LABELS = {
  smart_link: '🔗 Tautan Pintar (Smart Link)',
  social_bar: '📊 Bar Sosial (Social Bar)',
  popunder: '🪟 Popunder',
  native_banner: '🖼️ Spanduk Asli (Native Banner)',
  banner_468x60: '📐 Spanduk 468x60',
  banner_160x300: '📐 Spanduk 160x300',
  banner_160x600: '📐 Spanduk 160x600',
  banner_320x50: '📐 Spanduk 320x50',
  banner_300x250: '📐 Spanduk 300x250',
  banner_728x90: '📐 Spanduk 728x90'
};

// ── Helper: delete all tracked messages for user ──────────
async function clearMessages(chatId, userId) {
  const state = userStates[userId];
  if (!state || !state.lastMsgIds) return;
  for (const msgId of state.lastMsgIds) {
    await bot.deleteMessage(chatId, msgId).catch(() => {});
  }
  state.lastMsgIds = [];
}

// ── Helper: track sent message ────────────────────────────
function trackMsg(userId, msgId) {
  if (!userStates[userId]) userStates[userId] = { state: STATES.IDLE, data: {}, lastMsgIds: [] };
  userStates[userId].lastMsgIds = userStates[userId].lastMsgIds || [];
  userStates[userId].lastMsgIds.push(msgId);
}

// ── Helper: ensure user state exists ─────────────────────
function ensureState(userId) {
  if (!userStates[userId]) {
    userStates[userId] = { state: STATES.IDLE, data: {}, lastMsgIds: [] };
  }
}

// ── Helper: is admin ──────────────────────────────────────
function isAdmin(userId) {
  return parseInt(userId) === parseInt(config.ADMIN_ID);
}

// ── MAIN MENU ─────────────────────────────────────────────
async function showMainMenu(chatId, userId, editMsgId = null) {
  await clearMessages(chatId, userId);

  const stats = await db.getStats();
  const caption =
    `✨ *KUCING OFFICIAL BOT* ✨\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 ID Admin: \`${userId}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 *Statistik Video:*\n` +
    `  🌏 Asia  : ${stats.asia} video\n` +
    `  🏠 Lokal : ${stats.lokal} video\n` +
    `  🌎 Barat : ${stats.barat} video\n` +
    `  📦 Total : ${stats.total} video\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 Iklan Aktif: ${stats.ads_set}/10\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Pilih menu di bawah ini:_`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '➕ Tambah Video', callback_data: 'add_video' },
        { text: '🗑️ Hapus Video', callback_data: 'delete_video_menu' }
      ],
      [
        { text: '🎯 Kelola Iklan', callback_data: 'manage_ads' },
        { text: '📊 Statistik', callback_data: 'stats' }
      ],
      [
        { text: '🔗 Buka Website', url: config.WEB_URL }
      ]
    ]
  };

  const sent = await bot.sendPhoto(chatId, config.BOT_PHOTO, {
    caption,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
  trackMsg(userId, sent.message_id);
  ensureState(userId);
  userStates[userId].state = STATES.IDLE;
  userStates[userId].data = {};
}

// ── NON-ADMIN RESPONSE ────────────────────────────────────
async function showNonAdminMenu(chatId, userId) {
  await clearMessages(chatId, userId);
  const sent = await bot.sendPhoto(chatId, config.BOT_PHOTO, {
    caption:
      `🎬 *KUCING OFFICIAL*\n\n` +
      `Hai! 👋 Selamat datang.\n\n` +
      `🔗 Kunjungi website kami:\n${config.WEB_URL}\n\n` +
      `_Website video premium pilihan terbaik!_`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '🌐 Kunjungi Website', url: config.WEB_URL }
      ]]
    }
  });
  trackMsg(userId, sent.message_id);
}

// ── ADD VIDEO: Pilih kategori ─────────────────────────────
async function showAddVideoCategory(chatId, userId) {
  await clearMessages(chatId, userId);
  const sent = await bot.sendMessage(chatId,
    `➕ *TAMBAH VIDEO BARU*\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `📁 Pilih kategori video:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌏 Asia', callback_data: 'cat_asia' },
            { text: '🏠 Lokal', callback_data: 'cat_lokal' },
            { text: '🌎 Barat', callback_data: 'cat_barat' }
          ],
          [{ text: '⬅️ Kembali', callback_data: 'menu' }]
        ]
      }
    }
  );
  trackMsg(userId, sent.message_id);
  userStates[userId].state = STATES.IDLE;
}

// ── ADD VIDEO: Minta link Videy ───────────────────────────
async function askVideyLink(chatId, userId, category) {
  await clearMessages(chatId, userId);
  userStates[userId].state = STATES.WAITING_VIDEY_LINK;
  userStates[userId].data.category = category;

  const catEmoji = { asia: '🌏', lokal: '🏠', barat: '🌎' };
  const sent = await bot.sendMessage(chatId,
    `${catEmoji[category]} *Kategori: ${category.toUpperCase()}*\n` +
    `━━━━━━━━━━━━━━━━\n\n` +
    `🔗 *Langkah 1/3*\n` +
    `Kirim link video dari Videy:\n\n` +
    `_Contoh: https://videy.co/v?id=xxxxxxxx_`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '❌ Batal', callback_data: 'menu' }]]
      }
    }
  );
  trackMsg(userId, sent.message_id);
}

// ── ADD VIDEO: Minta thumbnail ────────────────────────────
async function askThumbnail(chatId, userId) {
  await clearMessages(chatId, userId);
  userStates[userId].state = STATES.WAITING_THUMBNAIL;
  const sent = await bot.sendMessage(chatId,
    `🖼️ *Langkah 2/3*\n` +
    `━━━━━━━━━━━━━━━━\n\n` +
    `Kirim link thumbnail dari Catbox:\n\n` +
    `_Contoh: https://files.catbox.moe/xxxxxx.jpg_\n\n` +
    `💡 Upload gambar dulu ke catbox.moe`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '❌ Batal', callback_data: 'menu' }]]
      }
    }
  );
  trackMsg(userId, sent.message_id);
}

// ── ADD VIDEO: Minta judul ────────────────────────────────
async function askTitle(chatId, userId) {
  await clearMessages(chatId, userId);
  userStates[userId].state = STATES.WAITING_TITLE;
  const sent = await bot.sendMessage(chatId,
    `✏️ *Langkah 3/3*\n` +
    `━━━━━━━━━━━━━━━━\n\n` +
    `Kirim *judul video*:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '❌ Batal', callback_data: 'menu' }]]
      }
    }
  );
  trackMsg(userId, sent.message_id);
}

// ── ADD VIDEO: Simpan & announce ──────────────────────────
async function saveVideo(chatId, userId) {
  const { category, videyLink, thumbnail, title } = userStates[userId].data;
  const videoId = uuidv4().split('-')[0];

  const videoObj = {
    id: videoId,
    title,
    thumbnail,
    videy_url: videyLink,
    category,
    date: new Date().toISOString()
  };

  const ok = await db.addVideo(category, videoObj);
  await clearMessages(chatId, userId);

  if (!ok) {
    const sent = await bot.sendMessage(chatId, '❌ Gagal menyimpan video. Coba lagi.', {
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Menu', callback_data: 'menu' }]] }
    });
    trackMsg(userId, sent.message_id);
    return;
  }

  const catEmoji = { asia: '🌏', lokal: '🏠', barat: '🌎' };
  const videoUrl = `${config.WEB_URL}?cat=${category}`;

  // Kirim konfirmasi ke admin
  const sent = await bot.sendPhoto(chatId, thumbnail, {
    caption:
      `✅ *VIDEO BERHASIL DITAMBAHKAN!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${catEmoji[category]} Kategori : ${category.toUpperCase()}\n` +
      `🎬 Judul     : ${title}\n` +
      `🔗 Videy     : ${videyLink}\n` +
      `🆔 ID        : \`${videoId}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Menu Utama', callback_data: 'menu' }]
      ]
    }
  }).catch(async () => {
    // Jika thumbnail gagal load, kirim tanpa foto
    return await bot.sendMessage(chatId,
      `✅ *VIDEO BERHASIL DITAMBAHKAN!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${catEmoji[category]} Kategori : ${category.toUpperCase()}\n` +
      `🎬 Judul     : ${title}\n` +
      `🔗 Videy     : ${videyLink}\n` +
      `🆔 ID        : \`${videoId}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '⬅️ Menu Utama', callback_data: 'menu' }]]
        }
      }
    );
  });
  trackMsg(userId, sent.message_id);

  // Kirim notifikasi ke channel
  if (config.CHANNEL_ID && config.CHANNEL_ID !== '@nama_channel_kamu') {
    await bot.sendPhoto(config.CHANNEL_ID, thumbnail, {
      caption:
        `🎬 *VIDEO BARU TERSEDIA!*\n\n` +
        `${catEmoji[category]} *Kategori:* ${category.toUpperCase()}\n` +
        `🎞️ *Judul:* ${title}\n\n` +
        `👆 Tonton sekarang di:\n${videoUrl}`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '▶️ Tonton Sekarang', url: videoUrl }]]
      }
    }).catch(() => {});
  }

  userStates[userId].state = STATES.IDLE;
  userStates[userId].data = {};
}

// ── DELETE VIDEO: Menu pilih kategori ─────────────────────
async function showDeleteMenu(chatId, userId) {
  await clearMessages(chatId, userId);
  const sent = await bot.sendMessage(chatId,
    `🗑️ *HAPUS VIDEO*\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `Pilih kategori:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌏 Asia', callback_data: 'del_cat_asia' },
            { text: '🏠 Lokal', callback_data: 'del_cat_lokal' },
            { text: '🌎 Barat', callback_data: 'del_cat_barat' }
          ],
          [{ text: '⬅️ Kembali', callback_data: 'menu' }]
        ]
      }
    }
  );
  trackMsg(userId, sent.message_id);
}

// ── DELETE VIDEO: Tampilkan list video ────────────────────
async function showVideoList(chatId, userId, category) {
  await clearMessages(chatId, userId);
  const videos = await db.getVideos(category);

  if (videos.length === 0) {
    const sent = await bot.sendMessage(chatId,
      `📭 Tidak ada video di kategori *${category.toUpperCase()}*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '⬅️ Kembali', callback_data: 'delete_video_menu' }]]
        }
      }
    );
    trackMsg(userId, sent.message_id);
    return;
  }

  // Tampilkan max 10 video
  const shown = videos.slice(0, 10);
  const buttons = shown.map(v => ([{
    text: `🎬 ${v.title.substring(0, 30)}`,
    callback_data: `del_video_${category}_${v.id}`
  }]));
  buttons.push([{ text: '⬅️ Kembali', callback_data: 'delete_video_menu' }]);

  const sent = await bot.sendMessage(chatId,
    `🗑️ *Hapus Video - ${category.toUpperCase()}*\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `Pilih video yang ingin dihapus:`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    }
  );
  trackMsg(userId, sent.message_id);
}

// ── MANAGE ADS ────────────────────────────────────────────
async function showManageAds(chatId, userId) {
  await clearMessages(chatId, userId);
  const ads = await db.getAds();

  const buttons = Object.entries(AD_LABELS).map(([key, label]) => {
    const isSet = ads[key] && ads[key].trim() !== '';
    return [{ text: `${isSet ? '✅' : '⬜'} ${label}`, callback_data: `set_ad_${key}` }];
  });
  buttons.push([{ text: '⬅️ Kembali', callback_data: 'menu' }]);

  const sent = await bot.sendMessage(chatId,
    `🎯 *KELOLA IKLAN ADSTERRA*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ = Sudah diset | ⬜ = Belum diset\n\n` +
    `Pilih jenis iklan untuk mengatur kode:`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    }
  );
  trackMsg(userId, sent.message_id);
}

// ── SET AD TOKEN ──────────────────────────────────────────
async function askAdCode(chatId, userId, adType) {
  await clearMessages(chatId, userId);
  userStates[userId].state = STATES.WAITING_AD_CODE;
  userStates[userId].data.adType = adType;

  const sent = await bot.sendMessage(chatId,
    `🎯 *${AD_LABELS[adType]}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Kirim kode iklan (script HTML) dari Adsterra:\n\n` +
    `_Salin kode dari dashboard Adsterra kamu_\n\n` +
    `⚠️ Kirim \`HAPUS\` untuk menghapus iklan ini`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '❌ Batal', callback_data: 'manage_ads' }]]
      }
    }
  );
  trackMsg(userId, sent.message_id);
}

// ── STATS ─────────────────────────────────────────────────
async function showStats(chatId, userId) {
  await clearMessages(chatId, userId);
  const stats = await db.getStats();
  const ads = await db.getAds();

  let adStatus = '';
  for (const [key, label] of Object.entries(AD_LABELS)) {
    const isSet = ads[key] && ads[key].trim() !== '';
    adStatus += `${isSet ? '✅' : '❌'} ${label}\n`;
  }

  const sent = await bot.sendMessage(chatId,
    `📊 *STATISTIK KUCING OFFICIAL*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎬 *Total Video: ${stats.total}*\n` +
    `  🌏 Asia  : ${stats.asia} video\n` +
    `  🏠 Lokal : ${stats.lokal} video\n` +
    `  🌎 Barat : ${stats.barat} video\n\n` +
    `🎯 *Status Iklan:*\n` + adStatus +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 Web: ${config.WEB_URL}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '⬅️ Menu Utama', callback_data: 'menu' }]]
      }
    }
  );
  trackMsg(userId, sent.message_id);
}

// ════════════════════════════════════════════
//   EVENT HANDLERS
// ════════════════════════════════════════════

// ── /start command ────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  ensureState(userId);

  // Hapus pesan /start user
  await bot.deleteMessage(chatId, msg.message_id).catch(() => {});

  if (isAdmin(userId)) {
    await showMainMenu(chatId, userId);
  } else {
    await showNonAdminMenu(chatId, userId);
  }
});

// ── Callback query (button press) ────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  await bot.answerCallbackQuery(query.id).catch(() => {});
  ensureState(userId);

  if (!isAdmin(userId)) {
    await bot.answerCallbackQuery(query.id, { text: '⛔ Akses ditolak!' });
    return;
  }

  // ── Navigate to menu
  if (data === 'menu') {
    await showMainMenu(chatId, userId);
    return;
  }

  // ── Add video
  if (data === 'add_video') {
    await showAddVideoCategory(chatId, userId);
    return;
  }

  // ── Select category for add
  if (data.startsWith('cat_')) {
    const category = data.replace('cat_', '');
    await askVideyLink(chatId, userId, category);
    return;
  }

  // ── Delete video menu
  if (data === 'delete_video_menu') {
    await showDeleteMenu(chatId, userId);
    return;
  }

  // ── Select category for delete list
  if (data.startsWith('del_cat_')) {
    const category = data.replace('del_cat_', '');
    await showVideoList(chatId, userId, category);
    return;
  }

  // ── Confirm delete video
  if (data.startsWith('del_video_')) {
    const parts = data.replace('del_video_', '').split('_');
    const category = parts[0];
    const videoId = parts.slice(1).join('_');

    const ok = await db.deleteVideo(category, videoId);
    await clearMessages(chatId, userId);

    const sent = await bot.sendMessage(chatId,
      ok
        ? `✅ *Video berhasil dihapus!*`
        : `❌ *Gagal menghapus video.*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🗑️ Hapus Lagi', callback_data: 'delete_video_menu' }],
            [{ text: '⬅️ Menu Utama', callback_data: 'menu' }]
          ]
        }
      }
    );
    trackMsg(userId, sent.message_id);
    return;
  }

  // ── Manage ads
  if (data === 'manage_ads') {
    await showManageAds(chatId, userId);
    return;
  }

  // ── Set specific ad
  if (data.startsWith('set_ad_')) {
    const adType = data.replace('set_ad_', '');
    await askAdCode(chatId, userId, adType);
    return;
  }

  // ── Stats
  if (data === 'stats') {
    await showStats(chatId, userId);
    return;
  }
});

// ── Text messages (conversation flow) ────────────────────
bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) return; // ignore commands
  if (!msg.text) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text.trim();

  // Hapus pesan user
  await bot.deleteMessage(chatId, msg.message_id).catch(() => {});

  if (!isAdmin(userId)) return;

  ensureState(userId);
  const state = userStates[userId].state;

  // ── Waiting for Videy link
  if (state === STATES.WAITING_VIDEY_LINK) {
    // Basic validation
    if (!text.includes('videy.co') && !text.startsWith('http')) {
      await clearMessages(chatId, userId);
      const sent = await bot.sendMessage(chatId,
        `⚠️ Link tidak valid!\nHarus berupa link dari videy.co\n\nCoba lagi:`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Batal', callback_data: 'menu' }]]
          }
        }
      );
      trackMsg(userId, sent.message_id);
      return;
    }
    userStates[userId].data.videyLink = text;
    await askThumbnail(chatId, userId);
    return;
  }

  // ── Waiting for thumbnail
  if (state === STATES.WAITING_THUMBNAIL) {
    if (!text.startsWith('http')) {
      await clearMessages(chatId, userId);
      const sent = await bot.sendMessage(chatId,
        `⚠️ Link tidak valid!\nHarus berupa URL gambar (catbox.moe)\n\nCoba lagi:`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Batal', callback_data: 'menu' }]]
          }
        }
      );
      trackMsg(userId, sent.message_id);
      return;
    }
    userStates[userId].data.thumbnail = text;
    await askTitle(chatId, userId);
    return;
  }

  // ── Waiting for title
  if (state === STATES.WAITING_TITLE) {
    userStates[userId].data.title = text;
    await saveVideo(chatId, userId);
    return;
  }

  // ── Waiting for ad code
  if (state === STATES.WAITING_AD_CODE) {
    const adType = userStates[userId].data.adType;
    let code = text === 'HAPUS' ? '' : text;

    const ok = await db.setAd(adType, code);
    await clearMessages(chatId, userId);

    const sent = await bot.sendMessage(chatId,
      ok
        ? `✅ *Kode iklan ${AD_LABELS[adType]} berhasil ${code ? 'diset' : 'dihapus'}!*`
        : `❌ *Gagal menyimpan kode iklan.*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎯 Kelola Iklan Lagi', callback_data: 'manage_ads' }],
            [{ text: '⬅️ Menu Utama', callback_data: 'menu' }]
          ]
        }
      }
    );
    trackMsg(userId, sent.message_id);
    userStates[userId].state = STATES.IDLE;
    userStates[userId].data = {};
    return;
  }
});

// ── Error handler ─────────────────────────────────────────
bot.on('polling_error', (err) => {
  if (err.code === 'ETELEGRAM' && err.message.includes('409')) {
    console.log('⚠️ 409 Conflict - Railway overlap, diabaikan');
    return;
  }
  console.error('❌ Bot polling error:', err.message);
});

console.log('🤖 Bot Telegram aktif...');

module.exports = bot;
