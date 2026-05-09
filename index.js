// ============================================
//   KUCING OFFICIAL - ENTRY POINT
// ============================================

const { startServer } = require('./server');
const db = require('./dataManager');

async function main() {
  console.log('🚀 Memulai Kucing Official...');
  console.log('📁 Data path:', require('./config').DATA_PATH);

  // Pastikan data.json ada
  await db.ensureDataFile();

  // Start web server
  startServer();

  // Start bot (imported last so server is ready)
  require('./bot');

  console.log('✅ Semua sistem aktif!');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
