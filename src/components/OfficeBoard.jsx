export default function OfficeBoard({ agentStatuses, isExecuting, fullView }) {
  const agents = [
    {
      id: 'data_miner',
      name: 'Data Miner',
      emoji: '⛏️',
      role: 'Director of Intelligence',
      monitorIdle: 'STANDBY — Awaiting orders...',
      monitorActive: 'SCRAPING — #corridostumbados',
    },
    {
      id: 'orchestrator',
      name: 'Henry',
      emoji: '🦅',
      role: 'COO / Orchestrator',
      monitorIdle: 'MISSION CONTROL — All systems nominal',
      monitorActive: 'COORDINATING — Pipeline active...',
    },
    {
      id: 'signal_processor',
      name: 'Signal Proc.',
      emoji: '🧠',
      role: 'VP of Creative',
      monitorIdle: 'STANDBY — Ready to analyze',
      monitorActive: 'PROCESSING — Classifying triggers',
    },
  ];

  const getStatus = (id) => agentStatuses[id]?.status || 'idle';
  const isActive = (id) => getStatus(id) === 'running';

  const orchActive = isActive('orchestrator');
  const minerActive = isActive('data_miner');
  const signalActive = isActive('signal_processor');

  // Explicit positions for each desk
  const deskPositions = [
    { left: '5%', top: '50%', transform: 'translateY(-50%)' },
    { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
    { right: '5%', top: '50%', transform: 'translateY(-50%)' },
  ];

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="card-header" style={{ padding: '14px 20px 0' }}>
        <div className="card-title">
          <span className="card-title-icon">🏢</span> Bélica HQ — Agent Office
        </div>
        <span className="card-badge">{isExecuting ? '🔴 LIVE' : '🟢 IDLE'}</span>
      </div>

      <div style={{
        position: 'relative',
        width: '100%',
        height: fullView ? 550 : 420,
        background: 'linear-gradient(180deg, #0c0c10 0%, #111118 100%)',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {/* Floor grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(245, 158, 11, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Office props */}
        <div style={{ position: 'absolute', left: '2%', top: '12%', fontSize: 24, opacity: 0.35 }}>🪴</div>
        <div style={{ position: 'absolute', right: '2%', bottom: '12%', fontSize: 24, opacity: 0.35 }}>🌵</div>
        <div style={{ position: 'absolute', left: '50%', top: '6%', transform: 'translateX(-50%)', fontSize: 18, opacity: 0.4 }}>☕</div>

        {/* Whiteboard */}
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '6%',
          transform: 'translateX(-50%)',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          background: 'rgba(24, 24, 27, 0.7)',
          padding: '8px 16px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          opacity: 0.6,
          textAlign: 'center',
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
        }}>
          📋 Trending Now — #corridostumbados · #pesopluma · #alucin · #regionalmexicano
        </div>

        {/* Data flow lines SVG */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 1000 420" preserveAspectRatio="none">
          {/* Miner → Orchestrator */}
          <line
            x1="230" y1="210" x2="420" y2="210"
            stroke={minerActive || orchActive ? '#f59e0b' : 'rgba(245, 158, 11, 0.12)'}
            strokeWidth="2"
            strokeDasharray={minerActive || orchActive ? '8 4' : '4 8'}
            style={minerActive || orchActive ? { animation: 'dataFlow 1s linear infinite' } : {}}
          />
          {/* Orchestrator → Signal */}
          <line
            x1="580" y1="210" x2="770" y2="210"
            stroke={orchActive || signalActive ? '#f59e0b' : 'rgba(245, 158, 11, 0.12)'}
            strokeWidth="2"
            strokeDasharray={orchActive || signalActive ? '8 4' : '4 8'}
            style={orchActive || signalActive ? { animation: 'dataFlow 1s linear infinite' } : {}}
          />
          {/* Arrow heads */}
          {(minerActive || orchActive) && (
            <polygon points="415,205 425,210 415,215" fill="#f59e0b" opacity="0.8" />
          )}
          {(orchActive || signalActive) && (
            <polygon points="765,205 775,210 765,215" fill="#f59e0b" opacity="0.8" />
          )}
          {/* Flow labels */}
          {(minerActive || orchActive) && (
            <text x="325" y="200" fill="#f59e0b" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" opacity="0.7">RAW DATA →</text>
          )}
          {(orchActive || signalActive) && (
            <text x="675" y="200" fill="#f59e0b" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" opacity="0.7">→ ANALYZE</text>
          )}
        </svg>

        {/* Agent Desks - explicitly positioned */}
        {agents.map((agent, index) => {
          const status = getStatus(agent.id);
          const active = status === 'running';
          const completed = status === 'completed';
          const message = agentStatuses[agent.id]?.message;
          const pos = deskPositions[index];

          return (
            <div key={agent.id} style={{
              position: 'absolute',
              width: 200,
              ...pos,
              zIndex: 10,
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #1e1e24, #252530)',
                border: `1px solid ${active ? 'rgba(245, 158, 11, 0.35)' : 'rgba(63, 63, 70, 0.4)'}`,
                borderRadius: 'var(--radius-md)',
                padding: 14,
                transition: 'all 0.4s ease',
                boxShadow: active ? '0 0 20px rgba(245, 158, 11, 0.1)' : 'none',
              }}>
                {/* Monitor */}
                <div style={{
                  width: '100%',
                  height: 70,
                  background: '#0a0a0e',
                  border: `1px solid ${active ? 'rgba(245, 158, 11, 0.3)' : 'rgba(63, 63, 70, 0.5)'}`,
                  borderRadius: 6,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: active ? '#f59e0b' : completed ? '#22c55e' : 'var(--text-muted)',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                }}>
                  {/* Scanline effect when active */}
                  {active && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.3), transparent)',
                      animation: 'scanline 3s linear infinite',
                    }} />
                  )}
                  <div style={{ zIndex: 1, textAlign: 'center', padding: 6, lineHeight: 1.5, wordBreak: 'break-word' }}>
                    {active
                      ? (message ? message.substring(0, 50) : agent.monitorActive)
                      : completed
                        ? '✅ COMPLETE'
                        : agent.monitorIdle}
                  </div>
                </div>

                {/* Character area */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    fontSize: 30,
                    transition: 'all 0.3s ease',
                    animation: active ? 'float 2s ease-in-out infinite' : 'none',
                    filter: active ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.3))' : 'none',
                  }}>
                    {agent.emoji}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    textAlign: 'center',
                  }}>
                    {agent.name}
                  </span>
                  <span style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    textAlign: 'center',
                    background: status === 'running' ? 'rgba(59, 130, 246, 0.15)'
                      : status === 'completed' ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(107, 114, 128, 0.15)',
                    color: status === 'running' ? '#3b82f6'
                      : status === 'completed' ? '#22c55e'
                      : '#6b7280',
                  }}>
                    {status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
