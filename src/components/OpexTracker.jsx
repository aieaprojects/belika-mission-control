export default function OpexTracker({ opex }) {
  const { totals = {}, breakdown = [], systemCosts = [] } = opex

  return (
    <div className="glass-card" style={{ height: '100%' }}>
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">💰</span> OPEX Financial Tracker
        </div>
        <span className="card-badge">Live</span>
      </div>

      <div className="opex-grid">
        <div className="opex-stat">
          <div className="opex-stat-label">Total Spend</div>
          <div className="opex-stat-value">
            ${(totals.total_cost || 0).toFixed(4)}
          </div>
          <div className="opex-stat-unit">USD</div>
        </div>
        <div className="opex-stat">
          <div className="opex-stat-label">Apify Cost</div>
          <div className="opex-stat-value">
            ${(totals.total_apify_cost || 0).toFixed(4)}
          </div>
          <div className="opex-stat-unit">{totals.total_apify_results || 0} results</div>
        </div>
        <div className="opex-stat">
          <div className="opex-stat-label">Henry Burn</div>
          <div className="opex-stat-value" style={{ color: '#a855f7' }}>
            ${(totals.henry_burn_rate || 0).toFixed(4)}
          </div>
          <div className="opex-stat-unit">{totals.henry_entries || 0} API calls</div>
        </div>
      </div>

      {/* Henry's system_costs breakdown */}
      {systemCosts.length > 0 && (
        <div className="opex-breakdown">
          <div className="card-title" style={{ fontSize: 11, marginBottom: 8, color: '#a855f7' }}>
            🦅 Henry's API Burn Rate
          </div>
          {systemCosts.slice(0, 10).map((row, i) => (
            <div className="opex-row" key={`sc-${i}`}>
              <span className="opex-row-label">
                {row.service || 'Unknown'} · {row.details ? row.details.substring(0, 40) : ''}
              </span>
              <span className="opex-row-value" style={{ color: '#a855f7' }}>
                ${(row.cost_usd || 0).toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="opex-breakdown">
        <div className="card-title" style={{ fontSize: 11, marginBottom: 8 }}>
          Run Breakdown
        </div>
        {breakdown.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
            No runs recorded yet
          </div>
        ) : (
          breakdown.map((row, i) => (
            <div className="opex-row" key={i}>
              <span className="opex-row-label">
                {row.agent_name || 'Unknown'} · {new Date(row.run_date || row.recorded_at).toLocaleDateString()}
              </span>
              <span className="opex-row-value">
                ${(row.total_cost || 0).toFixed(4)}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{
        marginTop: 16,
        padding: '10px 12px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          <div>📊 Pricing Model:</div>
          <div>  Apify: ~$2.50 / 1,000 results</div>
          <div>  Gemini Flash: $0.075/1M input · $0.30/1M output</div>
          <div>  Total Runs: {totals.total_runs || 0}</div>
          <div style={{ color: '#a855f7' }}>  🦅 Henry Burn: ${(totals.henry_burn_rate || 0).toFixed(4)} ({totals.henry_entries || 0} entries)</div>
        </div>
      </div>
    </div>
  )
}
