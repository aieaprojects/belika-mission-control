import { useState, useMemo } from 'react'
import { REAL_VIRAL_CONCEPTS } from '../data/viralConceptsReal'

const TRIGGER_COLORS = {
  'The Flex': { bg: 'rgba(234, 179, 8, 0.12)', color: '#eab308', border: 'rgba(234, 179, 8, 0.2)' },
  'The Emotional Story': { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.2)' },
  'The Heartbreak': { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: 'rgba(239, 68, 68, 0.2)' },
  'The Party Anthem': { bg: 'rgba(168, 85, 247, 0.12)', color: '#a78bfa', border: 'rgba(168, 85, 247, 0.2)' },
  'The Hustle': { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.2)' },
}

// Using REAL viral concepts from 252 scraped videos (500K+ views)
// Generated from actual TikTok data

export default function ViralConceptsPanel({ trends, isExecuting, onAnalyze }) {
  const [filter, setFilter] = useState('all')

  const triggerDistribution = useMemo(() => {
    const dist = {}
    trends?.forEach(t => {
      const type = t.trigger_type || 'Unclassified'
      if (type !== 'Unclassified') dist[type] = (dist[type] || 0) + 1
    })
    return Object.entries(dist).sort((a, b) => b[1] - a[1])
  }, [trends])

  const maxCount = triggerDistribution.length > 0 ? triggerDistribution[0][1] : 1

  const concepts = useMemo(() => {
    const topTrends = trends?.filter(t => t.velocity_score >= 15).slice(0, 10) || []
    // Use REAL viral concepts from scraped data
    return REAL_VIRAL_CONCEPTS.map((concept, i) => {
      return {
        id: concept.id,
        title: concept.title,
        hook: concept.hook,
        triggerType: concept.tipo_contenido,
        hashtags: concept.hashtags,
        reach: concept.alcance,
        audience: concept.ejemplo_real,
        example: concept.ejemplo_real,
        views: 0,
      }
    })
  }, [trends])

  const filteredConcepts = filter === 'all'
    ? concepts
    : concepts.filter(c => c.triggerType === filter)

  const filters = ['all', ...triggerDistribution.map(([type]) => type)]

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">💡</span> Viral Concepts Panel
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="card-badge">{filteredConcepts.length} concepts</span>
          <button
            onClick={onAnalyze}
            disabled={isExecuting}
            className="concept-generate-btn"
          >
            {isExecuting ? '⏳ Analyzing...' : '🧠 Generate New Concepts'}
          </button>
        </div>
      </div>

      {/* Trigger Distribution Chart */}
      <div className="trigger-chart-section">
        <div className="trigger-chart-title">📊 Trigger Type Distribution</div>
        <div className="trigger-chart-bars">
          {triggerDistribution.map(([type, count]) => {
            const colors = TRIGGER_COLORS[type] || { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', border: 'rgba(107,114,128,0.2)' }
            return (
              <div key={type} className="trigger-chart-row">
                <div className="trigger-chart-label">{type}</div>
                <div className="trigger-chart-bar-wrap">
                  <div
                    className="trigger-chart-bar-fill"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      background: `linear-gradient(90deg, ${colors.color}40, ${colors.color})`,
                    }}
                  />
                </div>
                <div className="trigger-chart-count" style={{ color: colors.color }}>{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter pills */}
      <div className="concept-filters">
        {filters.map(f => (
          <button
            key={f}
            className={`concept-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '🔥 All' : f}
          </button>
        ))}
      </div>

      {/* Concept Cards Grid */}
      <div className="concept-cards-grid">
        {filteredConcepts.map(concept => {
          const colors = TRIGGER_COLORS[concept.triggerType] || TRIGGER_COLORS['The Flex']
          return (
            <div key={concept.id} className="concept-card">
              <div className="concept-card-top">
                <div className="concept-badge" style={{
                  background: colors.bg,
                  color: colors.color,
                  border: `1px solid ${colors.border}`,
                }}>
                  {concept.triggerType}
                </div>
                <div className={`concept-reach reach-${concept.reach.toLowerCase()}`}>
                  {concept.reach === 'High' ? '🔥' : '📈'} {concept.reach}
                </div>
              </div>

              <div className="concept-title">{concept.title}</div>
              <div className="concept-angle">🎯 {concept.hook}</div>

              <div className="concept-hashtags">
                {concept.hashtags.map((h, i) => (
                  <span key={i} className="concept-hashtag">{h}</span>
                ))}
              </div>

              <div className="concept-footer">
                <span className="concept-audience">📊 {concept.example}</span>
                {concept.views > 0 && (
                  <span className="concept-views">
                    {(concept.views / 1000000).toFixed(1)}M views
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
