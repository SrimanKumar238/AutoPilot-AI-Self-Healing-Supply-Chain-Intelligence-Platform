/**
 * Demo Auth Service — works completely offline (no backend needed).
 * Stores users in localStorage, issues fake JWT-like tokens,
 * OTP is always 123456 in demo mode.
 */

const USERS_KEY = 'autopilot_demo_users'
const OTP_KEY   = 'autopilot_demo_otp'

function seedUsers() {
  let users = []
  try {
    users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch {
    users = []
  }
  if (!users.find(u => u.username === 'admin')) {
    users.push({
      id: 'demo-admin-001',
      username: 'admin',
      email: 'admin@autopilot.ai',
      password: 'Admin@123',
      phone: '',
      role: 'admin',
      is_active: true,
      is_mfa_enabled: true,
      created_at: new Date().toISOString(),
    })
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  }
  return users
}

function getUsers() { return seedUsers() }

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function makeFakeToken(user, type = 'access') {
  const payload = btoa(JSON.stringify({
    sub: user.id,
    role: user.role,
    type,
    exp: Date.now() + 86400000,
  }))
  return `demo.${payload}.sig`
}

function safeUser(user) {
  const { password: _pw, ...safe } = user
  safe.email_masked = user.email
    ? user.email.slice(0, 2) + '***@' + (user.email.split('@')[1] || 'demo.ai')
    : 'xx***@demo.ai'
  return safe
}

export const demoAuth = {
  /**
   * Register or UPDATE existing user (upsert by username).
   * This way re-registering the same username just updates their password.
   */
  register({ username, email, password, phone }) {
    if (!username || !email || !password) throw new Error('All fields required')
    const users = getUsers()
    let user = users.find(u => u.username === username)

    if (user) {
      // Upsert — update credentials instead of throwing
      user.email    = email
      user.password = password
      user.phone    = phone || user.phone
    } else {
      user = {
        id:             `demo-${Date.now()}`,
        username,
        email,
        password,
        phone:          phone || '',
        role:           'operator',
        is_active:      true,
        is_mfa_enabled: true,
        created_at:     new Date().toISOString(),
      }
      users.push(user)
    }

    saveUsers(users)
    localStorage.setItem(OTP_KEY, JSON.stringify({ userId: user.id, otp: '123456' }))
    return { user_id: user.id, requires_mfa: true }
  },

  login({ username, password }) {
    if (!username || !password) throw new Error('Username and password are required')
    const users = getUsers()
    const user  = users.find(u => u.username === username)
    if (!user)            throw new Error('User not found. Please register first.')
    if (user.password !== password) throw new Error('Wrong password')
    if (!user.is_active)  throw new Error('Account is deactivated')

    localStorage.setItem(OTP_KEY, JSON.stringify({ userId: user.id, otp: '123456' }))
    return { user_id: user.id, requires_mfa: true }
  },

  verifyOtp({ user_id, otp }) {
    let session = {}
    try { session = JSON.parse(localStorage.getItem(OTP_KEY) || '{}') } catch {}

    if (session.userId !== user_id) throw new Error('Session expired — please log in again')
    if (String(otp) !== String(session.otp)) throw new Error('Incorrect OTP. Demo OTP is 123456')

    localStorage.removeItem(OTP_KEY)
    const users = getUsers()
    const user  = users.find(u => u.id === user_id)
    if (!user) throw new Error('User not found')

    return {
      access_token:  makeFakeToken(user, 'access'),
      refresh_token: makeFakeToken(user, 'refresh'),
      token_type:    'bearer',
    }
  },

  me(accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      const users   = getUsers()
      const user    = users.find(u => u.id === payload.sub)
      if (!user) throw new Error('User not found')
      return safeUser(user)
    } catch {
      throw new Error('Invalid or expired token')
    }
  },

  getUsers() {
    return getUsers().map(safeUser)
  },

  updateRole(userId, role) {
    const users = getUsers()
    const u = users.find(u => u.id === userId)
    if (u) u.role = role
    saveUsers(users)
    return u ? safeUser(u) : null
  },

  toggleActive(userId) {
    const users = getUsers()
    const u = users.find(u => u.id === userId)
    if (u) u.is_active = !u.is_active
    saveUsers(users)
    return u ? safeUser(u) : null
  },
}
