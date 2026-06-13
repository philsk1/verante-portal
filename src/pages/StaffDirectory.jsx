import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'

const AVATAR_PALETTE = [
  { bg: '#f0ebf8', text: '#5e3b87' },
  { bg: '#e6f5ee', text: '#1e7a4a' },
  { bg: '#eff6ff', text: '#1d4ed8' },
  { bg: '#fef3d0', text: '#92610a' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#e0f2fe', text: '#0284c7' },
  { bg: '#fef9c3', text: '#ca8a04' },
]
const avatarColour = (name = '') => AVATAR_PALETTE[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTE.length]
const initials = (name = '') => name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

const STAFF_LIMIT = { free: 1, light: 3, standard: 8, professional: 15, enterprise: Infinity, bespoke: Infinity }
const TIER_LABEL = { free: 'Free', light: 'Light', standard: 'Standard', professional: 'Professional', enterprise: 'Enterprise', bespoke: 'Bespoke' }

const EMPTY_MEMBER = { name: '', role: '', phone: '', email: '', address: '', birthday: '', specialist_services: [], direct_line_did: '', private_notes: '', active: true }

const normaliseSpecs = (val) =>
  Array.isArray(val) ? val : (val ? String(val).split(',').map(s => s.trim()).filter(Boolean) : [])

export default function StaffDirectory({ onNavigate, openAdd, onOpenAddConsumed, tier = 'light' }) {
  const { user } = useAuth()
  const preview = usePreview()
  const isPreview = !!preview?.isPreview
  const previewReadOnly = preview?.previewReadOnly ?? isPreview

  const [tenantId, setTenantId]       = useState(null)
  const [staff, setStaff]             = useState([])
  const [catalogueItems, setCatalogueItems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [uncontactedLeads, setUncontactedLeads] = useState(0)
  const [staffCallCounts, setStaffCallCounts]   = useState({})
  const [selected, setSelected] = useState(null) // id of open profile
  const [draft, setDraft]       = useState(null) // edited copy
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [adding, setAdding]     = useState(false)
  const [addDraft, setAddDraft] = useState(EMPTY_MEMBER)
  const [addSaving, setAddSaving] = useState(false)
  const [editingSkills, setEditingSkills] = useState(false)

  const staffLimit = STAFF_LIMIT[tier] ?? Infinity
  const atLimit = staff.length >= staffLimit

  useEffect(() => {
    if (!openAdd || isPreview || atLimit) return
    setAdding(true)
    setSelected(null)
    onOpenAddConsumed?.()
  }, [openAdd, atLimit])

  useEffect(() => {
    if (!user && !isPreview) return
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
        const [staffRes, catRes] = await Promise.all([
          supabase.from('staff_profiles')
            .select('id, name, role, phone, email, address, birthday, specialist_services, direct_line_did, private_notes, active, colour')
            .eq('tenant_id', tid).order('name'),
          supabase.from('catalogue_items')
            .select('id, name, category').eq('tenant_id', tid).eq('active', true).order('name'),
        ])
        const data = staffRes.data
        setStaff((data || []).map(s => ({ ...s, specialist_services: normaliseSpecs(s.specialist_services) })))
        setCatalogueItems(catRes.data || [])

        // Cross-tab: uncontacted leads count
        const { count: lc } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).or('status.is.null,status.eq.new')
        setUncontactedLeads(lc || 0)

        // Cross-tab: name mentions in recent AI summaries (last 30 days)
        const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)
        const { data: recentCalls } = await supabase.from('call_logs').select('ai_summary').eq('tenant_id', tid).gte('created_at', monthAgo.toISOString()).not('ai_summary', 'is', null)
        const summaries = (recentCalls || []).map(c => (c.ai_summary || '').toLowerCase())
        const counts = {}
        ;(data || []).forEach(member => {
          if (!member.name) return
          const firstName = member.name.trim().split(' ')[0].toLowerCase()
          if (firstName.length < 3) return
          counts[member.id] = summaries.filter(s => s.includes(firstName)).length
        })
        setStaffCallCounts(counts)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isPreview])

  const openProfile = (member) => {
    setSelected(member.id)
    setDraft({ ...member })
    setAdding(false)
    setEditingSkills(false)
  }

  const closeProfile = () => { setSelected(null); setDraft(null) }

  const saveProfile = async () => {
    if (previewReadOnly || !draft || !tenantId) return
    setSaving(true)
    const { id, ...fields } = draft
    await supabase.from('staff_profiles').update({
      name: fields.name,
      role: fields.role || null,
      phone: fields.phone || null,
      email: fields.email || null,
      address: fields.address || null,
      birthday: fields.birthday || null,
      specialist_services: Array.isArray(fields.specialist_services) && fields.specialist_services.length > 0 ? fields.specialist_services : null,
      direct_line_did: fields.direct_line_did || null,
      private_notes: fields.private_notes || null,
      active: fields.active,
    }).eq('id', id)
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleActive = async (member) => {
    if (previewReadOnly) return
    await supabase.from('staff_profiles').update({ active: !member.active }).eq('id', member.id)
    setStaff(prev => prev.map(s => s.id === member.id ? { ...s, active: !s.active } : s))
    if (draft?.id === member.id) setDraft(d => ({ ...d, active: !d.active }))
  }

  const removeStaff = async (id) => {
    if (previewReadOnly || !window.confirm('Remove this team member?')) return
    await supabase.from('staff_profiles').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
    if (selected === id) closeProfile()
  }

  const addMember = async () => {
    if (previewReadOnly || !addDraft.name.trim() || !tenantId || atLimit) return
    setAddSaving(true)
    const { data, error } = await supabase.from('staff_profiles').insert({
      tenant_id: tenantId,
      name: addDraft.name.trim(),
      role: addDraft.role.trim() || null,
      phone: addDraft.phone.trim() || null,
      email: addDraft.email.trim() || null,
      active: true,
    }).select().maybeSingle()
    setAddSaving(false)
    if (!error && data) {
      setStaff(prev => [...prev, data])
      setAddDraft(EMPTY_MEMBER)
      setAdding(false)
      openProfile(data)
    }
  }

  const inp = (style = {}) => ({
    width: '100%', boxSizing: 'border-box',
    padding: '0.55rem 0.75rem',
    border: '1.5px solid rgba(94,59,135,0.15)',
    borderRadius: 8, fontSize: '0.875rem',
    fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a', background: 'white', outline: 'none',
    ...style,
  })

  const lbl = (text, required) => (
    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem', fontFamily: "'DM Sans', sans-serif" }}>
      {text}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
  )

  const field = (key, label, opts = {}) => (
    <div style={{ marginBottom: '0.9rem' }}>
      {lbl(label, opts.required)}
      {opts.textarea ? (
        <textarea value={draft[key] || ''} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
          rows={opts.rows || 3} placeholder={opts.placeholder || ''}
          autoComplete="off" data-1p-ignore="true" data-lpignore="true"
          style={{ ...inp(), resize: 'vertical', lineHeight: 1.5 }} />
      ) : (
        <input type={opts.type || 'text'} value={draft[key] || ''} placeholder={opts.placeholder || ''}
          onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
          autoComplete="off" data-1p-ignore="true" data-lpignore="true"
          style={inp()} />
      )}
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#aaa', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
      Loading team…
    </div>
  )

  return (
    <div data-help="Your team directory — full profiles, contact details, skills and private notes. Click any card to view or edit.">

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.1rem' }}>Team</h2>
          <div style={{ fontSize: '0.78rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>
            {staff.length}{staffLimit !== Infinity ? `/${staffLimit}` : ''} member{staff.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {uncontactedLeads > 0 && onNavigate && (
            <button
              onClick={() => onNavigate('dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fffbeb', border: '1px solid rgba(240,165,0,0.35)', borderLeft: '4px solid #f0a500', borderRadius: 10, padding: '0.5rem 0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.8rem', color: '#78460a' }}>
                {uncontactedLeads} lead{uncontactedLeads !== 1 ? 's' : ''} waiting for follow-up
              </span>
              <span style={{ fontSize: '0.72rem', color: '#b07a00', fontFamily: "'DM Sans', sans-serif" }}>→</span>
            </button>
          )}
          {!isPreview && (
            atLimit ? (
              <button
                onClick={() => onNavigate && onNavigate('settings')}
                style={{ padding: '0.45rem 1rem', background: '#f0ebf8', color: '#5e3b87', border: '1.5px solid rgba(94,59,135,0.25)', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                Upgrade to add more
              </button>
            ) : (
              <button onClick={() => { setAdding(true); closeProfile() }}
                style={{ padding: '0.45rem 1rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                + Add member
              </button>
            )
          )}
        </div>
      </div>

      {atLimit && !isPreview && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.65rem 1rem', background: '#f0ebf8', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔒</span>
            <span style={{ fontSize: '0.8rem', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
              <strong style={{ fontWeight: 700 }}>Team limit reached</strong>
              {staffLimit !== Infinity && ` — your ${TIER_LABEL[tier] || tier} plan includes up to ${staffLimit} team member${staffLimit !== 1 ? 's' : ''}.`}
            </span>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('settings')}
            style={{ padding: '0.35rem 0.85rem', background: '#5e3b87', color: 'white', border: 'none', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
            Upgrade plan →
          </button>
        </div>
      )}


      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

        {/* ── Staff list (left column) ─────────────────────────────────────── */}
        <div style={{ width: 260, flexShrink: 0 }}>
          {staff.length === 0 && !adding ? (
            <div
              onClick={!isPreview ? () => setAdding(true) : undefined}
              style={{ background: 'white', borderRadius: 14, border: '1.5px dashed rgba(94,59,135,0.18)', padding: '2rem 1.25rem', textAlign: 'center', cursor: !isPreview ? 'pointer' : 'default', transition: 'border-color 0.15s, background 0.15s' }}
              onMouseEnter={e => { if (!isPreview) { e.currentTarget.style.borderColor = '#5e3b87'; e.currentTarget.style.background = '#faf9fc' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(94,59,135,0.18)'; e.currentTarget.style.background = 'white' }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '0.65rem' }}>👥</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>No team members yet</div>
              <div style={{ fontSize: '0.78rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginBottom: !isPreview ? '1rem' : 0, lineHeight: 1.5 }}>Add your first team member to enable staff routing and calendar column view.</div>
              {!isPreview && (
                <button onClick={e => { e.stopPropagation(); setAdding(true) }} style={{ padding: '0.45rem 1.1rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  + Add first member
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {staff.map(member => {
                const av = avatarColour(member.name)
                const isSelected = selected === member.id
                return (
                  <div key={member.id} onClick={() => openProfile(member)}
                    style={{ background: isSelected ? '#f0ebf8' : 'white', borderRadius: 10, border: `1.5px solid ${isSelected ? '#5e3b87' : 'rgba(94,59,135,0.1)'}`, padding: '0.65rem 0.85rem', cursor: 'pointer', transition: 'all 0.15s', opacity: member.active === false ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: av.bg, color: av.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', flexShrink: 0, position: 'relative' }}>
                        {initials(member.name)}
                        <span style={{ position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: member.active === false ? '#d1d5db' : '#3db87a', border: '2px solid white' }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
                        {member.role && <div style={{ fontSize: '0.72rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.role}</div>}
                      </div>
                      {staffCallCounts[member.id] > 0 && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#5e3b87', background: '#f0ebf8', borderRadius: 4, padding: '0.1rem 0.3rem', flexShrink: 0 }}>{staffCallCounts[member.id]}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add member quick form */}
          {adding && (
            <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #5e3b87', padding: '1.25rem', marginTop: '0.75rem' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: '#5e3b87', marginBottom: '0.85rem' }}>New team member</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                {[
                  { key: 'name',  label: 'Full name *', placeholder: 'e.g. Sarah Jones' },
                  { key: 'role',  label: 'Role / title', placeholder: 'e.g. Senior Stylist' },
                  { key: 'phone', label: 'Phone',       placeholder: '07700 000000',     type: 'tel' },
                  { key: 'email', label: 'Email',       placeholder: 'sarah@example.com', type: 'email' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem', fontFamily: "'DM Sans', sans-serif" }}>{f.label}</label>
                    <input type={f.type || 'text'} value={addDraft[f.key]} onChange={e => setAddDraft(d => ({ ...d, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      autoComplete="off" data-1p-ignore="true" data-lpignore="true"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.65rem', border: '1.5px solid rgba(94,59,135,0.15)', borderRadius: 8, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', outline: 'none' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={addMember} disabled={addSaving || !addDraft.name.trim()}
                  style={{ padding: '0.5rem 1.1rem', background: !addDraft.name.trim() ? '#f5d98a' : '#f0a500', color: !addDraft.name.trim() ? '#7a5c1a' : '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: !addDraft.name.trim() ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {addSaving ? 'Adding…' : 'Add member'}
                </button>
                <button onClick={() => { setAdding(false); setAddDraft(EMPTY_MEMBER) }}
                  style={{ padding: '0.5rem 0.9rem', background: 'white', color: '#888', border: '1px solid rgba(94,59,135,0.15)', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Profile detail panel ────────────────────────────────────────── */}
        {!draft ? (
          <div style={{ flex: 1, minWidth: 0, background: 'white', borderRadius: 14, border: '0.5px solid rgba(94,59,135,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center', color: '#ccc' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>←</div>
              <div style={{ fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif" }}>Select a team member</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0, background: 'white', borderRadius: 14, border: '0.5px solid rgba(94,59,135,0.1)', boxShadow: '0 4px 24px rgba(94,59,135,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Panel header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(94,59,135,0.07)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
              {(() => { const av = avatarColour(draft.name); return (
                <div style={{ width: 44, height: 44, borderRadius: 11, background: av.bg, color: av.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                  {initials(draft.name)}
                </div>
              ) })()}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.name || 'Team member'}</div>
                <div style={{ fontSize: '0.75rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{draft.role || 'No role set'}</div>
              </div>
              {/* Active toggle — right side of header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: draft.active !== false ? '#3db87a' : '#bbb', fontFamily: "'DM Sans', sans-serif" }}>
                  {draft.active !== false ? 'Available' : 'Offline'}
                </span>
                <button onClick={() => toggleActive(draft)}
                  style={{ width: 38, height: 22, borderRadius: 11, border: 'none', background: draft.active !== false ? '#5e3b87' : '#e8e0f0', cursor: 'pointer', position: 'relative', transition: 'background 0.18s', flexShrink: 0, padding: 0 }}>
                  <span style={{ position: 'absolute', top: 2, left: draft.active !== false ? 18 : 2, width: 18, height: 18, borderRadius: 9, background: 'white', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                </button>
              </div>
              <button onClick={closeProfile} style={{ background: 'none', border: 'none', color: '#ccc', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1, padding: '0 2px', marginLeft: '0.25rem' }}>×</button>
            </div>

            {/* DID offline warning */}
            {draft.active !== false && draft.direct_line_did && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', margin: '0 0 0', padding: '0.5rem 0.75rem', background: '#fffbeb', borderBottom: '1px solid rgba(240,165,0,0.3)', fontSize: '0.75rem', color: '#78460a', lineHeight: 1.45 }}>
                <span style={{ flexShrink: 0 }}>⚠</span>
                <span>This team member has a direct line configured. Setting them offline will affect how your AI routes calls to them.</span>
              </div>
            )}

            {/* Panel body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
              {/* Contact section */}
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.65rem', fontFamily: "'DM Sans', sans-serif" }}>Contact</div>
              {/* Name + role side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.9rem' }}>
                <div>
                  {lbl('Full name', true)}
                  <input type="text" value={draft.name || ''} placeholder="e.g. Sandra Swift"
                    onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                    autoComplete="off" data-1p-ignore="true" data-lpignore="true" style={inp()} />
                </div>
                <div>
                  {lbl('Role / title')}
                  <input type="text" value={draft.role || ''} placeholder="e.g. Office & Accounts"
                    onChange={e => setDraft(d => ({ ...d, role: e.target.value }))}
                    autoComplete="off" data-1p-ignore="true" data-lpignore="true" style={inp()} />
                </div>
              </div>
              {field('email', 'Email address', { type: 'email', placeholder: 'name@example.com' })}
              {field('address', 'Home address', { placeholder: 'Street, City, Postcode' })}

              {/* Professional section */}
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0.85rem 0 0.65rem', fontFamily: "'DM Sans', sans-serif" }}>Professional</div>

              {/* Direct line + mobile side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.9rem' }}>
                <div>
                  {lbl('Direct line DID')}
                  <input type="tel" value={draft.direct_line_did || ''} placeholder="020 7946 0001"
                    onChange={e => setDraft(d => ({ ...d, direct_line_did: e.target.value }))}
                    autoComplete="off" data-1p-ignore="true" data-lpignore="true" style={inp()} />
                </div>
                <div>
                  {lbl('Direct mobile')}
                  <input type="tel" value={draft.phone || ''} placeholder="07700 000000"
                    onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
                    autoComplete="off" data-1p-ignore="true" data-lpignore="true" style={inp()} />
                </div>
              </div>

              {/* Specialist skills */}
              <div style={{ marginBottom: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  {lbl('Specialist services / skills')}
                  {!isPreview && !editingSkills && (
                    <button onClick={() => setEditingSkills(true)}
                      style={{ fontSize: '0.72rem', fontWeight: 600, color: '#5e3b87', background: '#f0ebf8', border: 'none', borderRadius: 6, padding: '0.2rem 0.55rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.3rem' }}>
                      Edit
                    </button>
                  )}
                </div>

                {/* Assigned chips (always visible) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: (draft.specialist_services || []).length > 0 ? '0.4rem' : 0 }}>
                  {(draft.specialist_services || []).map(tag => {
                    const isCatalogue = catalogueItems.some(c => c.name === tag)
                    return (
                      <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0.22rem 0.55rem', borderRadius: 20, background: isCatalogue ? '#f0ebf8' : '#e6f5ee', color: isCatalogue ? '#5e3b87' : '#1e7a4a', fontSize: '0.73rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                        {tag}
                        {!isPreview && (
                          <button onClick={() => setDraft(d => ({ ...d, specialist_services: (d.specialist_services || []).filter(s => s !== tag) }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '0.9rem', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', marginLeft: 1 }}>×</button>
                        )}
                      </span>
                    )
                  })}
                  {(draft.specialist_services || []).length === 0 && !editingSkills && (
                    <span style={{ fontSize: '0.78rem', color: '#ccc', fontFamily: "'DM Sans', sans-serif" }}>None assigned</span>
                  )}
                </div>

                {/* Edit panel */}
                {editingSkills && (
                  <div style={{ background: '#faf9fc', borderRadius: 10, padding: '0.85rem', border: '1px solid rgba(94,59,135,0.12)', marginTop: '0.35rem' }}>
                    {catalogueItems.length > 0 ? (
                      <>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>Add service</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.65rem' }}>
                          {catalogueItems.filter(c => !(draft.specialist_services || []).includes(c.name)).map(item => (
                            <button key={item.id} onClick={() => setDraft(d => ({ ...d, specialist_services: [...(d.specialist_services || []), item.name] }))}
                              style={{ padding: '0.22rem 0.6rem', borderRadius: 20, border: '1.5px dashed rgba(94,59,135,0.3)', background: 'white', color: '#5e3b87', fontSize: '0.73rem', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', fontWeight: 500 }}>
                              + {item.name}
                            </button>
                          ))}
                          {catalogueItems.every(c => (draft.specialist_services || []).includes(c.name)) && (
                            <span style={{ fontSize: '0.75rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>All catalogue services assigned</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ marginBottom: '0.65rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.4rem' }}>No services in catalogue yet.</div>
                        <button onClick={() => onNavigate && onNavigate('profile')}
                          style={{ padding: '0.25rem 0.65rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 5, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                          → Add services in Business Profile
                        </button>
                      </div>
                    )}
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem', fontFamily: "'DM Sans', sans-serif" }}>Custom skill</div>
                    <input type="text" placeholder="Type a skill and press Enter"
                      style={{ ...inp({ fontSize: '0.78rem', marginBottom: '0.65rem' }) }}
                      onKeyDown={e => {
                        if (e.key !== 'Enter') return
                        const val = e.target.value.trim()
                        if (!val) return
                        setDraft(d => {
                          const curr = d.specialist_services || []
                          if (curr.includes(val)) return d
                          return { ...d, specialist_services: [...curr, val] }
                        })
                        e.target.value = ''
                        e.preventDefault()
                      }}
                    />
                    <button onClick={() => setEditingSkills(false)}
                      style={{ padding: '0.35rem 0.85rem', background: '#5e3b87', color: 'white', border: 'none', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      Done
                    </button>
                  </div>
                )}
              </div>

              {/* Private notes */}
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0.85rem 0 0.65rem', fontFamily: "'DM Sans', sans-serif" }}>Private notes</div>
              {field('private_notes', 'Notes (not shared)', { textarea: true, rows: 3, placeholder: 'Allergies, preferences, contract details…' })}
            </div>

            {/* Panel footer */}
            <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid rgba(94,59,135,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <button onClick={() => removeStaff(draft.id)}
                style={{ padding: '0.4rem 0.75rem', background: 'white', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, fontSize: '0.78rem', color: '#ef4444', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Remove
              </button>
              <button onClick={saveProfile} disabled={saving || previewReadOnly || !draft.name.trim()}
                style={{ padding: '0.4rem 1rem', background: saved ? '#3db87a' : (saving ? '#f5d98a' : '#f0a500'), color: saved ? 'white' : '#1a0533', border: 'none', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
