export default function ExecutePanel({ isExecuting, terminalLog, agentStatuses, onExecute, onSyncVPS, isSyncing }) {
  const pipeline = [
    { key: 'orchestrator', name: 'Henry', emoji: '🦅', label: 'Orchestrate' },
    { key: 'data_miner', name: 'Mike', emoji: '⛏️', label: 'Scrape' },
    { key: 'signal_processor', name: 'Roger', emoji: '🧠', label: 'Analyze' },
  ]

  function getStepStatus(key) {
    const s = agentStatuses[key]
    if (!s) return 'idle'
    if (s.status === 'active') return 'running'
    return s.status
  }

  const completedCount = pipeline.filter(p => getStepStatus(p.key) === 'completed').length
  const progress = isExecuting ? Math.max(10, (completedCount / pipeline.length) * 100) : (completedCount === pipeline.length && completedCount > 0 ? 100 : 0)

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">🚀</span> Execute Pipeline
        </div>
      </div>

      {/* Big Execute Button */}
      <div className="execute-panel-hero">
        <button
          className={`execute-big-btn ${isExecuting ? 'running' : ''}`}
          onClick={onExecute}
          disabled={isExecuting}
        >
          <span className="execute-big-icon">{isExecuting ? '⏳' : '⚡'}</span>
          <span className="execute-big-text">
            {isExecuting ? 'EXECUTING FULL PIPELINE...' : 'EXECUTE FULL PIPELINE'}
          </span>
        </button>

        <button
          className="sync-btn-alt"
          onClick={onSyncVPS}
          disabled={isSyncing || isExecuting}
        >
          {isSyncing ? '🔄 Syncing...' : '☁️ Sync Data from VPS'}
        </button>
      </div>

      {/* Progress Bar */}
      {(isExecuting || progress > 0) && (
        <div className="pipeline-progress-wrap">
          <div className="pipeline-progress-bar">
            <div
              className={`pipeline-progress-fill ${isExecuting ? 'animating' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="pipeline-progress-label">{Math.round(progress)}%</span>
        </div>
      )}

      {/* Pipeline Steps */}
      <div className="pipeline-steps">
        {pipeline.map((step, i) => {
          const status = getStepStatus(step.key)
          const msg = agentStatuses[step.key]?.message || 'Standby'
          return (
            <div key={step.key} className="pipeline-step-wrap">
              {i > 0 && (
                <div className={`pipeline-connector ${status === 'completed' || status === 'running' ? 'active' : ''}`}>
                  <div className="pipeline-connector-line" />
                  <span className="pipeline-connector-arrow">→</span>
                </div>
              )}
              <div className={`pipeline-step ${status}`}>
                <div className="pipeline-step-emoji">{step.emoji}</div>
                <div className="pipeline-step-name">{step.name}</div>
                <div className="pipeline-step-label">{step.label}</div>
                <div className={`pipeline-step-dot ${status}`} />
                <div className="pipeline-step-msg">{msg.slice(0, 40)}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Terminal Output */}
      <div className="execute-terminal">
        <div className="execute-terminal-header">
          <span>🖥️ Live Output</span>
          <span className="card-badge" style={{
            background: isExecuting ? 'rgba(59,130,246,0.2)' : 'rgba(107,114,128,0.2)',
            color: isExecuting ? '#60a5fa' : '#9ca3af',
          }}>
            {isExecuting ? '● STREAMING' : '○ IDLE'}
          </span>
        </div>
        <div className="execute-terminal-body">
          {terminalLog.length === 0 ? (
            <div style={{ color: '#4a4a4a' }}>
              <div>{'>'} Awaiting signal from OpenClaw Gateway...</div>
              <div>{'>'} Click ⚡ EXECUTE FULL PIPELINE to begin</div>
              <div style={{ opacity: 0.5 }}>{'>'} Target: 187.124.153.19 (Hostinger VPS)</div>
            </div>
          ) : (
            [...terminalLog].reverse().map((entry, i) => (
              <div key={i} style={{
                color: entry.line.includes('✅') ? '#22c55e'
                  : entry.line.includes('❌') || entry.line.includes('FATAL') ? '#ef4444'
                  : entry.line.includes('⚠️') ? '#f59e0b'
                  : entry.line.includes('🦅') ? '#f59e0b'
                  : entry.line.includes('📡') || entry.line.includes('🛰️') ? '#a855f7'
                  : '#e4e4e7',
                borderBottom: '1px solid #111',
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
  )
}
