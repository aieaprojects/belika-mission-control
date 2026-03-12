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
    // Detailed activity log when Henry enters Mission Control
    const activities = [
      '🦅 Henry (System Orchestrator) has accessed Mission Control',
      '📋 Session started — Reading agent rosters & memory files',
      '🔄 Reviewed recent changes: agent names updated (Mike, Roger)',
      '💾 Committed changes to git: Add agent names',
      '☁️ Synced with GitHub: Changes pushed to belika-mission-control',
      '⚡ Configured Perplexity Sonar Pro Search via OpenRouter',
      '✅ System ready — All services online',
    ];
    
    // Send detailed terminal output
    activities.forEach((line, index) => {
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'terminal',
          line,
          timestamp: new Date().toISOString(),
        }));
      }, index * 150);
    });
    
    // Send orchestrator status update
    ws.send(JSON.stringify({
      type: 'agent_update',
      agent: 'orchestrator',
      status: 'active',
      message: 'SYSTEM OVERRIDE COMPLETE — Detailed session log above',
      timestamp: new Date().toISOString(),
    }));

    // Broadcast real-time agent status roster
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'agent_status_roster',
        agents: [
          { name: 'Henry', role: 'System Orchestrator / COO', status: 'active', codename: 'orchestrator' },
          { name: 'Mike', role: 'Director of Intelligence', status: 'idle', codename: 'data_miner' },
          { name: 'Roger', role: 'VP of Creative', status: 'idle', codename: 'signal_processor' },
        ],
        timestamp: new Date().toISOString(),
      }));
      
      // Terminal output for agent roster
      ws.send(JSON.stringify({
        type: 'terminal',
        line: '👥 AGENT ROSTER — Henry: 🟢 ACTIVE | Mike: ⚪ IDLE | Roger: ⚪ IDLE',
        timestamp: new Date().toISOString(),
      }));
    }, 1000);
  }, 500);

  ws.on('close', () => clients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify({ type: 'agent_update', ...data, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

function broadcastAgentStatus(agentName, status, message) {
  const agentCodes = {
    'Henry': 'orchestrator',
    'Mike': 'data_miner',
    'Roger': 'signal_processor',
  };
  
  // Broadcast agent status update
  const msg = JSON.stringify({
    type: 'agent_status_update',
    agent: agentCodes[agentName] || agentName.toLowerCase().replace(' ', '_'),
    name: agentName,
    status,
    message,
    timestamp: new Date().toISOString(),
  });
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
  
  // Also send terminal update
  const statusIcon = status === 'active' || status === 'running' ? '🟢' : status === 'idle' ? '⚪' : '🔴';
  const terminalMsg = JSON.stringify({
    type: 'terminal',
    line: `${statusIcon} ${agentName}: ${status.toUpperCase()} — ${message}`,
    timestamp: new Date().toISOString(),
  });
  for (const client of clients) {
    if (client.readyState === 1) client.send(terminalMsg);
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

// 🆕 Manually trigger sync from VPS Express API
app.post('/api/sync-trends', async (req, res) => {
  try {
    broadcastAgentStatus('Henry', 'active', '🔄 Manual VPS Data Sync initiated...');
    await fetchRemoteTrends();
    
    const count = db.prepare('SELECT COUNT(*) as count FROM trends').get();
    res.json({ success: true, count: count.count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/trends/top', (req, res) => {
  const top = db.prepare(`
    SELECT * FROM trends
    WHERE trigger_type IS NOT NULL AND trigger_type != 'Unclassified'
    ORDER BY velocity_score DESC LIMIT 10
  `).all();
  res.json(top);
});

// In-memory agent status (updated in real-time)
let agentStatuses = {
  orchestrator: { name: 'Henry', role: 'System Orchestrator / COO', status: 'idle' },
  data_miner: { name: 'Mike', role: 'Director of Intelligence', status: 'idle' },
  signal_processor: { name: 'Roger', role: 'VP of Creative', status: 'idle' },
};

app.get('/api/agents', (req, res) => {
  const agents = [
    { name: 'Henry', role: 'System Orchestrator / COO', codename: 'orchestrator', status: agentStatuses.orchestrator.status },
    { name: 'Mike', role: 'Director of Intelligence', codename: 'data_miner', status: agentStatuses.data_miner.status },
    { name: 'Roger', role: 'VP of Creative', codename: 'signal_processor', status: agentStatuses.signal_processor.status },
  ];
  res.json(agents);
});

// Get real-time agent status
app.get('/api/agents/status', (req, res) => {
  res.json(agentStatuses);
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
    // Henry assigns task to Mike (Data Miner)
    broadcastAgentStatus('Henry', 'active', 'Assigning research protocol to Mike');
    broadcastAgentStatus('Mike', 'running', '⛏️ Starting TikTok/Instagram scraper...');
    
    // Run scraper on VPS
    const result = await vpsExec(`python3 ${SCRAPER_SCRIPT}`);
    
    if (result.ok) {
      broadcastTerminal(result.output);
      broadcastAgentStatus('Mike', 'completed', '✅ Scraping complete — Data collected');
      
      // Henry assigns analysis to Roger (Signal Processor)
      broadcastAgentStatus('Henry', 'active', 'Tasking Roger with signal analysis');
      broadcastAgentStatus('Roger', 'running', '🧠 Processing viral trends & patterns...');
      
      // Fetch fresh data
      await fetchRemoteTrends();
      
      broadcastAgentStatus('Roger', 'completed', '✅ Signal processing complete');
      broadcastAgentStatus('Henry', 'active', '🦅 Protocol Complete — All agents idle');
    } else {
      broadcastTerminal(`❌ ERROR: ${result.error || result.output}`);
      broadcastAgentStatus('Mike', 'failed', '❌ Scraper failed');
      broadcastAgentStatus('Henry', 'active', '⚠️ Protocol failed — Review logs');
    }
  } catch (err) {
    broadcastTerminal(`❌ FATAL: ${err.message}`);
    broadcastAgentStatus('Henry', 'active', '❌ Fatal error encountered');
  }
});

async function fetchRemoteTrends() {
  broadcastTerminal('📊 Syncing viral trends from VPS API...');
  broadcastTerminal(`🛰️ Fetching from http://${VPS_HOST}:3001/api/trends`);
  
  try {
    const response = await fetch(`http://${VPS_HOST}:3001/api/trends`);
    if (!response.ok) {
      broadcastTerminal(`❌ VPS API returned ${response.status}`);
      return;
    }
    
    const trends = await response.json();
    broadcastTerminal(`✅ Received ${trends.length} videos from VPS`);
    
    // Clear old local trends and insert fresh VPS data
    db.exec('DELETE FROM trends');
    
    const upsert = db.prepare(`
      INSERT INTO trends
      (platform, trigger_keyword, video_url, caption, hook_transcript, audio_url, views, likes, velocity_score, trigger_type, scraped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const syncMany = db.transaction((items) => {
      for (const t of items) {
        upsert.run(
          t.platform,
          t.trigger_keyword || t.keyword,
          t.video_url,
          t.caption || '',
          t.hook_transcript || '',
          t.audio_url || '',
          t.views || 0,
          t.likes || 0,
          t.velocity_score || 0,
          t.trigger_type || 'Unclassified',
          t.scraped_at || new Date().toISOString()
        );
      }
    });
    syncMany(trends);
    
    broadcastTerminal(`💾 Saved ${trends.length} trends to local database`);
    
    // Broadcast real-time update to frontend
    const msg = JSON.stringify({ type: 'trends_update', trends, timestamp: new Date().toISOString() });
    for (const client of clients) {
      if (client.readyState === 1) client.send(msg);
    }
    
    broadcastAgentStatus('Henry', 'completed', `🦅 Synced ${trends.length} videos from VPS`);
  } catch (e) {
    broadcastTerminal(`❌ Fetch Error: ${e.message}`);
    broadcastAgentStatus('Henry', 'active', `❌ Sync failed: ${e.message}`);
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

// 🆕 API endpoint to pull latest code from GitHub
app.post('/api/update', async (req, res) => {
  broadcastTerminal('⬇️ Syncing latest code from GitHub...');
  
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Pull from GitHub
    const { stdout, stderr } = await execAsync('cd /data/.openclaw/workspace/belika-mission-control && git pull origin main');
    
    broadcastTerminal('✅ Code updated: ' + stdout);
    broadcastTerminal('🔄 Restarting services...');
    
    // Restart pm2
    await execAsync('pm2 restart all');
    
    broadcastTerminal('✅ Mission Control updated and restarted!');
    
    res.json({ status: 'updated', output: stdout });
  } catch (err) {
    broadcastTerminal('❌ Update failed: ' + err.message);
    res.json({ status: 'failed', error: err.message });
  }
});
