const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client } = require('discord.js-selfbot-v13');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data', 'bots.json');

// ---------- Penyimpanan konfigurasi ----------
function loadBots() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function saveBots(bots) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(bots, null, 2));
}

let botsConfig = loadBots(); // [{id, name, token, channelIds:[], message, intervalSeconds, running}]

// Runtime state: id -> { client, timer, logs: [] }
const runtime = {};

function addLog(id, text) {
  if (!runtime[id]) return;
  const line = `[${new Date().toLocaleString('id-ID')}] ${text}`;
  runtime[id].logs.unshift(line);
  if (runtime[id].logs.length > 100) runtime[id].logs.pop();
  console.log(`Bot ${id}: ${text}`);
}

function findBot(id) {
  return botsConfig.find((b) => b.id === id);
}

// ---------- Kontrol bot ----------
async function startBot(id) {
  const bot = findBot(id);
  if (!bot) throw new Error('Bot tidak ditemukan');
  if (runtime[id] && runtime[id].client) throw new Error('Bot sudah berjalan');

  runtime[id] = runtime[id] || { logs: [] };
  runtime[id].client = null;
  runtime[id].timer = null;

  const client = new Client();

  client.once('ready', () => {
    addLog(id, `Login berhasil sebagai ${client.user.username}`);
    bot.running = true;
    saveBots(botsConfig);

    // Kirim langsung sekali, lalu ulangi tiap interval
    sendToAllChannels(id, client, bot);
    runtime[id].timer = setInterval(() => {
      sendToAllChannels(id, client, bot);
    }, Math.max(1000, (bot.intervalSeconds || 5) * 1000));
  });

  client.on('error', (err) => addLog(id, `Error client: ${err.message}`));

  try {
    await client.login(bot.token);
    runtime[id].client = client;
  } catch (err) {
    addLog(id, `Gagal login: ${err.message}`);
    bot.running = false;
    saveBots(botsConfig);
    throw err;
  }
}

async function sendToAllChannels(id, client, bot) {
  for (const channelId of bot.channelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      await channel.send(bot.message);
      addLog(id, `Pesan terkirim ke channel ${channelId}`);
    } catch (err) {
      addLog(id, `Gagal kirim ke ${channelId}: ${err.message}`);
    }
  }
}

async function stopBot(id) {
  const bot = findBot(id);
  if (!bot) throw new Error('Bot tidak ditemukan');
  const rt = runtime[id];
  if (rt) {
    if (rt.timer) clearInterval(rt.timer);
    if (rt.client) {
      try {
        await rt.client.destroy();
      } catch (e) {}
    }
    rt.client = null;
    rt.timer = null;
  }
  bot.running = false;
  saveBots(botsConfig);
  addLog(id, 'Bot dihentikan');
}

// ---------- API ----------

// Daftar semua bot (tanpa expose token penuh)
app.get('/api/bots', (req, res) => {
  const list = botsConfig.map((b) => ({
    id: b.id,
    name: b.name,
    tokenMasked: b.token ? b.token.slice(0, 6) + '...' + b.token.slice(-4) : '',
    channelIds: b.channelIds,
    message: b.message,
    intervalSeconds: b.intervalSeconds,
    running: !!(runtime[b.id] && runtime[b.id].client),
  }));
  res.json(list);
});

// Tambah bot baru
app.post('/api/bots', (req, res) => {
  const { name, token, channelIds, message, intervalSeconds } = req.body;
  if (!token || !channelIds || !message) {
    return res.status(400).json({ error: 'token, channelIds, dan message wajib diisi' });
  }
  const id = 'bot_' + Date.now();
  const bot = {
    id,
    name: name || id,
    token,
    channelIds: Array.isArray(channelIds) ? channelIds : String(channelIds).split(',').map((s) => s.trim()).filter(Boolean),
    message,
    intervalSeconds: Number(intervalSeconds) || 5,
    running: false,
  };
  botsConfig.push(bot);
  saveBots(botsConfig);
  runtime[id] = { logs: [] };
  res.json({ id });
});

// Edit bot
app.put('/api/bots/:id', (req, res) => {
  const bot = findBot(req.params.id);
  if (!bot) return res.status(404).json({ error: 'Tidak ditemukan' });
  const { name, token, channelIds, message, intervalSeconds } = req.body;
  if (name !== undefined) bot.name = name;
  if (token) bot.token = token;
  if (channelIds !== undefined) {
    bot.channelIds = Array.isArray(channelIds) ? channelIds : String(channelIds).split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (message !== undefined) bot.message = message;
  if (intervalSeconds !== undefined) bot.intervalSeconds = Number(intervalSeconds) || 5;
  saveBots(botsConfig);
  res.json({ ok: true });
});

// Hapus bot
app.delete('/api/bots/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await stopBot(id);
  } catch (e) {}
  botsConfig = botsConfig.filter((b) => b.id !== id);
  saveBots(botsConfig);
  delete runtime[id];
  res.json({ ok: true });
});

// Start bot
app.post('/api/bots/:id/start', async (req, res) => {
  try {
    await startBot(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Stop bot
app.post('/api/bots/:id/stop', async (req, res) => {
  try {
    await stopBot(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Log bot
app.get('/api/bots/:id/logs', (req, res) => {
  const rt = runtime[req.params.id];
  res.json({ logs: rt ? rt.logs : [] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Dashboard jalan di http://localhost:${PORT}`);
});
