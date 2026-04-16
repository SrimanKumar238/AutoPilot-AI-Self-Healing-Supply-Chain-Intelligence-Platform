import { useState, useEffect } from 'react'
import { inventoryAPI } from '../services/api'
import { Package, Search, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const MOCK_INV = [
  { id: '1', sku: 'SKU-MCU-001', product_name: 'Microcontroller Unit STM32', category: 'Electronics', warehouse_location: 'WH-A1', quantity_on_hand: 45, quantity_reserved: 30, quantity_in_transit: 0, available_quantity: 15, reorder_point: 200, max_stock: 2000, status: 'critical', lead_time_days: 14, updated_at: new Date().toISOString() },
  { id: '2', sku: 'SKU-PCB-022', product_name: 'PCB Assembly Board v3', category: 'Electronics', warehouse_location: 'WH-A2', quantity_on_hand: 320, quantity_reserved: 80, quantity_in_transit: 100, available_quantity: 240, reorder_point: 150, max_stock: 1500, status: 'healthy', lead_time_days: 7, updated_at: new Date().toISOString() },
  { id: '3', sku: 'SKU-PKG-007', product_name: 'Packaging Material (Box L)', category: 'Packaging', warehouse_location: 'WH-B1', quantity_on_hand: 850, quantity_reserved: 200, quantity_in_transit: 0, available_quantity: 650, reorder_point: 300, max_stock: 5000, status: 'healthy', lead_time_days: 3, updated_at: new Date().toISOString() },
  { id: '4', sku: 'SKU-CAB-015', product_name: 'Power Cable 3-pin EU', category: 'Accessories', warehouse_location: 'WH-A3', quantity_on_hand: 120, quantity_reserved: 50, quantity_in_transit: 200, available_quantity: 70, reorder_point: 100, max_stock: 1000, status: 'low', lead_time_days: 5, updated_at: new Date().toISOString() },
  { id: '5', sku: 'SKU-SEN-044', product_name: 'IoT Sensor Module R2', category: 'Electronics', warehouse_location: 'WH-A4', quantity_on_hand: 0, quantity_reserved: 0, quantity_in_transit: 500, available_quantity: 0, reorder_point: 100, max_stock: 1000, status: 'out_of_stock', lead_time_days: 21, updated_at: new Date().toISOString() },
]

const statusColor = { healthy: 'var(--accent-green)', low: 'var(--accent-amber)', critical: 'var(--accent-red)', out_of_stock: '#dc2626', overstock: 'var(--accent-purple)' }

export default function InventoryPage() {
  const [items, setItems] = useState(MOCK_INV)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = items.filter(i =>
    (!search || i.sku.includes(search.toUpperCase()) || i.product_name.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || i.status === statusFilter)
  )

  const chartData = items.map(i => ({
    sku: i.sku.replace('SKU-', ''),
    available: i.available_quantity,
    reserved: i.quantity_reserved,
    reorder: i.reorder_point,
  }))

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Inventory</h1>
          <p>Stock levels, reorder triggers, and warehouse allocation</p>
        </div>
        <div className="topbar-right">
          <div style={{ display: 'flex', gap: 8 }}>
            {[['critical', 'Critical'], ['low', 'Low'], ['out_of_stock', 'Out of Stock']].map(([s, l]) => {
              const count = items.filter(i => i.status === s).length
              return count > 0 ? (
                <span key={s} className="badge critical">{count} {l}</span>
              ) : null
            })}
          </div>
        </div>
      </div>

      <div className="page">
        {/* Mini chart */}
        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">Stock Availability vs Reorder Points</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barGap={4}>
              <XAxis dataKey="sku" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0d1f3c', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="available" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Available" />
              <Bar dataKey="reserved" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Reserved" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="page-controls">
          <div className="search-bar">
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search SKU or product name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="low">Low</option>
            <option value="critical">Critical</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="overstock">Overstock</option>
          </select>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Location</th>
                <th>Available</th>
                <th>Reserved</th>
                <th>In Transit</th>
                <th>Reorder Point</th>
                <th>Status</th>
                <th>Lead Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const pct = Math.min((item.available_quantity / item.max_stock) * 100, 100)
                return (
                  <tr key={item.id}>
                    <td><span className="mono text-accent">{item.sku}</span></td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.product_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.category}</div>
                    </td>
                    <td className="text-sm text-muted">{item.warehouse_location}</td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 700, color: item.available_quantity === 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                        {item.available_quantity}
                      </div>
                      <div className="progress-bar" style={{ width: 60, marginTop: 4 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: statusColor[item.status] }} />
                      </div>
                    </td>
                    <td className="text-sm">{item.quantity_reserved}</td>
                    <td className="text-sm text-accent">{item.quantity_in_transit}</td>
                    <td className="text-sm text-muted">{item.reorder_point}</td>
                    <td>
                      <span className={`badge ${item.status === 'healthy' ? 'resolved' : item.status === 'out_of_stock' ? 'critical' : item.status === 'low' ? 'warning' : 'critical'}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{item.lead_time_days}d</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
