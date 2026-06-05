/**
 * ============================================================
 *  Minecraft Bot Player - Load Testing Script
 *  Dibuat untuk menguji kapasitas server Minecraft
 *  Library: Mineflayer (Node.js)
 *  Author: NebulaCloudID
 *  Update: + PvP Fix + Dig Fix (limit 64/1 stack → auto build)
 *          + Semua bot gerak (tidak ada yang diam)
 * ============================================================
 */

const mineflayer = require('mineflayer');
const readline   = require('readline');

// ============================================================
// INPUT INTERAKTIF
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
  let pvpLimit = 3;
  if (pvpEnabled) {
    const pvpLimitRaw = (await ask('  🎯 Max target dipukul per bot   : ')).trim();
    pvpLimit = parseInt(pvpLimitRaw) || 3;
  }
  const buildRaw     = (await ask('  🏗️  Aktifkan Random Build? (y/n) : ')).trim().toLowerCase();
  const buildEnabled = buildRaw === 'y';
  const digRaw       = (await ask('  ⛏️  Aktifkan Dig? (y/n)          : ')).trim().toLowerCase();
  const digEnabled   = digRaw === 'y';

  rl.close();
  console.log('');
  return { host, port, botCount, version: ver, pvpEnabled, pvpLimit, buildEnabled, digEnabled };
}

// ============================================================
// KONFIGURASI
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
    enabled: false,
    maxTargets: 3,
    attackRadius: 4,
    attackInterval: 1500,
    targetPlayers: true,
    targetMobs: true,
    avoidFriendlyMobs: true,
  },
  build: {
    enabled: false,
    interval: 60000,
    maxHeight: 5,
    maxSize: 5,
  },
  dig: {
    enabled: false,
    checkInterval: 500,
    maxInventoryBlocks: 64, // 1 stack penuh → auto build
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
// MOB LISTS
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
  'axolotl', 'glow_squid', 'allay', 'frog', 'tadpole', 'camel', 'sniffer',
]);

// ============================================================
// NAMA RANDOM
// ============================================================
const adjectives = [
  'Crazy','Cool','Epic','Dark','Swift','Iron','Fire','Storm',
  'Shadow','Neon','Hyper','Ultra','Mega','Super','Wild','Frost',
  'Blaze','Thunder','Sky','Void','Pixel','Turbo','Nitro','Rapid',
];
const nouns = [
  'Creeper','Warrior','Dragon','Knight','Hunter','Slayer','Master',
  'Phantom','Ninja','Ranger','Miner','Builder','Coder','Wizard',
  'Archer','Beast','Ghost','Legend','Pro','Gamer','Blade','Wolf',
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
// GERAKAN HUMAN-LIKE — SEMUA BOT SELALU GERAK
// ============================================================
function startHumanMovement(bot) {
  const directions = ['forward', 'back', 'left', 'right'];

  const interval = setInterval(() => {
    try {
      // Kalau sedang nge-dig jangan gerak, PvP boleh tetap gerak
      if (bot._digging) return;

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

        setTimeout(() => {
          try { bot.clearControlStates(); } catch (e) {}
        }, 1000 + Math.random() * 2000);
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
// PvP — chase + pukul, reset counter tiap 60 detik
// ============================================================
function startPvP(bot, botName) {
  if (!CONFIG.pvp.enabled) return;

  let attackedCount = 0;
  bot._pvpActive = false;

  const resetInterval = setInterval(() => {
    attackedCount = 0;
  }, 60000);

  const attackInterval = setInterval(async () => {
    try {
      if (bot._pvpActive) return;
      if (attackedCount >= CONFIG.pvp.maxTargets) return;
      if (!bot.entity) return;

      const radius   = CONFIG.pvp.attackRadius;
      const entities = Object.values(bot.entities);

      const candidates = entities.filter(e => {
        if (!e || !e.position || !e.isValid) return false;
        const dist = bot.entity.position.distanceTo(e.position);
        if (dist > radius) return false;
        if (e.type === 'player' && CONFIG.pvp.targetPlayers) return e.username !== bot.username;
        if (e.type === 'mob' && CONFIG.pvp.targetMobs) {
          const mobName = (e.name || e.displayName || '').toLowerCase().replace(/ /g, '_');
          if (CONFIG.pvp.avoidFriendlyMobs && FRIENDLY_MOBS.has(mobName)) return false;
          return HOSTILE_MOBS.has(mobName);
        }
        return false;
      });

      if (candidates.length === 0) return;

      const target = candidates.reduce((closest, e) => {
        const d  = bot.entity.position.distanceTo(e.position);
        const cd = closest ? bot.entity.position.distanceTo(closest.position) : Infinity;
        return d < cd ? e : closest;
      }, null);

      if (!target) return;

      bot._pvpActive = true;

      const weapon = bot.inventory.items().find(i =>
        i.name.includes('sword') || i.name.includes('axe')
      );
      if (weapon) {
        try { await bot.equip(weapon, 'hand'); } catch (e) {}
      }

      const dist = bot.entity.position.distanceTo(target.position);

      // Chase kalau jauh
      if (dist > 2.5) {
        bot.setControlState('sprint', true);
        bot.setControlState('forward', true);

        const chaseInterval = setInterval(() => {
          try {
            if (!target.isValid || !bot.entity) return;
            bot.lookAt(target.position.offset(0, target.height ? target.height * 0.9 : 1, 0), true);
          } catch (e) {}
        }, 100);

        let waited = 0;
        while (waited < 3000) {
          await sleep(100);
          waited += 100;
          if (!bot.entity) break;
          if (bot.entity.position.distanceTo(target.position) <= 2.5) break;
        }
        clearInterval(chaseInterval);
        bot.clearControlStates();
      }

      try {
        await bot.lookAt(
          target.position.offset(0, target.height ? target.height * 0.9 : 1, 0),
          true
        );
        await sleep(600);
        bot.attack(target);
        attackedCount++;
        const targetName = target.username || target.name || target.displayName || 'entity';
        console.log(`  ⚔️  [${botName}] Serang: ${targetName} (${attackedCount}/${CONFIG.pvp.maxTargets})`);
      } catch (e) {}

      bot._pvpActive = false;
    } catch (e) {
      bot._pvpActive = false;
    }
  }, CONFIG.pvp.attackInterval);

  bot._pvpInterval      = attackInterval;
  bot._pvpResetInterval = resetInterval;
}

// ============================================================
// DIG — limit 64 (1 stack), setelah penuh → auto build
// ============================================================
function startDig(bot, botName) {
  if (!CONFIG.dig.enabled) return;

  bot._digging       = false;
  bot._inventoryFull = false;

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
    let best = null, bestD = Infinity;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const b = bot.blockAt(pos.offset(dx, dy, dz));
          if (!b) continue;
          if (b.name === 'air' || b.name === 'cave_air' || b.name === 'void_air') continue;
          if (CONFIG.dig.blacklist.has(b.name)) continue;
          if (!bot.canDigBlock(b)) continue;
          // Jangan hancurin lantai sendiri
          if (b.position.x === pos.x && b.position.y === pos.y - 1 && b.position.z === pos.z) continue;
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

    const blockCount = countInventoryBlocks();

    // Inventory penuh (64) → berhenti dig, trigger build sekali lalu tunggu build selesai
    if (blockCount >= CONFIG.dig.maxInventoryBlocks) {
      if (!bot._inventoryFull) {
        bot._inventoryFull = true;
        console.log(`  📦 [${botName}] Inventory penuh (${blockCount} block)! Switch ke build...`);
        await doBuild(bot, botName);
        bot._inventoryFull = false; // setelah build selesai, boleh dig lagi
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

      console.log(`  ⛏️  [${botName}] Hancurin: ${target.name} | Inv: ${blockCount}/${CONFIG.dig.maxInventoryBlocks}`);
      await bot.dig(target);
      console.log(`  ✅ [${botName}] Block hancur! Inv: ${countInventoryBlocks()}/${CONFIG.dig.maxInventoryBlocks}`);
    } catch (e) {
      // Block sudah hilang, skip
    } finally {
      bot._digging = false;
    }
  }

  const interval = setInterval(() => doDigCycle(), CONFIG.dig.checkInterval);
  bot._digInterval = interval;
}

// ============================================================
// RANDOM BUILD
// ============================================================
async function doBuild(bot, botName) {
  const buildTypes  = ['tower', 'wall', 'floor', 'pyramid', 'random'];
  const buildBlocks = [
    'dirt','cobblestone','oak_planks','stone','sand',
    'gravel','oak_log','oak_leaves','glass','bricks',
  ];

  try {
    if (!bot.entity) return;

    const botPos    = bot.entity.position.floored();
    const buildType = buildTypes[Math.floor(Math.random() * buildTypes.length)];
    const size      = 2 + Math.floor(Math.random() * (CONFIG.build.maxSize - 1));
    const height    = 1 + Math.floor(Math.random() * CONFIG.build.maxHeight);

    // Cari block yang tersedia di inventory
    const available = buildBlocks.filter(name => bot.inventory.items().some(i => i.name === name));
    if (available.length === 0) return;
    const blockName = available[Math.floor(Math.random() * available.length)];

    const block = bot.inventory.items().find(i => i.name === blockName);
    if (!block) return;

    console.log(`  🏗️  [${botName}] Build: ${buildType} (${size}x${height}) dari ${blockName}`);
    await bot.equip(block, 'hand');

    const Vec3   = bot.entity.position.constructor;
    const startX = botPos.x + 1;
    const startY = botPos.y;
    const startZ = botPos.z;

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
  if (!CONFIG.build.enabled) return;
  const timeoutFirst = setTimeout(() => doBuild(bot, botName), 10000);
  const interval     = setInterval(() => doBuild(bot, botName), CONFIG.build.interval);
  bot._buildTimeout  = timeoutFirst;
  bot._buildInterval = interval;
}

// ============================================================
// CLEANUP
// ============================================================
function cleanupBot(botName) {
  const bot = activeBots.get(botName);
  if (!bot) return;
  try { clearInterval(bot._movementInterval); }   catch (e) {}
  try { clearInterval(bot._chatInterval); }        catch (e) {}
  try { clearInterval(bot._pvpInterval); }         catch (e) {}
  try { clearInterval(bot._pvpResetInterval); }    catch (e) {}
  try { clearInterval(bot._buildInterval); }       catch (e) {}
  try { clearInterval(bot._digInterval); }         catch (e) {}
  try { clearTimeout(bot._buildTimeout); }         catch (e) {}
  try { bot.clearControlStates(); }                catch (e) {}
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

  bot._pvpActive     = false;
  bot._digging       = false;
  bot._inventoryFull = false;
  bot._reconnecting  = false;
  activeBots.set(botName, bot);

  bot.once('spawn', () => {
    totalConnected++;
    console.log(`  ✅ [${botName}] Connected! (Aktif: ${activeBots.size})`);

    // SEMUA BOT SELALU GERAK
    startHumanMovement(bot);
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
// SPAWN SEMUA BOT
// ============================================================
async function spawnAllBots() {
  console.log('──────────────────────────────────────────────────────────');
  console.log(`  Server  : ${CONFIG.host}:${CONFIG.port}`);
  console.log(`  Versi   : ${CONFIG.version}`);
  console.log(`  Jumlah  : ${CONFIG.botCount} bot`);
  console.log(`  Delay   : ${CONFIG.spawnDelay}ms antar bot`);
  console.log(`  PvP     : ${CONFIG.pvp.enabled ? `✅ (max ${CONFIG.pvp.maxTargets} target/60s)` : '❌'}`);
  console.log(`  Build   : ${CONFIG.build.enabled ? '✅' : '❌'}`);
  console.log(`  Dig     : ${CONFIG.dig.enabled ? `✅ (limit 64 block → auto build)` : '❌'}`);
  console.log('──────────────────────────────────────────────────────────');
  console.log('  Spawning bot...\n');

  const botNames = new Set();
  while (botNames.size < CONFIG.botCount) botNames.add(generateRandomName());

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
// CTRL+C
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
