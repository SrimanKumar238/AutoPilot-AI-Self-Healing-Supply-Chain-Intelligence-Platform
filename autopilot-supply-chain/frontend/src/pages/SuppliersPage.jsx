import { useState } from 'react'
import { Users, Search, TrendingUp, TrendingDown } from 'lucide-react'

const MOCK_SUPPLIERS = [
  { id: '1', code: 'SHAN-07', name: 'Shanghai Electronics Co.', country: 'China', region: 'Asia Pacific', category: 'Electronics', reliability_score: 61, quality_score: 78, on_time_delivery_rate: 61, avg_lead_time_days: 21, risk_level: 'high', risk_score: 72, is_active: true, is_certified: false, total_orders: 284 },
  { id: '2', code: 'TITAN-03', name: 'Titan Global Logistics', country: 'Germany', region: 'Europe', category: 'Logistics', reliability_score: 94, quality_score: 92, on_time_delivery_rate: 94, avg_lead_time_days: 7, risk_level: 'low', risk_score: 12, is_active: true, is_certified: true, total_orders: 892 },
  { id: '3', code: 'APEX-11', name: 'Apex Manufacturing India', country: 'India', region: 'South Asia', category: 'Manufacturing', reliability_score: 86, quality_score: 89, on_time_delivery_rate: 86, avg_lead_time_days: 14, risk_level: 'medium', risk_score: 35, is_active: true, is_certified: true, total_orders: 412 },
  { id: '4', code: 'NEON-02', name: 'Neon Packaging Co.', country: 'USA', region: 'North America', category: 'Packaging', reliability_score: 91, quality_score: 95, on_time_delivery_rate: 91, avg_lead_time_days: 5, risk_level: 'low', risk_score: 18, is_active: true, is_certified: true, total_orders: 1247 },
  { id: '5', code: 'MERC-09', name: 'Mercury Components Ltd.', country: 'Taiwan', region: 'Asia Pacific', category: 'Electronics', reliability_score: 73, quality_score: 80, on_time_delivery_rate: 73, avg_lead_time_days: 18, risk_level: 'medium', risk_score: 48, is_active: false, is_certified: false, total_orders: 156 },
]

const riskColors = { low: 'resolved', medium: 'warning', high: 'critical', critical: 'critical' }

export default function SuppliersPage() {
  const [suppliers] = useState(MOCK_SUPPLIERS)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('')

  const filtered = suppliers.filter(s =>
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.includes(search.toUpperCase())) &&
    (!riskFilter || s.risk_level === riskFilter)
  )

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Supplier Intelligence</h1>
          <p>Vendor risk scoring, performance metrics, and compliance</p>
        </div>
        <div className="topbar-right">
          <span className="badge critical">{suppliers.filter(s => s.risk_level === 'high').length} High Risk</span>
          <span className="badge warning">{suppliers.filter(s => s.risk_level === 'medium').length} Medium Risk</span>
        </div>
      </div>

      <div className="page">
        {/* Supplier summary cards */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          {[
            { label: 'Total Suppliers', value: suppliers.length, color: 'blue' },
            { label: 'Certified', value: suppliers.filter(s => s.is_certified).length, color: 'green' },
            { label: 'High Risk', value: suppliers.filter(s => s.risk_level === 'high').length, color: 'red' },
            { label: 'Avg Reliability', value: `${Math.round(suppliers.reduce((a, s) => a + s.reliability_score, 0) / suppliers.length)}%`, color: 'purple' },
          ].map((k, i) => (
            <div key={i} className={`kpi-card ${k.color}`}>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="page-controls">
          <div className="search-bar">
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search supplier name or code..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select-filter" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
            <option value="">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Supplier</th>
                <th>Location</th>
                <th>Reliability</th>
                <th>On-Time %</th>
                <th>Lead Time</th>
                <th>Risk Level</th>
                <th>Risk Score</th>
                <th>Orders</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td><span className="mono text-accent">{s.code}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.category}</div>
                  </td>
                  <td className="text-sm text-muted">{s.country}<br /><span style={{ fontSize: 10 }}>{s.region}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: s.reliability_score >= 85 ? 'var(--accent-green)' : s.reliability_score >= 70 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                        {s.reliability_score}%
                      </span>
                      {s.reliability_score >= 85 ? <TrendingUp size={12} color="var(--accent-green)" /> : <TrendingDown size={12} color="var(--accent-red)" />}
                    </div>
                    <div className="progress-bar" style={{ width: 60, marginTop: 4 }}>
                      <div className="progress-fill" style={{ width: `${s.reliability_score}%`, background: s.reliability_score >= 85 ? 'var(--accent-green)' : s.reliability_score >= 70 ? 'var(--accent-amber)' : 'var(--accent-red)' }} />
                    </div>
                  </td>
                  <td>
                    <span style={{ color: s.on_time_delivery_rate >= 85 ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 600 }}>
                      {s.on_time_delivery_rate}%
                    </span>
                  </td>
                  <td className="text-sm">{s.avg_lead_time_days}d</td>
                  <td><span className={`badge ${riskColors[s.risk_level]}`}>{s.risk_level}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="progress-bar" style={{ width: 48 }}>
                        <div className="progress-fill" style={{ width: `${s.risk_score}%`, background: s.risk_score > 60 ? 'var(--accent-red)' : s.risk_score > 30 ? 'var(--accent-amber)' : 'var(--accent-green)' }} />
                      </div>
                      <span style={{ fontSize: 11 }}>{s.risk_score}</span>
                    </div>
                  </td>
                  <td className="text-sm">{s.total_orders.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${s.is_active ? 'resolved' : 'critical'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                    {s.is_certified && <span className="badge info" style={{ marginLeft: 4 }}>Certified</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
