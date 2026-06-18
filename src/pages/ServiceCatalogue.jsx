import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'

const SERVICE_LIMIT = { free: 5, light: 20, standard: 60, professional: 200, enterprise: Infinity, bespoke: Infinity }
const lim = (tier) => SERVICE_LIMIT[tier] ?? 20

const fmtPrice = (from, to) => {
  if (!from && !to) return '—'
  if (from && to && from !== to) return `£${from}–£${to}`
  return `£${from || to}`
}

const ServiceCatalogue = () => {
  const { user } = useAuth()
  const preview = usePreview()
  const isPreview = !!preview?.isPreview
  const previewReadOnly = preview?.previewReadOnly ?? isPreview

  const [tenantId, setTenantId] = useState(null)
  const [tier, setTier] = useState('light')
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', description: '', price_from: '', price_to: '', duration_minutes: '' })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [notesDrafts, setNotesDrafts] = useState({})
  const [savingNote, setSavingNote] = useState(null)
  const [toast, setToast] = useState(null)

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
      const { data } = await supabase.from('catalogue_items').select('*').eq('tenant_id', tid).eq('item_type', 'service').eq('active', true).order('name')
      setItems(data || [])
      setLoading(false)
    }
    load()
  }, [user, isPreview])

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(i => (i.name || '').toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q))
  }, [items, search])

  const limit = lim(tier)
  const atLimit = items.length >= limit
  const pct = Math.min(100, Math.round((items.length / (limit === Infinity ? items.length || 1 : limit)) * 100))

  const addItem = async () => {
    if (previewReadOnly || !tenantId || !draft.name.trim() || atLimit) return
    setSaving(true)
    const { data, error } = await supabase.from('catalogue_items').insert({
      tenant_id: tenantId,
      item_type: 'service',
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      price_from: draft.price_from ? parseFloat(draft.price_from) : null,
      price_to: draft.price_to ? parseFloat(draft.price_to) : null,
      duration_minutes: draft.duration_minutes ? parseInt(draft.duration_minutes) : null,
      active: true,
    }).select().maybeSingle()
    setSaving(false)
    if (!error && data) {
      setItems(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setDraft({ name: '', description: '', price_from: '', price_to: '', duration_minutes: '' })
      setAddOpen(false)
      showToast('Service added.')
      window.dispatchEvent(new Event('qscore-refresh'))
    } else {
      showToast(error?.message || 'Could not save', 'error')
    }
  }

  const deleteItem = async (id) => {
    if (previewReadOnly) return
    await supabase.from('catalogue_items').update({ active: false }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    window.dispatchEvent(new Event('qscore-refresh'))
  }

  const saveNote = async (item) => {
    if (previewReadOnly) return
    setSavingNote(item.id)
    const note = notesDrafts[item.id] ?? item.internal_notes ?? ''
    await supabase.from('catalogue_items').update({ internal_notes: note || null }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, internal_notes: note || null } : i))
    setSavingNote(null)
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div data-help-score={items.length === 0 ? 20 : items.length < 3 ? 65 : 95} style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.375rem', color: '#1a1a1a', margin: '0 0 0.2rem' }}>Services</h1>
          <p style={{ color: '#888', fontSize: '0.78rem', margin: 0 }}>AI reads your services on every call. Duration and price help it answer questions confidently.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services…" style={{ padding: '0.5rem 0.85rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", width: 190, color: '#1a1a1a' }} />
          <button onClick={() => setAddOpen(o => !o)} disabled={atLimit || previewReadOnly} style={{ padding: '0.5rem 1rem', background: atLimit ? '#f5d98a' : '#f0a500', color: '#1a0533', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: atLimit ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
            + Add Service
          </button>
        </div>
      </div>

      {/* Quota bar */}
      {limit !== Infinity && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ height: 4, background: '#f3f1f6', borderRadius: 2, overflow: 'hidden', marginBottom: '0.3rem' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: atLimit ? '#f0a500' : '#5e3b87', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: '0.72rem', color: '#aaa' }}>
            {items.length} of {limit} services ({tier})
            {atLimit && <span style={{ color: '#f0a500', fontWeight: 600, marginLeft: '0.5rem' }}>— upgrade to add more</span>}
          </span>
        </div>
      )}

      {/* Add form */}
      {addOpen && (
        <div style={{ background: '#f7f6f9', borderRadius: '10px', padding: '1.1rem', marginBottom: '1rem', border: '1px solid rgba(94,59,135,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Service name *</label>
              <input value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Cut & Blow Dry" style={{ width: '100%', padding: '0.5rem 0.7rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '7px', fontSize: '0.85rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', color: '#1a1a1a' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Duration (min)</label>
              <input type="number" value={draft.duration_minutes} onChange={e => setDraft(p => ({ ...p, duration_minutes: e.target.value }))} placeholder="60" style={{ width: '100%', padding: '0.5rem 0.7rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '7px', fontSize: '0.85rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', color: '#1a1a1a' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Price from (£)</label>
              <input type="number" value={draft.price_from} onChange={e => setDraft(p => ({ ...p, price_from: e.target.value }))} placeholder="45" style={{ width: '100%', padding: '0.5rem 0.7rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '7px', fontSize: '0.85rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', color: '#1a1a1a' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Price to (£)</label>
              <input type="number" value={draft.price_to} onChange={e => setDraft(p => ({ ...p, price_to: e.target.value }))} placeholder="55" style={{ width: '100%', padding: '0.5rem 0.7rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '7px', fontSize: '0.85rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', color: '#1a1a1a' }} />
            </div>
          </div>
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Description (AI reads this)</label>
            <input value={draft.description} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} placeholder="Brief description for the AI to quote on calls…" style={{ width: '100%', padding: '0.5rem 0.7rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '7px', fontSize: '0.85rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', color: '#1a1a1a' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={addItem} disabled={!draft.name.trim() || saving} style={{ padding: '0.5rem 1.1rem', background: draft.name.trim() ? '#f0a500' : '#f5d98a', color: '#1a0533', border: 'none', borderRadius: '7px', fontSize: '0.82rem', fontWeight: 600, cursor: draft.name.trim() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif" }}>
              {saving ? 'Saving…' : 'Save service'}
            </button>
            <button onClick={() => setAddOpen(false)} style={{ padding: '0.5rem 0.85rem', background: 'white', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '7px', fontSize: '0.82rem', color: '#666', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ marginBottom: '0.75rem', padding: '0.55rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 500, background: toast.type === 'error' ? '#fee2e2' : '#e6f5ee', color: toast.type === 'error' ? '#b91c1c' : '#1e7a4a' }}>
          {toast.msg}
        </div>
      )}

      {loading && <div style={{ color: '#aaa', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ color: '#bbb', fontSize: '0.875rem', textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '0.5px solid rgba(94,59,135,0.08)' }}>
          {items.length === 0 ? 'No services yet — add your first service above.' : 'No services match your search.'}
        </div>
      )}

      {/* Service list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {filtered.map(item => {
          const expanded = expandedId === item.id
          const noteDraft = notesDrafts[item.id] ?? item.internal_notes ?? ''
          return (
            <div key={item.id} style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.1)', borderRadius: '10px', padding: '0.85rem 1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>{item.name}</div>
                  {item.description && <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.15rem', lineHeight: 1.4 }}>{item.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexShrink: 0 }}>
                  {item.duration_minutes && <span style={{ fontSize: '0.78rem', color: '#5e3b87', background: '#f0ebf8', borderRadius: '4px', padding: '0.15rem 0.5rem' }}>{item.duration_minutes} min</span>}
                  <span style={{ fontSize: '0.85rem', fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#1a1a1a' }}>{fmtPrice(item.price_from, item.price_to)}</span>
                  <button onClick={() => setExpandedId(expanded ? null : item.id)} style={{ background: expanded ? '#ede8f5' : 'transparent', border: '1px solid rgba(94,59,135,0.15)', borderRadius: '6px', padding: '0.25rem 0.55rem', cursor: 'pointer', fontSize: '0.7rem', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif" }}>Notes</button>
                  {!previewReadOnly && (
                    <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: '1rem', lineHeight: 1, padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#b91c1c'}
                      onMouseLeave={e => e.currentTarget.style.color = '#ddd'}>✕</button>
                  )}
                </div>
              </div>
              {expanded && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(94,59,135,0.06)' }}>
                  <textarea
                    value={noteDraft}
                    onChange={e => setNotesDrafts(p => ({ ...p, [item.id]: e.target.value }))}
                    placeholder="Internal notes — not visible to AI or callers…"
                    rows={2}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.8rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box', color: '#1a1a1a' }}
                  />
                  <button onClick={() => saveNote(item)} disabled={savingNote === item.id || previewReadOnly} style={{ marginTop: '0.35rem', padding: '0.3rem 0.75rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {savingNote === item.id ? 'Saving…' : 'Save note'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ServiceCatalogue
