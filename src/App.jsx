import { API_BASE } from './config';
import { useState, useEffect, useRef, useCallback } from 'react'
import Header from './components/Header.jsx'
import TrendMatrix from './components/TrendMatrix.jsx'
import OpexTracker from './components/OpexTracker.jsx'
import AgentRoster from './components/AgentRoster.jsx'
import OfficeBoard from './components/OfficeBoard.jsx'
import StatusBar from './components/StatusBar.jsx'

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
  const wsRef = useRef(null)

  // ─── Gateway Health Check ──────────────────────────────
  useEffect(() => {
    async function probeGateway() {
      try {
        const res = await fetch(`${API_BASE}/api/gateway-health')
        const data = await res.json()
        setGatewayOnline(data.online)
        if (data.online) {
          addActivity('gateway', `🛰️ OpenClaw Gateway online (${data.url})`, 'completed')
        }
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
        fetch(`${API_BASE}/api/trends'),
        fetch(`${API_BASE}/api/agents'),
        fetch(`${API_BASE}/api/opex'),
      ])
      setTrends(await trendsRes.json())
      setAgents(await agentsRes.json())
      setOpex(await opexRes.json())
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }, [])

  // ─── WebSocket — Real-time updates + Terminal stream ───
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

          // Agent status updates
          if (data.type === 'agent_update') {
            setAgentStatuses(prev => ({
              ...prev,
              [data.agent]: { status: data.status, message: data.message },
            }))
            addActivity(data.agent, data.message, data.status)

            // If orchestrator completed/failed, stop executing and refresh data
            if (data.agent === 'orchestrator' && (data.status === 'completed' || data.status === 'failed')) {
              setIsExecuting(false)
              fetchData()
            }
          }

          // Live terminal output from VPS
          if (data.type === 'terminal') {
            setTerminalLog(prev => [
              { line: data.line, time: new Date().toLocaleTimeString() },
              ...prev.slice(0, 199),
            ])
          }

          // Fresh trends data from remote VPS SQLite
          if (data.type === 'trends_update') {
            setTrends(data.trends)
            addActivity('system', `📊 ${data.trends.length} trends received from VPS`, 'completed')
          }

        } catch {
          // Non-JSON, ignore
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
        setTimeout(connect, 3000)
      }

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

  // ─── Execute Research Protocol → Remote OpenClaw ──────
  async function handleExecute() {
    setIsExecuting(true)
    setTerminalLog([]) // Clear terminal for fresh run
    setAgentStatuses({
      orchestrator: { status: 'running', message: 'Dispatching to OpenClaw Gateway...' },
      data_miner: { status: 'idle', message: 'Standby' },
      signal_processor: { status: 'idle', message: 'Standby' },
    })
    addActivity('orchestrator', '🦅 EXECUTE RESEARCH PROTOCOL → OpenClaw Gateway', 'running')

    try {
      const res = await fetch(`${API_BASE}/api/execute', { method: 'POST' })
      const result = await res.json()
      if (!res.ok) {
        addActivity('system', `❌ ${result.error}`, 'failed')
        setIsExecuting(false)
      } else {
        addActivity('gateway', `✅ Dispatched (session: ${result.sessionId || 'active'})`, 'completed')
      }
    } catch (err) {
      setIsExecuting(false)
      addActivity('system', `❌ ${err.message}`, 'failed')
    }
  }

  // ─── Re-analyze / refresh from VPS ────────────────────
  async function handleAnalyze() {
    setIsExecuting(true)
    addActivity('orchestrator', '🔬 Refreshing data from VPS...', 'running')
    try {
      await fetch(`${API_BASE}/api/analyze', { method: 'POST' })
      await fetchData()
    } catch (err) {
      addActivity('system', `Error: ${err.message}`, 'failed')
    }
    setIsExecuting(false)
  }

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'trends', label: '📈 Trend Matrix' },
    { id: 'terminal', label: '🖥️ Terminal' },
    { id: 'office', label: '🏢 Office Board' },
  ]

  return (
    <div className="app-container">
      <Header
        wsConnected={wsConnected}
        gatewayOnline={gatewayOnline}
        isExecuting={isExecuting}
        onExecute={handleExecute}
      />

      <nav className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'terminal' && terminalLog.length > 0 && (
              <span style={{
                marginLeft: 6,
                background: '#f59e0b',
                color: '#000',
                borderRadius: 8,
                padding: '1px 6px',
                fontSize: 10,
                fontWeight: 700,
              }}>{terminalLog.length}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="main-content">
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
                              : item.status === 'failed' ? '#ef4444'
                              : '#6b7280',
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
                <AgentRoster agents={agents} agentStatuses={agentStatuses} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'trends' && (
          <div className="bento-grid">
            <div className="bento-full">
              <TrendMatrix trends={trends} onAnalyze={handleAnalyze} />
            </div>
          </div>
        )}

        {/* ─── LIVE TERMINAL TAB ─── */}
        {activeTab === 'terminal' && (
          <div className="bento-grid">
            <div className="bento-full">
              <div className="glass-card">
                <div className="card-header">
                  <div className="card-title">
                    <span className="card-title-icon">🖥️</span> VPS Terminal — Live Output
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="card-badge" style={{
                      background: isExecuting ? 'rgba(59,130,246,0.2)' : 'rgba(107,114,128,0.2)',
                      color: isExecuting ? '#60a5fa' : '#9ca3af',
                    }}>
                      {isExecuting ? '● STREAMING' : '○ IDLE'}
                    </span>
                    <button
                      onClick={() => setTerminalLog([])}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid #27272a',
                        color: '#9ca3af',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >Clear</button>
                  </div>
                </div>
                <div style={{
                  background: '#000000',
                  borderRadius: 8,
                  padding: 16,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                  maxHeight: 500,
                  overflowY: 'auto',
                  border: '1px solid #1a1a1a',
                }}>
                  {terminalLog.length === 0 ? (
                    <div style={{ color: '#4a4a4a' }}>
                      <div>{'>'} Awaiting signal from OpenClaw Gateway...</div>
                      <div>{'>'} Click ⚡ EXECUTE RESEARCH PROTOCOL to begin</div>
                      <div style={{ opacity: 0.5 }}>{'>'} Target: 187.124.153.19 (Hostinger VPS)</div>
                    </div>
                  ) : (
                    [...terminalLog].reverse().map((entry, i) => (
                      <div key={i} style={{
                        color: entry.line.includes('✅') ? '#22c55e'
                          : entry.line.includes('❌') || entry.line.includes('FATAL') ? '#ef4444'
                          : entry.line.includes('⚠️') ? '#f59e0b'
                          : entry.line.includes('═') || entry.line.includes('─') ? '#3b82f6'
                          : entry.line.includes('📡') || entry.line.includes('🛰️') ? '#a855f7'
                          : entry.line.includes('🦅') ? '#f59e0b'
                          : '#e4e4e7',
                        borderBottom: entry.line.includes('═') ? 'none' : '1px solid #111',
                        padding: '2px 0',
                      }}>
                        <span style={{ color: '#4a4a4a', marginRight: 8 }}>[{entry.time}]</span>
                        {entry.line}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
