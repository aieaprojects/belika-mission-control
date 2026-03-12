import { getGatewayInfo } from '../services/openclawApi.js'

export default function Header({ wsConnected, gatewayOnline, isExecuting, onExecute }) {
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
