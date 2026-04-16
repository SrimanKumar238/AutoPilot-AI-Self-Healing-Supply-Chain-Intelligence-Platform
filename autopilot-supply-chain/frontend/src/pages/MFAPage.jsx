import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { demoAuth } from '../services/demoAuth'
import toast from 'react-hot-toast'
import { Shield, ArrowLeft, Info } from 'lucide-react'

export default function MFAPage() {
  const navigate = useNavigate()
  const { pendingUserId, setTokens, setUser } = useAuthStore()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const refs = useRef([])

  useEffect(() => {
    if (!pendingUserId) { navigate('/login'); return }
    // Demo IDs start with "demo-"
    setIsDemoMode(String(pendingUserId).startsWith('demo-'))
  }, [pendingUserId])

  if (!pendingUserId) return null

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[i] = val.slice(-1)
    setOtp(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
    if (next.every(d => d)) handleVerify(next.join(''))
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const handleVerify = async (code) => {
    const otpCode = code || otp.join('')
    if (otpCode.length < 6 || loading) return
    setLoading(true)

    let tokens = null
    let userData = null

    // Try real backend (2s timeout)
    if (!isDemoMode) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        const res = await fetch('http://localhost:8000/api/v1/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: pendingUserId, otp: otpCode }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (res.ok) {
          tokens = await res.json()
          const meRes = await fetch('http://localhost:8000/api/v1/auth/me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          })
          if (meRes.ok) userData = await meRes.json()
        }
      } catch { /* fall through to demo */ }
    }

    // Demo fallback
    if (!tokens) {
      try {
        tokens   = demoAuth.verifyOtp({ user_id: pendingUserId, otp: otpCode })
        userData = demoAuth.me(tokens.access_token)
      } catch (err) {
        toast.error(err.message || 'Invalid OTP')
        setOtp(['', '', '', '', '', ''])
        refs.current[0]?.focus()
        setLoading(false)
        return
      }
    }

    setTokens(tokens.access_token, tokens.refresh_token)
    setUser(userData)
    toast.success(`Welcome, ${userData.username}! 🚀`)
    navigate('/dashboard')
  }

  // Auto-fill and submit demo OTP
  const fillDemoOtp = () => {
    const digits = ['1','2','3','4','5','6']
    setOtp(digits)
    handleVerify('123456')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/login')}
          style={{ marginBottom: 24 }}
        >
          <ArrowLeft size={14} /> Back to Login
        </button>

        <div className="auth-logo">
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #38bdf8, #22d3ee)' }}>
            <Shield size={28} color="white" />
          </div>
          <h1>Two-Factor Auth</h1>
          <p>Enter the 6-digit OTP sent to your email</p>
        </div>

        {/* Demo mode banner */}
        {isDemoMode && (
          <div style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <Info size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>Demo Mode</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
                Your OTP is{' '}
                <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2 }}>
                  1 2 3 4 5 6
                </span>
              </div>
            </div>
            <button
              className="btn btn-sm"
              style={{
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.4)',
                color: '#fbbf24',
                flexShrink: 0,
              }}
              onClick={fillDemoOtp}
              disabled={loading}
            >
              Auto-fill ⚡
            </button>
          </div>
        )}

        <div className="otp-grid" style={{ marginBottom: 24 }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              ref={el => refs.current[i] = el}
              className="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
              disabled={loading}
            />
          ))}
        </div>

        <button
          id="mfa-verify"
          className="btn btn-primary btn-full"
          onClick={() => handleVerify()}
          disabled={loading || otp.join('').length < 6}
        >
          {loading && <span className="spinner" />}
          {loading ? 'Verifying...' : 'Verify & Sign In'}
        </button>

        <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 16 }}>
          {isDemoMode
            ? 'Demo mode: users stored locally in your browser.'
            : 'OTP expires in 5 minutes. Check your spam folder if not received.'}
        </p>
      </div>
    </div>
  )
}
