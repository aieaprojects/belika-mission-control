/**
 * ═══════════════════════════════════════════════════════
 * BÉLICA OS — OpenClaw Gateway API Service
 * ═══════════════════════════════════════════════════════
 * 
 * Production-grade fetch wrapper for the OpenClaw Gateway
 * running on Hostinger VPS (187.124.153.19:18789).
 * 
 * All requests inject Bearer auth automatically.
 * Falls back to local Express backend for demo/offline mode.
 */

const OPENCLAW_API = import.meta.env.VITE_OPENCLAW_API_URL || 'http://187.124.153.19:18789'
const OPENCLAW_TOKEN = import.meta.env.VITE_OPENCLAW_GATEWAY_TOKEN || ''
const LOCAL_API = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3001'

// ─── Connection State ───────────────────────────────────
let _gatewayReachable = null

/**
 * Core fetch wrapper with Bearer auth injection
 */
async function gatewayFetch(endpoint, options = {}) {
  const url = `${OPENCLAW_API}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
    'X-Agent-Token': OPENCLAW_TOKEN,
    ...options.headers,
  }

  const res = await fetch(url, {
    ...options,
    headers,
    signal: options.signal || AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new GatewayError(res.status, body, endpoint)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  return res.text()
}

/**
 * Local backend fetch (for SQLite demo data fallback)
 */
async function localFetch(endpoint, options = {}) {
  const res = await fetch(`${LOCAL_API}${endpoint}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Local API error: ${res.status}`)
  return res.json()
}

// ─── Custom Error Class ─────────────────────────────────
class GatewayError extends Error {
  constructor(status, body, endpoint) {
    super(`Gateway ${status} on ${endpoint}: ${body}`)
    this.status = status
    this.body = body
    this.endpoint = endpoint
  }
}

// ═══════════════════════════════════════════════════════
// PUBLIC API — Used by App.jsx and components
// ═══════════════════════════════════════════════════════

/**
 * Check if the OpenClaw Gateway is reachable
 * @returns {Promise<{online: boolean, version?: string, mode?: string}>}
 */
export async function checkGatewayHealth() {
  try {
    const data = await gatewayFetch('/healthz')
    _gatewayReachable = true
    return { online: true, ...data }
  } catch {
    _gatewayReachable = false
    return { online: false }
  }
}

/**
 * Trigger the Research Protocol — sends command to OpenClaw Gateway
 * to spin up the Apify Data Miner agent pipeline
 * @returns {Promise<object>} execution response
 */
export async function triggerResearchProtocol() {
  // Try OpenClaw Gateway first
  try {
    const result = await gatewayFetch('/api/v1/agent/heartbeat', {
      method: 'POST',
      body: JSON.stringify({
        name: 'belica-data-miner',
        board_id: 'belica-research',
        status: 'online',
        command: 'execute_research_protocol',
        payload: {
          pipeline: 'viral-content-scrape',
          targets: ['tiktok', 'instagram'],
          keywords: [
            '#corridostumbados', '#pesopluma', '#alucin',
            '#regionalmexicano', '#corridos', '#musicamexicana',
          ],
          velocity_threshold: 10,
        },
      }),
    })
    return { source: 'gateway', ...result }
  } catch (gwErr) {
    console.warn('Gateway trigger failed, falling back to local:', gwErr.message)
    // Fallback to local Express backend
    try {
      const result = await localFetch('/api/execute', { method: 'POST' })
      return { source: 'local', ...result }
    } catch (localErr) {
      throw new Error(`Both gateway and local failed. Gateway: ${gwErr.message}. Local: ${localErr.message}`)
    }
  }
}

/**
 * Fetch viral trends from the backend
 * @returns {Promise<Array>} array of trend objects
 */
export async function fetchViralTrends() {
  // Try gateway first, then local
  try {
    const data = await gatewayFetch('/api/v1/agent/boards/belica-research/tasks', {
      method: 'GET',
    })
    // Normalize gateway response to our trend schema
    if (Array.isArray(data)) {
      return data.map(normalizeTrend)
    }
    if (data?.items) {
      return data.items.map(normalizeTrend)
    }
    // If gateway doesn't have trend data yet, fall through to local
    throw new Error('No trend data from gateway')
  } catch {
    // Fallback to local SQLite data
    try {
      return await localFetch('/api/trends')
    } catch {
      return []
    }
  }
}

/**
 * Fetch agent statuses and OPEX costs
 * @returns {Promise<{agents: Array, opex: object}>}
 */
export async function fetchAgentStatus() {
  const results = { agents: [], opex: { totals: {}, breakdown: [] } }

  // Try gateway for agent status
  try {
    const heartbeat = await gatewayFetch('/api/v1/agent/heartbeat', {
      method: 'POST',
      body: JSON.stringify({
        name: 'belica-status-check',
        board_id: 'belica-research',
        status: 'online',
      }),
    })
    if (heartbeat?.agents) {
      results.agents = heartbeat.agents
    }
  } catch {
    // Fallback to local
    try {
      results.agents = await localFetch('/api/agents')
    } catch {
      // Keep empty
    }
  }

  // OPEX always from local (cost ledger is local SQLite)
  try {
    results.opex = await localFetch('/api/opex')
  } catch {
    // Keep default
  }

  return results
}

/**
 * Re-analyze existing trend data
 * @returns {Promise<object>}
 */
export async function analyzeExistingData() {
  try {
    return await localFetch('/api/analyze', { method: 'POST' })
  } catch (err) {
    throw new Error(`Analysis failed: ${err.message}`)
  }
}

/**
 * Get WebSocket URL for real-time updates
 * Uses local WS for now; OpenClaw Gateway WS available at ws://IP:18789
 * @returns {string}
 */
export function getWebSocketUrl() {
  // Primary: OpenClaw Gateway WebSocket
  const gwWs = OPENCLAW_API.replace('http://', 'ws://').replace('https://', 'wss://')
  return gwWs
}

/**
 * Get local WebSocket URL (fallback for real-time updates)
 * @returns {string}
 */
export function getLocalWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

/**
 * Get gateway connection info for display
 * @returns {object}
 */
export function getGatewayInfo() {
  return {
    url: OPENCLAW_API,
    hasToken: !!OPENCLAW_TOKEN,
    tokenPreview: OPENCLAW_TOKEN ? `${OPENCLAW_TOKEN.substring(0, 6)}...` : 'none',
  }
}

// ─── Internal Helpers ───────────────────────────────────

function normalizeTrend(raw) {
  return {
    id: raw.id || raw.task_id || Math.random().toString(36).substr(2, 9),
    platform: raw.platform || raw.source || 'tiktok',
    keyword: raw.keyword || raw.trigger_keyword || raw.tag || '',
    video_url: raw.video_url || raw.url || raw.link || '#',
    caption: raw.caption || raw.hook || raw.title || raw.description || '',
    audio: raw.audio || raw.audio_name || raw.sound || '',
    views: raw.views || raw.view_count || 0,
    likes: raw.likes || raw.like_count || 0,
    velocity_score: raw.velocity_score || raw.velocity || 0,
    trigger_type: raw.trigger_type || raw.trigger || 'Unknown',
    scraped_at: raw.scraped_at || raw.created_at || new Date().toISOString(),
  }
}

export default {
  checkGatewayHealth,
  triggerResearchProtocol,
  fetchViralTrends,
  fetchAgentStatus,
  analyzeExistingData,
  getWebSocketUrl,
  getLocalWebSocketUrl,
  getGatewayInfo,
}
