/**
 * ============================================================
 *  Minecraft Bot Player - Load Testing Script  v3
 *  Support: Java Edition + Bedrock Edition
 *  Library: Mineflayer + bedrock-protocol (Node.js)
 *  Fitur: Movement, Chat anti-spam, Block Breaking
 * ============================================================
 */

const mineflayer   = require('mineflayer');
const bedrock      = require('bedrock-protocol');
const readline     = require('readline');

// ============================================================
// TERMINAL COLORS
// ============================================================
const C = {
  reset:   '\x1b[0m',
  bright:  '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgBlue:  '\x1b[44m',
};

const log = {
  info:  (m) => console.log(`  ${C.cyan}ℹ${C.reset}  ${m}`),
  ok:    (m) => console.log(`  ${C.green}✔${C.reset}  ${m}`),
  warn:  (m) => console.log(`  ${C.yellow}⚠${C.reset}  ${m}`),
  err:   (m) => console.log(`  ${C.red}✖${C.reset}  ${m}`),
  kick:  (m) => console.log(`  ${C.magenta}⊘${C.reset}  ${m}`),
  disc:  (m) => console.log(`  ${C.dim}↓${C.reset}  ${m}`),
  break: (m) => console.log(`  ${C.yellow}⛏${C.reset}  ${m}`),
  stat:  (m) => console.log(`\n  ${C.bgBlue}${C.white}${C.bright} STAT ${C.reset}  ${m}\n`),
};

// ============================================================
// INTERACTIVE INPUT
// ============================================================
const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function getInput() {
  console.log('');
  console.log(`${C.cyan}${C.bright}  ╔══════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}${C.bright}  ║   🤖  Minecraft Bot Player — Java & Bedrock Edition      ║${C.reset}`);
  console.log(`${C.cyan}${C.bright}  ╚══════════════════════════════════════════════════════════╝${C.reset}`);
  console.log('');

  const editionRaw = (await ask(`  ${C.bright}[1]${C.reset} Java  ${C.bright}[2]${C.reset} Bedrock\n  🎮 Edition (1/2)                   : `)).trim();
  const edition    = editionRaw === '2' ? 'bedrock' : 'java';

  const host       = (await ask(`  🌐 Domain / IP server              : `)).trim() || 'localhost';
  const portRaw    = (await ask(`  🔌 Port server                     : `)).trim();
  const port       = parseInt(portRaw) || (edition === 'bedrock' ? 19132 : 25565);

  let version = '';
  if (edition === 'java') {
    const verRaw = (await ask(`  🎮 Versi Minecraft (kosong=auto)   : `)).trim();
    version      = verRaw || 'auto';
  } else {
    const verRaw = (await ask(`  🎮 Versi Bedrock (kosong=auto)     : `)).trim();
    version      = verRaw || 'auto';
  }

  const countRaw   = (await ask(`  🤖 Jumlah bot                      : `)).trim();
  const botCount   = parseInt(countRaw) || 10;

  const delayRaw   = (await ask(`  ⏱️  Delay antar spawn (ms)          : `)).trim();
  const spawnDelay = parseInt(delayRaw) || 1500;

  const moveRaw    = (await ask(`  🏃 Gerakan human-like? (y/n)       : `)).trim().toLowerCase();
  const movement   = moveRaw !== 'n';

  const chatRaw    = (await ask(`  💬 Chat random anti-spam? (y/n)    : `)).trim().toLowerCase();
  const chatOn     = chatRaw !== 'n';

  const breakRaw   = (await ask(`  ⛏️  Hancurin block random? (y/n)    : `)).trim().toLowerCase();
  const breakOn    = breakRaw === 'y';

  const reconnRaw  = (await ask(`  🔄 Auto reconnect? (y/n)           : `)).trim().toLowerCase();
  const autoReconn = reconnRaw !== 'n';

  rl.close();
  console.log('');
  return { host, port, botCount, version, edition, spawnDelay, movement, chatOn, breakOn, autoReconn };
}

// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
  host: '',
  port: 25565,
  version: 'auto',
  edition: 'java',
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
    // Anti-spam: tiap bot punya delay beda — base 60s + jitter 0-60s
    // Artinya setiap bot chat antara 60-120 detik sekali, dan tidak barengan
    baseInterval: 60000,
    jitter: 60000,
    messages: [
      'halo semua!',
      'server nya kenceng ga?',
      'woy ada yang main?',
      'lag ga nih?',
      'mantap servernya',
      'nice server',
      'berapa ping kalian?',
      'ada yang tau texture pack bagus?',
      'gw baru join nih',
      'wah seru juga nih servernya',
      'ada yang mau trade?',
      'dimana spawnnya?',
      'server ini PvP atau survival?',
      'gw nyasar wkwk',
      'ada yang bisa bantu gw?',
      'lag dikit nih dari tadi',
      'udah lama main di sini?',
      'ada event apa nih?',
      'siapa admin servernya?',
      'servernya bagus banget',
      'bisa /home ga nih?',
      'pvp nya on ga?',
    ],
  },
  breakBlocks: {
    enabled: false,
    // Blok yang TIDAK dihancurin (biar ga ngehancurin bedrock/air/dll)
    blacklist: new Set([
      'air', 'bedrock', 'barrier', 'command_block', 'chain_command_block',
      'repeating_command_block', 'structure_block', 'jigsaw', 'end_portal_frame',
      'end_portal', 'nether_portal', 'void_air', 'cave_air',
    ]),
    radius: 4,
    // Delay antar dig: 3-6 detik
    minDelay: 3000,
    maxDelay: 6000,
  },
};

// ============================================================
// AUTO-DETECT VERSION (Java)
// ============================================================
async function autoDetectJavaVersion(host, port) {
  return new Promise((resolve) => {
    try {
      const mc = require('minecraft-protocol');
      mc.ping({ host, port, closeTimeout: 5000 }, (err, result) => {
        if (err || !result) {
          log.warn('Auto-detect gagal, fallback 1.20.1');
          return resolve('1.20.1');
        }
        const ver   = result.version?.name || '1.20.1';
        const clean = ver.replace(/[^0-9.]/g, '').replace(/^\.+|\.+$/g, '') || '1.20.1';
        log.ok(`Auto-detect versi: ${C.bright}${clean}${C.reset}`);
        resolve(clean);
      });
    } catch (e) {
      log.warn(`Auto-detect error: ${e.message} — fallback 1.20.1`);
      resolve('1.20.1');
    }
  });
}

// ============================================================
// NAMA RANDOM
// ============================================================
const adjectives = [
  'Crazy','Cool','Epic','Dark','Swift','Iron','Fire','Storm',
  'Shadow','Neon','Hyper','Ultra','Mega','Super','Wild','Frost',
  'Blaze','Thunder','Sky','Void','Pixel','Turbo','Nitro','Rapid',
  'Astro','Cyber','Venom','Stealth','Crystal','Atomic',
];
const nouns = [
  'Creeper','Warrior','Dragon','Knight','Hunter','Slayer','Master',
  'Phantom','Ninja','Ranger','Miner','Builder','Coder','Wizard',
  'Archer','Beast','Ghost','Legend','Pro','Gamer','Blade','Wolf',
  'Titan','Falcon','Viper','Cobra','Lynx','Hawk','Fox','Bear',
];

function generateRandomName() {
  const adj  = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num  = Math.floor(Math.random() * 9999);
  return `${adj}${noun}${num}`;
}

// ============================================================
// STATE
// ============================================================
const activeBots      = new Map();
let totalConnected    = 0;
let totalDisconnected = 0;
let totalErrors       = 0;

// ============================================================
// HUMAN-LIKE MOVEMENT (Java)
// ============================================================
function startHumanMovement(bot) {
  const directions = ['forward', 'back', 'left', 'right'];
  const interval = setInterval(() => {
    try {
      bot.clearControlStates();
      const cfg = CONFIG.movement;
      if (Math.random() < 0.6) {
        const dir = directions[Math.floor(Math.random() * directions.length)];
        bot.setControlState(dir, true);
        if (Math.random() < cfg.sprintChance) bot.setControlState('sprint', true);
        if (Math.random() < cfg.sneakChance)  bot.setControlState('sneak',  true);
        if (Math.random() < cfg.jumpChance) {
          setTimeout(() => {
            try { bot.setControlState('jump', true); } catch (_) {}
            setTimeout(() => { try { bot.setControlState('jump', false); } catch (_) {} }, 300);
          }, 200);
        }
        setTimeout(() => { try { bot.clearControlStates(); } catch (_) {} },
          1000 + Math.random() * 2000);
      }
      if (Math.random() < cfg.lookAroundChance) {
        try { bot.look((Math.random() * 2 - 1) * Math.PI, Math.random() * 0.6 - 0.3, false); } catch (_) {}
      }
    } catch (_) {}
  }, CONFIG.movement.interval + Math.random() * 1000);
  bot._movementInterval = interval;
}

// ============================================================
// RANDOM CHAT — ANTI SPAM (Java)
// Setiap bot schedule ulang delay nya sendiri setelah kirim chat
// jadi ga pernah barengan dan ga predictable
// ============================================================
function startRandomChatJava(bot) {
  if (!CONFIG.chat.enabled) return;

  function scheduleNextChat() {
    // Delay unik tiap bot: base + random jitter
    const delay = CONFIG.chat.baseInterval + Math.floor(Math.random() * CONFIG.chat.jitter);
    bot._chatTimeout = setTimeout(() => {
      try {
        const msgs = CONFIG.chat.messages;
        const msg  = msgs[Math.floor(Math.random() * msgs.length)];
        bot.chat(msg);
      } catch (_) {}
      scheduleNextChat(); // jadwalin lagi setelah kirim
    }, delay);
  }

  // Tiap bot mulai dengan offset awal yang random biar ga barengan saat spawn
  const initialDelay = Math.floor(Math.random() * CONFIG.chat.baseInterval);
  bot._chatTimeout = setTimeout(scheduleNextChat, initialDelay);
}

// ============================================================
// BLOCK BREAKING (Java only — mineflayer digBlock API)
// Bot cari block terdekat dalam radius, lalu hancurin satu per satu
// ============================================================
function startBlockBreaking(bot) {
  if (!CONFIG.breakBlocks.enabled) return;

  async function digLoop() {
    try {
      const pos = bot.entity.position;
      const r   = CONFIG.breakBlocks.radius;
      const bl  = CONFIG.breakBlocks.blacklist;

      // Scan blok dalam radius (kubus r*2+1)
      let target = null;
      for (let dx = -r; dx <= r && !target; dx++) {
        for (let dy = -2; dy <= 2 && !target; dy++) {
          for (let dz = -r; dz <= r && !target; dz++) {
            const block = bot.blockAt(pos.offset(dx, dy, dz));
            if (block && block.name && !bl.has(block.name) && block.name !== 'air') {
              target = block;
            }
          }
        }
      }

      if (target) {
        // Look ke arah block dulu biar keliatan natural
        try { await bot.lookAt(target.position.offset(0.5, 0.5, 0.5)); } catch (_) {}

        // Cek bisa di-dig
        if (bot.canDigBlock(target)) {
          try {
            log.break(`[${bot.username}] Hancurin: ${C.yellow}${target.name}${C.reset} @ (${target.position.x},${target.position.y},${target.position.z})`);
            await bot.dig(target);
          } catch (_) {}
        }
      }
    } catch (_) {}

    // Jadwalin dig berikutnya dengan delay random
    const delay = CONFIG.breakBlocks.minDelay
                + Math.floor(Math.random() * (CONFIG.breakBlocks.maxDelay - CONFIG.breakBlocks.minDelay));
    bot._breakTimeout = setTimeout(digLoop, delay);
  }

  // Mulai dengan delay awal random biar tiap bot ga barengan
  const initialDelay = Math.floor(Math.random() * 5000) + 2000;
  bot._breakTimeout = setTimeout(digLoop, initialDelay);
}

// ============================================================
// CLEANUP
// ============================================================
function cleanupBot(botName) {
  const bot = activeBots.get(botName);
  if (!bot) return;
  try { clearInterval(bot._movementInterval); } catch (_) {}
  try { clearTimeout(bot._chatTimeout);       } catch (_) {}
  try { clearTimeout(bot._breakTimeout);      } catch (_) {}
  if (CONFIG.edition === 'java') {
    try { bot.clearControlStates(); } catch (_) {}
  }
  activeBots.delete(botName);
}

// ============================================================
// CREATE JAVA BOT (Mineflayer)
// ============================================================
function createJavaBot(botName, index) {
  log.info(`[Bot ${String(index + 1).padStart(3)}] Java → ${C.bright}${botName}${C.reset} …`);

  let bot;
  try {
    bot = mineflayer.createBot({
      host:                 CONFIG.host,
      port:                 CONFIG.port,
      username:             botName,
      version:              CONFIG.version === 'auto' ? false : CONFIG.version,
      hideErrors:           false,
      checkTimeoutInterval: 30000,
    });
  } catch (err) {
    totalErrors++;
    log.err(`[${botName}] Gagal buat bot: ${err.message}`);
    if (CONFIG.autoReconnect) setTimeout(() => createJavaBot(botName, index), CONFIG.reconnectDelay);
    return;
  }

  activeBots.set(botName, bot);

  bot.once('spawn', () => {
    totalConnected++;
    log.ok(`[${botName}] ${C.green}Connected!${C.reset} (Aktif: ${activeBots.size})`);
    if (CONFIG.movement.enabled)    startHumanMovement(bot);
    if (CONFIG.chat.enabled)        startRandomChatJava(bot);
    if (CONFIG.breakBlocks.enabled) startBlockBreaking(bot);
  });

  bot.on('kicked', (reason) => {
    totalDisconnected++;
    let r = reason;
    try { r = JSON.parse(reason)?.text || reason; } catch (_) {}
    log.kick(`[${botName}] Kicked: ${r}`);
    cleanupBot(botName);
    if (CONFIG.autoReconnect) {
      log.info(`[${botName}] Reconnect dalam ${CONFIG.reconnectDelay / 1000}s …`);
      setTimeout(() => createJavaBot(botName, index), CONFIG.reconnectDelay);
    }
  });

  bot.on('error', (err) => {
    totalErrors++;
    log.err(`[${botName}] Error: ${err.message}`);
    cleanupBot(botName);
    if (CONFIG.autoReconnect) setTimeout(() => createJavaBot(botName, index), CONFIG.reconnectDelay);
  });

  bot.on('end', (reason) => {
    totalDisconnected++;
    log.disc(`[${botName}] Disconnect: ${reason}`);
    cleanupBot(botName);
    if (CONFIG.autoReconnect && reason !== 'manual') {
      setTimeout(() => createJavaBot(botName, index), CONFIG.reconnectDelay);
    }
  });

  return bot;
}

// ============================================================
// CREATE BEDROCK BOT (bedrock-protocol)
// ============================================================
function createBedrockBot(botName, index) {
  log.info(`[Bot ${String(index + 1).padStart(3)}] Bedrock → ${C.bright}${botName}${C.reset} …`);

  let client;
  const clientOptions = {
    host:    CONFIG.host,
    port:    CONFIG.port,
    username: botName,
    offline: true,
  };

  if (CONFIG.version && CONFIG.version !== 'auto') {
    clientOptions.version = CONFIG.version;
  }

  try {
    client = bedrock.createClient(clientOptions);
  } catch (err) {
    totalErrors++;
    log.err(`[${botName}] Gagal buat bedrock bot: ${err.message}`);
    if (CONFIG.autoReconnect) setTimeout(() => createBedrockBot(botName, index), CONFIG.reconnectDelay);
    return;
  }

  activeBots.set(botName, client);

  client.on('join', () => {
    totalConnected++;
    log.ok(`[${botName}] ${C.green}Bedrock Connected!${C.reset} (Aktif: ${activeBots.size})`);

    // Bedrock chat — anti spam dengan timeout scheduling
    if (CONFIG.chat.enabled) {
      function scheduleBedrockChat() {
        const delay = CONFIG.chat.baseInterval + Math.floor(Math.random() * CONFIG.chat.jitter);
        client._chatTimeout = setTimeout(() => {
          try {
            const msgs = CONFIG.chat.messages;
            client.queue('text', {
              type:             'chat',
              needs_translation: false,
              source_name:      botName,
              xuid:             '',
              platform_chat_id: '',
              message:          msgs[Math.floor(Math.random() * msgs.length)],
            });
          } catch (_) {}
          scheduleBedrockChat();
        }, delay);
      }
      const initDelay = Math.floor(Math.random() * CONFIG.chat.baseInterval);
      client._chatTimeout = setTimeout(scheduleBedrockChat, initDelay);
    }

    // Bedrock movement
    if (CONFIG.movement.enabled) {
      let x = 0, y = 64, z = 0;
      const moveInterval = setInterval(() => {
        try {
          x += (Math.random() - 0.5) * 2;
          z += (Math.random() - 0.5) * 2;
          client.queue('move_player', {
            runtime_id: 1n,
            position:   { x, y, z },
            pitch: 0,
            yaw:   Math.random() * 360,
            head_yaw: 0,
            mode: 0,
            on_ground: true,
            ridden_runtime_id: 0n,
            cause: { type: 'unknown', entity_id: 0n },
          });
        } catch (_) {}
      }, CONFIG.movement.interval + Math.random() * 1000);
      client._movementInterval = moveInterval;
    }
  });

  client.on('kick', (reason) => {
    totalDisconnected++;
    let r = reason?.message || JSON.stringify(reason) || 'Unknown';
    log.kick(`[${botName}] Kicked: ${r}`);
    cleanupBot(botName);
    if (CONFIG.autoReconnect) {
      log.info(`[${botName}] Reconnect dalam ${CONFIG.reconnectDelay / 1000}s …`);
      setTimeout(() => createBedrockBot(botName, index), CONFIG.reconnectDelay);
    }
  });

  client.on('error', (err) => {
    totalErrors++;
    log.err(`[${botName}] Bedrock Error: ${err.message}`);
    cleanupBot(botName);
    if (CONFIG.autoReconnect) setTimeout(() => createBedrockBot(botName, index), CONFIG.reconnectDelay);
  });

  client.on('close', () => {
    totalDisconnected++;
    log.disc(`[${botName}] Bedrock disconnect.`);
    cleanupBot(botName);
    if (CONFIG.autoReconnect) setTimeout(() => createBedrockBot(botName, index), CONFIG.reconnectDelay);
  });

  return client;
}

// ============================================================
// UNIFIED BOT SPAWNER
// ============================================================
function createBot(botName, index) {
  if (CONFIG.edition === 'bedrock') return createBedrockBot(botName, index);
  return createJavaBot(botName, index);
}

// ============================================================
// SPAWN ALL BOTS
// ============================================================
async function spawnAllBots() {
  console.log(`  ${C.dim}──────────────────────────────────────────────────────────${C.reset}`);
  log.info(`Server  : ${C.bright}${CONFIG.host}:${CONFIG.port}${C.reset}`);
  log.info(`Edition : ${C.bright}${CONFIG.edition.toUpperCase()}${C.reset}`);
  log.info(`Versi   : ${C.bright}${CONFIG.version}${C.reset}`);
  log.info(`Jumlah  : ${C.bright}${CONFIG.botCount} bot${C.reset}`);
  log.info(`Delay   : ${C.bright}${CONFIG.spawnDelay}ms${C.reset} antar bot`);
  log.info(`Gerak   : ${CONFIG.movement.enabled       ? C.green + 'ON' : C.red + 'OFF'}${C.reset}`);
  log.info(`Chat    : ${CONFIG.chat.enabled            ? C.green + 'ON' : C.red + 'OFF'}${C.reset}`);
  log.info(`Break   : ${CONFIG.breakBlocks.enabled     ? C.green + 'ON' : C.red + 'OFF'}${C.reset}`);
  log.info(`Reconn  : ${CONFIG.autoReconnect           ? C.green + 'ON' : C.red + 'OFF'}${C.reset}`);
  console.log(`  ${C.dim}──────────────────────────────────────────────────────────${C.reset}\n`);

  const botNames = new Set();
  while (botNames.size < CONFIG.botCount) botNames.add(generateRandomName());
  const names = Array.from(botNames);

  for (let i = 0; i < CONFIG.botCount; i++) {
    createBot(names[i], i);
    if (i < CONFIG.botCount - 1) {
      await new Promise(r => setTimeout(r, CONFIG.spawnDelay));
    }
  }

  console.log('');
  log.ok('Semua bot sudah di-spawn!\n');
}

// ============================================================
// STATUS MONITOR
// ============================================================
setInterval(() => {
  log.stat(
    `Aktif: ${C.green}${C.bright}${activeBots.size}${C.reset}  ` +
    `Connect: ${C.cyan}${totalConnected}${C.reset}  ` +
    `Disconnect: ${C.yellow}${totalDisconnected}${C.reset}  ` +
    `Error: ${C.red}${totalErrors}${C.reset}`
  );
}, 15000);

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
process.on('SIGINT', () => {
  console.log('\n');
  log.warn('Menghentikan semua bot …');
  for (const [name, bot] of activeBots) {
    try {
      if (CONFIG.edition === 'java') bot.quit('Script dihentikan');
      else bot.disconnect();
    } catch (_) {}
    cleanupBot(name);
  }
  log.ok('Semua bot disconnect. Sampai jumpa!\n');
  process.exit(0);
});

// ============================================================
// MAIN
// ============================================================
(async () => {
  const input = await getInput();

  CONFIG.host                   = input.host;
  CONFIG.port                   = input.port;
  CONFIG.botCount               = input.botCount;
  CONFIG.edition                = input.edition;
  CONFIG.spawnDelay             = input.spawnDelay;
  CONFIG.autoReconnect          = input.autoReconn;
  CONFIG.movement.enabled       = input.movement;
  CONFIG.chat.enabled           = input.chatOn;
  CONFIG.breakBlocks.enabled    = input.breakOn;
  CONFIG.reconnectDelay         = 5000;

  if (input.edition === 'java' && input.version === 'auto') {
    log.info('Auto-detecting versi Java server …');
    CONFIG.version = await autoDetectJavaVersion(input.host, input.port);
  } else {
    CONFIG.version = input.version;
  }

  await spawnAllBots();
})();
