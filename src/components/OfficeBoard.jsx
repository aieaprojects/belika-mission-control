import { useState, useEffect } from 'react'

const AGENTS = [
  {
    id: 'orchestrator',
    name: 'Henry',
    robot: '🤖',
    color: '#f59e0b',
    role: 'COO',
    deskPos: { x: 50, y: 52 },
    breakPos: { x: 78, y: 22 },
  },
  {
    id: 'data_miner',
    name: 'Mike',
    robot: '🤖',
    color: '#3b82f6',
    role: 'Intel',
    deskPos: { x: 14, y: 52 },
    breakPos: { x: 85, y: 30 },
  },
  {
    id: 'signal_processor',
    name: 'Roger',
    robot: '🤖',
    color: '#a855f7',
    role: 'Creative',
    deskPos: { x: 50, y: 78 },
    breakPos: { x: 82, y: 38 },
  },
]

export default function OfficeBoard({ agentStatuses, isExecuting, fullView }) {
  const [agentPositions, setAgentPositions] = useState({})
  const [bobPhase, setBobPhase] = useState(0)

  // Animate bob effect
  useEffect(() => {
    const interval = setInterval(() => setBobPhase(p => p + 1), 500)
    return () => clearInterval(interval)
  }, [])

  // Calculate agent positions based on status
  useEffect(() => {
    const positions = {}
    AGENTS.forEach(agent => {
      const status = getStatus(agent.id)
      if (status === 'running' || status === 'active') {
        positions[agent.id] = { ...agent.deskPos, location: 'desk' }
      } else if (status === 'idle') {
        positions[agent.id] = { ...agent.breakPos, location: 'break' }
      } else if (status === 'completed') {
        positions[agent.id] = { ...agent.deskPos, location: 'desk' }
      } else {
        positions[agent.id] = { ...agent.breakPos, location: 'break' }
      }
    })
    setAgentPositions(positions)
  }, [agentStatuses])

  function getStatus(id) {
    const s = agentStatuses[id]?.status
    return s || 'idle'
  }

  function getMessage(id) {
    return agentStatuses[id]?.message || null
  }

  const height = fullView ? 600 : 480

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="card-header" style={{ padding: '14px 20px 0' }}>
        <div className="card-title">
          <span className="card-title-icon">🏢</span> Bélica HQ — Agent Office
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="card-badge">{isExecuting ? '🔴 LIVE' : '🟢 IDLE'}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {AGENTS.map(a => {
              const s = getStatus(a.id)
              return (
                <span key={a.id} style={{
                  fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 6px',
                  borderRadius: 4,
                  background: s === 'running' || s === 'active' ? `${a.color}20` : 'rgba(107,114,128,0.15)',
                  color: s === 'running' || s === 'active' ? a.color : '#6b7280',
                }}>
                  {a.name}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{
        position: 'relative',
        width: '100%',
        height,
        background: 'linear-gradient(180deg, #0a0a0f 0%, #0e0e14 50%, #12121a 100%)',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {/* ── FLOOR GRID ── */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(245,158,11,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }} />

        {/* ── FLOOR TEXTURE ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
          background: 'linear-gradient(0deg, rgba(30,25,20,0.4) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* ══════ FURNITURE ══════ */}

        {/* ── DESK 1: Henry (center-top) ── */}
        <div className="office-furniture desk" style={{ left: '42%', top: '42%', width: 180 }}>
          <div className="desk-top">
            <div className="desk-monitor-2d">
              <div className="desk-screen" style={{
                borderColor: getStatus('orchestrator') === 'running' || getStatus('orchestrator') === 'active' ? '#f59e0b40' : '#27272a',
              }}>
                {(getStatus('orchestrator') === 'running' || getStatus('orchestrator') === 'active') && <div className="screen-scanline" />}
                <div className="screen-text" style={{
                  color: getStatus('orchestrator') === 'running' || getStatus('orchestrator') === 'active' ? '#f59e0b' : '#3f3f46',
                }}>
                  {getStatus('orchestrator') === 'running' || getStatus('orchestrator') === 'active' ? '▶ MISSION CTRL' : '⏸ STANDBY'}
                </div>
              </div>
              <div className="desk-stand" />
            </div>
            <div className="desk-items">
              <span style={{ fontSize: 10 }}>☕</span>
              <span style={{ fontSize: 10 }}>📋</span>
            </div>
          </div>
          <div className="desk-plate">
            <span className="desk-nameplate" style={{ color: '#f59e0b' }}>HENRY · COO</span>
          </div>
        </div>

        {/* ── DESK 2: Mike (left) ── */}
        <div className="office-furniture desk" style={{ left: '6%', top: '42%', width: 180 }}>
          <div className="desk-top">
            <div className="desk-monitor-2d">
              <div className="desk-screen" style={{
                borderColor: getStatus('data_miner') === 'running' || getStatus('data_miner') === 'active' ? '#3b82f640' : '#27272a',
              }}>
                {(getStatus('data_miner') === 'running' || getStatus('data_miner') === 'active') && <div className="screen-scanline" style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)' }} />}
                <div className="screen-text" style={{
                  color: getStatus('data_miner') === 'running' || getStatus('data_miner') === 'active' ? '#3b82f6' : '#3f3f46',
                }}>
                  {getStatus('data_miner') === 'running' || getStatus('data_miner') === 'active' ? '▶ SCRAPING...' : '⏸ STANDBY'}
                </div>
              </div>
              <div className="desk-stand" />
            </div>
            <div className="desk-items">
              <span style={{ fontSize: 10 }}>🔧</span>
              <span style={{ fontSize: 10 }}>📊</span>
            </div>
          </div>
          <div className="desk-plate">
            <span className="desk-nameplate" style={{ color: '#3b82f6' }}>MIKE · INTEL</span>
          </div>
        </div>

        {/* ── DESK 3: Roger (center-bottom) ── */}
        <div className="office-furniture desk" style={{ left: '42%', top: '68%', width: 180 }}>
          <div className="desk-top">
            <div className="desk-monitor-2d">
              <div className="desk-screen" style={{
                borderColor: getStatus('signal_processor') === 'running' || getStatus('signal_processor') === 'active' ? '#a855f740' : '#27272a',
              }}>
                {(getStatus('signal_processor') === 'running' || getStatus('signal_processor') === 'active') && <div className="screen-scanline" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)' }} />}
                <div className="screen-text" style={{
                  color: getStatus('signal_processor') === 'running' || getStatus('signal_processor') === 'active' ? '#a855f7' : '#3f3f46',
                }}>
                  {getStatus('signal_processor') === 'running' || getStatus('signal_processor') === 'active' ? '▶ ANALYZING...' : '⏸ STANDBY'}
                </div>
              </div>
              <div className="desk-stand" />
            </div>
            <div className="desk-items">
              <span style={{ fontSize: 10 }}>🧪</span>
              <span style={{ fontSize: 10 }}>💡</span>
            </div>
          </div>
          <div className="desk-plate">
            <span className="desk-nameplate" style={{ color: '#a855f7' }}>ROGER · CREATIVE</span>
          </div>
        </div>

        {/* ── WATER BREAK AREA ── */}
        <div className="office-furniture break-area" style={{ right: '4%', top: '15%' }}>
          <div className="break-sign">☕ BREAK ZONE</div>
          <div className="break-zone">
            <div className="break-item">🚰</div>
            <div className="break-item" style={{ fontSize: 16 }}>🧃</div>
            <div className="break-item" style={{ fontSize: 14 }}>🍩</div>
          </div>
          <div className="break-couch">
            <div className="couch-emoji">🛋️</div>
          </div>
        </div>

        {/* ── OFFICE DECORATIONS ── */}
        <div className="office-decor" style={{ left: '2%', top: '10%' }}>🪴</div>
        <div className="office-decor" style={{ left: '2%', bottom: '10%' }}>🌵</div>
        <div className="office-decor" style={{ right: '3%', bottom: '10%' }}>🪴</div>
        <div className="office-decor" style={{ left: '35%', top: '8%', fontSize: 12, opacity: 0.3 }}>📌</div>

        {/* ── WHITEBOARD ── */}
        <div className="office-whiteboard">
          <div className="whiteboard-title">📋 Sprint Board</div>
          <div className="whiteboard-items">
            <span className="wb-item done">✓ Scrape</span>
            <span className="wb-item active">→ Analyze</span>
            <span className="wb-item">○ Generate</span>
          </div>
        </div>

        {/* ── SERVER RACK ── */}
        <div className="office-server" style={{ left: '30%', top: '10%' }}>
          <div style={{ fontSize: 20 }}>🖥️</div>
          <div className="server-label">VPS<br/>187.124.153.19</div>
          <div className={`server-light ${isExecuting ? 'blinking' : ''}`} />
        </div>

        {/* ══════ ANIMATED ROBOT AGENTS ══════ */}
        {AGENTS.map(agent => {
          const status = getStatus(agent.id)
          const isWorking = status === 'running' || status === 'active'
          const isComplete = status === 'completed'
          const pos = agentPositions[agent.id] || agent.breakPos
          const message = getMessage(agent.id)
          const atDesk = pos.location === 'desk' || isWorking || isComplete
          const bob = bobPhase % 2 === 0 ? -2 : 2

          // Position: at desk when working, at break when idle
          const targetPos = atDesk ? agent.deskPos : agent.breakPos

          return (
            <div
              key={agent.id}
              className="office-robot"
              style={{
                left: `${targetPos.x}%`,
                top: `${targetPos.y}%`,
                transform: `translate(-50%, -50%) translateY(${isWorking ? bob : 0}px)`,
                zIndex: 50,
              }}
            >
              {/* Speech Bubble */}
              {message && (
                <div className="robot-speech" style={{ borderColor: `${agent.color}30` }}>
                  <div className="speech-text" style={{ color: isWorking ? agent.color : '#9ca3af' }}>
                    {message.length > 35 ? message.slice(0, 35) + '...' : message}
                  </div>
                  <div className="speech-arrow" style={{
                    borderTopColor: `${agent.color}15`,
                  }} />
                </div>
              )}

              {/* Robot Body */}
              <div className={`robot-body ${isWorking ? 'working' : isComplete ? 'done' : 'idle'}`} style={{
                borderColor: isWorking ? `${agent.color}50` : isComplete ? '#22c55e30' : '#27272a',
                boxShadow: isWorking ? `0 0 15px ${agent.color}20, 0 4px 12px rgba(0,0,0,0.4)` : '0 4px 12px rgba(0,0,0,0.4)',
              }}>
                {/* Antenna */}
                <div className="robot-antenna" style={{
                  background: isWorking ? agent.color : isComplete ? '#22c55e' : '#3f3f46',
                  boxShadow: isWorking ? `0 0 8px ${agent.color}60` : 'none',
                }} />
                <div className="robot-antenna-stick" />

                {/* Eyes */}
                <div className="robot-eyes">
                  <div className="robot-eye" style={{
                    background: isWorking ? agent.color : isComplete ? '#22c55e' : '#3f3f46',
                    boxShadow: isWorking ? `0 0 6px ${agent.color}` : 'none',
                  }}>
                    {isWorking && <div className="eye-glint" />}
                  </div>
                  <div className="robot-eye" style={{
                    background: isWorking ? agent.color : isComplete ? '#22c55e' : '#3f3f46',
                    boxShadow: isWorking ? `0 0 6px ${agent.color}` : 'none',
                  }}>
                    {isWorking && <div className="eye-glint" />}
                  </div>
                </div>

                {/* Mouth */}
                <div className="robot-mouth" style={{
                  borderColor: isWorking ? agent.color : '#3f3f46',
                }}>
                  {isWorking && (
                    <div className="mouth-talk" style={{ background: agent.color }} />
                  )}
                </div>

                {/* Action indicators */}
                {isWorking && (
                  <div className="robot-typing">
                    <span className="typing-dot" style={{ background: agent.color, animationDelay: '0s' }}>·</span>
                    <span className="typing-dot" style={{ background: agent.color, animationDelay: '0.2s' }}>·</span>
                    <span className="typing-dot" style={{ background: agent.color, animationDelay: '0.4s' }}>·</span>
                  </div>
                )}
              </div>

              {/* Name Tag */}
              <div className="robot-nametag" style={{
                background: isWorking ? `${agent.color}15` : 'rgba(0,0,0,0.5)',
                borderColor: isWorking ? `${agent.color}30` : '#1a1a1a',
                color: isWorking ? agent.color : '#6b7280',
              }}>
                {agent.name}
              </div>

              {/* Status indicator */}
              <div className="robot-status-dot" style={{
                background: isWorking ? agent.color
                  : isComplete ? '#22c55e'
                  : status === 'failed' ? '#ef4444'
                  : '#6b7280',
                boxShadow: isWorking ? `0 0 8px ${agent.color}` : 'none',
                animation: isWorking ? 'pulse 1s infinite' : 'none',
              }} />
            </div>
          )
        })}

        {/* ── DATA FLOW LINES ── */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 1000 500" preserveAspectRatio="none">
          {/* Mike → Henry */}
          <line
            x1="240" y1="260" x2="430" y2="260"
            stroke={(getStatus('data_miner') === 'running' || getStatus('orchestrator') === 'active') ? '#3b82f6' : '#ffffff08'}
            strokeWidth="2"
            strokeDasharray="6 4"
            style={(getStatus('data_miner') === 'running') ? { animation: 'dataFlow 0.8s linear infinite' } : {}}
          />
          {/* Henry → Roger */}
          <line
            x1="500" y1="300" x2="500" y2="370"
            stroke={(getStatus('signal_processor') === 'running' || getStatus('orchestrator') === 'active') ? '#a855f7' : '#ffffff08'}
            strokeWidth="2"
            strokeDasharray="6 4"
            style={(getStatus('signal_processor') === 'running') ? { animation: 'dataFlow 0.8s linear infinite' } : {}}
          />
        </svg>
      </div>
    </div>
  )
}
