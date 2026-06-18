import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

const OWNER_EMAILS = ['finsolsoffice@gmail.com', 'philoffice@btconnect.com']

const ELEMENT_LABELS = {
  answer:   'Answer',
  support:  'Support',
  q:        'Q',
  schedule: 'Schedule',
  listen:   'Listen',
  warden:   'Warden',
}

const SIGNAL_COLORS = {
  call_completed:    '#22c55e',
  call_support_done: '#6366f1',
  chat_turn:         '#f0a500',
  error:             '#dc2626',
  warden_snapshot:   '#9ca3af',
}

function Toggle({ value, onChange, danger }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 52, height: 28, borderRadius: 14, cursor: 'pointer',
        background: value ? (danger ? '#22c55e' : '#22c55e') : '#dc2626',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        border: `2px solid ${value ? '#16a34a' : '#b91c1c'}`,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: value ? 24 : 2,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  )
}

function StatusPill({ status }) {
  const colors = { active: '#22c55e', suspended: '#f97316', inactive: '#6b7280' }
  const c = colors[status] || '#6b7280'
  return (
    <span style={{ display: 'inline-block', background: c + '22', color: c, border: `1px solid ${c}44`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
      {status}
    </span>
  )
}

function ConfirmModal({ warning, detail, onConfirm, onCancel }) {
  const [secs, setSecs] = useState(10)
  useEffect(() => {
    if (secs <= 0) return
    const t = setTimeout(() => setSecs(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secs])
  const ready = secs === 0
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: '#1a0a2e', border: '2px solid #dc2626', borderRadius: 16, padding: '32px 36px', maxWidth: 460, width: '92%', boxShadow: '0 0 60px rgba(220,38,38,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 22 }}>⚠</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: '#dc2626' }}>Critical Action</span>
        </div>
        <div style={{ fontSize: 15, color: '#f0eeff', lineHeight: 1.65, marginBottom: 10 }}>{warning}</div>
        {detail && <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.55, marginBottom: 22, padding: '10px 14px', background: 'rgba(220,38,38,0.08)', borderRadius: 8, borderLeft: '3px solid #dc262655' }}>{detail}</div>}
        {!detail && <div style={{ marginBottom: 22 }} />}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '9px 22px', background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: '#9ca3af', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={ready ? onConfirm : undefined}
            style={{
              padding: '9px 22px', borderRadius: 8, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
              background: ready ? '#dc2626' : '#3d1010',
              color: ready ? '#fff' : '#7a3030',
              border: `1px solid ${ready ? '#dc2626' : '#5a1a1a'}`,
              cursor: ready ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              minWidth: 130,
            }}
          >
            {ready ? 'Confirm' : `Confirm (${secs}s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

function QBriefing({ userEmail }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
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
        body: JSON.stringify({ type: 'orchestrate', ownerEmail: userEmail, messages: newMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'ai', content: data.message }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Could not reach Q. Please try again.' }])
    } finally {
      setSending(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ background: '#1e1040', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ color: '#f0eeff', fontWeight: 700, fontSize: 14 }}>Q Briefing</div>
        <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
          Q reads the full system state — all element signals, health, stress flags. Advisory only. Q cannot write to this panel.
        </div>
      </div>

      <div style={{ height: 260, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ color: '#4b5563', fontSize: 14, textAlign: 'center', marginTop: 70 }}>
            Ask Q to brief you on the system, flag concerns, or interpret what the signals mean.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '84%',
              background: m.role === 'user' ? '#5e3b87' : '#140c2a',
              border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              padding: '10px 14px', color: '#f0eeff', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: '#140c2a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', color: '#6b7280', fontSize: 14 }}>
              Q is reading the system…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Brief me on the system… / What's the stress on Answer? / Is anything wrong?"
          style={{ flex: 1, background: '#140c2a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f0eeff', padding: '9px 12px', fontSize: 14, outline: 'none' }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          style={{
            background: '#f0a500', color: '#140c2a', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap',
            cursor: (sending || !input.trim()) ? 'not-allowed' : 'pointer',
            opacity: (sending || !input.trim()) ? 0.6 : 1,
          }}
        >
          Ask Q
        </button>
      </div>
    </div>
  )
}

export default function MasterControl() {
  const { user } = useAuth()
  const [config, setConfig]       = useState(null)
  const [signals, setSignals]     = useState([])
  const [snapshot, setSnapshot]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState(null)
  const [meaningMap, setMeaningMap]   = useState(null)
  const [mapExpanded, setMapExpanded] = useState({})
  const [pendingAction, setPendingAction] = useState(null)

  function guard(warning, detail, fn) {
    setPendingAction({ warning, detail, fn })
  }
  function confirmAction() {
    pendingAction?.fn()
    setPendingAction(null)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [cfgRes, sigRes, mapRes] = await Promise.all([
      supabase.from('master_config').select('*').eq('id', 'system').maybeSingle(),
      supabase.from('system_signals').select('element, signal_type, payload, created_at').order('created_at', { ascending: false }).limit(40),
      fetch('/api/admin?type=meaning-map').then(r => r.json()).catch(() => null),
    ])
    setConfig(cfgRes.data || null)
    const sigs = sigRes.data || []
    const lastSnap = sigs.find(s => s.signal_type === 'warden_snapshot')
    setSnapshot(lastSnap?.payload || null)
    setSignals(sigs.filter(s => s.signal_type !== 'warden_snapshot'))
    if (mapRes && !mapRes.error) setMeaningMap(mapRes)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save(patch) {
    if (!config) return
    setSaving(true); setError(null)
    const updated = { ...config, ...patch, updated_at: new Date().toISOString(), updated_by: user?.email }
    const { error: err } = await supabase
      .from('master_config')
      .update(updated)
      .eq('id', 'system')
    if (err) {
      setError(err.message)
    } else {
      setConfig(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  function setElementStatus(element, status) {
    const fn = () => {
      const updated = { ...(config.element_status || {}), [element]: status }
      save({ element_status: updated })
    }
    const name = ELEMENT_LABELS[element] || element
    if (status === 'inactive') {
      guard(
        `You are about to shut down ${name} completely.`,
        `${name} will stop all operations immediately. No tasks will be processed and no recovery is automatic — you must manually reactivate it from this panel.`,
        fn
      )
    } else if (status === 'suspended') {
      guard(
        `You are about to suspend ${name}.`,
        `${name} will hold and stop processing new tasks immediately. Existing operations may be interrupted. It will remain suspended until you manually return it to Active.`,
        fn
      )
    } else {
      fn()
    }
  }

  if (!OWNER_EMAILS.includes(user?.email)) {
    return <div style={{ padding: 40, color: '#9ca3af' }}>Access restricted.</div>
  }

  const sectionLabel = { display: 'block', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }
  const card = { background: '#1e1040', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }

  return (
    <div style={{ padding: '24px 28px', color: '#f0eeff', minHeight: '100vh', maxWidth: 820 }}>
      {pendingAction && (
        <ConfirmModal
          warning={pendingAction.warning}
          detail={pendingAction.detail}
          onConfirm={confirmAction}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>Master Control</h1>
          <span style={{ background: '#dc262622', color: '#dc2626', border: '1px solid #dc262644', borderRadius: 4, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
            Q HAS NO WRITE ACCESS TO THIS PANEL
          </span>
        </div>
        <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
          This panel reaches into the entire architecture. All changes here are enforced at the database level — Q and all elements can read but cannot write to this configuration.
        </p>
      </div>

      {loading && <div style={{ color: '#6b7280', fontSize: 14 }}>Loading…</div>}
      {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 12, background: '#1e0a0a', border: '1px solid #dc262644', borderRadius: 8, padding: '8px 14px' }}>{error}</div>}
      {saved && <div style={{ color: '#86efac', fontSize: 12, marginBottom: 12, background: '#0f2d1a', border: '1px solid #22c55e44', borderRadius: 8, padding: '8px 14px' }}>Changes saved.</div>}

      {!loading && config && (
        <>
          {/* Q Briefing — Q reads all element states, advisory only */}
          <QBriefing userEmail={user?.email} />

          {/* System state */}
          <div data-help="System state — switch between Live (normal operation), Maintenance (elements pause non-critical tasks) and Emergency (Q write authority is automatically suspended)" style={card}>
            <label style={sectionLabel}>System state</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['live', 'maintenance', 'emergency'].map(s => {
                const active = config.system_state === s
                const colors = { live: '#22c55e', maintenance: '#f0a500', emergency: '#dc2626' }
                return (
                  <button
                    key={s}
                    onClick={() => {
                        if (s === 'emergency') {
                          guard(
                            'You are about to set the system to EMERGENCY state.',
                            'Q write authority will be automatically suspended and all elements will enter restricted operation. This affects live callers immediately and cannot be automatically reversed.',
                            () => save({ system_state: s })
                          )
                        } else if (s === 'maintenance') {
                          guard(
                            'You are about to set the system to MAINTENANCE state.',
                            'Non-critical element tasks will pause immediately. Incoming calls will still be handled but some features will be restricted until you return the system to Live.',
                            () => save({ system_state: s })
                          )
                        } else {
                          save({ system_state: s })
                        }
                      }}
                    disabled={saving}
                    style={{
                      padding: '8px 20px', borderRadius: 8, border: `1px solid ${active ? colors[s] : 'rgba(255,255,255,0.12)'}`,
                      background: active ? colors[s] + '22' : 'transparent',
                      color: active ? colors[s] : '#6b7280',
                      fontWeight: active ? 700 : 400, fontSize: 14, cursor: 'pointer',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
            <div style={{ color: '#4b5563', fontSize: 11, marginTop: 10 }}>
              Emergency state suspends Q write authority automatically, regardless of the toggle below.
            </div>
          </div>

          {/* Q write authority */}
          <div data-help="Q write authority — when enabled Q can execute write operations like saving support policy. When suspended Q can still discuss changes but cannot execute them. Emergency state overrides this toggle regardless." style={{ ...card, border: config.q_write_enabled ? '1px solid rgba(255,255,255,0.08)' : '1px solid #dc262655' }}>
            <label style={sectionLabel}>Q write authority</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Toggle value={config.q_write_enabled} onChange={val => {
                if (!val) {
                  guard(
                    "You are about to suspend Q's write authority.",
                    "Q will be notified immediately and will no longer be able to execute any write operations — only discuss them. This takes effect the moment you confirm.",
                    () => save({ q_write_enabled: false })
                  )
                } else {
                  save({ q_write_enabled: val })
                }
              }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: config.q_write_enabled ? '#22c55e' : '#dc2626' }}>
                  {config.q_write_enabled ? 'Q can write policy' : 'Q write authority SUSPENDED'}
                </div>
                <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
                  When off, Q can discuss changes but cannot execute any write operations. Q is notified immediately.
                </div>
              </div>
            </div>
          </div>

          {/* Element status */}
          <div data-help="Element status — each element (Answer, Support, Q, Schedule, Listen) can be set to Active, Suspended or Inactive. Suspended means the element holds but does not process. Inactive means completely off. Warden is not listed here as it runs on a cron schedule outside your direct control." style={card}>
            <label style={sectionLabel}>Element status</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(ELEMENT_LABELS).filter(([id]) => id !== 'warden').map(([id, name]) => {
                const status = config.element_status?.[id] || 'inactive'
                const authority = config.element_authority?.[id] || 'report'
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: '#140c2a', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 90, fontSize: 14, fontWeight: 600, color: '#f0eeff' }}>{name}</div>
                    <div style={{ width: 80 }}><StatusPill status={status} /></div>
                    <div style={{ flex: 1, color: '#4b5563', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{authority}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['active', 'suspended', 'inactive'].map(s => (
                        <button
                          key={s}
                          onClick={() => setElementStatus(id, s)}
                          disabled={saving || status === s}
                          style={{
                            padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                            background: status === s ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: status === s ? '#f0eeff' : '#6b7280',
                            fontSize: 11, cursor: status === s ? 'default' : 'pointer', fontWeight: status === s ? 700 : 400,
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Warden snapshot */}
          {snapshot && (
            <div data-help="Warden snapshot — the Warden runs every night at midnight. It reads all system_signals from the previous 24 hours and computes signal count and error rate per element. Stress flags appear here when an element exceeds healthy error thresholds." style={card}>
              <label style={sectionLabel}>Last warden snapshot</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
                {Object.entries(snapshot.elements || {}).map(([el, data]) => (
                  <div key={el} style={{ background: '#140c2a', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>{ELEMENT_LABELS[el] || el}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: data.error_rate > 0.1 ? '#dc2626' : '#f0eeff' }}>{data.signal_count}</div>
                    <div style={{ fontSize: 10, color: '#4b5563' }}>signals · {data.errors} err</div>
                  </div>
                ))}
              </div>
              {snapshot.stress_flags?.length > 0 && (
                <div style={{ background: '#1e0a0a', border: '1px solid #dc262644', borderRadius: 8, padding: '8px 14px' }}>
                  <div style={{ color: '#f87171', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>STRESS FLAGS</div>
                  {snapshot.stress_flags.map((f, i) => (
                    <div key={i} style={{ color: '#fca5a5', fontSize: 12 }}>{f}</div>
                  ))}
                </div>
              )}
              {(!snapshot.stress_flags?.length) && (
                <div style={{ color: '#4b5563', fontSize: 12 }}>No stress flags in the last snapshot period.</div>
              )}
            </div>
          )}

          {/* Meaning Map */}
          {meaningMap && (
            <div data-help="Meaning Map — a semantic tree of everything clients ask Q about. The trunk is the whole system, branches are topic areas, twigs are individual knowledge sections. Each matched interaction increments a twig's weight. Unmatched interactions at the bottom are questions the map does not yet cover — these are the gaps." style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <label style={{ ...sectionLabel, marginBottom: 0 }}>Meaning Map</label>
                <span style={{ fontSize: 11, color: '#4b5563' }}>
                  {meaningMap.branches?.reduce((s, b) => s + b.total_occurrences, 0).toLocaleString()} total interactions mapped
                </span>
              </div>

              {/* Trunk */}
              {meaningMap.trunk && (
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12, fontStyle: 'italic' }}>
                  {meaningMap.trunk.label}
                </div>
              )}

              {/* Branches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(meaningMap.branches || []).map(branch => {
                  const isOpen    = mapExpanded[branch.id]
                  const barWidth  = meaningMap.branches[0]?.total_occurrences > 0
                    ? Math.round((branch.total_occurrences / meaningMap.branches[0].total_occurrences) * 100)
                    : 0

                  return (
                    <div key={branch.id} style={{ background: '#140c2a', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div
                        onClick={() => setMapExpanded(p => ({ ...p, [branch.id]: !p[branch.id] }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
                      >
                        <span style={{ fontSize: 11, color: '#6b7280', width: 12 }}>{isOpen ? '▾' : '▸'}</span>
                        <span style={{ fontSize: 14, color: '#f0eeff', fontWeight: 600, flex: 1 }}>{branch.label}</span>
                        <span style={{ fontSize: 11, color: '#6b7280', marginRight: 8 }}>{branch.twig_count} twigs</span>
                        <div style={{ width: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 6, flexShrink: 0 }}>
                          <div style={{ width: `${barWidth}%`, background: '#5e3b87', height: '100%', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#9ca3af', minWidth: 40, textAlign: 'right' }}>
                          {branch.total_occurrences > 0 ? branch.total_occurrences.toLocaleString() : '—'}
                        </span>
                      </div>

                      {isOpen && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '8px 14px 12px' }}>
                          {branch.top_twigs?.length === 0 && (
                            <div style={{ color: '#4b5563', fontSize: 12 }}>No interactions yet.</div>
                          )}
                          {(branch.top_twigs || []).map(twig => {
                            const twigBar = branch.top_twigs[0]?.occurrence_count > 0
                              ? Math.round((twig.occurrence_count / branch.top_twigs[0].occurrence_count) * 100)
                              : 0
                            return (
                              <div key={twig.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <span style={{ fontSize: 11, color: '#9ca3af', flex: 1, lineHeight: 1.3 }}>{twig.label}</span>
                                <div style={{ width: 50, background: 'rgba(255,255,255,0.05)', borderRadius: 2, height: 4, flexShrink: 0 }}>
                                  <div style={{ width: `${twigBar}%`, background: '#f0a500', height: '100%', borderRadius: 2 }} />
                                </div>
                                <span style={{ fontSize: 11, color: twig.occurrence_count > 0 ? '#f0a500' : '#374151', minWidth: 28, textAlign: 'right' }}>
                                  {twig.occurrence_count || 0}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Unmatched — the unknown */}
              {meaningMap.unmatched?.length > 0 && (
                <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#f0a500', fontWeight: 700 }}>
                      {meaningMap.unmatched.length} unmatched
                    </span>
                    <span style={{ fontSize: 11, color: '#4b5563' }}>— interactions the map doesn't yet cover</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                    {meaningMap.unmatched.map(u => (
                      <div key={u.id} style={{ background: '#0d0720', border: '1px solid rgba(240,165,0,0.12)', borderRadius: 6, padding: '8px 12px' }}>
                        <div style={{ fontSize: 12, color: '#f0eeff', marginBottom: 4, lineHeight: 1.4 }}>
                          "{u.user_message?.slice(0, 140)}{u.user_message?.length > 140 ? '…' : ''}"
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {u.zone_name && <span style={{ fontSize: 10, color: '#6b7280' }}>{u.zone_name}</span>}
                          <span style={{ fontSize: 10, color: '#374151' }}>
                            {new Date(u.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {meaningMap.unmatched?.length === 0 && (
                <div style={{ marginTop: 12, fontSize: 11, color: '#4b5563' }}>
                  No unmatched interactions yet — the map is covering everything.
                </div>
              )}
            </div>
          )}

          {/* Recent signals */}
          <div data-help="Recent signals — the system_signals table is the nervous system of the platform. Every element writes here after each operation. Colours indicate element: green = Answer call, indigo = Support call, amber = Q chat turn, grey = Warden snapshot, red = error. Q reads these signals to understand system health." style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <label style={{ ...sectionLabel, marginBottom: 0 }}>Recent signals</label>
              <button onClick={load} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#9ca3af', padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>Refresh</button>
            </div>
            {signals.length === 0
              ? <div style={{ color: '#4b5563', fontSize: 14 }}>No signals yet. They appear here as elements operate.</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                  {signals.map((s, i) => {
                    const col = SIGNAL_COLORS[s.signal_type] || '#6b7280'
                    const time = new Date(s.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 10px', background: '#140c2a', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ color: col, fontSize: 11, fontWeight: 700, minWidth: 70, paddingTop: 1 }}>{ELEMENT_LABELS[s.element] || s.element}</span>
                        <span style={{ color: '#9ca3af', fontSize: 11, flex: 1 }}>{s.signal_type.replace(/_/g, ' ')}</span>
                        <span style={{ color: '#4b5563', fontSize: 10, whiteSpace: 'nowrap' }}>{time}</span>
                      </div>
                    )
                  })}
                </div>
              )}
          </div>

          <div style={{ color: '#4b5563', fontSize: 11, marginTop: 8 }}>
            Last config change: {config.updated_at ? new Date(config.updated_at).toLocaleString('en-GB') : 'never'} · by {config.updated_by || 'system'}
          </div>
        </>
      )}
    </div>
  )
}
