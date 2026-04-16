import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useEffect, useState } from 'react'
import { authAPI } from '../services/api'
import {
  LayoutDashboard, Ship, Package, Users, AlertTriangle,
  Settings, LogOut, Zap, Activity, Bell
} from 'lucide-react'
import ChatBot from './ChatBot'

const navItems = [
  { path: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Control Tower' },
  { path: '/shipments', icon: <Ship size={16} />, label: 'Shipments' },
  { path: '/inventory', icon: <Package size={16} />, label: 'Inventory' },
  { path: '/suppliers', icon: <Users size={16} />, label: 'Suppliers' },
  { path: '/alerts', icon: <AlertTriangle size={16} />, label: 'Alerts & Anomalies', badge: true },
  { path: '/admin', icon: <Settings size={16} />, label: 'Admin', adminOnly: true },
]

export default function Layout() {
  const { user, setUser, logout, accessToken } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [alertCount, setAlertCount] = useState(3)

  useEffect(() => {
    if (!user && accessToken) {
      authAPI.me().then(r => setUser(r.data)).catch(() => logout())
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Zap size={18} color="white" />
            </div>
            <div>
              <h2>AutoPilot AI</h2>
              <p>Supply Chain Control Tower</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(item => {
            if (item.adminOnly && user?.role !== 'admin') return null
            const active = location.pathname === item.path
            return (
              <div
                key={item.path}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
                {item.badge && alertCount > 0 && (
                  <span className="nav-badge">{alertCount}</span>
                )}
              </div>
            )
          })}

          <div className="nav-section-label" style={{ marginTop: 16 }}>Observability</div>
          <a href="http://localhost:3001" target="_blank" rel="noreferrer" className="nav-item">
            <span className="icon"><Activity size={16} /></span>
            Grafana Dashboards
          </a>
          <a href="http://localhost:15672" target="_blank" rel="noreferrer" className="nav-item">
            <span className="icon"><Bell size={16} /></span>
            RabbitMQ Console
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-info" style={{ flex: 1, overflow: 'hidden' }}>
              <p className="truncate">{user?.username || 'User'}</p>
              <span>{user?.role || 'viewer'}</span>
            </div>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* AI Chatbot — available on all pages */}
      <ChatBot />
    </div>
  )
}
