import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { demoAuth } from '../services/demoAuth'
import toast from 'react-hot-toast'
import { Zap, Info } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setPendingUserId } = useAuthStore()
  const [form, setForm] = useState({ username: '', email: '', password: '', phone: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    // 1. Try real backend (2s timeout), fall back to local demo mode
    let userId = null
    let usedDemo = false

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      const res = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        userId = data.user_id
        toast.success('Account created! OTP sent to your email.')
      }
    } catch {
      // Backend not reachable → use demo mode
      usedDemo = true
    }

    // 2. Demo mode fallback
    if (usedDemo || !userId) {
      try {
        const result = demoAuth.register(form)
        userId = result.user_id
        toast.success('✅ Account created! Demo OTP: 123456', { duration: 7000, icon: '🔐' })
      } catch (demoErr) {
        toast.error(demoErr.message || 'Registration failed')
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
      <div className="auth-card" style={{ width: 480 }}>
        <div className="auth-logo">
          <div className="logo-icon">
            <Zap size={28} color="white" />
          </div>
          <h1>Create Account</h1>
          <p>Join AutoPilot AI Supply Chain Platform</p>
        </div>

        {/* Demo mode hint */}
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
          <span><strong style={{ color: 'var(--accent-blue)' }}>Demo Mode active</strong> — no backend needed. OTP will be <strong style={{ color: '#fff', fontFamily: 'monospace' }}>123456</strong> after signup.</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input
                id="reg-username"
                className="form-input"
                placeholder="johndoe"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                id="reg-phone"
                className="form-input"
                placeholder="+91 9xxxxxxxxx"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="john@company.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </div>

          <button
            id="reg-submit"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 20 }}>
          Already have an account? <Link to="/login" className="text-accent">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
