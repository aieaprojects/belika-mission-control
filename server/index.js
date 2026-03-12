import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import db from './db.js';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();

const execAsync = promisify(exec);

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
// VPS SSH CONFIGURATION
// ═══════════════════════════════════════════════════════
const VPS_HOST = '187.124.153.19';
const VPS_USER = 'root';
const VPS_PASS = 'Z9elWeyi#6nNRbEt';
const REMOTE_DB_HOST_PATH = '/docker/openclaw-adah/data/.openclaw/workspace/belica_factory/belica_trends.db';
const SCRAPER_SCRIPT = '/data/.openclaw/workspace/belica_factory/scraper_agent.py';

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════
// VPS EXECUTION HELPERS
// ═══════════════════════════════════════════════════════
async function vpsExec(command) {
  // Use docker exec since agents are inside the container
  const fullCommand = `sshpass -p '${VPS_PASS}' ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "docker exec openclaw-adah-openclaw-1 ${command}"`;
  try {
    const { stdout, stderr } = await execAsync(fullCommand);
    return { ok: true, output: stdout || stderr };
  } catch (err) {
    return { ok: false, error: err.message, output: err.stdout || err.stderr };
  }
}

async function vpsHostExec(command) {
  // Execute directly on host
  const fullCommand = `sshpass -p '${VPS_PASS}' ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "${command}"`;
  try {
    const { stdout, stderr } = await execAsync(fullCommand);
    return { ok: true, output: stdout || stderr };
  } catch (err) {
    return { ok: false, error: err.message, output: err.stdout || err.stderr };
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

app.get('/api/trends', (req, res) => {
  const trends = db.prepare('SELECT * FROM trends ORDER BY velocity_score DESC').all();
  res.json(trends);
});

app.get('/api/trends/top', (req, res) => {
  const top = db.prepare(`
    SELECT * FROM trends
    WHERE trigger_type IS NOT NULL AND trigger_type != 'Unclassified'
    ORDER BY velocity_score DESC LIMIT 10
  `).all();
  res.json(top);
});

app.get('/api/agents', (req, res) => {
  const agents = [
    { name: 'Henry', role: 'System Orchestrator / COO', codename: 'orchestrator', status: 'idle' },
    { name: 'Mike', role: 'Director of Intelligence', codename: 'data_miner', status: 'idle' },
    { name: 'Roger', role: 'VP of Creative', codename: 'signal_processor', status: 'idle' },
  ];
  res.json(agents);
});

app.get('/api/opex', async (req, res) => {
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(apify_cost), 0) as total_apify_cost,
      COALESCE(SUM(gemini_cost), 0) as total_gemini_cost,
      COALESCE(SUM(total_cost), 0) as total_cost,
      COUNT(*) as total_runs
    FROM opex_ledger
  `).get();

  const systemCostTotal = db.prepare(`
    SELECT COALESCE(SUM(cost_usd), 0) as total_burn, COUNT(*) as total_entries FROM system_costs
  `).get();

  const systemCosts = db.prepare(`SELECT * FROM system_costs ORDER BY timestamp DESC LIMIT 50`).all();

  totals.total_cost = (totals.total_cost || 0) + (systemCostTotal.total_burn || 0);
  totals.henry_burn_rate = systemCostTotal.total_burn || 0;
  totals.henry_entries = systemCostTotal.total_entries || 0;

  res.json({ totals, breakdown: [], systemCosts });
});

app.post('/api/execute', async (req, res) => {
  broadcastTerminal('🦅 BÉLICA OS — EXECUTE RESEARCH PROTOCOL');
  broadcastTerminal(`🛰️ Remote Target: ${VPS_HOST}`);
  
  res.json({ status: 'dispatched' });

  try {
    broadcast({ agent: 'data_miner', status: 'running', message: '⛏️ Starting remote scraper...' });
    
    // Run scraper on VPS
    const result = await vpsExec(`python3 ${SCRAPER_SCRIPT}`);
    
    if (result.ok) {
      broadcastTerminal(result.output);
      broadcast({ agent: 'data_miner', status: 'completed', message: '✅ Scraping complete' });
      
      // Fetch fresh data
      await fetchRemoteTrends();
    } else {
      broadcastTerminal(`❌ ERROR: ${result.error || result.output}`);
      broadcast({ agent: 'orchestrator', status: 'failed', message: '❌ Remote execution failed' });
    }
  } catch (err) {
    broadcastTerminal(`❌ FATAL: ${err.message}`);
  }
});

async function fetchRemoteTrends() {
  broadcastTerminal('📊 Syncing viral trends from VPS...');
  const result = await vpsHostExec(`sqlite3 -json ${REMOTE_DB_HOST_PATH} 'SELECT * FROM viral_trends ORDER BY velocity_score DESC LIMIT 50;'`);
  
  if (result.ok && result.output) {
    try {
      const trends = JSON.parse(result.output);
      const upsert = db.prepare(`
        INSERT OR REPLACE INTO trends
        (platform, trigger_keyword, video_url, views, likes, velocity_score, scraped_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const syncMany = db.transaction((items) => {
        for (const t of items) {
          upsert.run(t.platform, t.keyword, t.video_url, t.views, t.likes, t.velocity_score, t.scraped_at);
        }
      });
      syncMany(trends);
      
      // Broadcast update
      const msg = JSON.stringify({ type: 'trends_update', trends, timestamp: new Date().toISOString() });
      for (const client of clients) client.send(msg);
      
      broadcast({ agent: 'orchestrator', status: 'completed', message: '🦅 Protocol Complete' });
    } catch (e) {
      broadcastTerminal(`⚠️ JSON Parse Error: ${e.message}`);
    }
  }
}

app.post('/api/sync-costs', async (req, res) => {
  const result = await vpsHostExec(`sqlite3 -json ${REMOTE_DB_HOST_PATH} 'SELECT * FROM system_costs;'`);
  if (result.ok && result.output) {
    const costs = JSON.parse(result.output);
    const upsert = db.prepare(`INSERT OR REPLACE INTO system_costs (service, cost_usd, details, timestamp) VALUES (?, ?, ?, ?)`);
    db.transaction(items => {
      for (const c of items) upsert.run(c.service, c.cost_usd, c.details, c.timestamp);
    })(costs);
    res.json({ synced: costs.length });
  } else {
    res.json({ synced: 0 });
  }
});

app.get('/api/gateway-health', (req, res) => {
  res.json({ online: true, url: VPS_HOST });
});

server.listen(PORT, () => {
  console.log(`🦅 Mission Control API Online — Port ${PORT}`);
});
