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
]

const avatarStyle = (name = '', colour) => {
  if (colour) return { bg: colour + '22', text: colour }
  return AVATAR_PALETTE[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTE.length]
}

const initials = (name = '') =>
  name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

const fmt = (from, to) => {
  if (!from) return null
  return to && to !== from ? `£${from}–£${to}` : `£${from}`
}

const SOURCE_COLOUR = { Team: '#5e3b87', Partner: '#0ea5e9', Supplier: '#d97706' }

const scrollTo = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function BusinessTab({ onNavigate }) {
  const { user } = useAuth()
  const preview = usePreview()
  const isPreview = !!preview?.isPreview
  const previewReadOnly = preview?.previewReadOnly ?? isPreview

  const [tenantId, setTenantId]         = useState(null)
  const [tenant, setTenant]             = useState(null)
  const [staff, setStaff]               = useState([])
  const [catalogue, setCatalogue]       = useState([])
  const [suppliers, setSuppliers]       = useState([])
  const [partners, setPartners]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [supplierForm, setSupplierForm] = useState(null)
  const [supplierSaving, setSupplierSaving] = useState(false)

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

        const [tenantRes, staffRes, catRes, suppRes, partRes] = await Promise.all([
          supabase.from('tenants').select('business_name, lead_contact_name, business_phone, booking_link').eq('id', tid).maybeSingle(),
          supabase.from('staff_profiles').select('id, name, role, phone, email, colour, active').eq('tenant_id', tid).order('name'),
          supabase.from('catalogue_items').select('id, name, description, item_type, price_from, price_to, duration_minutes, active, supplier_id').eq('tenant_id', tid).order('name'),
          supabase.from('suppliers').select('*').eq('tenant_id', tid).order('name'),
          supabase.from('referral_partners').select('*').eq('tenant_id', tid).order('partner_name'),
        ])

        setTenant(tenantRes.data)
        setStaff(staffRes.data || [])
        setCatalogue(catRes.data || [])
        setSuppliers(suppRes.data || [])
        setPartners(partRes.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isPreview])

  const saveSupplier = async () => {
    if (previewReadOnly || !tenantId || !supplierForm?.name?.trim()) return
    setSupplierSaving(true)
    try {
      if (supplierForm.id) {
        await supabase.from('suppliers').update({
          name: supplierForm.name.trim(),
          email: supplierForm.email?.trim() || null,
          phone: supplierForm.phone?.trim() || null,
          notes: supplierForm.notes?.trim() || null,
        }).eq('id', supplierForm.id)
        setSuppliers(prev => prev.map(s => s.id === supplierForm.id ? { ...s, ...supplierForm, name: supplierForm.name.trim() } : s))
      } else {
        const { data } = await supabase.from('suppliers').insert({
          tenant_id: tenantId,
          name: supplierForm.name.trim(),
          email: supplierForm.email?.trim() || null,
          phone: supplierForm.phone?.trim() || null,
          notes: supplierForm.notes?.trim() || null,
        }).select().maybeSingle()
        if (data) setSuppliers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setSupplierForm(null)
    } finally {
      setSupplierSaving(false)
    }
  }

  const deleteSupplier = async (id) => {
    if (previewReadOnly || !tenantId) return
    await supabase.from('suppliers').delete().eq('id', id)
    setSuppliers(prev => prev.filter(s => s.id !== id))
    setCatalogue(prev => prev.map(c => c.supplier_id === id ? { ...c, supplier_id: null } : c))
  }

  const setProductSupplier = async (catalogueId, supplierId) => {
    if (previewReadOnly || !tenantId) return
    const val = supplierId || null
    await supabase.from('catalogue_items').update({ supplier_id: val }).eq('id', catalogueId)
    setCatalogue(prev => prev.map(c => c.id === catalogueId ? { ...c, supplier_id: val } : c))
  }

  const orderMailto = (supplier, product) => {
    const subject = encodeURIComponent(`Order enquiry: ${product.name}`)
    const sig = [tenant?.lead_contact_name, tenant?.business_name, tenant?.business_phone].filter(Boolean).join(' · ')
    const body = encodeURIComponent(
      `Hi ${supplier.name},\n\nCould you please supply the following:\n\nItem: ${product.name}\nQuantity: \n\nKind regards,\n${sig}`
    )
    return `mailto:${supplier.email}?subject=${subject}&body=${body}`
  }

  const activeStaff = staff.filter(s => s.active)
  const services    = catalogue.filter(c => c.item_type === 'service')
  const products    = catalogue.filter(c => c.item_type === 'product')

  const phonebook = [
    ...activeStaff.filter(s => s.phone || s.email).map(s => ({ name: s.name, phone: s.phone, email: s.email, source: 'Team' })),
    ...partners.filter(p => p.contact_phone).map(p => ({ name: p.partner_name, phone: p.contact_phone, email: p.email || null, source: 'Partner' })),
    ...suppliers.filter(s => s.phone || s.email).map(s => ({ name: s.name, phone: s.phone, email: s.email, source: 'Supplier' })),
  ].sort((a, b) => a.name.localeCompare(b.name))

  if (loading) return (
    <div style={{ padding: '2rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem' }}>Loading…</div>
  )

  // ─── Shared render helpers ────────────────────────────────────────────────────

  const chip = (label, href, bg, colour) => (
    <a key={`${label}-${href}`} href={href} style={{ fontSize: '0.7rem', background: bg, color: colour, padding: '3px 10px', borderRadius: 20, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</a>
  )

  const contactChips = (phone, email) => [
    phone && chip('Call', `tel:${phone}`,     '#f0ebf8', '#5e3b87'),
    phone && chip('Text', `sms:${phone}`,     '#e6f5ee', '#1e7a4a'),
    email && chip('Email', `mailto:${email}`, '#eff6ff', '#1d4ed8'),
  ].filter(Boolean)

  const sectionHead = (text, count, action) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>{text}</h2>
        {count != null && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#5e3b87', background: '#ede8f5', borderRadius: 20, padding: '1px 8px' }}>{count}</span>
        )}
      </div>
      {action}
    </div>
  )

  // ─── Jump nav ─────────────────────────────────────────────────────────────────

  const NAV_SECTIONS = [
    { id: 'biz-team',      label: 'Team',       count: activeStaff.length },
    { id: 'biz-services',  label: 'Services',   count: services.length },
    { id: 'biz-products',  label: 'Products',   count: products.length },
    { id: 'biz-partners',  label: 'Partners',   count: partners.length },
    { id: 'biz-suppliers', label: 'Suppliers',  count: suppliers.length },
    { id: 'biz-phonebook', label: 'Phone Book', count: phonebook.length },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Jump nav ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(248,246,252,0.95)', backdropFilter: 'blur(6px)', borderBottom: '1px solid rgba(94,59,135,0.08)', padding: '0.6rem 1.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {NAV_SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", padding: '0.3rem 0.75rem', borderRadius: 20, border: '1px solid rgba(94,59,135,0.18)', background: 'white', color: '#5e3b87', cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ede8f5'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.18)' }}
          >
            {s.label}
            {s.count > 0 && (
              <span style={{ fontSize: '0.62rem', fontWeight: 700, background: '#ede8f5', color: '#5e3b87', borderRadius: 20, padding: '0 5px', lineHeight: '1.4' }}>{s.count}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem', padding: '1.5rem' }}>

        {/* ── Team ── */}
        <section id="biz-team">
          {sectionHead('Team', activeStaff.length)}
          {activeStaff.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0 }}>No team members yet — add staff in the Team tab.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {activeStaff.map(member => {
                const av = avatarStyle(member.name, member.colour)
                return (
                  <div key={member.id} style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.1)', borderRadius: 10, padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: av.bg, color: av.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                      {initials(member.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>{member.role || '—'}</div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {contactChips(member.phone, member.email)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Services ── */}
        <section id="biz-services">
          {sectionHead('Services', services.length)}
          {services.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0 }}>No services yet — add them in Business Profile.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {services.map(item => {
                const price = fmt(item.price_from, item.price_to)
                return (
                  <div key={item.id} style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.1)', borderRadius: 10, padding: '1rem', opacity: item.active ? 1 : 0.5, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.4 }}>{item.description}</div>}
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      {price && <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1a1a1a' }}>{price}</span>}
                      {item.duration_minutes ? <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{item.duration_minutes}m</span> : null}
                    </div>
                    {!item.active && <span style={{ fontSize: '0.65rem', color: '#aaa' }}>Inactive</span>}
                    {tenant?.booking_link && (
                      <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                        <a href={tenant.booking_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', background: '#5e3b87', color: 'white', padding: '3px 10px', borderRadius: 20, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>Book</a>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Products ── */}
        <section id="biz-products">
          {sectionHead('Products', products.length)}
          {products.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0 }}>No products yet — add them in Business Profile.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {products.map(item => {
                const supplier = suppliers.find(s => s.id === item.supplier_id)
                const price = fmt(item.price_from, item.price_to)
                return (
                  <div key={item.id} style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.1)', borderRadius: 10, padding: '1rem', opacity: item.active ? 1 : 0.5, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.4 }}>{item.description}</div>}
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      {price && <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1a1a1a' }}>{price}</span>}
                    </div>
                    {!item.active && <span style={{ fontSize: '0.65rem', color: '#aaa' }}>Inactive</span>}
                    <div style={{ borderTop: '1px solid #f5f3fa', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}>
                      {!previewReadOnly && (
                        <select
                          value={item.supplier_id || ''}
                          onChange={e => setProductSupplier(item.id, e.target.value || null)}
                          style={{ flex: 1, fontSize: '0.72rem', border: '1px solid #e0d8f0', borderRadius: 6, padding: '3px 6px', color: '#555', background: 'white', fontFamily: "'DM Sans', sans-serif" }}
                        >
                          <option value=''>No supplier</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      )}
                      {previewReadOnly && supplier && (
                        <span style={{ fontSize: '0.72rem', color: '#888' }}>via {supplier.name}</span>
                      )}
                      {supplier?.email && (
                        <a href={orderMailto(supplier, item)} style={{ fontSize: '0.7rem', background: '#d97706', color: 'white', padding: '3px 10px', borderRadius: 20, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>Order</a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Partners ── */}
        <section id="biz-partners">
          {sectionHead('Partners', partners.length,
            onNavigate && (
              <button onClick={() => onNavigate('referrals')} style={{ fontSize: '0.75rem', color: '#0ea5e9', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", padding: 0 }}>
                Manage →
              </button>
            )
          )}
          {partners.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0 }}>
              No referral partners yet
              {onNavigate && (
                <> &mdash; <button onClick={() => onNavigate('referrals')} style={{ background: 'none', border: 'none', padding: 0, color: '#5e3b87', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}>add partners</button> to enable automatic referral routing.</>
              )}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {partners.map(partner => {
                const av = avatarStyle(partner.partner_name, '#0ea5e9')
                return (
                  <div key={partner.id} style={{ background: 'white', border: '0.5px solid rgba(14,165,233,0.15)', borderRadius: 10, padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                      {initials(partner.partner_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partner.partner_name}</div>
                      {partner.notes && <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.35rem' }}>{partner.notes}</div>}
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                        {contactChips(partner.contact_phone, partner.email)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Suppliers ── */}
        <section id="biz-suppliers">
          {sectionHead('Suppliers', suppliers.length,
            !previewReadOnly && (
              <button onClick={() => setSupplierForm({ name: '', email: '', phone: '', notes: '' })} style={{ fontSize: '0.8rem', background: '#5e3b87', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                + Add
              </button>
            )
          )}

          {supplierForm && (
            <div style={{ background: '#f8f5ff', border: '1.5px solid #e0d8f0', borderRadius: 10, padding: '1rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input placeholder='Supplier name *' value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '0.875rem', border: '1px solid #d0c8e8', borderRadius: 7, padding: '7px 10px', fontFamily: "'DM Sans', sans-serif" }} />
                <input placeholder='Email' value={supplierForm.email || ''} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} style={{ fontSize: '0.875rem', border: '1px solid #d0c8e8', borderRadius: 7, padding: '7px 10px', fontFamily: "'DM Sans', sans-serif" }} />
                <input placeholder='Phone' value={supplierForm.phone || ''} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} style={{ fontSize: '0.875rem', border: '1px solid #d0c8e8', borderRadius: 7, padding: '7px 10px', fontFamily: "'DM Sans', sans-serif" }} />
                <input placeholder='Notes (account no., rep name…)' value={supplierForm.notes || ''} onChange={e => setSupplierForm(p => ({ ...p, notes: e.target.value }))} style={{ fontSize: '0.875rem', border: '1px solid #d0c8e8', borderRadius: 7, padding: '7px 10px', fontFamily: "'DM Sans', sans-serif" }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={saveSupplier} disabled={supplierSaving || !supplierForm.name?.trim()} style={{ fontSize: '0.8rem', background: '#5e3b87', color: 'white', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", opacity: supplierSaving || !supplierForm.name?.trim() ? 0.55 : 1 }}>
                  {supplierSaving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setSupplierForm(null)} style={{ fontSize: '0.8rem', background: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {suppliers.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0 }}>
              No suppliers yet.{' '}
              {!previewReadOnly && (
                <button onClick={() => setSupplierForm({ name: '', email: '', phone: '', notes: '' })} style={{ background: 'none', border: 'none', padding: 0, color: '#5e3b87', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}>Add one</button>
              )}{' '}
              Suppliers unlock one-click order emails from your Products section.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {suppliers.map(supplier => {
                const linked = catalogue.filter(c => c.supplier_id === supplier.id)
                return (
                  <div key={supplier.id} style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.1)', borderRadius: 10, padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a' }}>{supplier.name}</div>
                        {supplier.notes && <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.15rem' }}>{supplier.notes}</div>}
                      </div>
                      {!previewReadOnly && (
                        <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem' }}>
                          <button onClick={() => setSupplierForm({ ...supplier })} style={{ fontSize: '0.7rem', background: '#f0ebf8', color: '#5e3b87', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Edit</button>
                          <button onClick={() => deleteSupplier(supplier.id)} style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Delete</button>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: linked.length > 0 ? '0.65rem' : 0 }}>
                      {contactChips(supplier.phone, supplier.email)}
                    </div>
                    {linked.length > 0 && (
                      <div style={{ borderTop: '1px solid #f5f3fa', paddingTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.35rem' }}>SUPPLIES</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {linked.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#f8f5ff', borderRadius: 8, padding: '3px 10px' }}>
                              <span style={{ fontSize: '0.78rem', color: '#1a1a1a' }}>{p.name}</span>
                              {supplier.email && (
                                <a href={orderMailto(supplier, p)} style={{ fontSize: '0.65rem', background: '#d97706', color: 'white', padding: '1px 7px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>Order</a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Phone Book ── */}
        <section id="biz-phonebook">
          {sectionHead('Phone Book', phonebook.length)}
          {phonebook.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0 }}>Phone book fills automatically from your team, partners, and suppliers once you add contact details.</p>
          ) : (
            <div style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.1)', borderRadius: 10, overflow: 'hidden' }}>
              {phonebook.map((contact, i) => (
                <div key={`${contact.source}-${contact.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderBottom: i < phonebook.length - 1 ? '1px solid #f5f3fa' : 'none', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', flex: 1, minWidth: 120 }}>{contact.name}</span>
                  <span style={{ fontSize: '0.65rem', background: SOURCE_COLOUR[contact.source] + '18', color: SOURCE_COLOUR[contact.source], padding: '1px 8px', borderRadius: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{contact.source}</span>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {contactChips(contact.phone, contact.email)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
