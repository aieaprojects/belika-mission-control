import { getGatewayInfo } from '../services/openclawApi.js'

export default function Header({ wsConnected, gatewayOnline, isExecuting, isSyncing, onExecute, onSyncVPS }) {
  const gwInfo = getGatewayInfo()

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">
          <span className="header-logo-icon">🦅</span>
          <span className="header-logo-text">Bélica</span>
        </div>
        <span className="header-subtitle">Mission Control · Research Engine</span>
      </div>

      <div className="header-right">
        {/* Gateway status indicator */}
        <div className="connection-status" title={`Gateway: ${gwInfo.url}`} style={{ marginRight: 6 }}>
          <div className={`connection-dot ${gatewayOnline ? '' : 'disconnected'}`}
            style={gatewayOnline ? { background: '#a855f7', boxShadow: '0 0 8px rgba(168, 85, 247, 0.6)' } : {}}
          />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            {gatewayOnline ? 'GATEWAY' : 'GW:OFF'}
          </span>
        </div>

        {/* Local WS status */}
        <div className="connection-status">
          <div className={`connection-dot ${wsConnected ? '' : 'disconnected'}`} />
          {wsConnected ? 'ONLINE' : 'OFFLINE'}
        </div>

        {/* Sync from VPS button */}
        <button
          onClick={onSyncVPS}
          disabled={isSyncing || isExecuting}
          style={{
            marginLeft: 8,
            padding: '6px 14px',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            background: isSyncing ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: 6,
            color: '#a855f7',
            cursor: (isSyncing || isExecuting) ? 'not-allowed' : 'pointer',
            opacity: (isSyncing || isExecuting) ? 0.5 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {isSyncing ? '🔄 SYNCING...' : '☁️ SYNC FROM VPS'}
        </button>

        <button
          className={`execute-btn ${isExecuting ? 'running' : ''}`}
          onClick={onExecute}
          disabled={isExecuting}
        >
          <span className="execute-btn-icon">{isExecuting ? '⏳' : '⚡'}</span>
          {isExecuting ? 'EXECUTING...' : 'EXECUTE RESEARCH PROTOCOL'}
        </button>
      </div>
    </header>
  )
}
