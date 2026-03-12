import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

// ═══════════════════════════════════════════════════════
// LOCAL DB: Add system_costs table (mirrors VPS schema)
// ═══════════════════════════════════════════════════════
db.exec(`
  CREATE TABLE IF NOT EXISTS system_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT,
    cost_usd REAL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

const app = express();
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════
// OPENCLAW GATEWAY CONFIGURATION
// ═══════════════════════════════════════════════════════
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://187.124.153.19:65220';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '8xj0Wd8ZvAR9VK36KYCcX1SaBzAexpTg';
const SCRAPER_SCRIPT = '/data/.openclaw/workspace/belica_factory/scraper_agent.py';
const REMOTE_DB_PATH = '/data/.openclaw/workspace/belica_factory/belica_trends.db';

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════
// OPENCLAW API HELPER
// ═══════════════════════════════════════════════════════
async function openclawExec(command, background = false) {
  const res = await fetch(`${OPENCLAW_URL}/v1/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
    },
    body: JSON.stringify({ command, background }),
  });

  const text = await res.text();

  // Try parse JSON, fallback to raw text
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: { output: text } };
  }
}

async function openclawPoll(sessionId, timeout = 1000) {
  const res = await fetch(`${OPENCLAW_URL}/v1/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
    },
    body: JSON.stringify({ action: 'poll', sessionId, timeout }),
  });

  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: { output: text } };
  }
}

// ═══════════════════════════════════════════════════════
// WEBSOCKET SETUP
// ═══════════════════════════════════════════════════════
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'connected', message: 'Mission Control WebSocket Online' }));

  // ─── HENRY'S SYSTEM OVERRIDE ───────────────────────
  // Permanent startup message broadcast to every new client
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'agent_update',
      agent: 'orchestrator',
      status: 'completed',
      message: 'SYSTEM OVERRIDE: Henry (System Orchestrator) has accessed Mission Control. Synchronization complete.',
      timestamp: new Date().toISOString(),
    }));
    ws.send(JSON.stringify({
      type: 'terminal',
      line: '🦅 SYSTEM OVERRIDE: Henry (System Orchestrator) has accessed Mission Control. Synchronization complete.',
      timestamp: new Date().toISOString(),
    }));
  }, 500);

  ws.on('close', () => clients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify({ type: 'agent_update', ...data, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

function broadcastTerminal(line) {
  const msg = JSON.stringify({ type: 'terminal', line, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

// ═══════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════

// GET /api/trends — fetch from local SQLite (populated by remote sync)
app.get('/api/trends', (req, res) => {
  const trends = db.prepare('SELECT * FROM trends ORDER BY velocity_score DESC').all();
  res.json(trends);
});

// GET /api/trends/top — top 10 viral concepts
app.get('/api/trends/top', (req, res) => {
  const top = db.prepare(`
    SELECT * FROM trends
    WHERE trigger_type IS NOT NULL AND trigger_type != 'Unclassified'
    ORDER BY velocity_score DESC LIMIT 10
  `).all();
  res.json(top);
});

// GET /api/agents — agent roster
app.get('/api/agents', (req, res) => {
  const agents = [
    {
      name: 'Henry',
      role: 'System Orchestrator / COO',
      codename: 'orchestrator',
      llm: 'Gemini 3.1 Pro Preview',
      description: 'Oversees the entire pipeline, triggers sub-agents, manages data flow.',
      status: 'idle',
    },
    {
      name: 'Data Miner',
      role: 'Director of Intelligence',
      codename: 'data_miner',
      llm: 'Python / Apify API',
      description: 'Scrapes TikTok & Instagram for high-velocity trending content.',
      status: 'idle',
    },
    {
      name: 'Signal Processor',
      role: 'VP of Creative',
      codename: 'signal_processor',
      llm: 'Gemini 2.5 Flash',
      description: 'Analyzes content hooks and classifies psychological triggers.',
      status: 'idle',
    },
  ];

  for (const agent of agents) {
    const latestRun = db.prepare(
      'SELECT status, started_at, completed_at FROM agent_runs WHERE agent_name = ? ORDER BY id DESC LIMIT 1'
    ).get(agent.codename);
    if (latestRun) {
      agent.lastStatus = latestRun.status;
      agent.lastRun = latestRun.started_at;
      agent.lastCompleted = latestRun.completed_at;
    }
  }

  res.json(agents);
});

// GET /api/opex — financial summary (local opex_ledger + remote system_costs)
app.get('/api/opex', async (req, res) => {
  // Local OPEX ledger totals
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(apify_cost), 0) as total_apify_cost,
      COALESCE(SUM(gemini_cost), 0) as total_gemini_cost,
      COALESCE(SUM(total_cost), 0) as total_cost,
      COALESCE(SUM(apify_results), 0) as total_apify_results,
      COALESCE(SUM(gemini_input_tokens), 0) as total_gemini_input,
      COALESCE(SUM(gemini_output_tokens), 0) as total_gemini_output,
      COUNT(*) as total_runs
    FROM opex_ledger
  `).get();

  const breakdown = db.prepare(`
    SELECT ol.*, ar.agent_name, ar.started_at as run_date
    FROM opex_ledger ol
    LEFT JOIN agent_runs ar ON ol.run_id = ar.id
    ORDER BY ol.recorded_at DESC
    LIMIT 20
  `).all();

  // Local system_costs (synced from VPS)
  const systemCosts = db.prepare(`
    SELECT * FROM system_costs ORDER BY timestamp DESC LIMIT 50
  `).all();

  const systemCostTotal = db.prepare(`
    SELECT
      COALESCE(SUM(cost_usd), 0) as total_burn,
      COUNT(*) as total_entries
    FROM system_costs
  `).get();

  // Merge into unified response
  totals.total_cost = (totals.total_cost || 0) + (systemCostTotal.total_burn || 0);
  totals.henry_burn_rate = systemCostTotal.total_burn || 0;
  totals.henry_entries = systemCostTotal.total_entries || 0;

  res.json({ totals, breakdown, systemCosts });
});

// POST /api/sync-costs — fetch system_costs from VPS and sync locally
app.post('/api/sync-costs', async (req, res) => {
  try {
    const result = await openclawExec(
      `sqlite3 -json ${REMOTE_DB_PATH} 'SELECT * FROM system_costs ORDER BY timestamp DESC LIMIT 100;'`,
      false
    );

    if (result.ok) {
      let costs = [];
      const rawOutput = result.data?.output || result.data;
      if (typeof rawOutput === 'string') {
        try {
          costs = JSON.parse(rawOutput);
        } catch {
          const jsonMatch = rawOutput.match(/\[[\s\S]*\]/);
          if (jsonMatch) costs = JSON.parse(jsonMatch[0]);
        }
      } else if (Array.isArray(rawOutput)) {
        costs = rawOutput;
      }

      if (costs.length > 0) {
        // Upsert into local system_costs
        const upsert = db.prepare(`
          INSERT OR REPLACE INTO system_costs (service, cost_usd, details, timestamp)
          VALUES (?, ?, ?, ?)
        `);
        const syncMany = db.transaction((items) => {
          for (const c of items) {
            upsert.run(c.service || '', c.cost_usd || 0, c.details || '', c.timestamp || new Date().toISOString());
          }
        });
        syncMany(costs);
        broadcastTerminal(`💰 Synced ${costs.length} cost entries from VPS`);
      }

      res.json({ synced: costs.length, costs });
    } else {
      res.json({ synced: 0, error: 'Remote query failed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent-runs — recent run history
app.get('/api/agent-runs', (req, res) => {
  const runs = db.prepare('SELECT * FROM agent_runs ORDER BY id DESC LIMIT 20').all();
  res.json(runs);
});

// ═══════════════════════════════════════════════════════
// TASK 1: POST /api/execute — REMOTE OPENCLAW EXECUTION
// ═══════════════════════════════════════════════════════
app.post('/api/execute', async (req, res) => {
  console.log('🦅 EXECUTE RESEARCH PROTOCOL — Dispatching to OpenClaw Gateway...');
  console.log(`   Target: ${OPENCLAW_URL}/v1/exec`);
  console.log(`   Script: ${SCRAPER_SCRIPT}`);

  // Broadcast pipeline start to frontend
  broadcast({ agent: 'orchestrator', status: 'running', message: '🦅 Henry: Initiating remote research protocol...' });
  broadcast({ agent: 'data_miner', status: 'running', message: '⛏️ Dispatching scraper to OpenClaw Gateway...' });
  broadcastTerminal('═══════════════════════════════════════════════');
  broadcastTerminal('🦅 BÉLICA OS — EXECUTE RESEARCH PROTOCOL');
  broadcastTerminal(`🛰️ Target: ${OPENCLAW_URL}`);
  broadcastTerminal(`📜 Script: ${SCRAPER_SCRIPT}`);
  broadcastTerminal('═══════════════════════════════════════════════');

  try {
    // ─── Step 1: Fire the remote scraper (background: true) ───
    const execResult = await openclawExec(
      `python3 ${SCRAPER_SCRIPT}`,
      true // background mode → returns sessionId immediately
    );

    console.log('   OpenClaw response:', execResult.status, JSON.stringify(execResult.data));
    broadcastTerminal(`📡 OpenClaw responded: HTTP ${execResult.status}`);

    if (!execResult.ok) {
      const errMsg = `OpenClaw Gateway error: HTTP ${execResult.status} — ${JSON.stringify(execResult.data)}`;
      broadcast({ agent: 'orchestrator', status: 'failed', message: `❌ ${errMsg}` });
      broadcastTerminal(`❌ ERROR: ${errMsg}`);
      return res.status(502).json({ error: errMsg, gatewayResponse: execResult.data });
    }

    const sessionId = execResult.data?.sessionId || execResult.data?.id || execResult.data?.pid;
    broadcastTerminal(`✅ Process launched — Session ID: ${sessionId || 'direct-exec'}`);
    broadcast({ agent: 'data_miner', status: 'running', message: `⛏️ Scraper running on VPS (session: ${sessionId || 'active'})` });

    // Respond immediately to the frontend (don't block the HTTP request)
    res.json({
      status: 'dispatched',
      sessionId,
      message: 'Research protocol dispatched to OpenClaw Gateway',
      gatewayResponse: execResult.data,
    });

    // ─── Step 2: REAL-TIME TELEMETRY POLLING (runs in background) ───
    if (sessionId) {
      pollRemoteProcess(sessionId);
    } else {
      // If no sessionId (synchronous exec), skip polling and go straight to data fetch
      broadcastTerminal('⚡ Synchronous execution detected — skipping polling');
      await fetchRemoteTrends();
    }

  } catch (error) {
    console.error('❌ OpenClaw dispatch failed:', error.message);
    const errMsg = `Connection failed: ${error.message}. Is OpenClaw Gateway running at ${OPENCLAW_URL}?`;
    broadcast({ agent: 'orchestrator', status: 'failed', message: `❌ ${errMsg}` });
    broadcastTerminal(`❌ FATAL: ${errMsg}`);
    res.status(502).json({ error: errMsg });
  }
});

// ═══════════════════════════════════════════════════════
// TASK 2: REAL-TIME TELEMETRY POLLING
// ═══════════════════════════════════════════════════════
async function pollRemoteProcess(sessionId) {
  console.log(`📡 Starting telemetry polling for session: ${sessionId}`);
  broadcastTerminal(`📡 Streaming live output from VPS (session: ${sessionId})...`);
  broadcastTerminal('─────────────────────────────────────────────');

  let polling = true;
  let pollCount = 0;
  const MAX_POLLS = 300; // 5 minutes max (300 × 1s)

  while (polling && pollCount < MAX_POLLS) {
    pollCount++;

    try {
      const pollResult = await openclawPoll(sessionId, 1000);

      if (pollResult.ok && pollResult.data) {
        const { output, exitCode, finished, status } = pollResult.data;

        // Stream terminal output to frontend
        if (output) {
          const lines = output.split('\n').filter(l => l.trim());
          for (const line of lines) {
            broadcastTerminal(line);
            console.log(`   [VPS] ${line}`);
          }
        }

        // Check if process is done
        if (finished || exitCode !== undefined || status === 'exited' || status === 'done') {
          polling = false;
          broadcastTerminal('─────────────────────────────────────────────');

          if (exitCode === 0 || status === 'done') {
            broadcastTerminal(`✅ Scraper finished successfully (exit code: ${exitCode ?? 0})`);
            broadcast({ agent: 'data_miner', status: 'completed', message: '✅ Scraping complete — Fetching results...' });
            broadcast({ agent: 'signal_processor', status: 'running', message: '🧠 Processing viral data from VPS...' });
          } else {
            broadcastTerminal(`⚠️ Scraper exited with code: ${exitCode}`);
            broadcast({ agent: 'data_miner', status: 'failed', message: `⚠️ Scraper exit code: ${exitCode}` });
          }

          // ─── Step 3: Fetch final data ───
          await fetchRemoteTrends();
          return;
        }
      }
    } catch (err) {
      console.error(`   Poll error (attempt ${pollCount}):`, err.message);
      broadcastTerminal(`⚠️ Poll error: ${err.message}`);
    }

    // Wait 1 second before next poll
    await new Promise(r => setTimeout(r, 1000));
  }

  if (pollCount >= MAX_POLLS) {
    broadcastTerminal('⏰ Polling timeout — max duration reached');
    broadcast({ agent: 'orchestrator', status: 'failed', message: '⏰ Remote process timed out after 5 minutes' });
  }

  // Even on timeout, try to fetch whatever data exists
  await fetchRemoteTrends();
}

// ═══════════════════════════════════════════════════════
// TASK 3: FETCH REMOTE VIRAL DATA FROM VPS SQLITE
// ═══════════════════════════════════════════════════════
async function fetchRemoteTrends() {
  console.log('📊 Fetching remote trend data from VPS SQLite...');
  broadcastTerminal('📊 Fetching viral data from remote database...');

  try {
    const sqlResult = await openclawExec(
      `sqlite3 -json ${REMOTE_DB_PATH} 'SELECT * FROM viral_trends ORDER BY velocity_score DESC LIMIT 50;'`,
      false // synchronous — wait for result
    );

    console.log('   Remote DB response:', sqlResult.status);

    if (sqlResult.ok) {
      let trends = [];
      const rawOutput = sqlResult.data?.output || sqlResult.data;

      // Parse the JSON array from sqlite3 output
      if (typeof rawOutput === 'string') {
        try {
          trends = JSON.parse(rawOutput);
        } catch {
          // Try to extract JSON from the output (might have extra text)
          const jsonMatch = rawOutput.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            trends = JSON.parse(jsonMatch[0]);
          }
        }
      } else if (Array.isArray(rawOutput)) {
        trends = rawOutput;
      }

      if (trends.length > 0) {
        broadcastTerminal(`✅ Received ${trends.length} viral trends from VPS`);
        console.log(`   ✅ ${trends.length} trends received from remote DB`);

        // Sync to local SQLite for caching
        syncTrendsToLocal(trends);

        // Send fresh data to frontend via WebSocket
        const msg = JSON.stringify({
          type: 'trends_update',
          trends,
          source: 'remote_vps',
          timestamp: new Date().toISOString(),
        });
        for (const client of clients) {
          if (client.readyState === 1) client.send(msg);
        }

        broadcast({ agent: 'signal_processor', status: 'completed', message: `✅ ${trends.length} viral trends processed` });
        broadcast({ agent: 'orchestrator', status: 'completed', message: `🦅 Research protocol complete — ${trends.length} trends captured` });
        broadcastTerminal('═══════════════════════════════════════════════');
        broadcastTerminal('🦅 RESEARCH PROTOCOL COMPLETE');
        broadcastTerminal(`📊 ${trends.length} viral trends in the matrix`);
        broadcastTerminal('═══════════════════════════════════════════════');
      } else {
        broadcastTerminal('⚠️ No trends returned from remote database');
        broadcast({ agent: 'orchestrator', status: 'completed', message: '⚠️ Protocol complete — no new trends found' });
      }
    } else {
      broadcastTerminal(`⚠️ Remote DB query failed: HTTP ${sqlResult.status}`);
      broadcastTerminal(`   Response: ${JSON.stringify(sqlResult.data)}`);
      broadcast({ agent: 'orchestrator', status: 'completed', message: '⚠️ Could not fetch remote data — check VPS logs' });
    }
  } catch (err) {
    console.error('❌ Remote data fetch failed:', err.message);
    broadcastTerminal(`❌ Data fetch error: ${err.message}`);
    broadcast({ agent: 'orchestrator', status: 'failed', message: `❌ Data fetch failed: ${err.message}` });
  }
}

// ─── Sync remote trends to local SQLite cache ─────────
function syncTrendsToLocal(remoteTrends) {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO trends
    (platform, trigger_keyword, video_url, caption, hook_transcript, audio_url, views, likes, velocity_score, trigger_type, scraped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((trends) => {
    for (const t of trends) {
      upsert.run(
        t.platform || 'tiktok',
        t.trigger_keyword || t.keyword || '',
        t.video_url || t.url || '',
        t.caption || t.hook || '',
        t.hook_transcript || t.transcript || '',
        t.audio_url || t.audio || '',
        t.views || t.view_count || 0,
        t.likes || t.like_count || 0,
        t.velocity_score || t.velocity || 0,
        t.trigger_type || t.trigger || 'Unclassified',
        t.scraped_at || new Date().toISOString(),
      );
    }
  });

  try {
    insertMany(remoteTrends);
    console.log(`   💾 Synced ${remoteTrends.length} trends to local cache`);
  } catch (err) {
    console.error('   ⚠️ Local sync error:', err.message);
  }
}

// POST /api/analyze — re-analyze existing data (local fallback)
app.post('/api/analyze', async (req, res) => {
  try {
    // Try to fetch fresh data from remote
    broadcast({ agent: 'orchestrator', status: 'running', message: '🔬 Re-fetching data from VPS...' });
    await fetchRemoteTrends();
    res.json({ status: 'ok', message: 'Data refreshed from VPS' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/gateway-health — check OpenClaw Gateway status
app.get('/api/gateway-health', async (req, res) => {
  try {
    const response = await fetch(`${OPENCLAW_URL}/healthz`, {
      headers: { 'Authorization': `Bearer ${OPENCLAW_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });
    res.json({ online: response.ok, status: response.status, url: OPENCLAW_URL });
  } catch (err) {
    res.json({ online: false, error: err.message, url: OPENCLAW_URL });
  }
});

// ═══════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════
server.listen(PORT, () => {
  console.log('');
  console.log('🦅 ═══════════════════════════════════════════════');
  console.log('   BÉLICA OS — Mission Control API');
  console.log('   ═══════════════════════════════════════════════');
  console.log(`   Local:     http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`   Gateway:   ${OPENCLAW_URL}`);
  console.log(`   Token:     ${OPENCLAW_TOKEN.substring(0, 8)}...`);
  console.log(`   Script:    ${SCRAPER_SCRIPT}`);
  console.log('   ═══════════════════════════════════════════════');
  console.log('');
});
