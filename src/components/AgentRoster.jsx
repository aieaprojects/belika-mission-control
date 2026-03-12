const AGENT_META = {
  orchestrator: { emoji: '🦅', color: '#f59e0b' },
  data_miner: { emoji: '⛏️', color: '#3b82f6' },
  signal_processor: { emoji: '🧠', color: '#a855f7' },
}

export default function AgentRoster({ agents, agentStatuses }) {
  return (
    <div className="glass-card" style={{ height: '100%' }}>
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">👥</span> Agent Roster
        </div>
        <span className="card-badge">{agents.length} agents</span>
      </div>

      <div className="agent-roster">
        {agents.map((agent, i) => {
          const liveStatus = agentStatuses[agent.codename]
          const status = liveStatus?.status || agent.lastStatus || 'idle'
          const meta = AGENT_META[agent.codename] || { emoji: '🤖', color: '#6b7280' }

          return (
            <div
              key={agent.codename}
              className={`agent-card ${agent.codename}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="agent-avatar" style={{
                borderColor: meta.color + '40',
                background: meta.color + '15',
              }}>
                {meta.emoji}
              </div>

              <div className="agent-name">{agent.name}</div>
              <div className="agent-role">{agent.role}</div>
              <div className="agent-desc">{agent.description}</div>

              <div className="agent-llm">
                <span>🔧</span> {agent.llm}
              </div>

              <div className="agent-status">
                <div className={`agent-status-dot ${status}`} />
                <span className={`status-text ${status}`}>
                  {status.toUpperCase()}
                </span>
              </div>

              {liveStatus?.message && (
                <div style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  lineHeight: 1.4,
                }}>
                  {liveStatus.message}
                </div>
              )}

              {agent.lastRun && !liveStatus && (
                <div style={{
                  marginTop: 8,
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}>
                  Last run: {new Date(agent.lastRun).toLocaleString()}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {agents.length === 0 && (
        <div className="agent-roster">
          {['🦅 Henry · COO', '⛏️ Mike · Intelligence', '🧠 Roger · Creative'].map((label, i) => (
            <div className="agent-card" key={i}>
              <div className="agent-avatar">{label.split(' ')[0]}</div>
              <div className="agent-name">{label.split('·')[0].slice(2).trim()}</div>
              <div className="agent-role">{label.split('·')[1]?.trim()}</div>
              <div className="agent-status">
                <div className="agent-status-dot idle" />
                <span className="status-text idle">IDLE</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
