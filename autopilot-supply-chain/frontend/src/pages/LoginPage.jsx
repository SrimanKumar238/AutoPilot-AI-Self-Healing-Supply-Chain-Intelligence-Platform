import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { demoAuth } from '../services/demoAuth'
import toast from 'react-hot-toast'
import { Zap, Eye, EyeOff, Info } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setPendingUserId } = useAuthStore()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    let userId = null
    let usedDemo = false

    // Try real backend (2s timeout)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        userId = data.user_id
        toast.success('OTP sent to your email!')
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Login failed')
        setLoading(false)
        return
      }
    } catch {
      usedDemo = true
    }

    // Demo fallback
    if (usedDemo || !userId) {
      try {
        const result = demoAuth.login(form)
        userId = result.user_id
        toast.success('🔐 Demo Mode — OTP is: 123456', { duration: 7000 })
      } catch (demoErr) {
        toast.error(demoErr.message || 'Invalid credentials')
        setLoading(false)
        return
      }
    }

    setPendingUserId(userId)
    setLoading(false)
    navigate('/mfa')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">
            <Zap size={28} color="white" />
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to AutoPilot AI Control Tower</p>
        </div>

        {/* Demo hint */}
        <div style={{
          background: 'rgba(56,189,248,0.07)',
          border: '1px solid rgba(56,189,248,0.2)',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}>
          <Info size={13} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--accent-blue)' }}>Quick demo login:</strong>
            {' '}username <code style={{ color: '#fff', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>admin</code>
            {' '}/ password <code style={{ color: '#fff', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>Admin@123</code>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              id="login-username"
              className="form-input"
              placeholder="Enter your username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="divider" />

        <a
          href="http://localhost:8000/api/v1/auth/google"
          className="btn btn-ghost btn-full"
          style={{ justifyContent: 'center' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>

        <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 20 }}>
          Don't have an account? <Link to="/register" className="text-accent">Register</Link>
        </p>
      </div>
    </div>
  )
}
