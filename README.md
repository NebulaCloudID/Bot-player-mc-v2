# 🤖 Minecraft Bot - Load Testing v2

> Dibuat oleh **NebulaCloudID**

Script untuk load testing server Minecraft menggunakan [Mineflayer](https://github.com/PrismarineJS/mineflayer).  
Versi 2 hadir dengan fitur **PvP** dan **Random Build**!

---

## ⚡ Install Otomatis (1 Command)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/NebulaCloudID/Bot-player-mc-v2/main/installer.sh)
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
npm install

# Jalankan bot
node bot.js
```

---

## ⚙️ Fitur

| Fitur | Keterangan |
|---|---|
| 🤖 Multi-bot | Spawn banyak bot sekaligus |
| 🏃 Human movement | Gerakan acak seperti pemain asli |
| 💬 Random chat | Kirim pesan acak otomatis |
| 🔄 Auto-reconnect | Konek ulang otomatis jika disconnect |
| 📊 Status monitor | Laporan tiap 15 detik |
| ⚔️ PvP | Bot bisa menyerang player & hostile mob (limit target) |
| 🏗️ Random Build | Bot membangun struktur acak dari inventory |

---

## ⚔️ Fitur PvP

Bot dapat menyerang entitas di sekitarnya secara otomatis dengan batasan target yang bisa dikonfigurasi.

- **Target**: Player dan hostile mob (zombie, skeleton, creeper, dll)
- **Mob jinak aman**: Sapi, babi, villager, dll tidak diserang
- **Limit target**: Tentukan berapa maksimal target per bot per 60 detik
- **Radius serangan**: 4 block (bisa diubah di `CONFIG.pvp.attackRadius`)
- **Auto-sprint**: Bot sprint mengejar target saat menyerang

Saat setup, kamu akan ditanya:
```
⚔️  Aktifkan PvP? (y/n)          : y
🎯 Max target dipukul per bot   : 3
```

---

## 🏗️ Fitur Random Build

Bot secara otomatis membangun struktur random menggunakan block yang ada di inventory.

### Tipe Struktur
| Tipe | Keterangan |
|---|---|
| 🗼 Tower | Kolom vertikal ke atas |
| 🧱 Wall | Dinding horizontal |
| 🟫 Floor | Lantai flat N×N |
| 🔺 Pyramid | Piramida bertingkat |
| 🎲 Random | Block di posisi acak |

### Block yang Digunakan
`dirt`, `cobblestone`, `oak_planks`, `stone`, `sand`, `gravel`, `oak_log`, `oak_leaves`, `glass`, `bricks`

> **Catatan:** Bot harus punya block di inventory. Cocok untuk server **Survival** (dengan item) atau **Creative mode**.

Saat setup, kamu akan ditanya:
```
🏗️  Aktifkan Random Build? (y/n) : y
```

---

## 🖥️ Contoh Setup

```
🌐 Domain / IP server          : play.myserver.net
🔌 Port server (default 25565)  : 25565
🤖 Jumlah bot (default 10)      : 20
🎮 Versi Minecraft (cth: 1.20.1): 1.20.4
⚔️  Aktifkan PvP? (y/n)          : y
🎯 Max target dipukul per bot   : 5
🏗️  Aktifkan Random Build? (y/n) : y
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

- [mineflayer](https://github.com/PrismarineJS/mineflayer) ^4.14.0
