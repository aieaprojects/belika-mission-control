import { getGatewayInfo } from '../services/openclawApi.js'

export default function StatusBar({ wsConnected, gatewayOnline, isExecuting, agentStatuses, trendsCount }) {
  const gwInfo = getGatewayInfo()
  const currentPhase = isExecuting
    ? (agentStatuses.orchestrator?.message || 'Executing pipeline...')
    : 'Idle — Ready for orders'

  return (
    <footer className="status-bar">
      <div className="status-bar-left">
        <div className="status-indicator">
          <div className={`connection-dot ${wsConnected ? '' : 'disconnected'}`} />
          {wsConnected ? 'WS:Connected' : 'WS:Disconnected'}
        </div>
        <span>|</span>
        <div className="status-indicator">
          <div className={`connection-dot ${gatewayOnline ? '' : 'disconnected'}`}
            style={gatewayOnline ? { background: '#a855f7', boxShadow: '0 0 6px rgba(168, 85, 247, 0.5)' } : {}}
          />
          {gatewayOnline ? `GW:${gwInfo.url.replace('http://', '')}` : 'GW:Offline'}
        </div>
        <span>|</span>
        <span>{currentPhase}</span>
      </div>
      <div className="status-bar-right">
        <span>Trends: {trendsCount}</span>
        <span>|</span>
        <span>v2.0.0 — OpenClaw</span>
        <span>|</span>
        <span>🦅 BÉLICA OS</span>
      </div>
    </footer>
  )
}
