/**
 * ============================================================
 *  Minecraft Bot Player - Load Testing Script
 *  Dibuat untuk menguji kapasitas server Minecraft
 *  Library: Mineflayer (Node.js)
 *  Author: NebulaCloudID
 *  Update: + PvP (limit target) + Random Build + Dig (hancurin block)
 * ============================================================
 */

const mineflayer = require('mineflayer');
const readline   = require('readline');

// ============================================================
// INPUT INTERAKTIF — semua input selesai dulu, baru bot jalan
// ============================================================
async function getInput() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(resolve => rl.question(q, resolve));

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       🤖  Minecraft Bot Player - Load Testing            ║');
  console.log('║              github.com/NebulaCloudID                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  const host       = (await ask('  🌐 Domain / IP server          : ')).trim() || 'localhost';
  const portRaw    = (await ask('  🔌 Port server (default 25565)  : ')).trim();
  const port       = parseInt(portRaw) || 25565;
  const countRaw   = (await ask('  🤖 Jumlah bot (default 10)      : ')).trim();
  const botCount   = parseInt(countRaw) || 10;
  const ver        = (await ask('  🎮 Versi Minecraft (cth: 1.20.1): ')).trim() || '1.20.1';
  const pvpRaw     = (await ask('  ⚔️  Aktifkan PvP? (y/n)          : ')).trim().toLowerCase();
  const pvpEnabled = pvpRaw === 'y';
  let pvpLimit     = 3;
  if (pvpEnabled) {
    const pvpLimitRaw = (await ask('  🎯 Max target dipukul per bot   : ')).trim();
    pvpLimit = parseInt(pvpLimitRaw) || 3;
  }
  const buildRaw     = (await ask('  \u26CF\uFE0F  Aktifkan Random Build? (y/n) : ')).trim().toLowerCase();
  const buildEnabled = buildRaw === 'y';
  const digRaw       = (await ask('  \u26CF\uFE0F  Aktifkan Dig (hancurin block)? (y/n): ')).trim().toLowerCase();
  const digEnabled   = digRaw === 'y';

  rl.close();
  console.log('');
  return { host, port, botCount, version: ver, pvpEnabled, pvpLimit, buildEnabled, digEnabled };
}

// ============================================================
// KONFIGURASI (diisi dari input)
// ============================================================
const CONFIG = {
  host: '',
  port: 25565,
  version: '1.20.1',
  botCount: 10,
  spawnDelay: 1500,
  reconnectDelay: 5000,
  autoReconnect: true,
  movement: {
    enabled: true,
    interval: 3000,
    jumpChance: 0.3,
    sprintChance: 0.4,
    sneakChance: 0.1,
    lookAroundChance: 0.5,
  },
  chat: {
    enabled: true,
    interval: 30000,
    messages: [
      'halo semua!',
      'server nya kenceng ga?',
      'tes tes',
      'woy ada yang main?',
      'lag ga nih?',
      'mantap',
      'nice server',
      'berapa ping kalian?',
    ],
  },
  pvp: {
    enabled: false,
    maxTargets: 3,        // Limit berapa target yang dipukul
    attackRadius: 4,      // Radius pencarian target (block)
    attackInterval: 2000, // Interval serang (ms)
    targetPlayers: true,  // Serang player
    targetMobs: true,     // Serang hostile mob
    avoidFriendlyMobs: true, // Hindari serang mob jinak
  },
  build: {
    enabled: false,
    interval: 60000,      // Interval build (ms)
    maxHeight: 5,         // Tinggi maks struktur
    maxSize: 5,           // Ukuran luas maks (5x5)
  },
  dig: {
    enabled: false,
    interval: 4000,       // Interval cari & hancurin block baru (ms)
    radius: 3,            // Radius pencarian block (block)
    blacklist: new Set([
      'bedrock', 'barrier', 'command_block', 'chain_command_block',
      'repeating_command_block', 'structure_block', 'jigsaw',
      'end_portal_frame', 'end_portal', 'end_gateway',
      'nether_portal', 'moving_piston',
    ]),
  },
};

// ============================================================
// DAFTAR MOB HOSTILE (untuk targeting PvP)
// ============================================================
const HOSTILE_MOBS = new Set([
  'zombie', 'skeleton', 'creeper', 'spider', 'enderman',
  'witch', 'blaze', 'ghast', 'slime', 'phantom', 'drowned',
  'husk', 'stray', 'pillager', 'ravager', 'vindicator',
  'evoker', 'vex', 'wither_skeleton', 'magma_cube',
]);

const FRIENDLY_MOBS = new Set([
  'cow', 'pig', 'sheep', 'chicken', 'horse', 'donkey', 'mule',
  'wolf', 'cat', 'ocelot', 'parrot', 'rabbit', 'bat', 'squid',
  'villager', 'iron_golem', 'snow_golem', 'bee', 'fox', 'panda',
  'polar_bear', 'turtle', 'dolphin', 'cod', 'salmon', 'tropical_fish',
]);

// ============================================================
// GENERATOR NAMA RANDOM
// ============================================================
const adjectives = [
  'Crazy', 'Cool', 'Epic', 'Dark', 'Swift', 'Iron', 'Fire', 'Storm',
  'Shadow', 'Neon', 'Hyper', 'Ultra', 'Mega', 'Super', 'Wild', 'Frost',
  'Blaze', 'Thunder', 'Sky', 'Void', 'Pixel', 'Turbo', 'Nitro', 'Rapid',
];
const nouns = [
  'Creeper', 'Warrior', 'Dragon', 'Knight', 'Hunter', 'Slayer', 'Master',
  'Phantom', 'Ninja', 'Ranger', 'Miner', 'Builder', 'Coder', 'Wizard',
  'Archer', 'Beast', 'Ghost', 'Legend', 'Pro', 'Gamer', 'Blade', 'Wolf',
];

function generateRandomName() {
  const adj  = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num  = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
}

// ============================================================
// STATE
// ============================================================
const activeBots = new Map();
let totalConnected    = 0;
let totalDisconnected = 0;

// ============================================================
// GERAKAN HUMAN-LIKE
// ============================================================
function startHumanMovement(bot) {
  const directions = ['forward', 'back', 'left', 'right'];

  const interval = setInterval(() => {
    try {
      // Kalau lagi PvP, jangan gerak random dulu
      if (bot._pvpActive) return;

      bot.clearControlStates();
      const cfg = CONFIG.movement;

      if (Math.random() < 0.6) {
        const dir = directions[Math.floor(Math.random() * directions.length)];
        bot.setControlState(dir, true);
        if (Math.random() < cfg.sprintChance) bot.setControlState('sprint', true);
        if (Math.random() < cfg.sneakChance)  bot.setControlState('sneak', true);

        if (Math.random() < cfg.jumpChance) {
          setTimeout(() => {
            try { bot.setControlState('jump', true); } catch (e) {}
            setTimeout(() => { try { bot.setControlState('jump', false); } catch (e) {} }, 300);
          }, 200);
        }

        setTimeout(() => { try { bot.clearControlStates(); } catch (e) {} },
          1000 + Math.random() * 2000);
      }

      if (Math.random() < cfg.lookAroundChance) {
        try {
          bot.look((Math.random() * 2 - 1) * Math.PI, Math.random() * 0.6 - 0.3, false);
        } catch (e) {}
      }
    } catch (e) {}
  }, CONFIG.movement.interval);

  bot._movementInterval = interval;
}

// ============================================================
// CHAT RANDOM
// ============================================================
function startRandomChat(bot) {
  if (!CONFIG.chat.enabled) return;
  const interval = setInterval(() => {
    try {
      const msgs = CONFIG.chat.messages;
      bot.chat(msgs[Math.floor(Math.random() * msgs.length)]);
    } catch (e) {}
  }, CONFIG.chat.interval + Math.random() * 10000);
  bot._chatInterval = interval;
}

// ============================================================
// PvP — Serang target terbatas
// ============================================================
function startPvP(bot, botName) {
  if (!CONFIG.pvp.enabled) return;

  let attackedCount = 0; // Hitung berapa target sudah diserang sesi ini

  const interval = setInterval(() => {
    try {
      // Reset hitungan tiap 60 detik biar bot terus aktif
      // (logika: limit per "sesi", bukan selamanya)
    } catch (e) {}
  }, 60000);

  // Reset counter tiap 60 detik
  const resetInterval = setInterval(() => {
    attackedCount = 0;
    bot._pvpActive = false;
  }, 60000);

  const attackInterval = setInterval(() => {
    try {
      if (attackedCount >= CONFIG.pvp.maxTargets) return; // Sudah capai limit

      const radius = CONFIG.pvp.attackRadius;
      let target = null;

      // Cari entity dalam radius
      const entities = Object.values(bot.entities);
      const candidates = entities.filter(e => {
        if (!e || !e.position) return false;
        const dist = bot.entity.position.distanceTo(e.position);
        if (dist > radius) return false;

        if (e.type === 'player' && CONFIG.pvp.targetPlayers) {
          return e.username !== bot.username; // Jangan serang diri sendiri
        }
        if (e.type === 'mob' && CONFIG.pvp.targetMobs) {
          const mobName = e.name ? e.name.toLowerCase() : '';
          if (CONFIG.pvp.avoidFriendlyMobs && FRIENDLY_MOBS.has(mobName)) return false;
          return HOSTILE_MOBS.has(mobName) || !FRIENDLY_MOBS.has(mobName);
        }
        return false;
      });

      if (candidates.length === 0) return;

      // Pilih target terdekat
      target = candidates.reduce((closest, e) => {
        const d = bot.entity.position.distanceTo(e.position);
        const cd = closest ? bot.entity.position.distanceTo(closest.position) : Infinity;
        return d < cd ? e : closest;
      }, null);

      if (!target) return;

      bot._pvpActive = true;
      attackedCount++;

      // Look at target lalu serang
      bot.lookAt(target.position.offset(0, target.height || 1, 0), true, () => {
        try {
          bot.attack(target);
          console.log(`  ⚔️  [${botName}] Menyerang: ${target.username || target.name || 'entity'} (${attackedCount}/${CONFIG.pvp.maxTargets})`);
        } catch (e) {}
      });

      // Kejar target (sprint forward)
      bot.setControlState('sprint', true);
      bot.setControlState('forward', true);
      setTimeout(() => {
        try {
          bot.clearControlStates();
          bot._pvpActive = false;
        } catch (e) {}
      }, 800);

    } catch (e) {}
  }, CONFIG.pvp.attackInterval);

  bot._pvpInterval    = attackInterval;
  bot._pvpResetInterval = resetInterval;
}

// ============================================================
// RANDOM BUILD — Bikin struktur random dari block tanah
// ============================================================
function startRandomBuild(bot, botName) {
  if (!CONFIG.build.enabled) return;

  // Tipe struktur yang bisa dibuat
  const buildTypes = ['tower', 'wall', 'floor', 'pyramid', 'random'];

  // Block yang bisa dipakai (nama sesuai Mineflayer)
  const buildBlocks = [
    'dirt', 'cobblestone', 'oak_planks', 'stone', 'sand',
    'gravel', 'oak_log', 'oak_leaves', 'glass', 'bricks',
  ];

  async function doBuild() {
    try {
      const botPos  = bot.entity.position.floored();
      const buildType = buildTypes[Math.floor(Math.random() * buildTypes.length)];
      const blockName = buildBlocks[Math.floor(Math.random() * buildBlocks.length)];
      const size      = 2 + Math.floor(Math.random() * (CONFIG.build.maxSize - 1)); // 2..maxSize
      const height    = 1 + Math.floor(Math.random() * CONFIG.build.maxHeight);     // 1..maxHeight

      console.log(`  🏗️  [${botName}] Build: ${buildType} (${size}x${height}) dari ${blockName}`);

      // Cari block di inventory
      const block = bot.inventory.items().find(i => i.name === blockName);
      if (!block) {
        // Kalau ga ada block, skip
        return;
      }
      await bot.equip(block, 'hand');

      // Posisi awal build (di depan bot)
      const startX = botPos.x + 1;
      const startY = botPos.y;
      const startZ = botPos.z;

      if (buildType === 'tower') {
        // Tower: 1 kolom ke atas
        for (let y = 0; y < height; y++) {
          const targetBlock = bot.blockAt(new bot.entity.position.constructor(startX, startY + y - 1, startZ));
          if (targetBlock) {
            try { await bot.placeBlock(targetBlock, new bot.entity.position.constructor(0, 1, 0)); } catch (e) {}
          }
          await sleep(300);
        }

      } else if (buildType === 'wall') {
        // Wall: baris horizontal
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < Math.min(height, 3); y++) {
            const targetBlock = bot.blockAt(new bot.entity.position.constructor(startX + x, startY + y - 1, startZ));
            if (targetBlock) {
              try { await bot.placeBlock(targetBlock, new bot.entity.position.constructor(0, 1, 0)); } catch (e) {}
            }
            await sleep(200);
          }
        }

      } else if (buildType === 'floor') {
        // Floor: lantai flat NxN
        for (let x = 0; x < size; x++) {
          for (let z = 0; z < size; z++) {
            const targetBlock = bot.blockAt(new bot.entity.position.constructor(startX + x, startY - 1, startZ + z));
            if (targetBlock) {
              try { await bot.placeBlock(targetBlock, new bot.entity.position.constructor(0, 1, 0)); } catch (e) {}
            }
            await sleep(150);
          }
        }

      } else if (buildType === 'pyramid') {
        // Pyramid: dari besar ke kecil
        const levels = Math.min(height, Math.floor(size / 2) + 1);
        for (let lvl = 0; lvl < levels; lvl++) {
          const s = size - lvl * 2;
          if (s <= 0) break;
          for (let x = 0; x < s; x++) {
            for (let z = 0; z < s; z++) {
              const targetBlock = bot.blockAt(new bot.entity.position.constructor(
                startX + lvl + x, startY + lvl - 1, startZ + lvl + z
              ));
              if (targetBlock) {
                try { await bot.placeBlock(targetBlock, new bot.entity.position.constructor(0, 1, 0)); } catch (e) {}
              }
              await sleep(100);
            }
          }
        }

      } else {
        // Random: taruh block di posisi acak dalam radius
        const blockCount = size * size;
        for (let i = 0; i < blockCount; i++) {
          const rx = Math.floor(Math.random() * size);
          const ry = Math.floor(Math.random() * height);
          const rz = Math.floor(Math.random() * size);
          const targetBlock = bot.blockAt(new bot.entity.position.constructor(
            startX + rx, startY + ry - 1, startZ + rz
          ));
          if (targetBlock) {
            try { await bot.placeBlock(targetBlock, new bot.entity.position.constructor(0, 1, 0)); } catch (e) {}
          }
          await sleep(150);
        }
      }

      console.log(`  ✅ [${botName}] Build selesai!`);
    } catch (e) {
      // Build bisa gagal kalau bot disconnect, ignore saja
    }
  }

  // Jalankan build pertama setelah 10 detik, lalu tiap interval
  const timeoutFirst = setTimeout(() => doBuild(), 10000);
  const interval = setInterval(() => doBuild(), CONFIG.build.interval);

  bot._buildTimeout  = timeoutFirst;
  bot._buildInterval = interval;
}

// ============================================================
// DIG — Hancurin block apapun di sekitar bot
// ============================================================
function startDig(bot, botName) {
  if (!CONFIG.dig.enabled) return;

  async function doDigCycle() {
    try {
      if (!bot.entity) return;
      const pos = bot.entity.position.floored();
      const radius = CONFIG.dig.radius;
      const candidates = [];

      // Scan block dalam radius
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dz = -radius; dz <= radius; dz++) {
            const b = bot.blockAt(pos.offset(dx, dy, dz));
            if (!b) continue;
            if (b.name === 'air' || b.name === 'cave_air' || b.name === 'void_air') continue;
            if (CONFIG.dig.blacklist.has(b.name)) continue;
            if (!bot.canDigBlock(b)) continue;
            candidates.push(b);
          }
        }
      }

      if (candidates.length === 0) return;

      // Pilih block acak dari kandidat
      const target = candidates[Math.floor(Math.random() * candidates.length)];

      // Look at block, lalu hancurin
      await bot.lookAt(target.position.offset(0.5, 0.5, 0.5), true);
      await bot.dig(target);
      console.log(`  ⛏️  [${botName}] Hancurin: ${target.name} @ (${target.position.x},${target.position.y},${target.position.z})`);
    } catch (e) {
      // Block mungkin sudah hilang atau tidak bisa dihancur, skip saja
    }
  }

  const interval = setInterval(() => doDigCycle(), CONFIG.dig.interval);
  bot._digInterval = interval;
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// CLEANUP BOT
// ============================================================
function cleanupBot(botName) {
  const bot = activeBots.get(botName);
  if (!bot) return;
  try { clearInterval(bot._movementInterval); } catch (e) {}
  try { clearInterval(bot._chatInterval); } catch (e) {}
  try { clearInterval(bot._pvpInterval); } catch (e) {}
  try { clearInterval(bot._pvpResetInterval); } catch (e) {}
  try { clearInterval(bot._buildInterval); } catch (e) {}
  try { clearInterval(bot._digInterval); } catch (e) {}
  try { clearTimeout(bot._buildTimeout); } catch (e) {}
  try { bot.clearControlStates(); } catch (e) {}
  activeBots.delete(botName);
}

// ============================================================
// BUAT SATU BOT
// ============================================================
function createBot(botName, index) {
  console.log(`  [Bot ${String(index + 1).padStart(3)}] Connecting → ${botName}...`);

  let bot;
  try {
    bot = mineflayer.createBot({
      host    : CONFIG.host,
      port    : CONFIG.port,
      username: botName,
      version : CONFIG.version,
      hideErrors           : false,
      checkTimeoutInterval : 30000,
    });
  } catch (err) {
    console.error(`  ❌ [${botName}] Gagal buat bot: ${err.message}`);
    return;
  }

  bot._pvpActive = false;
  bot._reconnecting = false;
  activeBots.set(botName, bot);

  bot.once('spawn', () => {
    totalConnected++;
    console.log(`  ✅ [${botName}] Connected! (Aktif: ${activeBots.size})`);
    if (CONFIG.movement.enabled) startHumanMovement(bot);
    startRandomChat(bot);
    startPvP(bot, botName);
    startRandomBuild(bot, botName);
    startDig(bot, botName);
  });

  bot.on('kicked', (reason) => {
    totalDisconnected++;
    let r = reason;
    try {
      if (typeof reason === 'object') {
        r = reason.text || reason.translate || JSON.stringify(reason);
      } else {
        const parsed = JSON.parse(reason);
        r = parsed.text || parsed.translate || parsed.extra?.[0]?.text || reason;
      }
    } catch (e) { r = String(reason); }
    console.log(`  ⚠️  [${botName}] Kicked: ${r}`);
    cleanupBot(botName);
    if (CONFIG.autoReconnect && !bot._reconnecting) {
      bot._reconnecting = true;
      console.log(`  🔄 [${botName}] Reconnect dalam ${CONFIG.reconnectDelay / 1000}s...`);
      setTimeout(() => createBot(botName, index), CONFIG.reconnectDelay);
    }
  });

  bot.on('error', (err) => {
    // EPIPE/ECONNRESET: koneksi putus paksa dari server, sudah ditangani oleh event 'end'/'kicked'
    if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
    if (err.code === 'ECONNREFUSED') {
      console.log(`  ❌ [${botName}] Koneksi ditolak — cek IP/port server!`);
    } else if (err.code === 'ENOTFOUND') {
      console.log(`  ❌ [${botName}] Domain tidak ditemukan — cek domain server!`);
    } else {
      console.log(`  ❌ [${botName}] Error: ${err.message}`);
    }
    cleanupBot(botName);
    if (CONFIG.autoReconnect && !bot._reconnecting) {
      bot._reconnecting = true;
      setTimeout(() => createBot(botName, index), CONFIG.reconnectDelay);
    }
  });

  bot.on('end', (reason) => {
    totalDisconnected++;
    console.log(`  🔌 [${botName}] Disconnect: ${reason}`);
    cleanupBot(botName);
    if (CONFIG.autoReconnect && reason !== 'manual' && !bot._reconnecting) {
      bot._reconnecting = true;
      setTimeout(() => createBot(botName, index), CONFIG.reconnectDelay);
    }
  });

  return bot;
}

// ============================================================
// SPAWN SEMUA BOT BERTAHAP
// ============================================================
async function spawnAllBots() {
  console.log('──────────────────────────────────────────────────────────');
  console.log(`  Server  : ${CONFIG.host}:${CONFIG.port}`);
  console.log(`  Versi   : ${CONFIG.version}`);
  console.log(`  Jumlah  : ${CONFIG.botCount} bot`);
  console.log(`  Delay   : ${CONFIG.spawnDelay}ms antar bot`);
  console.log(`  PvP     : ${CONFIG.pvp.enabled ? `✅ (max ${CONFIG.pvp.maxTargets} target/60s)` : '❌'}`);
  console.log(`  Build   : ${CONFIG.build.enabled ? '✅ (random build aktif)' : '❌'}`);
  console.log(`  Dig     : ${CONFIG.dig.enabled ? '✅ (hancurin block aktif)' : '❌'}`);
  console.log('──────────────────────────────────────────────────────────');
  console.log('  Spawning bot...\n');

  const botNames = new Set();
  while (botNames.size < CONFIG.botCount) {
    botNames.add(generateRandomName());
  }

  const names = Array.from(botNames);
  for (let i = 0; i < CONFIG.botCount; i++) {
    createBot(names[i], i);
    if (i < CONFIG.botCount - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.spawnDelay));
    }
  }

  console.log('\n  ✅ Semua bot sudah di-spawn!');
  console.log('  📊 Status monitor aktif tiap 15 detik...\n');

  setInterval(() => {
    console.log(`\n  📊 STATUS → Aktif: ${activeBots.size} | Connect: ${totalConnected} | Disconnect: ${totalDisconnected}\n`);
  }, 15000);
}

// ============================================================
// CTRL+C — Matikan semua bot dengan bersih
// ============================================================
process.on('SIGINT', () => {
  console.log('\n\n  🛑 Menghentikan semua bot...');
  for (const [name, bot] of activeBots) {
    try { bot.quit('Script dihentikan'); } catch (e) {}
    cleanupBot(name);
  }
  console.log('  ✅ Semua bot disconnect. Bye!\n');
  process.exit(0);
});

// ============================================================
// MAIN
// ============================================================
(async () => {
  const input = await getInput();
  CONFIG.host             = input.host;
  CONFIG.port             = input.port;
  CONFIG.botCount         = input.botCount;
  CONFIG.version          = input.version;
  CONFIG.pvp.enabled      = input.pvpEnabled;
  CONFIG.pvp.maxTargets   = input.pvpLimit;
  CONFIG.build.enabled    = input.buildEnabled;
  CONFIG.dig.enabled      = input.digEnabled;
  await spawnAllBots();
})();
