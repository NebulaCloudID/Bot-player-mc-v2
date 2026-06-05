/**
 * ============================================================
 *  Minecraft Bot Player - Load Testing Script
 *  Dibuat untuk menguji kapasitas server Minecraft
 *  Library: Mineflayer (Node.js)
 *  Author: NebulaCloudID
 *  Update: + Role Acak per Bot + Inventory Limit 64 (1 stack)
 *          + Fighter diam di tempat (tidak chase)
 *          + Builder otomatis setelah inventory penuh
 * ============================================================
 */

const mineflayer = require('mineflayer');
const readline   = require('readline');

// ============================================================
// ROLE DEFINITIONS
// Setiap bot dapat satu role secara acak saat spawn
// ============================================================
// WALKER  : jalan-jalan, chat, tidak dig tidak pvp
// DIGGER  : fokus hancurin block, setelah inventory penuh → random build
// FIGHTER : pvp diam di tempat (tidak chase), sampai mati
// BUILDER : random build saja, tidak dig tidak pvp
// ============================================================
const ROLES = ['walker', 'digger', 'fighter', 'builder'];

// Bobot probabilitas role (sesuaikan sesuai kebutuhan):
// walker 35%, digger 25%, fighter 25%, builder 15%
const ROLE_WEIGHTS = [35, 25, 25, 15];

function pickRole() {
  const total = ROLE_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < ROLES.length; i++) {
    r -= ROLE_WEIGHTS[i];
    if (r <= 0) return ROLES[i];
  }
  return ROLES[0];
}

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

  rl.close();
  console.log('');
  return { host, port, botCount, version: ver };
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
      'gaskeun',
      'siapa yang lag?',
    ],
  },
  pvp: {
    attackRadius: 4,       // radius deteksi musuh
    attackInterval: 1500,  // ms antar serangan
    targetPlayers: true,
    targetMobs: true,
    avoidFriendlyMobs: true,
    maxTargets: 999,       // fighter terus serang, tidak ada limit per menit
  },
  build: {
    interval: 60000,
    maxHeight: 5,
    maxSize: 5,
  },
  dig: {
    checkInterval: 500,
    maxInventoryBlocks: 64,  // 1 stack penuh → berhenti dig, mulai build
    radius: 3,
    blacklist: new Set([
      'bedrock', 'barrier', 'command_block', 'chain_command_block',
      'repeating_command_block', 'structure_block', 'jigsaw',
      'end_portal_frame', 'end_portal', 'end_gateway',
      'nether_portal', 'moving_piston',
    ]),
  },
};

// ============================================================
// DAFTAR MOB
// ============================================================
const HOSTILE_MOBS = new Set([
  'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider', 'enderman',
  'witch', 'blaze', 'ghast', 'slime', 'phantom', 'drowned',
  'husk', 'stray', 'pillager', 'ravager', 'vindicator',
  'evoker', 'vex', 'wither_skeleton', 'magma_cube', 'silverfish',
  'endermite', 'guardian', 'elder_guardian', 'shulker', 'hoglin',
  'zoglin', 'piglin_brute', 'warden',
]);

const FRIENDLY_MOBS = new Set([
  'cow', 'pig', 'sheep', 'chicken', 'horse', 'donkey', 'mule',
  'wolf', 'cat', 'ocelot', 'parrot', 'rabbit', 'bat', 'squid',
  'villager', 'iron_golem', 'snow_golem', 'bee', 'fox', 'panda',
  'polar_bear', 'turtle', 'dolphin', 'cod', 'salmon', 'tropical_fish',
  'axolotl', 'glow_squid', 'allay', 'frog', 'tadpole', 'camel',
  'sniffer',
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// GERAKAN HUMAN-LIKE (untuk WALKER & BUILDER)
// ============================================================
function startHumanMovement(bot) {
  const directions = ['forward', 'back', 'left', 'right'];

  const interval = setInterval(() => {
    try {
      if (bot._pvpActive || bot._digging) return;

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
// CHAT RANDOM (semua role)
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
// PvP — FIGHTER: DIAM DI TEMPAT, tidak chase, hanya pukul
// yang masuk radius (sampai bot mati / disconnect)
// ============================================================
function startPvP(bot, botName) {
  bot._pvpActive = false;

  const attackInterval = setInterval(async () => {
    try {
      if (bot._pvpActive) return;
      if (!bot.entity) return;

      const radius   = CONFIG.pvp.attackRadius;
      const entities = Object.values(bot.entities);

      const candidates = entities.filter(e => {
        if (!e || !e.position || !e.isValid) return false;
        const dist = bot.entity.position.distanceTo(e.position);
        if (dist > radius) return false;

        if (e.type === 'player' && CONFIG.pvp.targetPlayers) {
          return e.username !== bot.username;
        }
        if (e.type === 'mob' && CONFIG.pvp.targetMobs) {
          const mobName = (e.name || e.displayName || '').toLowerCase().replace(/ /g, '_');
          if (CONFIG.pvp.avoidFriendlyMobs && FRIENDLY_MOBS.has(mobName)) return false;
          return HOSTILE_MOBS.has(mobName);
        }
        return false;
      });

      if (candidates.length === 0) return;

      // Pilih target terdekat dalam radius
      const target = candidates.reduce((closest, e) => {
        const d  = bot.entity.position.distanceTo(e.position);
        const cd = closest ? bot.entity.position.distanceTo(closest.position) : Infinity;
        return d < cd ? e : closest;
      }, null);

      if (!target) return;

      bot._pvpActive = true;

      // Equip senjata terbaik
      const weapon = bot.inventory.items().find(i =>
        i.name.includes('sword') || i.name.includes('axe')
      );
      if (weapon) {
        try { await bot.equip(weapon, 'hand'); } catch (e) {}
      }

      // DIAM — hanya hadap ke target lalu serang, TIDAK chase
      try {
        await bot.lookAt(
          target.position.offset(0, target.height ? target.height * 0.9 : 1, 0),
          true
        );
        await sleep(600); // tunggu swing cooldown
        bot.attack(target);
        const targetName = target.username || target.name || target.displayName || 'entity';
        console.log(`  ⚔️  [${botName}] Serang (diam): ${targetName}`);
      } catch (e) {}

      bot._pvpActive = false;
    } catch (e) {
      bot._pvpActive = false;
    }
  }, CONFIG.pvp.attackInterval);

  bot._pvpInterval = attackInterval;
}

// ============================================================
// DIG — DIGGER: hancurin block sampai 64 item (1 stack)
// Setelah penuh → langsung trigger random build
// ============================================================
function startDig(bot, botName) {
  bot._digging       = false;
  bot._inventoryFull = false; // flag: sudah 64 block, pindah ke build

  function countInventoryBlocks() {
    return bot.inventory.items().filter(i => {
      const n = i.name;
      return !(
        n.includes('sword') || n.includes('axe') || n.includes('pickaxe') ||
        n.includes('shovel') || n.includes('hoe') || n.includes('helmet') ||
        n.includes('chestplate') || n.includes('leggings') || n.includes('boots') ||
        n.includes('bow') || n.includes('crossbow') || n.includes('trident') ||
        n.includes('shield') || n.includes('bucket') || n.includes('flint')
      );
    }).reduce((sum, i) => sum + i.count, 0);
  }

  function findDigTarget() {
    if (!bot.entity) return null;
    const pos    = bot.entity.position.floored();
    const radius = CONFIG.dig.radius;
    let   best   = null;
    let   bestD  = Infinity;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const b = bot.blockAt(pos.offset(dx, dy, dz));
          if (!b) continue;
          if (b.name === 'air' || b.name === 'cave_air' || b.name === 'void_air') continue;
          if (CONFIG.dig.blacklist.has(b.name)) continue;
          if (!bot.canDigBlock(b)) continue;

          const bx = b.position.x, by = b.position.y, bz = b.position.z;
          const ex = pos.x, ey = pos.y, ez = pos.z;
          if (bx === ex && by === ey - 1 && bz === ez) continue; // jangan hancurin lantai sendiri

          const d = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
          if (d < bestD) { bestD = d; best = b; }
        }
      }
    }
    return best;
  }

  async function doDigCycle() {
    if (bot._digging) return;
    if (!bot.entity) return;
    if (bot._inventoryFull) return; // sudah penuh, biarkan builder loop ambil alih

    const blockCount = countInventoryBlocks();

    // Inventory sudah 64 (1 stack) → flag penuh, trigger build sekali
    if (blockCount >= CONFIG.dig.maxInventoryBlocks) {
      if (!bot._inventoryFull) {
        bot._inventoryFull = true;
        console.log(`  📦 [${botName}] Inventory penuh (${blockCount} block)! Mulai build...`);
        doBuild(bot, botName); // trigger build langsung
      }
      return;
    }

    const target = findDigTarget();
    if (!target) return;

    bot._digging = true;
    try {
      await bot.lookAt(target.position.offset(0.5, 0.5, 0.5), true);

      const bestTool = bot.inventory.items().find(i =>
        i.name.includes('pickaxe') || i.name.includes('shovel') ||
        i.name.includes('axe')     || i.name.includes('hoe')
      );
      if (bestTool) {
        try { await bot.equip(bestTool, 'hand'); } catch (e) {}
      }

      console.log(`  ⛏️  [${botName}] Hancurin: ${target.name} | Inventory: ${blockCount}/${CONFIG.dig.maxInventoryBlocks}`);
      await bot.dig(target);
      console.log(`  ✅ [${botName}] Block hancur! Inventory: ${countInventoryBlocks()}/${CONFIG.dig.maxInventoryBlocks}`);
    } catch (e) {
      // Block sudah hilang atau penghalang, skip
    } finally {
      bot._digging = false;
    }
  }

  const interval = setInterval(() => doDigCycle(), CONFIG.dig.checkInterval);
  bot._digInterval = interval;
}

// ============================================================
// RANDOM BUILD — digunakan oleh BUILDER dan DIGGER (setelah penuh)
// ============================================================
async function doBuild(bot, botName) {
  const buildTypes  = ['tower', 'wall', 'floor', 'pyramid', 'random'];
  const buildBlocks = [
    'dirt', 'cobblestone', 'oak_planks', 'stone', 'sand',
    'gravel', 'oak_log', 'oak_leaves', 'glass', 'bricks',
  ];

  try {
    if (!bot.entity) return;

    const botPos    = bot.entity.position.floored();
    const buildType = buildTypes[Math.floor(Math.random() * buildTypes.length)];
    const size      = 2 + Math.floor(Math.random() * (CONFIG.build.maxSize - 1));
    const height    = 1 + Math.floor(Math.random() * CONFIG.build.maxHeight);

    // Cari block yang ada di inventory (dari dig atau bawaan)
    const availableBlocks = buildBlocks.filter(name =>
      bot.inventory.items().some(i => i.name === name)
    );
    if (availableBlocks.length === 0) return;
    const blockName = availableBlocks[Math.floor(Math.random() * availableBlocks.length)];

    console.log(`  🏗️  [${botName}] Build: ${buildType} (${size}x${height}) dari ${blockName}`);

    const block = bot.inventory.items().find(i => i.name === blockName);
    if (!block) return;
    await bot.equip(block, 'hand');

    const startX = botPos.x + 1;
    const startY = botPos.y;
    const startZ = botPos.z;

    const Vec3 = bot.entity.position.constructor;

    if (buildType === 'tower') {
      for (let y = 0; y < height; y++) {
        const tb = bot.blockAt(new Vec3(startX, startY + y - 1, startZ));
        if (tb) try { await bot.placeBlock(tb, new Vec3(0, 1, 0)); } catch (e) {}
        await sleep(300);
      }
    } else if (buildType === 'wall') {
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < Math.min(height, 3); y++) {
          const tb = bot.blockAt(new Vec3(startX + x, startY + y - 1, startZ));
          if (tb) try { await bot.placeBlock(tb, new Vec3(0, 1, 0)); } catch (e) {}
          await sleep(200);
        }
      }
    } else if (buildType === 'floor') {
      for (let x = 0; x < size; x++) {
        for (let z = 0; z < size; z++) {
          const tb = bot.blockAt(new Vec3(startX + x, startY - 1, startZ + z));
          if (tb) try { await bot.placeBlock(tb, new Vec3(0, 1, 0)); } catch (e) {}
          await sleep(150);
        }
      }
    } else if (buildType === 'pyramid') {
      const levels = Math.min(height, Math.floor(size / 2) + 1);
      for (let lvl = 0; lvl < levels; lvl++) {
        const s = size - lvl * 2;
        if (s <= 0) break;
        for (let x = 0; x < s; x++) {
          for (let z = 0; z < s; z++) {
            const tb = bot.blockAt(new Vec3(startX + lvl + x, startY + lvl - 1, startZ + lvl + z));
            if (tb) try { await bot.placeBlock(tb, new Vec3(0, 1, 0)); } catch (e) {}
            await sleep(100);
          }
        }
      }
    } else {
      const blockCount = size * size;
      for (let i = 0; i < blockCount; i++) {
        const rx = Math.floor(Math.random() * size);
        const ry = Math.floor(Math.random() * height);
        const rz = Math.floor(Math.random() * size);
        const tb = bot.blockAt(new Vec3(startX + rx, startY + ry - 1, startZ + rz));
        if (tb) try { await bot.placeBlock(tb, new Vec3(0, 1, 0)); } catch (e) {}
        await sleep(150);
      }
    }
    console.log(`  ✅ [${botName}] Build selesai!`);
  } catch (e) {}
}

function startRandomBuild(bot, botName) {
  // Build pertama setelah 10 detik
  const timeoutFirst = setTimeout(() => doBuild(bot, botName), 10000);
  const interval     = setInterval(() => doBuild(bot, botName), CONFIG.build.interval);
  bot._buildTimeout  = timeoutFirst;
  bot._buildInterval = interval;
}

// ============================================================
// CLEANUP BOT
// ============================================================
function cleanupBot(botName) {
  const bot = activeBots.get(botName);
  if (!bot) return;
  try { clearInterval(bot._movementInterval); }   catch (e) {}
  try { clearInterval(bot._chatInterval); }        catch (e) {}
  try { clearInterval(bot._pvpInterval); }         catch (e) {}
  try { clearInterval(bot._buildInterval); }       catch (e) {}
  try { clearInterval(bot._digInterval); }         catch (e) {}
  try { clearTimeout(bot._buildTimeout); }         catch (e) {}
  try { bot.clearControlStates(); }                catch (e) {}
  activeBots.delete(botName);
}

// ============================================================
// BUAT SATU BOT — assign role acak
// ============================================================
function createBot(botName, index) {
  const role = pickRole();
  const roleIcon = { walker: '🚶', digger: '⛏️ ', fighter: '⚔️ ', builder: '🏗️ ' }[role];
  console.log(`  [Bot ${String(index + 1).padStart(3)}] Connecting → ${botName} | Role: ${roleIcon} ${role}...`);

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

  bot._role          = role;
  bot._pvpActive     = false;
  bot._digging       = false;
  bot._inventoryFull = false;
  bot._reconnecting  = false;
  activeBots.set(botName, bot);

  bot.once('spawn', () => {
    totalConnected++;
    console.log(`  ✅ [${botName}] Connected! Role: ${roleIcon} ${role} (Aktif: ${activeBots.size})`);

    // Semua bot chat
    startRandomChat(bot);

    switch (role) {
      case 'walker':
        // Hanya jalan-jalan, lihat-lihat, chat
        startHumanMovement(bot);
        break;

      case 'digger':
        // Hancurin block sampai 64, lalu otomatis build, sambil sesekali gerak
        startHumanMovement(bot); // tetap bergerak agar tidak statis total
        startDig(bot, botName);
        // Loop builder juga aktif, tapi diBuild baru jalan kalau _inventoryFull
        // Pakai interval ringan agar setelah inventoryFull langsung lanjut build
        const diggerBuildLoop = setInterval(() => {
          if (bot._inventoryFull) doBuild(bot, botName);
        }, CONFIG.build.interval);
        bot._diggerBuildLoop = diggerBuildLoop;
        break;

      case 'fighter':
        // Diam di tempat, serang musuh dalam radius
        // TIDAK startHumanMovement (diam)
        startPvP(bot, botName);
        break;

      case 'builder':
        // Jalan-jalan + build random
        startHumanMovement(bot);
        startRandomBuild(bot, botName);
        break;
    }
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
    if (bot._diggerBuildLoop) clearInterval(bot._diggerBuildLoop);
    cleanupBot(botName);
    if (CONFIG.autoReconnect && !bot._reconnecting) {
      bot._reconnecting = true;
      console.log(`  🔄 [${botName}] Reconnect dalam ${CONFIG.reconnectDelay / 1000}s...`);
      setTimeout(() => createBot(botName, index), CONFIG.reconnectDelay);
    }
  });

  bot.on('error', (err) => {
    if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
    if (err.code === 'ECONNREFUSED') {
      console.log(`  ❌ [${botName}] Koneksi ditolak — cek IP/port server!`);
    } else if (err.code === 'ENOTFOUND') {
      console.log(`  ❌ [${botName}] Domain tidak ditemukan — cek domain server!`);
    } else {
      console.log(`  ❌ [${botName}] Error: ${err.message}`);
    }
    if (bot._diggerBuildLoop) clearInterval(bot._diggerBuildLoop);
    cleanupBot(botName);
    if (CONFIG.autoReconnect && !bot._reconnecting) {
      bot._reconnecting = true;
      setTimeout(() => createBot(botName, index), CONFIG.reconnectDelay);
    }
  });

  bot.on('end', (reason) => {
    totalDisconnected++;
    console.log(`  🔌 [${botName}] Disconnect: ${reason}`);
    if (bot._diggerBuildLoop) clearInterval(bot._diggerBuildLoop);
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
  console.log('  Role    : 🚶 Walker 35% | ⛏️  Digger 25% | ⚔️  Fighter 25% | 🏗️  Builder 15%');
  console.log(`  Dig max : ${CONFIG.dig.maxInventoryBlocks} block (1 stack) → auto build`);
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
    const roleCounts = { walker: 0, digger: 0, fighter: 0, builder: 0 };
    for (const [, bot] of activeBots) {
      if (bot._role && roleCounts[bot._role] !== undefined) roleCounts[bot._role]++;
    }
    console.log(
      `\n  📊 STATUS → Aktif: ${activeBots.size} | Connect: ${totalConnected} | Disconnect: ${totalDisconnected}` +
      ` | 🚶${roleCounts.walker} ⛏️ ${roleCounts.digger} ⚔️ ${roleCounts.fighter} 🏗️ ${roleCounts.builder}\n`
    );
  }, 15000);
}

// ============================================================
// CTRL+C — Matikan semua bot dengan bersih
// ============================================================
process.on('SIGINT', () => {
  console.log('\n\n  🛑 Menghentikan semua bot...');
  for (const [name, bot] of activeBots) {
    try { bot.quit('Script dihentikan'); } catch (e) {}
    if (bot._diggerBuildLoop) clearInterval(bot._diggerBuildLoop);
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
  CONFIG.host     = input.host;
  CONFIG.port     = input.port;
  CONFIG.botCount = input.botCount;
  CONFIG.version  = input.version;
  await spawnAllBots();
})();
