import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { useDemo } from '../context/DemoContext'

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  {
    id: 'urgent',
    label: 'Urgent',
    filter: c => c.call_outcome === 'escalated',
    empty: 'No urgent calls — your AI is handling everything smoothly.',
    color: '#b91c1c',
    bg: '#fef2f2',
  },
  {
    id: 'callback',
    label: 'Call Back',
    filter: c => c.callback_flagged,
    empty: 'No calls flagged for callback. Flag any call to add it to your personal calling list.',
    color: '#5e3b87',
    bg: '#f5f3ff',
  },
  {
    id: 'booked',
    label: 'Booked',
    filter: c => c.call_outcome === 'booked',
    empty: 'No bookings recorded yet.',
    color: '#1d4ed8',
    bg: '#eff6ff',
  },
  {
    id: 'leads',
    label: 'Lead Captured',
    filter: c => c.call_outcome === 'lead_captured',
    empty: 'No leads captured yet.',
    color: '#166534',
    bg: '#f0fdf4',
  },
  {
    id: 'log',
    label: 'Call Log',
    filter: () => true,
    empty: 'No calls recorded yet — transcripts will appear here after your first call.',
    color: '#666',
    bg: '#f9f9f9',
  },
]

const OUTCOME_STYLE = {
  lead_captured: { bg: '#e6f5ee', color: '#1e7a4a', label: 'Lead' },
  booked:        { bg: '#ede8f5', color: '#5e3b87', label: 'Booked' },
  referred_out:  { bg: '#eff6ff', color: '#1d4ed8', label: 'Referred' },
  escalated:     { bg: '#fef2f2', color: '#b91c1c', label: 'Urgent' },
  filtered:      { bg: '#f5f5f5', color: '#666',    label: 'Filtered' },
  spam:          { bg: '#f5f5f5', color: '#aaa',    label: 'Spam' },
}

function outcomeStyle(o) {
  return OUTCOME_STYLE[o] || { bg: '#f5f5f5', color: '#aaa', label: o || 'Unknown' }
}

function timeSince(iso) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function fmtDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function parseTranscript(raw) {
  if (!raw || typeof raw !== 'string') return null
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const bubbles = []
  for (const line of lines) {
    const m = line.match(/^(AI|User|Assistant|Customer|Agent|Speaker\s*\d+)\s*:\s*(.+)$/i)
    if (m) {
      const isAI = /^(ai|assistant|agent|speaker\s*0)/i.test(m[1])
      bubbles.push({ speaker: isAI ? 'ai' : 'user', text: m[2].trim() })
    } else if (bubbles.length > 0 && line.length > 0) {
      bubbles[bubbles.length - 1].text += ' ' + line
    }
  }
  return bubbles.length >= 2 ? bubbles : null
}

// ─── Flag icon ────────────────────────────────────────────────────────────────

const FlagIcon = ({ active }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? '#5e3b87' : 'none'} stroke={active ? '#5e3b87' : '#ccc'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
)

// ─── Main component ───────────────────────────────────────────────────────────

export default function ListenTab({ prefill, onPrefillConsumed, urgentOutcomes = ['escalated'] }) {
  const { user }   = useAuth()
  const preview    = usePreview()
  const demo       = useDemo()
  const isDemo     = !!demo?.isDemo || !!preview?.isDemo
  const isPreview  = !!preview?.isPreview

  const [tenantId, setTenantId]   = useState(null)
  const [calls, setCalls]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('urgent')
  const [selected, setSelected]   = useState(null)
  const [search, setSearch]       = useState('')
  const transcriptRef             = useRef(null)

  // ── Demo load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!demo?.isDemo || demo.loading) return
    const raw = demo.calls || []
    setCalls(raw.map(c => ({
      id:               c.id,
      created_at:       c.created_at,
      duration_seconds: c.duration_seconds,
      call_outcome:     c.call_outcome,
      ai_summary:       c.ai_summary,
      caller_phone:     c.callers?.phone_number || c.caller_number || null,
      caller_name:      c.caller_name || null,
      transcript:       c.transcript || null,
      callback_flagged: c.callback_flagged || false,
    })))
    setLoading(false)
  }, [demo?.isDemo, demo?.business?.id, demo?.loading])

  // ── Real tenant load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (demo?.isDemo || (!user && !isPreview)) return
    const load = async () => {
      setLoading(true)
      try {
        let tid
        if (isPreview) {
          tid = preview.previewTenantId
        } else {
          const { data: m } = await supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
          if (!m) return
          tid = m.tenant_id
        }
        setTenantId(tid)
        const { data } = await supabase
          .from('call_logs')
          .select('id, created_at, duration_seconds, call_outcome, ai_summary, caller_phone, transcript, callback_flagged')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
          .limit(200)
        setCalls(data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isPreview])

  // ── Prefill: navigate from Dashboard "View transcript" ───────────────────────
  useEffect(() => {
    if (!prefill?.callId || calls.length === 0) return
    const match = calls.find(c => c.id === prefill.callId)
    if (match) {
      setActiveTab('log')
      setSelected(match)
      onPrefillConsumed?.()
    }
  }, [prefill?.callId, calls])

  // ── Scroll transcript to top on selection change ─────────────────────────────
  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = 0
  }, [selected?.id])

  // ── Auto-advance to first populated tab if current is empty ──────────────────
  useEffect(() => {
    if (loading || calls.length === 0 || prefill?.callId) return
    const getCount = (t) => t.id === 'urgent'
      ? calls.filter(c => urgentOutcomes.includes(c.call_outcome)).length
      : calls.filter(t.filter).length
    const currentTabDef = TABS.find(t => t.id === activeTab)
    if (currentTabDef && getCount(currentTabDef) === 0) {
      const firstPopulated = TABS.find(t => getCount(t) > 0)
      if (firstPopulated) setActiveTab(firstPopulated.id)
    }
  }, [loading, calls, urgentOutcomes])

  // ── Flag toggle ──────────────────────────────────────────────────────────────
  const toggleFlag = async (callId, e) => {
    e.stopPropagation()
    const call = calls.find(c => c.id === callId)
    if (!call) return
    const next = !call.callback_flagged
    setCalls(prev => prev.map(c => c.id === callId ? { ...c, callback_flagged: next } : c))
    if (selected?.id === callId) setSelected(s => ({ ...s, callback_flagged: next }))
    if (!isDemo && !isPreview && tenantId) {
      await supabase.from('call_logs').update({ callback_flagged: next }).eq('id', callId)
    }
  }

  // ── Filtered list for active tab ─────────────────────────────────────────────
  const urgentFilter = c => urgentOutcomes.includes(c.call_outcome)
  const tabDef   = TABS.find(t => t.id === activeTab)
  const effectiveFilter = activeTab === 'urgent' ? urgentFilter : tabDef.filter
  const tabCalls = calls.filter(effectiveFilter)
  const visible  = activeTab === 'log' && search
    ? tabCalls.filter(c => {
        const q = search.toLowerCase()
        return (c.caller_phone?.toLowerCase().includes(q)) ||
               (c.caller_name?.toLowerCase().includes(q)) ||
               (c.ai_summary?.toLowerCase().includes(q)) ||
               (c.transcript?.toLowerCase().includes(q))
      })
    : tabCalls

  const tabCounts = {}
  TABS.forEach(t => {
    tabCounts[t.id] = t.id === 'urgent'
      ? calls.filter(urgentFilter).length
      : calls.filter(t.filter).length
  })

  return (
    <div data-help="Listen — your AI call triage inbox. Urgent and unhandled calls surface at the top. Flag any call to add it to your personal Call Back list. The Call Log at the end is the full searchable archive."
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '2rem', boxSizing: 'border-box' }}>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 1rem', background: '#f0fdf4', border: '1px solid rgba(61,184,122,0.2)', borderRadius: 10, marginBottom: '1.1rem', flexShrink: 0 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3db87a', display: 'inline-block', flexShrink: 0, boxShadow: '0 0 0 3px rgba(61,184,122,0.25)' }} />
        <span style={{ fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", color: '#1e7a4a', fontWeight: 500 }}>AI is standing by — answering calls automatically</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif" }}>
          {calls.length} call{calls.length !== 1 ? 's' : ''} recorded
        </span>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid rgba(94,59,135,0.08)', marginBottom: '1rem', flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(tab => {
          const count  = tabCounts[tab.id]
          const active = activeTab === tab.id
          const urgent = tab.id === 'urgent' && count > 0
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelected(null); setSearch('') }}
              style={{
                padding: '0.6rem 1.1rem', border: 'none', borderBottom: active ? `2px solid ${tab.id === 'urgent' && count > 0 ? '#b91c1c' : '#5e3b87'}` : '2px solid transparent',
                background: 'transparent', cursor: 'pointer', marginBottom: -2,
                fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem',
                fontWeight: active ? 600 : 400,
                color: active ? (urgent ? '#b91c1c' : '#5e3b87') : '#999',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem',
                transition: 'color 0.12s',
              }}>
              {tab.label}
              {count > 0 && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, minWidth: 18, height: 18,
                  borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                  background: urgent ? '#fef2f2' : active ? '#ede8f5' : '#f3f3f3',
                  color: urgent ? '#b91c1c' : active ? '#5e3b87' : '#aaa',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Two-panel body ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', gap: '1rem', minHeight: 0 }}>

        {/* ── Call list ─────────────────────────────────────────────────────── */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0 }}>

          {/* Search — Call Log only */}
          {activeTab === 'log' && (
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search calls, names, summaries…"
              style={{ padding: '0.5rem 0.75rem', border: '1.5px solid rgba(94,59,135,0.15)', borderRadius: 8, fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', background: 'white', outline: 'none', marginBottom: '0.6rem', flexShrink: 0, boxSizing: 'border-box', width: '100%' }}
            />
          )}

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 82, borderRadius: 10, background: 'rgba(94,59,135,0.06)', animation: 'shimmer 1.4s infinite' }} />
              ))
            ) : visible.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                {activeTab === 'urgent' && (
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</div>
                )}
                {activeTab === 'callback' && (
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🚩</div>
                )}
                <div style={{ fontSize: '0.8rem', color: '#bbb', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
                  {search ? 'No calls match your search.' : tabDef.empty}
                </div>
                {activeTab === 'callback' && !search && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.73rem', color: '#ccc', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55 }}>
                    When you review a call and decide to personally follow up, tap the <FlagIcon active={false} /> flag icon to add it here.
                  </div>
                )}
              </div>
            ) : (
              visible.map(call => {
                const os = outcomeStyle(call.call_outcome)
                const isSelected = selected?.id === call.id
                const isUrgent = call.call_outcome === 'escalated'
                return (
                  <button key={call.id} onClick={() => setSelected(call)}
                    style={{
                      textAlign: 'left',
                      background: isSelected ? '#f3f1f7' : 'white',
                      border: `1.5px solid ${isUrgent ? 'rgba(185,28,28,0.25)' : isSelected ? '#5e3b87' : 'rgba(94,59,135,0.1)'}`,
                      borderLeft: isUrgent ? '3px solid #b91c1c' : isSelected ? '3px solid #5e3b87' : '3px solid transparent',
                      borderRadius: 10, padding: '0.65rem 0.75rem', cursor: 'pointer',
                      transition: 'all 0.12s', fontFamily: "'DM Sans', sans-serif",
                      position: 'relative',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.25rem', gap: '0.4rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {call.caller_name || call.caller_phone || 'Unknown caller'}
                        </div>
                        {call.caller_name && call.caller_phone && (
                          <div style={{ fontSize: '0.68rem', color: '#bbb', fontFamily: "'DM Sans', sans-serif" }}>{call.caller_phone}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: os.bg, color: os.color, fontWeight: 600 }}>{os.label}</span>
                        <button
                          onClick={e => toggleFlag(call.id, e)}
                          title={call.callback_flagged ? 'Remove from Call Back' : 'Add to Call Back list'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          <FlagIcon active={call.callback_flagged} />
                        </button>
                      </div>
                    </div>
                    {call.ai_summary && (
                      <div style={{ fontSize: '0.72rem', color: '#777', lineHeight: 1.4, marginBottom: '0.25rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {call.ai_summary}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                      <span style={{ fontSize: '0.65rem', color: '#bbb' }}>{timeSince(call.created_at)}</span>
                      <span style={{ fontSize: '0.65rem', color: '#bbb' }}>{fmtDuration(call.duration_seconds)}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Transcript panel ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, background: 'white', borderRadius: 14, border: '0.5px solid rgba(94,59,135,0.1)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f3f1f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#5e3b87' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', marginBottom: '0.35rem' }}>Select a call</div>
              <div style={{ fontSize: '0.8rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", maxWidth: 280, lineHeight: 1.55 }}>
                Click any call to read the AI summary and full transcript.
              </div>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(94,59,135,0.07)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', marginBottom: '0.2rem' }}>
                      {selected.caller_name || selected.caller_phone || 'Unknown caller'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                      {selected.caller_name && selected.caller_phone && (
                        <span style={{ fontSize: '0.73rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{selected.caller_phone}</span>
                      )}
                      <span style={{ fontSize: '0.73rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>
                        {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {fmtTime(selected.created_at)}
                      </span>
                      <span style={{ fontSize: '0.73rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{fmtDuration(selected.duration_seconds)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {(() => { const os = outcomeStyle(selected.call_outcome); return (
                      <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: 5, background: os.bg, color: os.color, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{os.label}</span>
                    )})()}
                    <button
                      onClick={e => toggleFlag(selected.id, e)}
                      title={selected.callback_flagged ? 'Remove from Call Back list' : 'Add to your Call Back list'}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: 6, border: `1px solid ${selected.callback_flagged ? 'rgba(94,59,135,0.3)' : 'rgba(200,200,200,0.5)'}`, background: selected.callback_flagged ? '#f3f1f7' : 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', fontWeight: 500, color: selected.callback_flagged ? '#5e3b87' : '#bbb', transition: 'all 0.15s' }}>
                      <FlagIcon active={selected.callback_flagged} />
                      {selected.callback_flagged ? 'In Call Back' : 'Flag for Call Back'}
                    </button>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#ccc', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
                  </div>
                </div>
              </div>

              {/* Scrollable content */}
              <div ref={transcriptRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {selected.ai_summary && (
                  <div style={{ background: '#f3f1f7', borderRadius: 10, padding: '0.85rem 1rem', borderLeft: '3px solid #5e3b87' }}>
                    <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem', fontFamily: "'DM Sans', sans-serif" }}>AI Summary</div>
                    <div style={{ fontSize: '0.82rem', color: '#1a1a1a', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{selected.ai_summary}</div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}>Transcript</div>
                  {(() => {
                    const bubbles = parseTranscript(selected.transcript)
                    if (!selected.transcript) return (
                      <div style={{ fontSize: '0.8rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", background: '#fafafa', borderRadius: 8, padding: '1.25rem', textAlign: 'center' }}>
                        Transcript not recorded for this call.
                      </div>
                    )
                    if (!bubbles) return (
                      <pre style={{ fontSize: '0.78rem', color: '#444', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'pre-wrap', lineHeight: 1.65, margin: 0, background: '#fafafa', borderRadius: 8, padding: '0.85rem 1rem' }}>
                        {selected.transcript}
                      </pre>
                    )
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {bubbles.map((b, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: b.speaker === 'ai' ? 'flex-start' : 'flex-end' }}>
                            <div style={{ maxWidth: '80%', padding: '0.55rem 0.85rem', borderRadius: b.speaker === 'ai' ? '4px 12px 12px 12px' : '12px 4px 12px 12px', background: b.speaker === 'ai' ? '#f3f1f7' : '#5e3b87', color: b.speaker === 'ai' ? '#1a1a1a' : 'white', fontSize: '0.8rem', lineHeight: 1.55, fontFamily: "'DM Sans', sans-serif" }}>
                              {b.speaker === 'ai' && (
                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#9b7cc5', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI</div>
                              )}
                              {b.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>

              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
