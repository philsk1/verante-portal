import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const OWNER_EMAIL  = 'finsolsoffice@gmail.com'
const OWNER_EMAILS = ['finsolsoffice@gmail.com', 'philoffice@btconnect.com']

const CAT_LABEL = { A: 'Service failure', B: 'Config-caused', C: 'Unclear', D: 'Not upheld', unknown: 'Unclassified' }
const CAT_COLOR = { A: '#dc2626', B: '#f0a500', C: '#6366f1', D: '#6b7280', unknown: '#9ca3af' }
const FRUSTRATION_COLOR = { low: '#22c55e', medium: '#f0a500', high: '#f97316', critical: '#dc2626' }

function Badge({ label, color }) {
  return (
    <span style={{ display: 'inline-block', background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
      {label}
    </span>
  )
}

function CallCard({ call }) {
  const [open, setOpen] = useState(false)
  const cat = call.complaint_category || 'unknown'
  const frust = call.frustration_level || 'low'
  const date = call.created_at ? new Date(call.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
  const mins = call.duration_seconds ? `${Math.round(call.duration_seconds / 60)}m` : '—'

  return (
    <div style={{ background: '#1e1040', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 10 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
      >
        <Badge label={`Cat ${cat}`} color={CAT_COLOR[cat]} />
        <Badge label={frust} color={FRUSTRATION_COLOR[frust]} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#e2e0f0', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {call.business_name || call.caller_phone || 'Unknown caller'}
          </div>
          {call.complaint_summary && (
            <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {call.complaint_summary}
            </div>
          )}
        </div>
        <div style={{ color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap' }}>{mins}</div>
        <div style={{ color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap' }}>{date}</div>
        {call.requires_escalation && <Badge label="ESCALATED" color="#dc2626" />}
        {call.gift_given === 'free_minutes_10' && <Badge label="Gift given" color="#6366f1" />}
        <span style={{ color: '#6b7280', fontSize: 14 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>Caller phone</div>
              <div style={{ color: '#e2e0f0', fontSize: 13 }}>{call.caller_phone || '—'}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>Resolution</div>
              <div style={{ color: '#e2e0f0', fontSize: 13 }}>{call.resolution || '—'}</div>
            </div>
            {call.gift_given === 'free_minutes_10' && (
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>Gift rationale</div>
                <div style={{ color: '#e2e0f0', fontSize: 13 }}>{call.gift_rationale || '—'}</div>
              </div>
            )}
            {call.ai_summary && (
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>AI summary</div>
                <div style={{ color: '#e2e0f0', fontSize: 13, lineHeight: 1.5 }}>{call.ai_summary}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PolicyEditor({ policy, onSave }) {
  const [text, setText] = useState(policy?.policy_text || '')
  const [freeMin, setFreeMin] = useState(policy?.free_minutes_per_call ?? 10)
  const [maxStrikes, setMaxStrikes] = useState(policy?.max_strikes ?? 2)
  const [escalEmail, setEscalEmail] = useState(policy?.escalation_email || '')
  const [escalWA, setEscalWA] = useState(policy?.escalation_whatsapp || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    await onSave({ policyText: text, freeMinutesPerCall: freeMin, maxStrikes, escalationEmail: escalEmail, escalationWhatsapp: escalWA || null })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputStyle = {
    width: '100%', background: '#140c2a', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, color: '#e2e0f0', padding: '10px 12px', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <label style={labelStyle}>Q's support instructions (plain English)</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={7}
          placeholder="Write in plain English how you want Q to behave on support calls. Q reads this verbatim on every call."
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
        <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>Q reads this at the start of every support call. Write naturally — no code, no formatting needed.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Free minutes per call</label>
          <input type="number" min={1} max={60} value={freeMin} onChange={e => setFreeMin(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Max strikes before escalation</label>
          <input type="number" min={1} max={5} value={maxStrikes} onChange={e => setMaxStrikes(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Escalation email</label>
          <input type="email" value={escalEmail} onChange={e => setEscalEmail(e.target.value)} style={inputStyle} placeholder="support@yourdomain.com" />
        </div>
        <div>
          <label style={labelStyle}>Escalation WhatsApp number</label>
          <input type="text" value={escalWA} onChange={e => setEscalWA(e.target.value)} style={inputStyle} placeholder="+44 7700 900000" />
        </div>
      </div>
      <div>
        <button
          onClick={save}
          disabled={saving}
          style={{ background: '#f0a500', color: '#140c2a', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save policy'}
        </button>
      </div>
    </div>
  )
}

function IncidentForm({ onCreated }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [startedAt, setStartedAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit() {
    if (!title || !startedAt) { setError('Title and start time required'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerEmail: OWNER_EMAIL, action: 'incident-create', title, description: desc, startedAt: new Date(startedAt).toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTitle(''); setDesc(''); setStartedAt('')
      onCreated(data.incident)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', background: '#140c2a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e2e0f0', padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>Incident title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="e.g. Vapi outage — calls not answering" />
      </div>
      <div>
        <label style={labelStyle}>Description (optional)</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} style={inputStyle} placeholder="What failed and how" />
      </div>
      <div>
        <label style={labelStyle}>Start time</label>
        <input type="datetime-local" value={startedAt} onChange={e => setStartedAt(e.target.value)} style={inputStyle} />
      </div>
      {error && <div style={{ color: '#f87171', fontSize: 12 }}>{error}</div>}
      <button onClick={submit} disabled={loading} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, alignSelf: 'flex-start' }}>
        {loading ? 'Logging…' : 'Log incident'}
      </button>
    </div>
  )
}

function IncidentCard({ incident, onResolved }) {
  const [resolveAt, setResolveAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const isActive = incident.status === 'active'

  async function resolve() {
    if (!resolveAt) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerEmail: OWNER_EMAIL, action: 'incident-resolve', id: incident.id, endedAt: new Date(resolveAt).toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      onResolved()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const started = new Date(incident.started_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const ended   = incident.ended_at ? new Date(incident.ended_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div style={{ background: '#1e1040', border: `1px solid ${isActive ? '#dc262644' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Badge label={isActive ? 'ACTIVE' : incident.status.toUpperCase()} color={isActive ? '#dc2626' : '#22c55e'} />
        <span style={{ color: '#e2e0f0', fontWeight: 600, fontSize: 14 }}>{incident.title}</span>
      </div>
      {incident.description && <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 8 }}>{incident.description}</div>}
      <div style={{ color: '#6b7280', fontSize: 11 }}>
        Started: {started}{ended ? ` — Ended: ${ended}` : ''}
        {incident.total_compensation_gbp ? ` · Total compensation: £${incident.total_compensation_gbp}` : ''}
      </div>
      {result && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: '#0f2d1a', border: '1px solid #22c55e44', borderRadius: 8, fontSize: 12, color: '#86efac' }}>
          Resolved. {result.affected_tenants} tenant(s) affected · {result.downtime_minutes} mins downtime · Total compensation: £{result.total_compensation_gbp} · {result.compensation_rows} payment records created.
        </div>
      )}
      {isActive && !result && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <input
            type="datetime-local"
            value={resolveAt}
            onChange={e => setResolveAt(e.target.value)}
            style={{ background: '#140c2a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e2e0f0', padding: '7px 10px', fontSize: 12, outline: 'none' }}
          />
          <button
            onClick={resolve}
            disabled={loading || !resolveAt}
            style={{ background: '#22c55e', color: '#0f2d1a', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 700, fontSize: 12, cursor: (loading || !resolveAt) ? 'not-allowed' : 'pointer', opacity: (loading || !resolveAt) ? 0.6 : 1 }}
          >
            {loading ? 'Resolving…' : 'Mark resolved + auto-compensate'}
          </button>
        </div>
      )}
    </div>
  )
}

function PolicyChat({ userEmail, onPolicyUpdated }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [updated, setUpdated]   = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'policy-chat', ownerEmail: userEmail, messages: newMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'ai', content: data.message }])
      if (data.policyUpdated) {
        setUpdated(true)
        setTimeout(() => setUpdated(false), 5000)
        onPolicyUpdated?.()
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Something went wrong. Please try again.' }])
    } finally {
      setSending(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ marginTop: 24, background: '#1e1040', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ color: '#e2e0f0', fontWeight: 700, fontSize: 13 }}>Talk to Q about this policy</div>
        <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>Ask Q to explain, adjust, or rewrite any part. When you confirm, Q writes it to the database.</div>
      </div>

      {updated && (
        <div style={{ background: '#0f2d1a', borderBottom: '1px solid #22c55e44', padding: '8px 18px', color: '#86efac', fontSize: 12, fontWeight: 600 }}>
          Policy updated — Q will use the new text on all future support calls.
        </div>
      )}

      <div style={{ height: 280, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', marginTop: 80 }}>
            Ask Q to explain, adjust, or rewrite your support policy.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '82%',
              background: m.role === 'user' ? '#5e3b87' : '#140c2a',
              border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              padding: '10px 14px',
              color: '#e2e0f0',
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: '#140c2a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', color: '#6b7280', fontSize: 13 }}>
              Q is thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask Q to adjust the policy…"
          style={{
            flex: 1, background: '#140c2a', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, color: '#e2e0f0', padding: '9px 12px', fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          style={{
            background: '#f0a500', color: '#140c2a', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontWeight: 700, fontSize: 13,
            cursor: (sending || !input.trim()) ? 'not-allowed' : 'pointer',
            opacity: (sending || !input.trim()) ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default function SupportIntelligence() {
  const { user } = useAuth()
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [calls, setCalls]         = useState([])
  const [incidents, setIncidents] = useState([])
  const [policy, setPolicy]       = useState(null)
  const [tab, setTab]             = useState('calls')
  const [catFilter, setCatFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerEmail: OWNER_EMAIL, action: 'support-dashboard' }),
      })
      if (!res.ok) throw new Error('Failed to load support data')
      const data = await res.json()
      setCalls(data.calls || [])
      setIncidents(data.incidents || [])
      setPolicy(data.policy || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function savePolicy(fields) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerEmail: OWNER_EMAIL, action: 'support-policy-save', ...fields }),
    })
  }

  if (!OWNER_EMAILS.includes(user?.email)) {
    return <div style={{ padding: 40, color: '#9ca3af', fontSize: 14 }}>Access restricted to owner.</div>
  }

  const filteredCalls = catFilter === 'all' ? calls : calls.filter(c => (c.complaint_category || 'unknown') === catFilter)

  const stats = {
    total:      calls.length,
    catA:       calls.filter(c => c.complaint_category === 'A').length,
    catB:       calls.filter(c => c.complaint_category === 'B').length,
    giftsGiven: calls.filter(c => c.gift_given === 'free_minutes_10').length,
    escalated:  calls.filter(c => c.requires_escalation).length,
    activeInc:  incidents.filter(i => i.status === 'active').length,
  }

  const tabStyle = (t) => ({
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    background: tab === t ? '#f0a500' : 'transparent',
    color: tab === t ? '#140c2a' : '#9ca3af',
    fontWeight: tab === t ? 700 : 500,
    fontSize: 13,
    cursor: 'pointer',
  })

  return (
    <div style={{ padding: '24px 28px', color: '#e2e0f0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>Support Intelligence</h1>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>All support calls, complaint categories, incidents, and Q's operating instructions.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Support calls', value: stats.total, color: '#e2e0f0' },
          { label: 'Cat A (failures)', value: stats.catA, color: '#dc2626' },
          { label: 'Cat B (config)', value: stats.catB, color: '#f0a500' },
          { label: 'Gifts given', value: stats.giftsGiven, color: '#6366f1' },
          { label: 'Escalated', value: stats.escalated, color: '#f97316' },
          { label: 'Active incidents', value: stats.activeInc, color: stats.activeInc > 0 ? '#dc2626' : '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1e1040', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['calls', 'Support calls'], ['incidents', 'Incidents'], ['policy', "Q's instructions"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{label}</button>
        ))}
      </div>

      {loading && <div style={{ color: '#6b7280', fontSize: 13 }}>Loading…</div>}
      {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}

      {/* Support calls tab */}
      {!loading && tab === 'calls' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['all', 'A', 'B', 'C', 'D', 'unknown'].map(cat => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)',
                  background: catFilter === cat ? (cat === 'all' ? '#5e3b87' : CAT_COLOR[cat] + '33') : 'transparent',
                  color: catFilter === cat ? '#fff' : '#9ca3af',
                  fontSize: 12, cursor: 'pointer', fontWeight: catFilter === cat ? 700 : 400,
                }}
              >
                {cat === 'all' ? 'All' : `Cat ${cat}`}
              </button>
            ))}
          </div>
          {filteredCalls.length === 0
            ? <div style={{ color: '#6b7280', fontSize: 13 }}>No support calls recorded yet.</div>
            : filteredCalls.map(c => <CallCard key={c.id} call={c} />)
          }
        </div>
      )}

      {/* Incidents tab */}
      {!loading && tab === 'incidents' && (
        <div>
          <div style={{ background: '#1e1040', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ color: '#e2e0f0', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Log a new incident</div>
            <IncidentForm onCreated={inc => { setIncidents(prev => [inc, ...prev]); load() }} />
          </div>
          {incidents.length === 0
            ? <div style={{ color: '#6b7280', fontSize: 13 }}>No incidents logged.</div>
            : incidents.map(i => <IncidentCard key={i.id} incident={i} onResolved={load} />)
          }
        </div>
      )}

      {/* Policy tab */}
      {!loading && tab === 'policy' && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ background: '#1e1040', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
            <div style={{ color: '#e2e0f0', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Q's support instructions</div>
            <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 20 }}>
              Q reads these instructions verbatim on every support call. Write in plain English. You can steer Q's generosity, strictness, and tone from here without touching any code.
            </div>
            <PolicyEditor policy={policy} onSave={savePolicy} />
          </div>
          <PolicyChat userEmail={user?.email} onPolicyUpdated={load} />
        </div>
      )}
    </div>
  )
}
