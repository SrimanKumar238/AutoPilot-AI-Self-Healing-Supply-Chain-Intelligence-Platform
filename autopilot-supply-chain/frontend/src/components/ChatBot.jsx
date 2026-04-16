import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, Zap, Minimize2 } from 'lucide-react'

// ── AI Brain: Supply Chain Knowledge Base ─────────────────────────────────────
const QUICK_CHIPS = [
  '📊 Dashboard KPIs',
  '🚨 Active anomalies',
  '🤖 Self-healing status',
  '🚢 Delayed shipments',
  '📦 Low inventory items',
  '⚡ How does it work?',
]

const KB = [
  {
    triggers: ['kpi', 'dashboard', 'overview', 'metric', 'stats', 'summary'],
    response: () => `📊 **Current Platform KPIs**

• **Total Shipments:** 284 (↑12 today)
• **On-Time Rate:** 82.4% (↑2.1% vs yesterday)
• **Active Anomalies:** 5 (3 critical)
• **Inventory Health:** 76.2% (3 items critical)
• **Supplier Reliability:** 84.7% (across 28 suppliers)
• **Self-Healed Today:** 12 (autonomous resolutions)
• **Delayed Shipments:** 18 (require attention)

🟢 System status: **All 12 services operational**`,
  },
  {
    triggers: ['anomal', 'detect', 'worker 1', 'ai agent', 'alert feed', 'active anomal'],
    response: () => `🔴 **Active Anomalies (Worker 1 Live)**

**Critical (3):**
• Shipment AP-3F8A — delayed 14.5h (AI confidence: 97%)
• SKU-MCU-001 — 7.5% of safety stock (AI: 99%)
• Supplier SHAN-07 — OTD rate dropped to 61% (AI: 78%)

**Warning (2):**
• Port congestion: Singapore — 3 shipments affected
• Route disruption: Rotterdam corridor

🤖 Worker 1 is continuously scanning for anomalies using rule-based + statistical analysis. Events are published to RabbitMQ → consumed by Worker 2.`,
  },
  {
    triggers: ['heal', 'worker 2', 'auto', 'resolv', 'orchestrat', 'self-heal'],
    response: () => `🤖 **Self-Healing Orchestrator (Worker 2)**

**Actions executed today (12 resolutions):**
✅ Auto-PO PO-AUTO-3F8A12 generated for SKU MCU-001
✅ Backup supplier sourced: TITAN Electronics (48h lead)
✅ Shipment AP-3F8A rerouted via inland transit
✅ Stakeholder notifications sent to 4 recipients
✅ Shipment AP-1A5C auto-healed — delay reduced 9h
✅ Cross-warehouse reallocation initiated for WH-B1

**Healing Strategies by Type:**
• Shipment Delay → Priority rerouting + backup supplier
• Inventory Low → Auto purchase order + reallocation
• Supplier Risk → Secondary supplier evaluation
• Route Disruption → Alternative route calculation`,
  },
  {
    triggers: ['shipment', 'delayed', 'tracking', 'cargo', 'in transit', 'customs'],
    response: () => `🚢 **Shipment Status Overview**

| Status | Count |
|--------|-------|
| 🔴 Delayed | 18 |
| 🟡 At Customs | 4 |
| 🔵 In Transit | 167 |
| ⚪ Pending | 53 |
| 🟢 Delivered | 42 |

**Critical delayed shipments:**
• **AP-3F8A7C** — Shanghai → Mumbai (+14.5h, Maersk)
• **AP-7B4F2A** — Singapore → London (+2.5h, at customs)

Worker 1 monitors all shipments and triggers healing when delay > 4 hours.`,
  },
  {
    triggers: ['inventor', 'stock', 'sku', 'warehouse', 'reorder', 'low stock'],
    response: () => `📦 **Inventory Status**

🔴 **Critical / Out of Stock (3 items):**
• **SKU-MCU-001** — Microcontroller: 45 units (reorder: 200) → Auto-PO triggered
• **SKU-SENS-003** — Temperature Sensor: 0 units → **OUT OF STOCK**
• **SKU-PCB-006** — PCB Assembly: 12 units (reorder: 50) → Critical

🟡 **Low Stock (1):**
• **SKU-CABLE-005** — USB-C Cable: 68 units (reorder: 100)

🟢 **Healthy (4 items)** — No action needed

Worker 1 monitors inventory levels continuously and Worker 2 auto-generates purchase orders when below reorder point.`,
  },
  {
    triggers: ['supplier', 'vendor', 'risk', 'reliability', 'performance', 'partner'],
    response: () => `🏭 **Supplier Intelligence**

**Risk Overview:**
🔴 High Risk (1): SHAN-07 (Shanghai Electronics) — Risk Score: 72
🟡 Medium Risk (2): LOGIX-03, MEX-07
🟢 Low Risk (4): TITAN-02, NANO-04, VIET-06, others

**Top Performer:** TITAN-02 (Germany) — 95% reliability, 94% OTD
**Watch:** SHAN-07 — OTD dropped from 84% → 61% in 30 days

AI automatically monitors:
• On-time delivery rate trends
• Quality score changes
• Response time SLA compliance
• Risk score (calculated from 8 factors)`,
  },
  {
    triggers: ['how', 'work', 'architecture', 'system', 'stack', 'tech', 'behind', 'design'],
    response: () => `⚡ **How AutoPilot AI Works**

\`\`\`
Frontend → FastAPI → PostgreSQL
               ↓
      RabbitMQ (TOPIC Exchange)
         ↙              ↘
   Worker 1          Worker 2
 (Anomaly AI)    (Self-Healing)
\`\`\`

**Event Flow:**
1. 📡 Shipment created → publishes \`shipment.created\` event
2. 🔍 Worker 1 consumes → analyzes for anomalies
3. 🚨 Anomaly found → publishes \`anomaly.detected\`
4. 🤖 Worker 2 consumes → executes healing strategy
5. ✅ Healed → publishes \`healing.completed\` + writes to DB

**Security:** JWT + MFA OTP + Fernet PII encryption + RBAC
**Observability:** Prometheus + Grafana + Loki + Tempo`,
  },
  {
    triggers: ['rabbitmq', 'queue', 'event', 'message', 'broker', 'amqp'],
    response: () => `🐇 **RabbitMQ Event Bus**

**Exchange:** \`supply_chain_events\` (TOPIC, durable)

**Published Events:**
• \`shipment.created\` → triggers anomaly scan
• \`shipment.delayed\` → immediate anomaly flag
• \`inventory.low\` → Worker 1 alert
• \`anomaly.detected\` → Worker 2 consumes
• \`healing.completed\` → audit log persisted

**Reliability Features:**
✅ Durable messages (survive broker restart)
✅ Dead-letter exchange (failed messages retained)
✅ Atomic pickup: prefetch_count=1 (no duplicate processing)
✅ Redis idempotency keys (24h TTL dedup)

RabbitMQ Console: http://localhost:15672`,
  },
  {
    triggers: ['security', 'auth', 'jwt', 'mfa', 'otp', 'rbac', 'role', 'permission', 'pii', 'encrypt'],
    response: () => `🔐 **Security Architecture**

**Authentication:**
• JWT access tokens (60 min expiry)
• JWT refresh tokens (7 day, revocable via Redis)
• Email OTP MFA (6-digit, 5-min TTL in Redis)
• Google OAuth2 (optional)

**Authorization (RBAC):**
• **Admin** — Full access + user management
• **Operator** — Create/update/heal
• **Viewer** — Read-only dashboards

**PII Protection:**
• Email & phone **encrypted** with Fernet (AES-128) in DB
• PII **never returned** in API responses (enforced by schema)
• Admin view shows masked email: \`ad***@company.com\`

**Network:** All services on isolated \`supply-chain-net\` Docker network`,
  },
  {
    triggers: ['grafana', 'prometheus', 'metric', 'monitor', 'observ', 'log', 'loki', 'tempo', 'trace'],
    response: () => `📡 **Observability Stack**

**Metrics → Prometheus + Grafana:**
• HTTP request rate by endpoint
• P50/P90/P99 response time
• Error rate (5xx)
• Custom supply chain KPIs

**Logs → Loki + Promtail:**
• All structured JSON logs (structlog)
• Worker events and healing actions
• OTP and auth events (masked)

**Traces → Tempo (OTLP):**
• Distributed tracing across backend + workers
• Correlated with logs via Loki datasource

Access Grafana at: **http://localhost:3001** (admin/admin)
Pre-built dashboard: "AutoPilot AI – Supply Chain Control Tower"`,
  },
  {
    triggers: ['docker', 'deploy', 'run', 'start', 'service', 'container', 'compose'],
    response: () => `🐳 **Deployment**

**12 Docker Services:**
\`\`\`
backend    → FastAPI (port 8000)
worker1    → Anomaly Detection
worker2    → Self-Healing
frontend   → React/Vite (port 3000)
postgres   → PostgreSQL 16
redis      → Redis 7
rabbitmq   → RabbitMQ 3.12
prometheus → Metrics (port 9090)
grafana    → Dashboards (port 3001)
loki       → Log aggregation
tempo      → Distributed tracing
promtail   → Log shipper
\`\`\`

**Start everything:**
\`\`\`bash
docker compose up --build -d
docker compose exec backend python scripts/seed_demo_data.py
\`\`\``,
  },
  {
    triggers: ['hello', 'hi', 'hey', 'help', 'start', 'what can you do', 'capabilities'],
    response: () => `👋 **Hello! I'm AutoPilot AI Assistant**

I can help you understand the supply chain platform:

🔍 **Ask me about:**
• Current KPIs and platform health
• Active anomalies and AI detections
• Self-healing strategies and outcomes
• Shipment and inventory status
• Supplier risk intelligence
• System architecture and tech stack
• Security, auth, and observability
• Docker deployment

Just type your question or click one of the quick options below! 🚀`,
  },
]

function getResponse(msg) {
  const lower = msg.toLowerCase()
  const match = KB.find(entry => entry.triggers.some(t => lower.includes(t)))
  if (match) return match.response()

  // Fuzzy fallback
  return `🤔 I'm not sure about that specific question, but I can help with:

• **Supply chain operations** — shipments, inventory, suppliers
• **AI agents** — anomaly detection, self-healing
• **Platform architecture** — tech stack, event flow
• **Observability** — Grafana, Prometheus, Loki

Try asking something like: *"How does self-healing work?"* or *"Show me active anomalies"* 🚀`
}

// ── Simple markdown-like renderer ─────────────────────────────────────────────
function renderMessage(text) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Code block (single backtick inline)
    line = line.replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Headers
    if (line.startsWith('# ')) return <div key={i} className="chat-h1">{line.slice(2)}</div>
    if (line.startsWith('## ')) return <div key={i} className="chat-h2">{line.slice(3)}</div>
    // Empty line
    if (!line.trim()) return <br key={i} />
    // List items
    if (line.trim().startsWith('✅') || line.trim().startsWith('•') || line.trim().startsWith('|') || line.trim().startsWith('🔴') || line.trim().startsWith('🟡') || line.trim().startsWith('🟢')) {
      return <div key={i} className="chat-list-item" dangerouslySetInnerHTML={{ __html: line }} />
    }
    return <div key={i} className="chat-line" dangerouslySetInnerHTML={{ __html: line }} />
  })
}

// ── Main ChatBot Component ─────────────────────────────────────────────────────
export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: `👋 **Hello! I'm AutoPilot AI Assistant**\n\nI have real-time knowledge of your supply chain. Ask me about:\n• Active anomalies and AI detections\n• Self-healing strategies\n• KPIs, shipments, inventory, suppliers\n• System architecture\n\nHow can I help you today? 🚀`,
      ts: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const sendMessage = async (text) => {
    const userMsg = text.trim() || input.trim()
    if (!userMsg) return
    setInput('')

    const userEntry = { id: Date.now(), role: 'user', text: userMsg, ts: new Date() }
    setMessages(prev => [...prev, userEntry])
    setTyping(true)

    // Simulate AI thinking delay (400–900ms)
    const delay = 400 + Math.random() * 500
    await new Promise(r => setTimeout(r, delay))

    const response = getResponse(userMsg)
    const botEntry = { id: Date.now() + 1, role: 'assistant', text: response, ts: new Date() }
    setMessages(prev => [...prev, botEntry])
    setTyping(false)

    if (!open) setUnread(n => n + 1)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* Floating Button */}
      <button
        id="chatbot-toggle"
        className={`chat-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI Assistant"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 && (
          <span className="chat-fab-badge">{unread}</span>
        )}
        {!open && (
          <span className="chat-fab-pulse" />
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div className={`chat-window ${minimized ? 'minimized' : ''}`}>
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-left">
              <div className="chat-bot-avatar">
                <Bot size={16} color="white" />
                <span className="chat-bot-online" />
              </div>
              <div>
                <div className="chat-header-name">AutoPilot AI Assistant</div>
                <div className="chat-header-status">
                  <span className="chat-online-dot" />
                  AI-powered · Supply Chain Intelligence
                </div>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                className="chat-icon-btn"
                onClick={() => setMinimized(m => !m)}
                title={minimized ? 'Expand' : 'Minimize'}
              >
                <Minimize2 size={14} />
              </button>
              <button
                className="chat-icon-btn"
                onClick={() => setOpen(false)}
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="chat-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`chat-msg ${msg.role}`}>
                    {msg.role === 'assistant' && (
                      <div className="chat-msg-avatar">
                        <Zap size={12} color="white" />
                      </div>
                    )}
                    <div className="chat-bubble">
                      <div className="chat-bubble-content">
                        {renderMessage(msg.text)}
                      </div>
                      <div className="chat-bubble-time">{formatTime(msg.ts)}</div>
                    </div>
                  </div>
                ))}

                {typing && (
                  <div className="chat-msg assistant">
                    <div className="chat-msg-avatar">
                      <Zap size={12} color="white" />
                    </div>
                    <div className="chat-bubble">
                      <div className="chat-typing">
                        <span /><span /><span />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick Chips */}
              <div className="chat-chips">
                {QUICK_CHIPS.map(chip => (
                  <button
                    key={chip}
                    className="chat-chip"
                    onClick={() => sendMessage(chip)}
                    disabled={typing}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="chat-input-row">
                <input
                  ref={inputRef}
                  className="chat-input"
                  placeholder="Ask about supply chain, anomalies, healing..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={typing}
                />
                <button
                  id="chat-send-btn"
                  className="chat-send-btn"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || typing}
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
