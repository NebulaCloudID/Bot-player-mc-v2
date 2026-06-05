# 🤖 Minecraft Bot - Load Testing v3

> Dibuat oleh **NebulaCloudID**

Script untuk load testing server Minecraft menggunakan [Mineflayer](https://github.com/PrismarineJS/mineflayer) + [bedrock-protocol](https://github.com/PrismarineJS/bedrock-protocol).  
Versi 3 hadir dengan dukungan **Java & Bedrock Edition**, **Block Breaking**, dan movement yang lebih natural!

---

## ⚡ Install Otomatis (1 Command)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/NebulaCloudID/Bot-player-mc-v2/main/installer2.sh)
```

Script akan otomatis:
- Install Node.js (jika belum ada)
- Download semua file dari GitHub
- Install dependencies
- Langsung jalankan bot

---

## 🚀 Cara Pakai Manual

```bash
# Clone repo
git clone https://github.com/NebulaCloudID/Bot-player-mc-v2.git
cd Bot-player-mc-v2

# Install dependencies
npm install mineflayer bedrock-protocol minecraft-protocol

# Jalankan bot
node botv3.js
```

---

## ⚙️ Fitur

| Fitur | Keterangan |
|---|---|
| 🤖 Multi-bot | Spawn banyak bot sekaligus |
| 🎮 Java & Bedrock | Support kedua edition |
| 🏃 Human movement | Gerakan acak seperti pemain asli |
| 💬 Random chat | Kirim pesan acak otomatis (anti-spam) |
| ⛏️ Block Breaking | Hancurin block random di sekitar bot |
| 🔄 Auto-reconnect | Konek ulang otomatis jika disconnect |
| 📊 Status monitor | Laporan tiap 15 detik |
| 🔍 Auto-detect versi | Deteksi otomatis versi server Java |

---

## ⛏️ Fitur Block Breaking

Bot secara otomatis menghancurkan block di sekitarnya dengan delay random agar terlihat natural.

- **Radius**: 4 block dari posisi bot
- **Delay**: 3–6 detik per block (acak)
- **Blacklist aman**: bedrock, barrier, command block, portal, dll tidak dihancurin
- Aktifkan saat setup: `⛏️  Hancurin block random? (y/n) : y`

---

## 🎮 Dukungan Bedrock Edition

Bot v3 support Minecraft **Bedrock Edition** via `bedrock-protocol`:

- Mode offline (tanpa akun Xbox)
- Chat & movement otomatis
- Auto-reconnect jika disconnect
- Pilih edition saat setup: `🎮 Edition (1/2) : 2`

---

## 🖥️ Contoh Setup

```
[1] Java  [2] Bedrock
🎮 Edition (1/2)                   : 1
🌐 Domain / IP server              : play.myserver.net
🔌 Port server                     : 25565
🎮 Versi Minecraft (kosong=auto)   : 
🤖 Jumlah bot                      : 20
⏱️  Delay antar spawn (ms)          : 1500
🏃 Gerakan human-like? (y/n)       : y
💬 Chat random anti-spam? (y/n)    : y
⛏️  Hancurin block random? (y/n)    : n
🔄 Auto reconnect? (y/n)           : y
```

---

## ⚠️ Disclaimer

> Hanya gunakan di **server milik sendiri** untuk keperluan testing.  
> Penggunaan di server orang lain tanpa izin adalah **pelanggaran** dan dapat dikenakan sanksi!

---

## 📋 Requirements

- Node.js v14+
- npm
- VPS / Linux server

---

## 📦 Dependencies

- [mineflayer](https://github.com/PrismarineJS/mineflayer) ^4.14.0 — Java Edition
- [bedrock-protocol](https://github.com/PrismarineJS/bedrock-protocol) — Bedrock Edition
- [minecraft-protocol](https://github.com/PrismarineJS/node-minecraft-protocol) — Auto-detect versi Java
