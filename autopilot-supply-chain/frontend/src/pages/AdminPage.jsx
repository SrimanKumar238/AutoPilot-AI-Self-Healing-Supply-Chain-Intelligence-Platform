import { useState, useEffect } from 'react'
import { adminAPI } from '../services/api'
import { demoAuth } from '../services/demoAuth'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import toast from 'react-hot-toast'

const MOCK_USERS = [
  { id: '1', username: 'admin_user', role: 'admin', is_active: true, is_mfa_enabled: true, email_masked: 'ad***@company.com', created_at: new Date(Date.now() - 864000000 * 30).toISOString() },
  { id: '2', username: 'john_ops', role: 'operator', is_active: true, is_mfa_enabled: true, email_masked: 'jo***@company.com', created_at: new Date(Date.now() - 864000000 * 14).toISOString() },
  { id: '3', username: 'jane_viewer', role: 'viewer', is_active: true, is_mfa_enabled: false, email_masked: 'ja***@company.com', created_at: new Date(Date.now() - 864000000 * 7).toISOString() },
]

export default function AdminPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [users, setUsers] = useState(MOCK_USERS)

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Admin access required')
      navigate('/dashboard')
      return
    }
    // Try real API, then demo, then keep mock
    adminAPI.users()
      .then(r => { if (r.data?.length) setUsers(r.data) })
      .catch(() => {
        try {
          const demoUsers = demoAuth.getUsers()
          if (demoUsers.length) setUsers(demoUsers)
        } catch {}
      })
  }, [])

  const handleRoleChange = async (id, role) => {
    try {
      try {
        await adminAPI.updateRole(id, role)
      } catch {
        demoAuth.updateRole(id, role)
      }
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
      toast.success('Role updated')
    } catch { toast.error('Failed to update role') }
  }

  const handleToggle = async (id) => {
    try {
      try {
        await adminAPI.toggleActive(id)
      } catch {
        demoAuth.toggleActive(id)
      }
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u))
      toast.success('User status toggled')
    } catch { toast.error('Failed to toggle') }
  }


  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Admin Panel</h1>
          <p>User management, RBAC, and platform configuration</p>
        </div>
        <div className="topbar-right">
          <span className="badge critical">{users.filter(u => !u.is_active).length} Inactive</span>
        </div>
      </div>

      <div className="page">
        {/* Stats */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          {[
            { label: 'Total Users', value: users.length, color: 'blue' },
            { label: 'Admins', value: users.filter(u => u.role === 'admin').length, color: 'red' },
            { label: 'Operators', value: users.filter(u => u.role === 'operator').length, color: 'amber' },
            { label: 'MFA Enabled', value: users.filter(u => u.is_mfa_enabled).length, color: 'green' },
          ].map((k, i) => (
            <div key={i} className={`kpi-card ${k.color}`}>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        {/* RBAC Info */}
        <div className="card mb-6" style={{ borderColor: 'rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Shield size={16} color="var(--accent-purple)" />
            <span style={{ fontWeight: 700, fontSize: 13 }}>RBAC Role Permissions</span>
          </div>
          <div className="grid-3" style={{ gap: 12 }}>
            {[
              { role: 'Admin', perms: ['Full system access', 'User management', 'RBAC control', 'All CRUD operations'], color: 'var(--accent-red)' },
              { role: 'Operator', perms: ['Create/update resources', 'Acknowledge/resolve alerts', 'View all dashboards', 'Manage shipments'], color: 'var(--accent-amber)' },
              { role: 'Viewer', perms: ['Read-only access', 'View dashboards', 'Monitor alerts', 'No data modification'], color: 'var(--accent-blue)' },
            ].map(r => (
              <div key={r.role} style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: r.color, marginBottom: 8 }}>{r.role}</div>
                {r.perms.map(p => <div key={p} style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>• {p}</div>)}
              </div>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">User Management</span>
            <span className="text-xs text-muted">Email shown masked for security</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email (Masked)</th>
                <th>Role</th>
                <th>MFA</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{u.username}</span>
                    </div>
                  </td>
                  <td><span className="mono text-sm text-muted">{u.email_masked}</span></td>
                  <td>
                    <select
                      className="select-filter"
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="operator">Operator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${u.is_mfa_enabled ? 'resolved' : 'warning'}`}>
                      {u.is_mfa_enabled ? '🔐 Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'resolved' : 'critical'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-xs text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleToggle(u.id)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
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
