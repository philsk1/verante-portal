import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const FILTERS = ['all', 'tenants', 'calls', 'leads', 'staff', 'partners', 'services']

const TYPE_COLOUR = {
  tenants:  '#5e3b87',
  calls:    '#1d4ed8',
  leads:    '#f0a500',
  staff:    '#3db87a',
  partners: '#e11d48',
  services: '#7c3aed',
}

const TYPE_LABEL = {
  tenants: 'Tenant', calls: 'Call', leads: 'Lead',
  staff: 'Staff', partners: 'Partner', services: 'Service',
}

const fmt = ts => ts ? new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

const IcoSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(94,59,135,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)

const OwnerAudit = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery]       = useState('')
  const [filter, setFilter]     = useState('all')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [counts, setCounts]     = useState({})
  const [error, setError]       = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (user && user.email !== 'finsolsoffice@gmail.com') navigate('/portal', { replace: true })
  }, [user])

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); setCounts({}); setError(null); return }
    setLoading(true)
    setError(null)
    const like = `%${q}%`
    const all  = []

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)

      if (filter === 'all' || filter === 'tenants') {
        const orFilter = isUuid
          ? `business_name.ilike.${like},business_email.ilike.${like},id.eq.${q}`
          : `business_name.ilike.${like},business_email.ilike.${like},business_phone.ilike.${like}`
        const { data } = await supabase.from('tenants')
          .select('id, business_name, business_email, business_phone, subscription_tier, created_at, is_demo, triage_mode, billing_model')
          .or(orFilter).limit(25)
        ;(data || []).forEach(r => all.push({
          type: 'tenants', id: r.id,
          title: r.business_name || '(no name)',
          sub: r.business_email,
          meta: [r.subscription_tier, r.billing_model, r.is_demo ? 'demo' : null].filter(Boolean).join(' · '),
          ts: r.created_at, raw: r, tenantName: r.business_name,
        }))
      }

      if (filter === 'all' || filter === 'calls') {
        const { data } = await supabase.from('call_logs')
          .select('id, tenant_id, created_at, caller_name, caller_phone, call_outcome, duration_seconds, ai_summary, tenants(business_name)')
          .or(`caller_name.ilike.${like},caller_phone.ilike.${like},ai_summary.ilike.${like},call_outcome.ilike.${like}`)
          .order('created_at', { ascending: false }).limit(25)
        ;(data || []).forEach(r => all.push({
          type: 'calls', id: r.id,
          title: r.caller_name || r.caller_phone || 'Unknown caller',
          sub: r.call_outcome,
          meta: r.ai_summary ? r.ai_summary.slice(0, 100) : '',
          ts: r.created_at, raw: r, tenantName: r.tenants?.business_name,
        }))
      }

      if (filter === 'all' || filter === 'leads') {
        const { data } = await supabase.from('leads')
          .select('id, tenant_id, created_at, lead_name, lead_phone, lead_email, status, ai_summary, tenants(business_name)')
          .or(`lead_name.ilike.${like},lead_phone.ilike.${like},lead_email.ilike.${like},ai_summary.ilike.${like}`)
          .order('created_at', { ascending: false }).limit(25)
        ;(data || []).forEach(r => all.push({
          type: 'leads', id: r.id,
          title: r.lead_name || r.lead_phone || 'Unknown',
          sub: [r.lead_email, r.status].filter(Boolean).join(' · '),
          meta: r.ai_summary ? r.ai_summary.slice(0, 100) : '',
          ts: r.created_at, raw: r, tenantName: r.tenants?.business_name,
        }))
      }

      if (filter === 'all' || filter === 'staff') {
        const { data } = await supabase.from('staff_profiles')
          .select('id, tenant_id, created_at, name, role, email, phone, tenants(business_name)')
          .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like},role.ilike.${like}`)
          .limit(25)
        ;(data || []).forEach(r => all.push({
          type: 'staff', id: r.id,
          title: r.name,
          sub: r.role,
          meta: [r.email, r.phone].filter(Boolean).join(' · '),
          ts: r.created_at, raw: r, tenantName: r.tenants?.business_name,
        }))
      }

      if (filter === 'all' || filter === 'partners') {
        const { data } = await supabase.from('referral_partners')
          .select('id, tenant_id, created_at, partner_name, contact_phone, service_type, tenants(business_name)')
          .or(`partner_name.ilike.${like},contact_phone.ilike.${like},service_type.ilike.${like}`)
          .limit(25)
        ;(data || []).forEach(r => all.push({
          type: 'partners', id: r.id,
          title: r.partner_name,
          sub: r.service_type,
          meta: r.contact_phone || '',
          ts: r.created_at, raw: r, tenantName: r.tenants?.business_name,
        }))
      }

      if (filter === 'all' || filter === 'services') {
        const { data } = await supabase.from('catalogue_items')
          .select('id, tenant_id, created_at, name, description, category, sku, item_type, price_from, tenants(business_name)')
          .or(`name.ilike.${like},description.ilike.${like},category.ilike.${like},sku.ilike.${like}`)
          .limit(25)
        ;(data || []).forEach(r => all.push({
          type: 'services', id: r.id,
          title: r.name,
          sub: [r.category, r.item_type].filter(Boolean).join(' · '),
          meta: r.description ? r.description.slice(0, 100) : '',
          ts: r.created_at, raw: r, tenantName: r.tenants?.business_name,
        }))
      }

      all.sort((a, b) => new Date(b.ts) - new Date(a.ts))
      setResults(all)
      const c = { all: all.length }
      FILTERS.slice(1).forEach(t => { c[t] = all.filter(r => r.type === t).length })
      setCounts(c)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, filter, search])

  const visible = filter === 'all' ? results : results.filter(r => r.type === filter)

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ background: '#5e3b87', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, boxShadow: '0 2px 12px rgba(58,32,87,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/owner/select')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: '0.8rem', padding: 0, fontFamily: "'DM Sans', sans-serif" }}
          >
            ← Tenants
          </button>
          <span style={{ color: 'rgba(255,255,255,0.18)' }}>|</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1rem', letterSpacing: '-0.01em' }}>
            Database Audit
          </span>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>{user?.email}</span>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <IcoSearch />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, phone, email, outcome, summary, UUID…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '0.9rem 3rem 0.9rem 2.75rem',
              fontSize: '0.95rem', fontFamily: "'DM Sans', sans-serif",
              border: '1.5px solid rgba(94,59,135,0.18)', borderRadius: 12,
              background: 'white', color: '#1a1a1a', outline: 'none',
              boxShadow: '0 2px 16px rgba(94,59,135,0.08)',
            }}
          />
          {loading && (
            <div style={{
              position: 'absolute', right: '1rem', top: '50%',
              width: 16, height: 16,
              border: '2px solid rgba(94,59,135,0.12)', borderTopColor: '#5e3b87',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            }} />
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
          {FILTERS.map(t => {
            const active = filter === t
            return (
              <button key={t} onClick={() => setFilter(t)} style={{
                padding: '0.28rem 0.75rem', borderRadius: 20,
                border: `1.5px solid ${active ? '#5e3b87' : 'rgba(94,59,135,0.15)'}`,
                background: active ? '#5e3b87' : 'white',
                color: active ? 'white' : '#5e3b87',
                fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", transition: 'all 0.12s',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {counts[t] > 0 && (
                  <span style={{
                    background: active ? 'rgba(255,255,255,0.22)' : 'rgba(94,59,135,0.1)',
                    borderRadius: 10, padding: '0.05rem 0.38rem', fontSize: '0.7rem',
                  }}>
                    {counts[t]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.65rem 1rem', color: '#b91c1c', fontSize: '0.82rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Empty */}
        {query.length >= 2 && !loading && visible.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#bbb', fontSize: '0.875rem' }}>
            No results for "{query}" in {filter}
          </div>
        )}

        {/* Results */}
        {visible.map(r => (
          <div
            key={`${r.type}-${r.id}`}
            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            style={{
              background: 'white', borderRadius: 10,
              border: `0.5px solid ${expanded === r.id ? 'rgba(94,59,135,0.2)' : 'rgba(94,59,135,0.09)'}`,
              marginBottom: '0.55rem', cursor: 'pointer',
              boxShadow: expanded === r.id ? '0 4px 20px rgba(94,59,135,0.1)' : '0 1px 4px rgba(94,59,135,0.04)',
              transition: 'box-shadow 0.15s, border-color 0.15s',
            }}
          >
            {/* Row */}
            <div style={{ padding: '0.7rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{
                flexShrink: 0, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                background: TYPE_COLOUR[r.type] + '1a', color: TYPE_COLOUR[r.type],
                borderRadius: 4, padding: '0.18rem 0.45rem', marginTop: '0.1rem',
              }}>
                {TYPE_LABEL[r.type]}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>{r.title}</span>
                  {r.sub && <span style={{ fontSize: '0.78rem', color: '#999' }}>{r.sub}</span>}
                </div>
                {r.meta && (
                  <div style={{ fontSize: '0.75rem', color: '#bbb', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.meta}
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 90 }}>
                {r.tenantName && r.type !== 'tenants' && (
                  <div style={{ fontSize: '0.7rem', color: '#5e3b87', fontWeight: 500, marginBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                    {r.tenantName}
                  </div>
                )}
                <div style={{ fontSize: '0.67rem', color: '#ccc' }}>{fmt(r.ts)}</div>
              </div>
            </div>

            {/* Expanded */}
            {expanded === r.id && (
              <div style={{ borderTop: '1px solid rgba(94,59,135,0.07)', padding: '0.85rem 1rem', background: '#faf9fd', borderRadius: '0 0 10px 10px' }}>
                <pre style={{
                  margin: 0, fontSize: '0.72rem', color: '#555', lineHeight: 1.8,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  fontFamily: 'Consolas, Monaco, monospace',
                }}>
                  {JSON.stringify(r.raw, null, 2)}
                </pre>
                <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Copy ID', text: r.id },
                    { label: 'Copy JSON', text: JSON.stringify(r.raw, null, 2) },
                    { label: 'Copy tenant_id', text: r.raw.tenant_id || r.raw.id, hidden: !r.raw.tenant_id && r.type === 'tenants' },
                  ].filter(a => !a.hidden).map(a => (
                    <button
                      key={a.label}
                      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(a.text) }}
                      style={{
                        fontSize: '0.72rem', padding: '0.28rem 0.7rem',
                        border: '1px solid rgba(94,59,135,0.18)', borderRadius: 6,
                        background: 'white', color: '#5e3b87', cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(94,59,135,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {query.length < 2 && (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(94,59,135,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5e3b87" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.4rem' }}>Type 2+ characters to search</div>
            <div style={{ fontSize: '0.78rem', color: '#ccc' }}>Searches tenants · calls · leads · staff · partners · services</div>
            <div style={{ fontSize: '0.72rem', color: '#ddd', marginTop: '0.3rem' }}>UUID search supported — paste any record ID directly</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OwnerAudit
