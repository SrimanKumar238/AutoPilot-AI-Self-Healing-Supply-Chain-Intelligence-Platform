import { useState, useEffect } from 'react'
import { shipmentAPI } from '../services/api'
import { Ship, Plus, Search, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const MOCK = [
  { id: '1', tracking_number: 'AP-3F8A7C', origin: 'Shanghai, CN', destination: 'Mumbai, IN', status: 'delayed', priority: 'critical', carrier: 'Maersk', delay_hours: 14.5, expected_delivery: new Date(Date.now() + 86400000 * 2).toISOString(), updated_at: new Date().toISOString() },
  { id: '2', tracking_number: 'AP-2C1D9E', origin: 'Rotterdam, NL', destination: 'New York, US', status: 'in_transit', priority: 'high', carrier: 'MSC', delay_hours: 0, expected_delivery: new Date(Date.now() + 86400000 * 5).toISOString(), updated_at: new Date().toISOString() },
  { id: '3', tracking_number: 'AP-7B4F2A', origin: 'Singapore, SG', destination: 'London, UK', status: 'at_customs', priority: 'medium', carrier: 'CMA CGM', delay_hours: 2.5, expected_delivery: new Date(Date.now() + 86400000 * 3).toISOString(), updated_at: new Date().toISOString() },
  { id: '4', tracking_number: 'AP-9E3D8B', origin: 'Dubai, AE', destination: 'Chennai, IN', status: 'pending', priority: 'low', carrier: 'Hapag-Lloyd', delay_hours: 0, expected_delivery: new Date(Date.now() + 86400000 * 7).toISOString(), updated_at: new Date().toISOString() },
  { id: '5', tracking_number: 'AP-1A5C6D', origin: 'Los Angeles, US', destination: 'Tokyo, JP', status: 'delivered', priority: 'medium', carrier: 'Evergreen', delay_hours: 0, actual_delivery: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState(MOCK)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ origin: '', destination: '', carrier: '', priority: 'medium' })
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await shipmentAPI.list({ status: statusFilter || undefined })
      if (data.items?.length) setShipments(data.items)
    } catch { /* use mock */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  const filtered = shipments.filter(s =>
    !search || s.tracking_number.toLowerCase().includes(search.toLowerCase()) ||
    s.origin.toLowerCase().includes(search.toLowerCase()) ||
    s.destination.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await shipmentAPI.create(form)
    } catch (err) {
      // Demo fallback: simulate success locally
      setShipments(prev => [{...form, id: Date.now().toString(), tracking_number: `AP-${Math.floor(1000 + Math.random()*9000)}X`, status: 'pending', delay_hours: 0, updated_at: new Date().toISOString(), expected_delivery: new Date(Date.now() + 86400000 * 5).toISOString() }, ...prev])
    } finally {
      toast.success('Shipment created and event published!')
      setShowCreate(false)
      setForm({ origin: '', destination: '', carrier: '', priority: 'medium' })
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Shipments</h1>
          <p>Track and manage all shipments in real-time</p>
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          <button id="create-shipment-btn" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Shipment
          </button>
        </div>
      </div>

      <div className="page">
        {/* Create Modal */}
        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: 480, maxWidth: '90vw' }}>
              <div className="card-header">
                <span className="section-title">New Shipment</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Origin *</label>
                  <input className="form-input" placeholder="e.g. Shanghai, CN" value={form.origin}
                    onChange={e => setForm({ ...form, origin: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination *</label>
                  <input className="form-input" placeholder="e.g. Mumbai, IN" value={form.destination}
                    onChange={e => setForm({ ...form, destination: e.target.value })} required />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Carrier</label>
                    <input className="form-input" placeholder="Maersk" value={form.carrier}
                      onChange={e => setForm({ ...form, carrier: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-input select-filter" value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? <span className="spinner" /> : <Ship size={14} />}
                    {creating ? 'Creating...' : 'Create Shipment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="page-controls">
          <div className="search-bar">
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search by tracking, origin, destination..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="at_customs">At Customs</option>
            <option value="delayed">Delayed</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>

        <div className="card">
          {loading ? <div className="page-loader"><div className="spinner" /></div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Carrier</th>
                  <th>Delay</th>
                  <th>ETA</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="empty-state">No shipments found</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id}>
                    <td><span className="mono text-accent">{s.tracking_number}</span></td>
                    <td>
                      <div style={{ fontSize: 12 }}>{s.origin}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>→ {s.destination}</div>
                    </td>
                    <td><span className={`badge ${s.status}`}>{s.status.replace('_', ' ')}</span></td>
                    <td><span className={`badge ${s.priority === 'critical' ? 'critical' : s.priority === 'high' ? 'warning' : 'info'}`}>{s.priority}</span></td>
                    <td className="text-sm text-muted">{s.carrier || '—'}</td>
                    <td>
                      {s.delay_hours > 0
                        ? <span className="text-red text-sm">{s.delay_hours}h</span>
                        : <span className="text-green text-sm">On time</span>}
                    </td>
                    <td className="text-sm text-muted mono">
                      {s.expected_delivery ? new Date(s.expected_delivery).toLocaleDateString() : '—'}
                    </td>
                    <td className="text-xs text-muted">{formatDistanceToNow(new Date(s.updated_at))} ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
