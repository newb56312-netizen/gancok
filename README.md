# 🎬 KUCING OFFICIAL

Website video premium dengan Telegram Bot admin panel.

---

## ⚙️ LANGKAH 1 — Edit config.js

Buka file `config.js` dan isi:

```js
BOT_TOKEN:  'token dari @BotFather',
ADMIN_ID:   123456789,        // ID kamu (cek via @userinfobot)
CHANNEL_ID: '@nama_channel',  // channel notifikasi
WEB_URL:    'https://xxx.up.railway.app'  // isi setelah deploy
```

---

## 📦 LANGKAH 2 — Upload ke GitHub via Termux

### Install Git di Termux:
```bash
pkg update && pkg upgrade -y
pkg install git -y
```

### Setup identitas Git:
```bash
git config --global user.name "NamaKamu"
git config --global user.email "email@kamu.com"
```

### Buat repo baru di GitHub:
1. Buka https://github.com/new
2. Nama repo: `kucing-official`
3. Pilih **Private** → klik **Create repository**

### Upload dari Termux:
```bash
# Masuk ke folder project
cd /path/ke/kucing-official

# Init git
git init
git add .
git commit -m "first commit"

# Hubungkan ke GitHub (ganti USERNAME)
git remote add origin https://github.com/USERNAME/kucing-official.git
git branch -M main
git push -u origin main
```

> Saat diminta password GitHub, gunakan **Personal Access Token**
> (buat di: GitHub → Settings → Developer Settings → Personal Access Tokens → Classic)

---

## 🚂 LANGKAH 3 — Deploy ke Railway

1. Buka https://railway.app → Login
2. Klik **New Project** → **Deploy from GitHub repo**
3. Pilih repo `kucing-official`
4. Railway otomatis detect dan deploy

---

## 💾 LANGKAH 4 — Buat Volume (WAJIB agar video tidak hilang)

1. Di Railway project kamu → klik tab **Volumes**
2. Klik **Add Volume**
3. Isi:
   - **Mount Path**: `/app/data`
   - Klik **Create**
4. Railway akan restart otomatis
5. Data video sekarang **permanen** tidak hilang saat restart

---

## 🌐 LANGKAH 5 — Set Environment Variable DATA_PATH

1. Di Railway → tab **Variables**
2. Tambahkan:
   ```
   DATA_PATH = /app/data/data.json
   ```
3. Klik **Save** → Railway restart

---

## ✅ LANGKAH 6 — Aktifkan Bot

1. Buka bot kamu di Telegram
2. Ketik `/start`
3. Tampil menu admin

---

## 🤖 CARA PAKAI BOT

### Tambah Video:
1. Tekan **➕ Tambah Video**
2. Pilih kategori (Asia / Lokal / Barat)
3. Kirim link videy.co
4. Kirim link thumbnail dari catbox.moe
5. Kirim judul video
6. Bot otomatis umumkan ke channel

### Hapus Video:
1. Tekan **🗑️ Hapus Video**
2. Pilih kategori
3. Pilih video → hapus

### Kelola Iklan Adsterra:
1. Tekan **🎯 Kelola Iklan**
2. Pilih jenis iklan
3. Salin kode dari dashboard Adsterra
4. Kirim ke bot

---

## 🔄 Update Kode (setelah edit):

```bash
git add .
git commit -m "update"
git push
```

Railway akan auto-deploy setelah push.

---

## 📁 Struktur Folder

```
kucing-official/
├── config.js         ← Token bot & admin ID
├── index.js          ← Entry point
├── server.js         ← Web server
├── bot.js            ← Telegram bot
├── dataManager.js    ← Baca/tulis data
├── package.json
├── Procfile
├── railway.json
├── data/
│   └── data.json     ← Data video & iklan (Railway Volume)
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```
