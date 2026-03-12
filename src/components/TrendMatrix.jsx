import { useState } from 'react'

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function getTriggerClass(trigger) {
  if (!trigger) return ''
  const t = trigger.toLowerCase()
  if (t.includes('flex')) return 'flex'
  if (t.includes('emotional')) return 'emotional'
  if (t.includes('heartbreak')) return 'heartbreak'
  if (t.includes('party')) return 'party'
  if (t.includes('hustle')) return 'hustle'
  return ''
}

export default function TrendMatrix({ trends, onAnalyze }) {
  const [sortBy, setSortBy] = useState('velocity_score')
  const [sortDir, setSortDir] = useState('desc')
  const [search, setSearch] = useState('')

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  const filtered = trends
    .filter(t => {
      const q = search.toLowerCase()
      return !q || (t.caption || '').toLowerCase().includes(q)
        || (t.trigger_keyword || '').toLowerCase().includes(q)
        || (t.trigger_type || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const av = a[sortBy] ?? 0
      const bv = b[sortBy] ?? 0
      return sortDir === 'desc' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1)
    })

  const maxVelocity = Math.max(...trends.map(t => t.velocity_score || 0), 1)

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">📊</span> The Trend Matrix
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search trends..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              outline: 'none',
              width: 200,
            }}
          />
          <span className="card-badge">{filtered.length} trends</span>
          <button onClick={onAnalyze} style={{
            background: 'var(--accent-dim)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            cursor: 'pointer',
          }}>
            🔬 Re-Analyze
          </button>
        </div>
      </div>

      <div className="trend-table-wrap">
        <table className="trend-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('platform')} style={{ cursor: 'pointer' }}>
                Platform {sortBy === 'platform' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th onClick={() => handleSort('trigger_keyword')} style={{ cursor: 'pointer' }}>
                Keyword {sortBy === 'trigger_keyword' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th>Video</th>
              <th>Hook / Caption</th>
              <th>Audio</th>
              <th onClick={() => handleSort('views')} style={{ cursor: 'pointer' }}>
                Views {sortBy === 'views' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th onClick={() => handleSort('velocity_score')} style={{ cursor: 'pointer' }}>
                Velocity % {sortBy === 'velocity_score' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th>Trigger</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((trend, i) => (
              <tr key={trend.id || i} style={{ animationDelay: `${i * 0.03}s` }}>
                <td>
                  <span className={`platform-badge ${trend.platform}`}>
                    {trend.platform === 'tiktok' ? '♪' : '📷'} {trend.platform}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                  {trend.trigger_keyword}
                </td>
                <td>
                  <a href={trend.video_url} target="_blank" rel="noreferrer" className="trend-link">
                    ▶ View
                  </a>
                </td>
                <td>
                  <div className="hook-text" title={trend.caption}>
                    {trend.caption || trend.hook_transcript || '—'}
                  </div>
                </td>
                <td>
                  {trend.audio_url ? (
                    <a href={trend.audio_url} target="_blank" rel="noreferrer" className="trend-link">
                      🎵 Audio
                    </a>
                  ) : '—'}
                </td>
                <td>
                  <span className="view-count">{formatNumber(trend.views)}</span>
                </td>
                <td>
                  <div className="velocity-bar">
                    <div
                      className="velocity-fill"
                      style={{ width: `${(trend.velocity_score / maxVelocity) * 80}px` }}
                    />
                    <span className="velocity-value">{trend.velocity_score}%</span>
                  </div>
                </td>
                <td>
                  <span className={`trigger-badge ${getTriggerClass(trend.trigger_type)}`}>
                    {trend.trigger_type || 'Unclassified'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">
            No trends found. Execute Research Protocol to start scraping.
          </div>
        </div>
      )}
    </div>
  )
}
