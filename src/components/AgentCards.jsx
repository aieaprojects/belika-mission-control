import { API_BASE } from '../services/api'

const AGENT_PROFILES = {
  orchestrator: {
    name: 'Henry',
    avatar: '🦅',
    role: 'System Orchestrator / COO',
    brain: 'Gemini 2.5 Pro',
    brainIcon: '🧬',
    brainColor: '#4285f4',
    desc: 'Orchestrates the full pipeline. Dispatches missions, monitors all agents, manages cost tracking and system health.',
    tools: ['OpenClaw CLI', 'SQLite', 'PM2', 'SSH'],
    color: '#f59e0b',
  },
  data_miner: {
    name: 'Mike',
    avatar: '⛏️',
    role: 'Director of Intelligence',
    brain: 'DeepSeek V3',
    brainIcon: '🔮',
    brainColor: '#22c55e',
    desc: 'Scrapes TikTok & Instagram for viral content. Targets hashtags, extracts hooks, captions, and engagement data.',
    tools: ['Apify', 'TikTok API', 'Instagram API', 'Python'],
    color: '#3b82f6',
  },
  signal_processor: {
    name: 'Roger',
    avatar: '🧠',
    role: 'VP of Creative / Signal Analyst',
    brain: 'Gemini 2.5 Flash',
    brainIcon: '⚡',
    brainColor: '#a855f7',
    desc: 'Analyzes scraped data to classify trigger types, generate viral concepts, and identify content angles.',
    tools: ['Gemini API', 'NLP Pipeline', 'Trend Analysis'],
    color: '#a855f7',
  },
}

export default function AgentCards({ agentStatuses, trends, isExecuting, onRunAgent }) {
  const totalVideos = trends?.length || 0
  const platforms = trends?.reduce((acc, t) => {
    acc[t.platform] = (acc[t.platform] || 0) + 1
    return acc
  }, {}) || {}
  const triggerTypes = trends?.reduce((acc, t) => {
    if (t.trigger_type && t.trigger_type !== 'Unclassified') {
      acc[t.trigger_type] = (acc[t.trigger_type] || 0) + 1
    }
    return acc
  }, {}) || {}

  function getStatus(codename) {
    const s = agentStatuses[codename]
    return s?.status || 'idle'
  }

  function getMessage(codename) {
    const s = agentStatuses[codename]
    return s?.message || 'Awaiting orders...'
  }

  function formatStatusLabel(status) {
    if (status === 'active') return 'ACTIVE'
    if (status === 'running') return 'RUNNING'
    if (status === 'completed') return 'COMPLETED'
    if (status === 'failed') return 'FAILED'
    return 'IDLE'
  }

  return (
    <div className="agent-cards-grid">
      {Object.entries(AGENT_PROFILES).map(([codename, agent]) => {
        const status = getStatus(codename)
        const message = getMessage(codename)
        const statusClass = status === 'active' ? 'running' : status

        return (
          <div key={codename} className={`agent-detail-card ${statusClass}`}>
            {/* Glowing top border */}
            <div className="agent-detail-glow" style={{
              background: `linear-gradient(90deg, transparent, ${agent.color}40, transparent)`,
              opacity: status === 'idle' ? 0 : 1,
            }} />

            {/* Header */}
            <div className="agent-detail-header">
              <div className="agent-detail-avatar" style={{
                borderColor: `${agent.color}40`,
                boxShadow: status !== 'idle' ? `0 0 20px ${agent.color}20` : 'none',
              }}>
                <span className={status === 'running' || status === 'active' ? 'character-emoji working' : ''}>{agent.avatar}</span>
              </div>
              <div className="agent-detail-info">
                <div className="agent-detail-name">{agent.name}</div>
                <div className="agent-detail-role" style={{ color: agent.color }}>{agent.role}</div>
              </div>
              <div className={`agent-detail-status-badge ${statusClass}`}>
                <div className={`agent-status-dot ${statusClass}`} />
                <span>{formatStatusLabel(status)}</span>
              </div>
            </div>

            {/* Brain Model */}
            <div className="agent-brain-tag" style={{
              borderColor: `${agent.brainColor}30`,
              background: `${agent.brainColor}08`,
            }}>
              <span>{agent.brainIcon}</span>
              <span style={{ color: agent.brainColor, fontWeight: 600 }}>{agent.brain}</span>
              <span className="brain-separator">·</span>
              <span className="brain-tools">{agent.tools.join(' · ')}</span>
            </div>

            {/* Description */}
            <div className="agent-detail-desc">{agent.desc}</div>

            {/* Current Task */}
            <div className="agent-task-box">
              <div className="agent-task-label">CURRENT STATUS</div>
              <div className="agent-task-message" style={{
                color: status === 'completed' ? '#22c55e'
                  : status === 'running' || status === 'active' ? '#3b82f6'
                  : status === 'failed' ? '#ef4444'
                  : '#71717a'
              }}>
                {message}
              </div>
            </div>

            {/* Agent-specific stats */}
            {codename === 'data_miner' && (
              <div className="agent-stats-row">
                <div className="agent-stat">
                  <div className="agent-stat-value">{totalVideos}</div>
                  <div className="agent-stat-label">Videos Scraped</div>
                </div>
                <div className="agent-stat">
                  <div className="agent-stat-value">{platforms.tiktok || 0}</div>
                  <div className="agent-stat-label">TikTok</div>
                </div>
                <div className="agent-stat">
                  <div className="agent-stat-value">{platforms.instagram || 0}</div>
                  <div className="agent-stat-label">Instagram</div>
                </div>
              </div>
            )}

            {codename === 'signal_processor' && (
              <div className="agent-stats-row">
                {Object.entries(triggerTypes).slice(0, 3).map(([type, count]) => (
                  <div key={type} className="agent-stat">
                    <div className="agent-stat-value">{count}</div>
                    <div className="agent-stat-label">{type}</div>
                  </div>
                ))}
              </div>
            )}

            {codename === 'orchestrator' && (
              <div className="agent-stats-row">
                <div className="agent-stat">
                  <div className="agent-stat-value">{totalVideos}</div>
                  <div className="agent-stat-label">Total Data</div>
                </div>
                <div className="agent-stat">
                  <div className="agent-stat-value">{Object.keys(triggerTypes).length}</div>
                  <div className="agent-stat-label">Categories</div>
                </div>
                <div className="agent-stat">
                  <div className="agent-stat-value">{Object.keys(platforms).length}</div>
                  <div className="agent-stat-label">Platforms</div>
                </div>
              </div>
            )}

            {/* Run button */}
            <button
              className="agent-run-btn"
              disabled={isExecuting}
              onClick={() => onRunAgent && onRunAgent(codename)}
              style={{ borderColor: `${agent.color}40`, color: agent.color }}
            >
              {isExecuting ? '⏳ Processing...' : `▶ Run ${agent.name}`}
            </button>
          </div>
        )
      })}
    </div>
  )
}
