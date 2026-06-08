import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { useDemo } from '../context/DemoContext'

const OUTCOMES = [
  { id: 'all',            label: 'All calls' },
  { id: 'lead_captured',  label: 'Lead captured' },
  { id: 'booked',         label: 'Booked' },
  { id: 'referred_out',   label: 'Referred' },
  { id: 'escalated',      label: 'Urgent' },
  { id: 'filtered',       label: 'Filtered' },
]

const OUTCOME_STYLE = {
  lead_captured: { bg: '#e6f5ee', color: '#1e7a4a', label: 'Lead' },
  booked:        { bg: '#ede8f5', color: '#5e3b87', label: 'Booked' },
  referred_out:  { bg: '#eff6ff', color: '#1d4ed8', label: 'Referred' },
  escalated:     { bg: '#fef2f2', color: '#b91c1c', label: 'Urgent' },
  filtered:      { bg: '#f5f5f5', color: '#666',    label: 'Filtered' },
}

function outcomeStyle(o) {
  return OUTCOME_STYLE[o] || { bg: '#f5f5f5', color: '#aaa', label: o || 'Unknown' }
}

function timeSince(iso) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)  return `${secs}s ago`
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

export default function ListenTab() {
  const { user }  = useAuth()
  const preview   = usePreview()
  const demo      = useDemo()
  const isDemo    = !!demo?.isDemo || !!preview?.isDemo
  const isPreview = !!preview?.isPreview

  const [tenantId, setTenantId]  = useState(null)
  const [calls, setCalls]        = useState([])
  const [loading, setLoading]    = useState(true)
  const [selected, setSelected]  = useState(null)
  const [filter, setFilter]      = useState('all')
  const [search, setSearch]      = useState('')
  const transcriptRef            = useRef(null)

  // Load demo data
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
      transcript:       c.transcript || null,
    })))
    setLoading(false)
  }, [demo?.isDemo, demo?.business?.id, demo?.loading])

  // Load real tenant data
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
          .select('id, created_at, duration_seconds, call_outcome, ai_summary, caller_phone, transcript')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
          .limit(150)
        setCalls(data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isPreview])

  // Scroll transcript to top on selection change
  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = 0
  }, [selected?.id])

  const filtered = calls.filter(c => {
    if (filter !== 'all' && c.call_outcome !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      if (c.caller_phone?.toLowerCase().includes(q)) return true
      if (c.ai_summary?.toLowerCase().includes(q)) return true
      if (c.transcript?.toLowerCase().includes(q)) return true
      return false
    }
    return true
  })

  const inp = {
    padding: '0.5rem 0.75rem', border: '1.5px solid rgba(94,59,135,0.15)',
    borderRadius: 8, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a', background: 'white', outline: 'none', width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div data-help="Listen — full transcript archive for every call your AI has handled. Click any call to read the transcript and AI summary." style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 1rem', background: '#f0fdf4', border: '1px solid rgba(61,184,122,0.2)', borderRadius: 10, marginBottom: '1.1rem', flexShrink: 0 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3db87a', display: 'inline-block', flexShrink: 0, boxShadow: '0 0 0 3px rgba(61,184,122,0.25)', animation: 'none' }} />
        <span style={{ fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", color: '#1e7a4a', fontWeight: 500 }}>AI is standing by — answering calls automatically</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif" }}>
          {calls.length} call{calls.length !== 1 ? 's' : ''} recorded
        </span>
      </div>

      {/* Filter + search row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {OUTCOMES.map(o => (
            <button key={o.id} onClick={() => setFilter(o.id)}
              style={{ padding: '0.28rem 0.7rem', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.73rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, background: filter === o.id ? '#5e3b87' : '#f0ebf8', color: filter === o.id ? 'white' : '#5e3b87', transition: 'all 0.13s' }}>
              {o.label}
            </button>
          ))}
        </div>
        <input style={{ ...inp, maxWidth: 220, marginLeft: 'auto' }} placeholder="Search transcripts…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Two-panel body */}
      <div style={{ flex: 1, display: 'flex', gap: '1rem', minHeight: 0 }}>

        {/* ── Call list ──────────────────────────────────────────────────── */}
        <div style={{ width: 300, flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 78, borderRadius: 10, background: 'rgba(94,59,135,0.06)', animation: 'shimmer 1.4s infinite' }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#aaa', fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif" }}>
              {calls.length === 0 ? 'No calls recorded yet — transcripts will appear here after your first call.' : 'No calls match this filter.'}
            </div>
          ) : filtered.map(call => {
            const os = outcomeStyle(call.call_outcome)
            const isSelected = selected?.id === call.id
            return (
              <button key={call.id} onClick={() => setSelected(call)}
                style={{ textAlign: 'left', background: isSelected ? '#f3f1f7' : 'white', border: `1.5px solid ${isSelected ? '#5e3b87' : 'rgba(94,59,135,0.1)'}`, borderRadius: 10, padding: '0.7rem 0.85rem', cursor: 'pointer', transition: 'all 0.12s', fontFamily: "'DM Sans', sans-serif" }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1a1a1a' }}>{call.caller_phone || 'Unknown caller'}</span>
                  <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: os.bg, color: os.color, fontWeight: 600 }}>{os.label}</span>
                </div>
                {call.ai_summary && (
                  <div style={{ fontSize: '0.73rem', color: '#666', lineHeight: 1.4, marginBottom: '0.3rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {call.ai_summary}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.67rem', color: '#aaa' }}>{timeSince(call.created_at)}</span>
                  <span style={{ fontSize: '0.67rem', color: '#aaa' }}>{fmtDuration(call.duration_seconds)}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Transcript panel ───────────────────────────────────────────── */}
        <div style={{ flex: 1, background: 'white', borderRadius: 14, border: '0.5px solid rgba(94,59,135,0.1)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f3f1f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#5e3b87' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', marginBottom: '0.35rem' }}>Select a call</div>
              <div style={{ fontSize: '0.8rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", maxWidth: 280, lineHeight: 1.55 }}>Click any call on the left to read the full transcript and AI summary.</div>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(94,59,135,0.07)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', marginBottom: '0.2rem' }}>
                      {selected.caller_phone || 'Unknown caller'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.85rem' }}>
                      <span style={{ fontSize: '0.73rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {fmtTime(selected.created_at)}</span>
                      <span style={{ fontSize: '0.73rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{fmtDuration(selected.duration_seconds)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {(() => { const os = outcomeStyle(selected.call_outcome); return (
                      <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: 5, background: os.bg, color: os.color, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{os.label}</span>
                    )})()}
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#ccc', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
                  </div>
                </div>
              </div>

              {/* Scrollable content */}
              <div ref={transcriptRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* AI summary */}
                {selected.ai_summary && (
                  <div style={{ background: '#f3f1f7', borderRadius: 10, padding: '0.85rem 1rem', borderLeft: '3px solid #5e3b87' }}>
                    <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem', fontFamily: "'DM Sans', sans-serif" }}>AI Summary</div>
                    <div style={{ fontSize: '0.82rem', color: '#1a1a1a', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{selected.ai_summary}</div>
                  </div>
                )}

                {/* Transcript */}
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
                            <div style={{
                              maxWidth: '80%',
                              padding: '0.55rem 0.85rem',
                              borderRadius: b.speaker === 'ai' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                              background: b.speaker === 'ai' ? '#f3f1f7' : '#5e3b87',
                              color: b.speaker === 'ai' ? '#1a1a1a' : 'white',
                              fontSize: '0.8rem',
                              lineHeight: 1.55,
                              fontFamily: "'DM Sans', sans-serif",
                            }}>
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
