import { API_BASE } from './services/api';
import { useState, useEffect, useRef, useCallback } from 'react'
import Header from './components/Header.jsx'
import TrendMatrix from './components/TrendMatrix.jsx'
import OpexTracker from './components/OpexTracker.jsx'
import AgentCards from './components/AgentCards.jsx'
import OfficeBoard from './components/OfficeBoard.jsx'
import StatusBar from './components/StatusBar.jsx'
import ViralConceptsPanel from './components/ViralConceptsPanel.jsx'
import ExecutePanel from './components/ExecutePanel.jsx'

export default function App() {
  const [trends, setTrends] = useState([])
  const [agents, setAgents] = useState([])
  const [opex, setOpex] = useState({ totals: {}, breakdown: [] })
  const [activeTab, setActiveTab] = useState('dashboard')
  const [wsConnected, setWsConnected] = useState(false)
  const [gatewayOnline, setGatewayOnline] = useState(false)
  const [agentStatuses, setAgentStatuses] = useState({})
  const [activityLog, setActivityLog] = useState([])
  const [terminalLog, setTerminalLog] = useState([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const wsRef = useRef(null)

  // ─── Gateway Health Check ──────────────────────────────
  useEffect(() => {
    async function probeGateway() {
      try {
        const res = await fetch(API_BASE + '/api/gateway-health')
        const data = await res.json()
        setGatewayOnline(data.online)
      } catch {
        setGatewayOnline(false)
      }
    }
    probeGateway()
    const interval = setInterval(probeGateway, 30000)
    return () => clearInterval(interval)
  }, [])

  // ─── Fetch Data ────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [trendsRes, agentsRes, opexRes] = await Promise.all([
        fetch(API_BASE + '/api/trends'),
        fetch(API_BASE + '/api/agents'),
        fetch(API_BASE + '/api/opex'),
      ])
      setTrends(await trendsRes.json())
      setAgents(await agentsRes.json())
      setOpex(await opexRes.json())
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }, [])

  // ─── WebSocket ─────────────────────────────────────────
  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

      ws.onopen = () => {
        setWsConnected(true)
        addActivity('system', 'WebSocket connected to Mission Control', 'completed')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'agent_update') {
            setAgentStatuses(prev => ({
              ...prev,
              [data.agent]: { status: data.status, message: data.message },
            }))
            addActivity(data.agent, data.message, data.status)
            if (data.agent === 'orchestrator' && (data.status === 'completed' || data.status === 'failed')) {
              setIsExecuting(false)
              fetchData()
            }
          }

          if (data.type === 'terminal') {
            setTerminalLog(prev => [
              { line: data.line, time: new Date().toLocaleTimeString() },
              ...prev.slice(0, 199),
            ])
          }

          if (data.type === 'trends_update') {
            setTrends(data.trends)
            addActivity('system', `📊 ${data.trends.length} trends received from VPS`, 'completed')
          }
        } catch { /* ignore */ }
      }

      ws.onclose = () => { setWsConnected(false); setTimeout(connect, 3000) }
      ws.onerror = () => ws.close()
      wsRef.current = ws
    }

    connect()
    return () => wsRef.current?.close()
  }, [fetchData])

  useEffect(() => { fetchData() }, [fetchData])

  function addActivity(agent, message, status) {
    setActivityLog(prev => [
      { agent, message, status, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 49),
    ])
  }

  // ─── Actions ───────────────────────────────────────────
  async function handleExecute() {
    setIsExecuting(true)
    setTerminalLog([])
    setAgentStatuses({
      orchestrator: { status: 'running', message: 'Dispatching to OpenClaw Gateway...' },
      data_miner: { status: 'idle', message: 'Standby' },
      signal_processor: { status: 'idle', message: 'Standby' },
    })
    addActivity('orchestrator', '🦅 EXECUTE RESEARCH PROTOCOL → OpenClaw Gateway', 'running')
    try {
      const res = await fetch(API_BASE + '/api/execute', { method: 'POST' })
      const result = await res.json()
      if (!res.ok) { addActivity('system', `❌ ${result.error}`, 'failed'); setIsExecuting(false) }
      else { addActivity('gateway', `✅ Dispatched`, 'completed') }
    } catch (err) { setIsExecuting(false); addActivity('system', `❌ ${err.message}`, 'failed') }
  }

  async function handleSyncVPS() {
    setIsSyncing(true)
    addActivity('orchestrator', '🔄 Syncing data from Hostinger VPS...', 'running')
    try {
      const res = await fetch(API_BASE + '/api/sync-trends', { method: 'POST' })
      const ct = res.headers.get('content-type')
      if (ct && ct.includes('application/json')) {
        const result = await res.json()
        if (result.success) {
          await fetchData()
          addActivity('orchestrator', `✅ Sincronizado: ${result.count} videos`, 'completed')
        } else { addActivity('orchestrator', `❌ ${result.error}`, 'failed') }
      } else { addActivity('system', '❌ VPS returned non-JSON', 'failed') }
    } catch (err) { addActivity('system', `❌ ${err.message}`, 'failed') }
    finally { setIsSyncing(false) }
  }

  async function handleAnalyze() {
    setIsExecuting(true)
    addActivity('orchestrator', '🔬 Analyzing data...', 'running')
    try { await fetch(API_BASE + '/api/analyze', { method: 'POST' }); await fetchData() }
    catch (err) { addActivity('system', `Error: ${err.message}`, 'failed') }
    setIsExecuting(false)
  }

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'agents', label: '🤖 Agents' },
    { id: 'trends', label: '📈 Trend Matrix' },
    { id: 'concepts', label: '💡 Viral Concepts' },
    { id: 'execute', label: '🚀 Execute' },
    { id: 'office', label: '🏢 Office' },
  ]

  return (
    <div className="app-container">
      <Header
        wsConnected={wsConnected}
        gatewayOnline={gatewayOnline}
        isExecuting={isExecuting}
        isSyncing={isSyncing}
        onExecute={handleExecute}
        onSyncVPS={handleSyncVPS}
      />

      <nav className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'execute' && terminalLog.length > 0 && (
              <span style={{
                marginLeft: 6, background: '#f59e0b', color: '#000',
                borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 700,
              }}>{terminalLog.length}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {/* ─── DASHBOARD TAB ─── */}
        {activeTab === 'dashboard' && (
          <>
            <div className="bento-grid">
              <div className="bento-8">
                <OfficeBoard agentStatuses={agentStatuses} isExecuting={isExecuting} />
              </div>
              <div className="bento-4">
                <div className="glass-card" style={{ height: '100%' }}>
                  <div className="card-header">
                    <div className="card-title">
                      <span className="card-title-icon">📡</span> Live Feed
                    </div>
                    <span className="card-badge">{activityLog.length}</span>
                  </div>
                  <div className="activity-feed">
                    {activityLog.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">📡</div>
                        <div className="empty-state-text">Awaiting signal...</div>
                      </div>
                    ) : (
                      activityLog.map((item, i) => (
                        <div className="activity-item" key={i}>
                          <div className="activity-dot" style={{
                            background: item.status === 'completed' ? '#22c55e'
                              : item.status === 'running' ? '#3b82f6'
                              : item.status === 'failed' ? '#ef4444' : '#6b7280',
                          }} />
                          <div className="activity-content">
                            <div className="activity-message">{item.message}</div>
                            <div className="activity-time">{item.time}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bento-grid">
              <div className="bento-4">
                <OpexTracker opex={opex} />
              </div>
              <div className="bento-8">
                <div className="glass-card">
                  <div className="card-header">
                    <div className="card-title"><span className="card-title-icon">📊</span> Quick Stats</div>
                  </div>
                  <div className="opex-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div className="opex-stat">
                      <div className="opex-stat-label">Videos Scraped</div>
                      <div className="opex-stat-value">{trends.length}</div>
                    </div>
                    <div className="opex-stat">
                      <div className="opex-stat-label">Platforms</div>
                      <div className="opex-stat-value">{[...new Set(trends.map(t => t.platform))].length}</div>
                    </div>
                    <div className="opex-stat">
                      <div className="opex-stat-label">Trigger Types</div>
                      <div className="opex-stat-value">{[...new Set(trends.filter(t => t.trigger_type && t.trigger_type !== 'Unclassified').map(t => t.trigger_type))].length}</div>
                    </div>
                    <div className="opex-stat">
                      <div className="opex-stat-label">Total Reach</div>
                      <div className="opex-stat-value">{(trends.reduce((a, t) => a + (t.views || 0), 0) / 1000000).toFixed(1)}<span className="opex-stat-unit">M</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── AGENTS TAB ─── */}
        {activeTab === 'agents' && (
          <AgentCards
            agentStatuses={agentStatuses}
            trends={trends}
            isExecuting={isExecuting}
            onRunAgent={(codename) => {
              addActivity(codename, `▶ Manual run triggered for ${codename}`, 'running')
              handleExecute()
            }}
          />
        )}

        {/* ─── TRENDS TAB ─── */}
        {activeTab === 'trends' && (
          <div className="bento-grid">
            <div className="bento-full">
              <TrendMatrix trends={trends} onAnalyze={handleAnalyze} />
            </div>
          </div>
        )}

        {/* ─── VIRAL CONCEPTS TAB ─── */}
        {activeTab === 'concepts' && (
          <ViralConceptsPanel
            trends={trends}
            isExecuting={isExecuting}
            onAnalyze={handleAnalyze}
          />
        )}

        {/* ─── EXECUTE TAB ─── */}
        {activeTab === 'execute' && (
          <ExecutePanel
            isExecuting={isExecuting}
            terminalLog={terminalLog}
            agentStatuses={agentStatuses}
            onExecute={handleExecute}
            onSyncVPS={handleSyncVPS}
            isSyncing={isSyncing}
          />
        )}

        {/* ─── OFFICE TAB ─── */}
        {activeTab === 'office' && (
          <div className="bento-grid">
            <div className="bento-full">
              <OfficeBoard agentStatuses={agentStatuses} isExecuting={isExecuting} fullView />
            </div>
          </div>
        )}
      </main>

      <StatusBar
        wsConnected={wsConnected}
        gatewayOnline={gatewayOnline}
        isExecuting={isExecuting}
        agentStatuses={agentStatuses}
        trendsCount={trends.length}
      />
    </div>
  )
}
