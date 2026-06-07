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

const EMPTY_MEMBER = { name: '', role: '', phone: '', email: '', address: '', birthday: '', specialist_services: '', direct_line_did: '', private_notes: '', active: true }

export default function StaffDirectory() {
  const { user } = useAuth()
  const preview = usePreview()
  const isDemo = !!preview?.isDemo
  const isPreview = !!preview?.isPreview

  const [tenantId, setTenantId] = useState(null)
  const [staff, setStaff]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null) // id of open profile
  const [draft, setDraft]       = useState(null) // edited copy
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [adding, setAdding]     = useState(false)
  const [addDraft, setAddDraft] = useState(EMPTY_MEMBER)
  const [addSaving, setAddSaving] = useState(false)

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
        const { data } = await supabase.from('staff_profiles')
          .select('id, name, role, phone, email, address, birthday, specialist_services, direct_line_did, private_notes, active, colour')
          .eq('tenant_id', tid).order('name')
        setStaff(data || [])
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
  }

  const closeProfile = () => { setSelected(null); setDraft(null) }

  const saveProfile = async () => {
    if (isDemo || isPreview || !draft || !tenantId) return
    setSaving(true)
    const { id, ...fields } = draft
    await supabase.from('staff_profiles').update({
      name: fields.name,
      role: fields.role || null,
      phone: fields.phone || null,
      email: fields.email || null,
      address: fields.address || null,
      birthday: fields.birthday || null,
      specialist_services: fields.specialist_services || null,
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
    if (isDemo || isPreview) return
    await supabase.from('staff_profiles').update({ active: !member.active }).eq('id', member.id)
    setStaff(prev => prev.map(s => s.id === member.id ? { ...s, active: !s.active } : s))
    if (draft?.id === member.id) setDraft(d => ({ ...d, active: !d.active }))
  }

  const removeStaff = async (id) => {
    if (isDemo || isPreview || !window.confirm('Remove this team member?')) return
    await supabase.from('staff_profiles').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
    if (selected === id) closeProfile()
  }

  const addMember = async () => {
    if (isDemo || isPreview || !addDraft.name.trim() || !tenantId) return
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
          style={{ ...inp(), resize: 'vertical', lineHeight: 1.5 }} />
      ) : (
        <input type={opts.type || 'text'} value={draft[key] || ''} placeholder={opts.placeholder || ''}
          onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.1rem' }}>Team</h2>
          <div style={{ fontSize: '0.78rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{staff.length} member{staff.length !== 1 ? 's' : ''}</div>
        </div>
        {!isDemo && !isPreview && (
          <button onClick={() => { setAdding(true); closeProfile() }}
            style={{ padding: '0.45rem 1rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            + Add member
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

        {/* ── Staff card grid ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {staff.length === 0 && !adding ? (
            <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid rgba(94,59,135,0.1)', padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👥</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>No team members yet</div>
              <div style={{ fontSize: '0.82rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginBottom: '1rem' }}>Add your first team member to enable staff routing and column calendar view.</div>
              {!isDemo && !isPreview && (
                <button onClick={() => setAdding(true)} style={{ padding: '0.5rem 1.25rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Add first member
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {staff.map(member => {
                const av = avatarColour(member.name)
                const isSelected = selected === member.id
                return (
                  <div key={member.id} onClick={() => openProfile(member)}
                    style={{ background: 'white', borderRadius: 12, border: `1.5px solid ${isSelected ? '#5e3b87' : 'rgba(94,59,135,0.1)'}`, padding: '1rem', cursor: 'pointer', transition: 'all 0.15s', opacity: member.active === false ? 0.5 : 1, boxShadow: isSelected ? '0 0 0 3px rgba(94,59,135,0.12)' : '0 2px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: av.bg, color: av.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, position: 'relative' }}>
                        {initials(member.name)}
                        <span style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: member.active === false ? '#d1d5db' : '#3db87a', border: '2px solid white' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
                        {member.role && <div style={{ fontSize: '0.75rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.role}</div>}
                      </div>
                    </div>
                    {member.specialist_services && (
                      <div style={{ fontSize: '0.7rem', background: av.bg, color: av.text, borderRadius: 5, padding: '0.15rem 0.4rem', display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.specialist_services}</div>
                    )}
                    {member.phone && <div style={{ fontSize: '0.72rem', color: '#bbb', marginTop: '0.35rem' }}>{member.phone}</div>}
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
        {draft && (
          <div style={{ width: 320, flexShrink: 0, background: 'white', borderRadius: 14, border: '0.5px solid rgba(94,59,135,0.1)', boxShadow: '0 4px 24px rgba(94,59,135,0.1)', display: 'flex', flexDirection: 'column', maxHeight: 780, overflow: 'hidden' }}>
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
              <button onClick={closeProfile} style={{ background: 'none', border: 'none', color: '#ccc', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>

            {/* Panel body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', padding: '0.6rem 0.85rem', background: '#faf9fc', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>Active</div>
                  <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{draft.active !== false ? 'Available for bookings' : 'Not taking bookings'}</div>
                </div>
                <button onClick={() => toggleActive(draft)}
                  style={{ width: 42, height: 24, borderRadius: 12, border: 'none', background: draft.active !== false ? '#5e3b87' : '#e8e0f0', cursor: 'pointer', position: 'relative', transition: 'background 0.18s', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: 3, left: draft.active !== false ? 20 : 3, width: 18, height: 18, borderRadius: 9, background: 'white', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                </button>
              </div>

              {/* Contact section */}
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.65rem', fontFamily: "'DM Sans', sans-serif" }}>Contact</div>
              {field('name', 'Full name', { required: true })}
              {field('role', 'Role / title', { placeholder: 'e.g. Senior Stylist' })}
              {field('phone', 'Mobile phone', { type: 'tel', placeholder: '07700 000000' })}
              {field('email', 'Email address', { type: 'email', placeholder: 'name@example.com' })}
              {field('address', 'Home address', { placeholder: 'Street, City, Postcode' })}
              {field('birthday', 'Birthday', { type: 'date' })}

              {/* Professional section */}
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0.85rem 0 0.65rem', fontFamily: "'DM Sans', sans-serif" }}>Professional</div>
              {field('specialist_services', 'Specialist services / skills', { placeholder: 'e.g. Colour, Extensions, Gas safe' })}
              {field('direct_line_did', 'Direct line DID', { type: 'tel', placeholder: '020 7946 0001' })}

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
              <button onClick={saveProfile} disabled={saving || isDemo || isPreview || !draft.name.trim()}
                style={{ padding: '0.4rem 1rem', background: saved ? '#3db87a' : (saving || isDemo ? '#f5d98a' : '#f0a500'), color: saved ? 'white' : '#1a0533', border: 'none', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, cursor: saving || isDemo ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
