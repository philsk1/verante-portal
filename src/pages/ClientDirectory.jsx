import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'

const CAMPAIGN_LIMIT = { free: 0, light: 100, standard: 500, professional: 2000, enterprise: Infinity, bespoke: Infinity }

const AVATAR_PAL = [
  { bg: '#f0ebf8', c: '#5e3b87' }, { bg: '#e6f5ee', c: '#1e7a4a' },
  { bg: '#eff6ff', c: '#1d4ed8' }, { bg: '#fef3d0', c: '#92610a' },
  { bg: '#fce7f3', c: '#9d174d' }, { bg: '#dcfce7', c: '#166534' },
]
const avatarCol = (s = '') => AVATAR_PAL[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PAL.length]
const initials = (s = '') => s.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const OUTCOME_LABEL = {
  lead_captured: 'Lead captured', booked: 'Booked', callback_scheduled: 'Callback',
  escalated: 'Escalated', filtered: 'Spam filtered', referred_out: 'Referred',
}

const ClientDirectory = () => {
  const { user } = useAuth()
  const preview = usePreview()
  const isPreview = !!preview?.isPreview
  const previewReadOnly = preview?.previewReadOnly ?? isPreview

  const [tenantId, setTenantId] = useState(null)
  const [tier, setTier] = useState('light')
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [noteDrafts, setNoteDrafts] = useState({})
  const [savingNote, setSavingNote] = useState(null)
  const [campaignOpen, setCampaignOpen] = useState(false)
  const [campaignMsg, setCampaignMsg] = useState('')
  const [aiDrafting, setAiDrafting] = useState(false)
  const [campaignSending, setCampaignSending] = useState(false)
  const [campaignResult, setCampaignResult] = useState(null)

  useEffect(() => {
    if (!user && !isPreview) return
    const load = async () => {
      setLoading(true)
      let tid
      if (isPreview) {
        tid = preview.previewTenantId
      } else {
        const { data: m } = await supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
        if (!m) { setLoading(false); return }
        tid = m.tenant_id
      }
      setTenantId(tid)

      const { data: tenant } = await supabase.from('tenants').select('subscription_tier').eq('id', tid).maybeSingle()
      setTier(tenant?.subscription_tier || 'light')

      const [logsRes, relsRes] = await Promise.all([
        supabase.from('call_logs')
          .select('caller_id, caller_phone, call_outcome, ai_summary, created_at, callers(id, full_name, phone_number)')
          .eq('tenant_id', tid)
          .not('caller_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(3000),
        supabase.from('caller_tenant_relationships')
          .select('id, caller_id, notes, marketing_opted_out, opted_out_at, is_hot_prospect, deletion_requested')
          .eq('tenant_id', tid),
      ])

      const relMap = {}
      for (const r of relsRes.data || []) relMap[r.caller_id] = r

      // Aggregate per caller_id
      const callerMap = {}
      for (const log of logsRes.data || []) {
        const cid = log.caller_id
        if (!callerMap[cid]) {
          callerMap[cid] = {
            caller_id: cid,
            name: log.callers?.full_name || null,
            phone: log.callers?.phone_number || log.caller_phone || null,
            call_count: 0,
            last_call: log.created_at,
            last_outcome: log.call_outcome,
            last_summary: log.ai_summary,
            ...(relMap[cid] || { id: null, notes: null, marketing_opted_out: false, opted_out_at: null, is_hot_prospect: false, deletion_requested: false }),
          }
        }
        callerMap[cid].call_count++
      }

      const merged = Object.values(callerMap).filter(c => !c.deletion_requested)
      setClients(merged)
      setLoading(false)
    }
    load()
  }, [user, isPreview])

  const upsertRel = async (callerId, updates) => {
    if (previewReadOnly || !tenantId) return
    const existing = clients.find(c => c.caller_id === callerId)
    if (existing?.id) {
      await supabase.from('caller_tenant_relationships').update(updates).eq('id', existing.id)
    } else {
      await supabase.from('caller_tenant_relationships').insert({ tenant_id: tenantId, caller_id: callerId, ...updates })
    }
    setClients(prev => prev.map(c => c.caller_id === callerId ? { ...c, ...updates } : c))
  }

  const toggleHot = (c) => upsertRel(c.caller_id, { is_hot_prospect: !c.is_hot_prospect })
  const toggleOptOut = (c) => upsertRel(c.caller_id, { marketing_opted_out: !c.marketing_opted_out, opted_out_at: !c.marketing_opted_out ? new Date().toISOString() : null })
  const deleteClient = async (c) => {
    if (previewReadOnly) return
    await upsertRel(c.caller_id, { deletion_requested: true, deletion_requested_at: new Date().toISOString() })
    setClients(prev => prev.filter(x => x.caller_id !== c.caller_id))
  }
  const saveNote = async (c) => {
    setSavingNote(c.caller_id)
    const note = noteDrafts[c.caller_id] ?? c.notes ?? ''
    await upsertRel(c.caller_id, { notes: note || null })
    setSavingNote(null)
  }

  const filtered = useMemo(() => {
    let list = clients
    if (filterTab === 'hot') list = list.filter(c => c.is_hot_prospect)
    if (filterTab === 'optout') list = list.filter(c => c.marketing_opted_out)
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.last_summary || '').toLowerCase().includes(q) ||
      (OUTCOME_LABEL[c.last_outcome] || '').toLowerCase().includes(q)
    )
  }, [clients, search, filterTab])

  const campaignTargets = filtered.filter(c => !c.marketing_opted_out)
  const optedOutInFilter = filtered.filter(c => c.marketing_opted_out).length
  const canCampaign = tier !== 'free'
  const recipientLimit = CAMPAIGN_LIMIT[tier] ?? 0

  const aiDraft = async () => {
    setAiDrafting(true)
    const intentSummary = filtered.slice(0, 5).map(c => c.last_summary).filter(Boolean).join('. ')
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'vera-chat',
          message: `Write a short, friendly SMS campaign message (max 130 characters) for a UK small business to send to past callers. Intent context: ${intentSummary || 'general enquiries'}. Be warm and direct. No emojis. End with a call to action.`,
          history: [],
        }),
      })
      const d = await r.json()
      const text = d.reply || d.message || ''
      if (text) setCampaignMsg(text.slice(0, 130))
    } catch { /* silent */ }
    setAiDrafting(false)
  }

  const sendCampaign = async () => {
    if (!canCampaign || campaignSending || !campaignMsg.trim()) return
    const recipients = campaignTargets.slice(0, recipientLimit)
    if (!recipients.length) return
    setCampaignSending(true)
    setCampaignResult(null)
    try {
      const fullMsg = campaignMsg.trim() + '\nReply STOP to opt out.'
      const r = await fetch('/api/notify?type=campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          message: fullMsg,
          recipients: recipients.map(c => ({ phone: c.phone, name: c.name || 'there', caller_id: c.caller_id })),
        }),
      })
      const d = await r.json()
      if (d.ok) {
        setCampaignResult({ ok: true, sent: d.sent, failed: d.failed })
        // Log to campaigns table
        await supabase.from('campaigns').insert({
          tenant_id: tenantId,
          message: fullMsg,
          recipient_count: recipients.length,
          sent_count: d.sent || 0,
          failed_count: d.failed || 0,
          status: 'sent',
          search_context: search || filterTab,
          sent_at: new Date().toISOString(),
        })
      } else {
        setCampaignResult({ ok: false, error: d.error || 'Send failed' })
      }
    } catch (e) {
      setCampaignResult({ ok: false, error: e.message })
    }
    setCampaignSending(false)
  }

  const hotCount = clients.filter(c => c.is_hot_prospect).length
  const optoutCount = clients.filter(c => c.marketing_opted_out).length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.375rem', color: '#1a1a1a', margin: '0 0 0.25rem' }}>Clients</h1>
          <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>
            {clients.length} contacts · {hotCount} hot prospects · {optoutCount} opted out
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, intent…"
            style={{ padding: '0.5rem 0.85rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", width: 220, color: '#1a1a1a' }}
          />
          {canCampaign ? (
            <button
              onClick={() => { setCampaignOpen(true); setCampaignResult(null) }}
              disabled={campaignTargets.length === 0}
              style={{ padding: '0.5rem 1rem', background: campaignTargets.length ? '#5e3b87' : '#e8e2f1', color: campaignTargets.length ? 'white' : '#bbb', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: campaignTargets.length ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
            >
              Send Campaign → {filtered.length > 0 && `(${campaignTargets.length})`}
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#aaa', background: '#f7f6f9', border: '1px solid #eee', borderRadius: '8px', padding: '0.5rem 0.85rem' }}>
              Campaigns from Light tier
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem' }}>
        {[['all', `All (${clients.length})`], ['hot', `Hot Prospects (${hotCount})`], ['optout', `Opted Out (${optoutCount})`]].map(([id, label]) => (
          <button key={id} onClick={() => setFilterTab(id)} style={{ padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: filterTab === id ? 600 : 400, background: filterTab === id ? '#5e3b87' : 'white', color: filterTab === id ? 'white' : '#666', border: `1px solid ${filterTab === id ? '#5e3b87' : 'rgba(94,59,135,0.15)'}`, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#aaa', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>Loading clients…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ color: '#bbb', fontSize: '0.875rem', textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '0.5px solid rgba(94,59,135,0.08)' }}>
          {clients.length === 0 ? 'No client data yet — contacts appear here as your AI handles calls.' : 'No contacts match your search.'}
        </div>
      )}

      {/* Client list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.map(c => {
          const av = avatarCol(c.name || c.phone || '')
          const ini = initials(c.name || '')
          const expanded = expandedId === c.caller_id
          const noteDraft = noteDrafts[c.caller_id] ?? c.notes ?? ''
          return (
            <div key={c.caller_id} style={{ background: 'white', border: `0.5px solid ${c.marketing_opted_out ? 'rgba(185,28,28,0.15)' : 'rgba(94,59,135,0.1)'}`, borderRadius: '10px', padding: '0.85rem 1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                {/* Avatar */}
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: av.bg, color: av.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0, fontFamily: "'Syne', sans-serif" }}>
                  {ini || '?'}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>{c.name || 'Unknown'}</span>
                    <span style={{ fontSize: '0.775rem', color: '#999' }}>{c.phone}</span>
                    {c.is_hot_prospect && <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: 700 }}>★ HOT</span>}
                    {c.marketing_opted_out && <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: 600 }}>OPTED OUT</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                    {c.call_count} call{c.call_count !== 1 ? 's' : ''} · Last: {fmtDate(c.last_call)}
                    {c.last_outcome && <span style={{ marginLeft: '0.5rem', color: '#5e3b87' }}>· {OUTCOME_LABEL[c.last_outcome] || c.last_outcome}</span>}
                  </div>
                  {c.last_summary && <div style={{ fontSize: '0.73rem', color: '#aaa', marginTop: '0.2rem', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>{c.last_summary}</div>}
                  {c.marketing_opted_out && (
                    <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '0.3rem', background: '#fff5f5', borderRadius: '4px', padding: '0.2rem 0.5rem', display: 'inline-block' }}>
                      Opted out {c.opted_out_at ? fmtDate(c.opted_out_at) : ''} — excluded from all campaigns
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, alignItems: 'center' }}>
                  <button onClick={() => setExpandedId(expanded ? null : c.caller_id)} title="Notes" style={{ background: expanded ? '#ede8f5' : 'transparent', border: '1px solid rgba(94,59,135,0.15)', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem', color: '#5e3b87' }}>
                    Notes
                  </button>
                  <button onClick={() => toggleHot(c)} title={c.is_hot_prospect ? 'Remove from hot prospects' : 'Mark as hot prospect'} style={{ background: c.is_hot_prospect ? '#fef3c7' : 'transparent', border: '1px solid rgba(240,165,0,0.3)', borderRadius: '6px', padding: '0.3rem 0.45rem', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 }}>
                    ★
                  </button>
                  <button onClick={() => toggleOptOut(c)} title={c.marketing_opted_out ? 'Re-enable marketing' : 'Opt out of campaigns'} style={{ background: c.marketing_opted_out ? '#fee2e2' : 'transparent', border: `1px solid ${c.marketing_opted_out ? 'rgba(185,28,28,0.3)' : 'rgba(94,59,135,0.15)'}`, borderRadius: '6px', padding: '0.3rem 0.45rem', cursor: 'pointer', fontSize: '0.8rem', color: c.marketing_opted_out ? '#b91c1c' : '#999', lineHeight: 1 }}>
                    🚫
                  </button>
                  {!isPreview && (
                    <button onClick={() => deleteClient(c)} title="Delete contact" style={{ background: 'transparent', border: '1px solid rgba(94,59,135,0.1)', borderRadius: '6px', padding: '0.3rem 0.45rem', cursor: 'pointer', fontSize: '0.8rem', color: '#ddd', lineHeight: 1 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#b91c1c'}
                      onMouseLeave={e => e.currentTarget.style.color = '#ddd'}>
                      ✕
                    </button>
                  )}
                </div>
              </div>
              {/* Notes panel */}
              {expanded && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(94,59,135,0.06)' }}>
                  <textarea
                    value={noteDraft}
                    onChange={e => setNoteDrafts(p => ({ ...p, [c.caller_id]: e.target.value }))}
                    placeholder="Private notes — not visible to the AI or caller…"
                    rows={3}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.8rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box', color: '#1a1a1a' }}
                  />
                  <button onClick={() => saveNote(c)} disabled={savingNote === c.caller_id || previewReadOnly} style={{ marginTop: '0.4rem', padding: '0.35rem 0.85rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {savingNote === c.caller_id ? 'Saving…' : 'Save note'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Campaign composer modal */}
      {campaignOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '1.75rem', width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a' }}>Send Campaign</span>
              <button onClick={() => { setCampaignOpen(false); setCampaignResult(null) }} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', background: '#f7f6f9', borderRadius: '8px', padding: '0.65rem 0.85rem', lineHeight: 1.5 }}>
              <strong style={{ color: '#1a1a1a' }}>{campaignTargets.length}</strong> recipients
              {optedOutInFilter > 0 && <span style={{ color: '#b91c1c' }}> · {optedOutInFilter} opted out — excluded automatically</span>}
              {campaignTargets.length > recipientLimit && <span style={{ color: '#f0a500' }}> · capped at {recipientLimit} for your plan</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Message</label>
              <button onClick={aiDraft} disabled={aiDrafting} style={{ fontSize: '0.72rem', color: '#5e3b87', background: '#ede8f5', border: 'none', borderRadius: '6px', padding: '0.25rem 0.65rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                {aiDrafting ? 'Drafting…' : '✦ AI Draft'}
              </button>
            </div>
            <textarea
              value={campaignMsg}
              onChange={e => setCampaignMsg(e.target.value.slice(0, 140))}
              placeholder="Hi [name], we wanted to reach out about…"
              rows={4}
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'none', boxSizing: 'border-box', color: '#1a1a1a', marginBottom: '0.4rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.72rem', color: campaignMsg.length > 120 ? '#f0a500' : '#aaa' }}>{campaignMsg.length} / 140 chars</span>
              <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{Math.ceil((campaignMsg.length + 22) / 160)} SMS segment{Math.ceil((campaignMsg.length + 22) / 160) !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#888', background: '#f7f6f9', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              "Reply STOP to opt out." is appended automatically. Opt-out requests are actioned immediately.
            </div>
            {campaignResult && (
              <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 500, background: campaignResult.ok ? '#e6f5ee' : '#fee2e2', color: campaignResult.ok ? '#1e7a4a' : '#b91c1c' }}>
                {campaignResult.ok ? `✓ Sent to ${campaignResult.sent} contacts${campaignResult.failed ? ` · ${campaignResult.failed} failed` : ''}` : `Failed: ${campaignResult.error}`}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setCampaignOpen(false); setCampaignResult(null) }} style={{ padding: '0.55rem 1.1rem', background: 'white', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.85rem', color: '#666', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button onClick={sendCampaign} disabled={campaignSending || !campaignMsg.trim() || campaignTargets.length === 0} style={{ padding: '0.55rem 1.25rem', background: campaignSending || !campaignMsg.trim() ? '#f5d98a' : '#f0a500', color: '#1a0533', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: campaignSending ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {campaignSending ? 'Sending…' : `Send to ${Math.min(campaignTargets.length, recipientLimit)} contacts →`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientDirectory
