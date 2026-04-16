import { useState, useEffect } from 'react'
import { alertAPI } from '../services/api'
import { AlertTriangle, CheckCircle, Eye, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const MOCK_ALERTS = [
  { id: '1', alert_type: 'shipment_delay', severity: 'critical', status: 'healing', title: 'Critical: Shipment AP-3F8A delayed 14h', description: 'Shipment AP-3F8A7C is delayed by 14.5 hours, exceeding critical threshold. Worker 2 executing autonomous rerouting.', ai_confidence: 0.97, shipment_id: 'a1', detected_at: new Date(Date.now() - 180000).toISOString(), healing_action: 'shipment_delay_mitigation', auto_healed: false },
  { id: '2', alert_type: 'inventory_low', severity: 'critical', status: 'open', title: 'CRITICAL: SKU-MCU-001 out of safety stock', description: 'Microcontroller availability at 15 units – 7.5% of reorder point. Production line at risk.', ai_confidence: 0.99, inventory_id: 'b1', detected_at: new Date(Date.now() - 360000).toISOString(), healing_action: null, auto_healed: false },
  { id: '3', alert_type: 'supplier_risk', severity: 'warning', status: 'acknowledged', title: 'Supplier SHAN-07 performance degraded', description: 'On-time delivery rate dropped from 84% to 61% over past 30 days. Risk score elevated to 72.', ai_confidence: 0.78, supplier_id: 'c1', detected_at: new Date(Date.now() - 720000).toISOString(), healing_action: null, auto_healed: false },
  { id: '4', alert_type: 'route_disruption', severity: 'warning', status: 'open', title: 'Port congestion: Singapore — 3 shipments affected', description: 'Port of Singapore experiencing 48h congestion. 3 shipments in queue. Alternative routing available.', ai_confidence: 0.85, detected_at: new Date(Date.now() - 1200000).toISOString(), healing_action: null, auto_healed: false },
  { id: '5', alert_type: 'shipment_delay', severity: 'info', status: 'resolved', title: 'Shipment AP-1A5C auto-healed ✓', description: 'Delay of 9h successfully mitigated. Backup route through inland transport activated. ETA adjusted.', ai_confidence: 0.99, shipment_id: 'd1', detected_at: new Date(Date.now() - 7200000).toISOString(), healing_action: 'shipment_delay_mitigation', auto_healed: true, resolved_at: new Date(Date.now() - 5400000).toISOString() },
]

const typeLabels = { shipment_delay: 'Shipment Delay', inventory_low: 'Inventory Low', supplier_risk: 'Supplier Risk', route_disruption: 'Route Disruption', demand_spike: 'Demand Spike' }

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS)
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = async () => {
    try {
      const { data } = await alertAPI.list({ severity: severityFilter || undefined, status: statusFilter || undefined })
      if (data.items?.length) setAlerts(data.items)
    } catch { /* use mock */ }
  }
  useEffect(() => { load() }, [severityFilter, statusFilter])

  const handleAck = async (id) => {
    try {
      await alertAPI.acknowledge(id)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a))
      toast.success('Alert acknowledged')
    } catch { toast.error('Failed to acknowledge') }
  }

  const handleResolve = async (id) => {
    try {
      await alertAPI.resolve(id)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a))
      toast.success('Alert resolved')
    } catch { toast.error('Failed to resolve') }
  }

  const filtered = alerts.filter(a =>
    (!severityFilter || a.severity === severityFilter) &&
    (!statusFilter || a.status === statusFilter)
  )

  const counts = { open: alerts.filter(a => a.status === 'open').length, healing: alerts.filter(a => a.status === 'healing').length, resolved: alerts.filter(a => a.status === 'resolved').length }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Alerts & Anomalies</h1>
          <p>AI-detected supply chain anomalies with autonomous self-healing</p>
        </div>
        <div className="topbar-right">
          <span className="badge critical">{counts.open} Open</span>
          <span className="badge healing">{counts.healing} Healing</span>
          <span className="badge resolved">{counts.resolved} Resolved</span>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="page">
        <div className="page-controls">
          <select className="select-filter" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select className="select-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="healing">Self-Healing</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {filtered.map(alert => (
          <div key={alert.id} className="alert-item" style={{ marginBottom: 10 }}>
            <div className={`alert-dot ${alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : alert.status === 'resolved' ? 'resolved' : 'info'}`} />
            <div className="alert-content">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-desc" style={{ marginTop: 4 }}>{alert.description}</div>
                  <div className="alert-meta" style={{ marginTop: 8 }}>
                    <span className={`badge ${alert.severity}`}>{alert.severity}</span>
                    <span className={`badge ${alert.status}`}>{alert.status}</span>
                    <span className="badge info">{typeLabels[alert.alert_type] || alert.alert_type}</span>
                    <span className="badge ai">AI {Math.round(alert.ai_confidence * 100)}%</span>
                    {alert.auto_healed && <span className="badge resolved">🤖 Auto-Healed</span>}
                    <span className="alert-time">{formatDistanceToNow(new Date(alert.detected_at))} ago</span>
                  </div>
                  {alert.healing_action && (
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent-green)' }}>
                      ⚡ Healing strategy: <strong>{alert.healing_action.replace(/_/g, ' ')}</strong>
                    </div>
                  )}
                </div>
                {alert.status === 'open' && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleAck(alert.id)}>
                      <Eye size={12} /> Ack
                    </button>
                    <button className="btn btn-success btn-sm" onClick={() => handleResolve(alert.id)}>
                      <CheckCircle size={12} /> Resolve
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
