import { useState, useEffect } from 'react'
import { dashboardAPI, alertAPI } from '../services/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Ship, Package, Users, AlertTriangle, Zap, Activity, CheckCircle, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Mock real-time data for demo
const genChartData = () => Array.from({ length: 12 }, (_, i) => ({
  hour: `${String(i * 2).padStart(2, '0')}:00`,
  shipments: Math.floor(Math.random() * 40 + 20),
  anomalies: Math.floor(Math.random() * 8),
  healed: Math.floor(Math.random() * 6),
}))

const MOCK_ALERTS = [
  { id: 1, alert_type: 'shipment_delay', severity: 'critical', status: 'healing', title: 'Shipment AP-3F8A delayed 14h', description: 'Worker 1 detected critical delay. Worker 2 executing rerouting strategy.', ai_confidence: 0.97, detected_at: new Date(Date.now() - 180000).toISOString() },
  { id: 2, alert_type: 'inventory_low', severity: 'warning', status: 'open', title: 'SKU-MCU-001 inventory critical', description: 'Microcontroller stock at 8% of reorder point. Auto-PO triggered.', ai_confidence: 0.92, detected_at: new Date(Date.now() - 420000).toISOString() },
  { id: 3, alert_type: 'supplier_risk', severity: 'warning', status: 'acknowledged', title: 'Supplier SHAN-07 risk elevated', description: 'On-time delivery rate dropped to 61%. Backup supplier evaluation started.', ai_confidence: 0.78, detected_at: new Date(Date.now() - 720000).toISOString() },
  { id: 4, alert_type: 'shipment_delay', severity: 'info', status: 'resolved', title: 'Shipment AP-2C1D auto-healed', description: 'Worker 2 successfully rerouted through inland transit. Delay reduced by 9h.', ai_confidence: 0.99, detected_at: new Date(Date.now() - 3600000).toISOString() },
]

const HEALING_LOG = [
  { id: 1, action: 'Auto-PO PO-AUTO-3F8A12 generated for SKU MCU-001', time: '2 min ago', worker: 'Worker 2' },
  { id: 2, action: 'Backup supplier sourced: TITAN Electronics – 48h lead time', time: '5 min ago', worker: 'Worker 2' },
  { id: 3, action: 'Shipment AP-3F8A rerouted via inland transit', time: '12 min ago', worker: 'Worker 2' },
  { id: 4, action: 'Stakeholder notifications sent to 4 recipients', time: '14 min ago', worker: 'Worker 2' },
]

const pieData = [
  { name: 'Healthy', value: 72, color: '#34d399' },
  { name: 'Delayed', value: 18, color: '#f87171' },
  { name: 'At Customs', value: 6, color: '#fbbf24' },
  { name: 'Pending', value: 4, color: '#94a3b8' },
]

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null)
  const [chartData] = useState(genChartData)
  const [alerts, setAlerts] = useState(MOCK_ALERTS)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    dashboardAPI.kpis()
      .then(r => setKpis(r.data))
      .catch(() => setKpis({
        total_shipments: 284, on_time_rate: 82.4, delayed_shipments: 18,
        critical_alerts: 3, inventory_health: 76.2, avg_supplier_reliability: 84.7,
        active_anomalies: 5, healed_today: 12,
      }))
      .finally(() => setLoading(false))

    // Simulate live updates
    const interval = setInterval(() => setTick(t => t + 1), 8000)
    return () => clearInterval(interval)
  }, [])

  const kpiCards = kpis ? [
    { label: 'Total Shipments', value: kpis.total_shipments, icon: <Ship size={18} />, color: 'blue', change: '+12 today', up: true },
    { label: 'On-Time Rate', value: `${kpis.on_time_rate}%`, icon: <TrendingUp size={18} />, color: 'green', change: '+2.1% vs yesterday', up: true },
    { label: 'Active Anomalies', value: kpis.active_anomalies, icon: <AlertTriangle size={18} />, color: 'red', change: `${kpis.critical_alerts} critical`, up: false },
    { label: 'Inventory Health', value: `${kpis.inventory_health}%`, icon: <Package size={18} />, color: 'cyan', change: '3 items critical', up: false },
    { label: 'Supplier Reliability', value: `${kpis.avg_supplier_reliability}%`, icon: <Users size={18} />, color: 'purple', change: 'Across 28 suppliers', up: true },
    { label: 'Self-Healed Today', value: kpis.healed_today, icon: <Zap size={18} />, color: 'amber', change: 'Autonomous resolutions', up: true },
    { label: 'Delayed Shipments', value: kpis.delayed_shipments, icon: <Activity size={18} />, color: 'amber', change: 'Requires attention', up: false },
    { label: 'Auto-Resolved', value: kpis.healed_today, icon: <CheckCircle size={18} />, color: 'green', change: 'No manual effort', up: true },
  ] : []

  const severityColor = { critical: 'critical', warning: 'warning', info: 'info' }
  const statusBadge = { healing: 'healing', open: 'critical', acknowledged: 'warning', resolved: 'resolved' }

  return (
    <div>
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>Supply Chain Control Tower</h1>
          <p>Real-time visibility across your entire supply chain network</p>
        </div>
        <div className="topbar-right">
          <div className="live-indicator">
            <span className="live-dot" />
            LIVE
          </div>
          <span className="text-xs text-muted font-mono">Updated {tick * 8}s ago</span>
        </div>
      </div>

      <div className="page">
        {/* KPI Grid */}
        {loading ? <div className="page-loader"><div className="spinner" /></div> : (
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {kpiCards.map((k, i) => (
              <div key={i} className={`kpi-card ${k.color}`}>
                <div className={`kpi-icon ${k.color}`}>{k.icon}</div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-label">{k.label}</div>
                <div className={`kpi-change ${k.up ? 'up' : 'down'}`}>
                  {k.up ? '↑' : '↓'} {k.change}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div className="charts-grid">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Event Activity (24h)</span>
              <span className="badge info">Live</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0d1f3c', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="shipments" stroke="#38bdf8" fill="url(#gradBlue)" strokeWidth={2} />
                <Area type="monotone" dataKey="anomalies" stroke="#f87171" fill="url(#gradRed)" strokeWidth={2} />
                <Area type="monotone" dataKey="healed" stroke="#34d399" fill="url(#gradGreen)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {[['#38bdf8', 'Shipments'], ['#f87171', 'Anomalies'], ['#34d399', 'Healed']].map(([c, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Shipment Status</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0d1f3c', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {pieData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-muted)' }}>{d.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid-2">
          {/* Alert Feed */}
          <div>
            <div className="section-header">
              <div>
                <div className="section-title">🔴 Live Anomaly Feed</div>
                <div className="section-subtitle">AI-detected supply chain anomalies</div>
              </div>
              <span className="badge critical">Worker 1 Active</span>
            </div>
            {alerts.map(a => (
              <div key={a.id} className="alert-item">
                <div className={`alert-dot ${a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'info'}`} />
                <div className="alert-content">
                  <div className="alert-title">{a.title}</div>
                  <div className="alert-desc">{a.description}</div>
                  <div className="alert-meta">
                    <span className={`badge ${statusBadge[a.status]}`}>{a.status}</span>
                    <span className="badge ai">AI {Math.round(a.ai_confidence * 100)}%</span>
                    <span className="alert-time">{formatDistanceToNow(new Date(a.detected_at))} ago</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Self-Healing Log */}
          <div>
            <div className="section-header">
              <div>
                <div className="section-title">🤖 Self-Healing Log</div>
                <div className="section-subtitle">Autonomous actions by Worker 2</div>
              </div>
              <span className="badge healing">Worker 2 Active</span>
            </div>
            {HEALING_LOG.map(log => (
              <div key={log.id} className="healing-log-item">
                <CheckCircle size={14} className="healing-icon" color="var(--accent-green)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{log.action}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {log.worker} · {log.time}
                  </div>
                </div>
              </div>
            ))}

            {/* Worker Status */}
            <div style={{ marginTop: 16 }}>
              <div className="section-title" style={{ fontSize: 13, marginBottom: 10 }}>Worker Status</div>
              <div className="worker-panel">
                {[
                  { name: 'Anomaly Detector', id: 'Worker 1', status: 'running', color: 'var(--accent-blue)', processed: 47, queue: 3 },
                  { name: 'Self-Healing Agent', id: 'Worker 2', status: 'running', color: 'var(--accent-green)', processed: 12, queue: 1 },
                ].map(w => (
                  <div key={w.id} className="worker-card">
                    <div className="worker-header">
                      <span className="worker-name">{w.id}</span>
                      <span className="status-indicator">
                        <span className="status-dot" style={{ background: w.color, boxShadow: `0 0 6px ${w.color}` }} />
                        <span style={{ color: w.color, fontSize: 11, fontWeight: 700 }}>RUNNING</span>
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{w.name}</div>
                    <div className="worker-stat"><span>Processed:</span><span>{w.processed}</span></div>
                    <div className="worker-stat"><span>Queue depth:</span><span>{w.queue}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
