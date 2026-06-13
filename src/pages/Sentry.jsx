import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { usePreview } from '../context/PreviewContext'

const ZONE_TYPES = [
  { id: 'chair',          label: 'Chair / Station',  color: '#f0a500', hex30: 'rgba(240,165,0,0.18)' },
  { id: 'wash_basin',     label: 'Wash Basin',        color: '#3b82f6', hex30: 'rgba(59,130,246,0.18)' },
  { id: 'colour_station', label: 'Colour Station',    color: '#8b5cf6', hex30: 'rgba(139,92,246,0.18)' },
  { id: 'reception',      label: 'Reception',         color: '#10b981', hex30: 'rgba(16,185,129,0.18)' },
  { id: 'other',          label: 'Other',             color: '#9ca3af', hex30: 'rgba(156,163,175,0.18)' },
]
const ztColor = (type) => ZONE_TYPES.find(t => t.id === type)?.color || '#9ca3af'
const ztBg = (type) => ZONE_TYPES.find(t => t.id === type)?.hex30 || 'rgba(156,163,175,0.18)'
const ztLabel = (type) => ZONE_TYPES.find(t => t.id === type)?.label || 'Other'

const VARIANCE_LABELS = {
  unlogged_service: 'Unlogged service',
  duration_gap:     'Duration gap',
  no_show:          'No-show',
  call_not_booked:  'Call not converted',
}
const SEVERITY_STYLES = {
  high:   { bg: '#fef2f2', border: 'rgba(239,68,68,0.25)',   dot: '#ef4444', text: '#991b1b' },
  medium: { bg: '#fffbeb', border: 'rgba(240,165,0,0.25)',   dot: '#f0a500', text: '#92400e' },
  low:    { bg: '#f0fdf4', border: 'rgba(16,185,129,0.25)',  dot: '#10b981', text: '#065f46' },
}

const CANVAS_W = 640
const CANVAS_H = 360

const TILES = [
  { id: 'stations',  title: 'Stations',         icon: '🏷️', color: '#5e3b87', lightBg: '#faf8ff', desc: 'Physical areas in your workspace' },
  { id: 'staff',     title: 'Staff → Stations', icon: '👤', color: '#3db87a', lightBg: '#f0fdf4', desc: 'Who works where' },
  { id: 'cameras',   title: 'Cameras',          icon: '📹', color: '#ef4444', lightBg: '#fff5f5', desc: 'Optional live monitoring' },
  { id: 'activity',  title: 'Live Activity',    icon: '📊', color: '#3b82f6', lightBg: '#eff6ff', desc: 'Real-time station status' },
  { id: 'variances', title: 'Booking Accuracy', icon: '⚠️', color: '#f0a500', lightBg: '#fffbf0', desc: 'Gaps between bookings & activity' },
]

function QFace({ size = 68 }) {
  return <img src="/qmood/content.svg" alt="Q" style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
}

function ZoneEditorCanvas({ canvasRef, onMouseDown, onMouseMove, onMouseUp }) {
  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1.5px solid rgba(94,59,135,0.18)', cursor: 'crosshair', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 320 }}
      />
      <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif", pointerEvents: 'none' }}>
        Hold and drag to draw a zone
      </div>
    </div>
  )
}

export default function SentryTab({ cameraLimit = 3 }) {
  const { isPreview, previewTenantId, previewReadOnly } = usePreview()

  const [tenantId, setTenantId] = useState(null)
  const [zones, setZones] = useState([])
  const [cameras, setCameras] = useState([])
  const [staff, setStaff] = useState([])
  const [variances, setVariances] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePanel, setActivePanel] = useState(null)

  // Add station (standalone zone)
  const [newZoneLabel, setNewZoneLabel] = useState('')
  const [newZoneType, setNewZoneType] = useState('chair')
  const [zoneSaving, setZoneSaving] = useState(false)

  // Add camera
  const [newCamName, setNewCamName] = useState('')
  const [newCamUrl, setNewCamUrl] = useState('')
  const [testStatus, setTestStatus] = useState(null)
  const [frameData, setFrameData] = useState(null)
  const [camSaving, setCamSaving] = useState(false)
  const [showAddCamForm, setShowAddCamForm] = useState(false)

  // Camera zone editor
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const [editorCamera, setEditorCamera] = useState(null)
  const [editorZones, setEditorZones] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState(null)
  const [previewRect, setPreviewRect] = useState(null)
  const [pendingRect, setPendingRect] = useState(null)
  const [zoneLabel, setZoneLabel] = useState('')
  const [zoneType, setZoneType] = useState('chair')
  const zoneLabelRef = useRef(null)
  const [camZoneSaving, setCamZoneSaving] = useState(false)

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async (tid) => {
    const [zonesRes, camRes, staffRes, varRes] = await Promise.all([
      supabase.from('sentry_zones').select('id, label, zone_type, camera_id, staff_profile_id, x, y, w, h, created_at').eq('tenant_id', tid).order('created_at'),
      supabase.from('sentry_cameras').select('id, name, snapshot_url, created_at').eq('tenant_id', tid).order('created_at'),
      supabase.from('staff_profiles').select('id, name, role').eq('tenant_id', tid).order('name'),
      supabase.from('sentry_variances')
        .select('*, sentry_zones(label, zone_type), sentry_sessions(start_ts, end_ts, duration_mins)')
        .eq('tenant_id', tid).eq('reviewed', false)
        .order('created_at', { ascending: false }).limit(50),
    ])
    setZones(zonesRes.data || [])
    setCameras(camRes.data || [])
    setStaff(staffRes.data || [])
    setVariances(varRes.data || [])
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: mem } = await supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
      const tid = isPreview ? previewTenantId : mem?.tenant_id
      if (!tid) return
      setTenantId(tid)
      await loadData(tid)
      setLoading(false)
    }
    load()
  }, [isPreview, previewTenantId, loadData])

  // ── Canvas redraw ───────────────────────────────────────────────────────────

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, CANVAS_W, CANVAS_H)
    } else {
      ctx.fillStyle = '#1a0c2e'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      for (let x = 0; x < CANVAS_W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke() }
      for (let y = 0; y < CANVAS_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke() }
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.font = '13px DM Sans, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Camera view will appear here', CANVAS_W / 2, CANVAS_H / 2 - 8)
      ctx.font = '11px DM Sans, system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.fillText('Draw zones to map to your camera frame', CANVAS_W / 2, CANVAS_H / 2 + 14)
    }
    editorZones.forEach(zone => {
      if (!zone.x && zone.x !== 0) return
      ctx.fillStyle = ztBg(zone.zone_type)
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h)
      ctx.strokeStyle = ztColor(zone.zone_type)
      ctx.lineWidth = 2
      ctx.strokeRect(zone.x, zone.y, zone.w, zone.h)
      ctx.font = 'bold 11px DM Sans, system-ui, sans-serif'
      ctx.textAlign = 'left'
      const tw = ctx.measureText(zone.label).width
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(zone.x + 4, zone.y + 4, tw + 10, 19)
      ctx.fillStyle = 'white'
      ctx.fillText(zone.label, zone.x + 9, zone.y + 17)
    })
    if (previewRect && previewRect.w > 5 && previewRect.h > 5) {
      ctx.strokeStyle = 'rgba(240,165,0,0.85)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.strokeRect(previewRect.x, previewRect.y, previewRect.w, previewRect.h)
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(240,165,0,0.07)'
      ctx.fillRect(previewRect.x, previewRect.y, previewRect.w, previewRect.h)
    }
  }, [editorZones, previewRect])

  useEffect(() => { redrawCanvas() }, [redrawCanvas])

  useEffect(() => {
    if (!frameData) { imgRef.current = null; redrawCanvas(); return }
    const img = new Image()
    img.onload = () => { imgRef.current = img; redrawCanvas() }
    img.src = frameData
  }, [frameData, redrawCanvas])

  const getCanvasXY = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) * (CANVAS_W / rect.width), y: (e.clientY - rect.top) * (CANVAS_H / rect.height) }
  }
  const onMouseDown = (e) => {
    if (pendingRect) return
    const { x, y } = getCanvasXY(e)
    setIsDrawing(true); setDrawStart({ x, y }); setPreviewRect({ x, y, w: 0, h: 0 })
  }
  const onMouseMove = (e) => {
    if (!isDrawing || !drawStart) return
    const { x, y } = getCanvasXY(e)
    setPreviewRect({ x: Math.min(x, drawStart.x), y: Math.min(y, drawStart.y), w: Math.abs(x - drawStart.x), h: Math.abs(y - drawStart.y) })
  }
  const onMouseUp = (e) => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (previewRect && previewRect.w > 20 && previewRect.h > 20) {
      setPendingRect({ ...previewRect })
      setZoneLabel(''); setZoneType('chair')
      setTimeout(() => zoneLabelRef.current?.focus(), 50)
    }
    setPreviewRect(null); setDrawStart(null)
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  const addStandaloneZone = async () => {
    if (!newZoneLabel.trim() || !tenantId || previewReadOnly) return
    setZoneSaving(true)
    const { data, error } = await supabase.from('sentry_zones').insert({
      tenant_id: tenantId, label: newZoneLabel.trim(), zone_type: newZoneType,
    }).select().maybeSingle()
    setZoneSaving(false)
    if (error || !data) return
    setZones(prev => [...prev, data])
    setNewZoneLabel('')
    setNewZoneType('chair')
  }

  const deleteZone = async (id) => {
    if (previewReadOnly) return
    await supabase.from('sentry_zones').delete().eq('id', id)
    setZones(prev => prev.filter(z => z.id !== id))
    setEditorZones(prev => prev.filter(z => z.id !== id))
  }

  const assignStaffToZone = async (zoneId, staffId) => {
    if (previewReadOnly) return
    await supabase.from('sentry_zones').update({ staff_profile_id: staffId || null }).eq('id', zoneId)
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, staff_profile_id: staffId || null } : z))
  }

  const testCamera = async (url, tid) => {
    if (!url.trim() || !(tid || tenantId)) return
    setTestStatus('testing'); setFrameData(null)
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sentry-snapshot', tenantId: tid || tenantId, url: url.trim() }),
      })
      const json = await res.json()
      if (json.frame) { setFrameData(json.frame); setTestStatus('ok') }
      else setTestStatus('unreachable')
    } catch { setTestStatus('unreachable') }
  }

  const addCamera = async () => {
    if (!newCamName.trim() || !tenantId || previewReadOnly) return
    setCamSaving(true)
    const { data, error } = await supabase.from('sentry_cameras').insert({
      tenant_id: tenantId, name: newCamName.trim(), snapshot_url: newCamUrl.trim() || null,
    }).select().maybeSingle()
    setCamSaving(false)
    if (error || !data) return
    setCameras(prev => [...prev, data])
    setNewCamName(''); setNewCamUrl(''); setTestStatus(null); setFrameData(null)
    setShowAddCamForm(false)
    openCameraEditor(data)
  }

  const openCameraEditor = (cam) => {
    setEditorCamera(cam)
    setEditorZones(zones.filter(z => z.camera_id === cam.id))
    setFrameData(null); imgRef.current = null
    setPendingRect(null); setZoneLabel(''); setZoneType('chair')
  }

  const saveCameraZone = async () => {
    if (!zoneLabel.trim() || !pendingRect || !editorCamera || !tenantId) return
    setCamZoneSaving(true)
    const { data, error } = await supabase.from('sentry_zones').insert({
      camera_id: editorCamera.id, tenant_id: tenantId,
      label: zoneLabel.trim(), zone_type: zoneType,
      x: Math.round(pendingRect.x), y: Math.round(pendingRect.y),
      w: Math.round(pendingRect.w), h: Math.round(pendingRect.h),
    }).select().maybeSingle()
    setCamZoneSaving(false)
    if (error || !data) return
    setEditorZones(prev => [...prev, data])
    setZones(prev => [...prev, data])
    setPendingRect(null); setZoneLabel('')
  }

  const deleteCameraZone = async (id) => {
    await deleteZone(id)
  }

  const markReviewed = async (id) => {
    await supabase.from('sentry_variances').update({ reviewed: true }).eq('id', id)
    setVariances(prev => prev.filter(v => v.id !== id))
  }

  // ── Tile stats ──────────────────────────────────────────────────────────────

  const standaloneZones = zones.filter(z => !z.camera_id)
  const cameraZones = zones.filter(z => z.camera_id)
  const assignedZones = zones.filter(z => z.staff_profile_id)
  const assignedStaff = new Set(zones.map(z => z.staff_profile_id).filter(Boolean)).size

  if (loading) return null

  // ── Tile subtitles ──────────────────────────────────────────────────────────

  const tileSubs = {
    stations: zones.length === 0
      ? 'No stations defined'
      : `${zones.length} station${zones.length !== 1 ? 's' : ''} · ${ZONE_TYPES.filter(t => zones.some(z => z.zone_type === t.id)).map(t => t.label).join(', ')}`,
    staff: staff.length === 0
      ? 'No staff loaded'
      : `${assignedStaff} of ${staff.length} assigned`,
    cameras: cameras.length === 0
      ? 'No cameras — optional'
      : `${cameras.length} camera${cameras.length !== 1 ? 's' : ''} · ${cameraZones.length} mapped zone${cameraZones.length !== 1 ? 's' : ''}`,
    activity: cameras.length === 0 ? 'Add a camera to enable' : 'Live data coming soon',
    variances: variances.length === 0 ? 'No unreviewed findings' : `${variances.length} finding${variances.length !== 1 ? 's' : ''} to review`,
  }

  const renderPanel = () => {
    if (!activePanel) return null
    const tile = TILES.find(t => t.id === activePanel)

    // ── STATIONS PANEL ─────────────────────────────────────────────────────────
    if (activePanel === 'stations') return (
      <div>
        <div style={{ fontSize: '0.8125rem', color: '#555', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Define the physical areas in your workspace — chairs, wash basins, colour stations. Cameras are not required. Once stations exist, Sentry can reconcile activity against your Schedule bookings.
        </div>

        {/* Add zone form */}
        {!previewReadOnly && (
          <div style={{ background: '#f9f7fc', borderRadius: 10, padding: '1rem', border: '1px solid rgba(94,59,135,0.12)', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.6rem' }}>Add station</div>
            <input value={newZoneLabel} onChange={e => setNewZoneLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStandaloneZone()}
              placeholder="e.g. Chair 1, Wash Basin, Colour Section"
              style={{ width: '100%', padding: '0.55rem 0.7rem', border: '1.5px solid rgba(94,59,135,0.2)', borderRadius: 7, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box', marginBottom: '0.6rem' }} />
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {ZONE_TYPES.map(zt => (
                <button key={zt.id} onClick={() => setNewZoneType(zt.id)}
                  style={{ padding: '0.2rem 0.6rem', borderRadius: 20, border: `1.5px solid ${newZoneType === zt.id ? zt.color : 'rgba(0,0,0,0.1)'}`, background: newZoneType === zt.id ? zt.hex30 : 'white', color: newZoneType === zt.id ? zt.color : '#888', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {zt.label}
                </button>
              ))}
            </div>
            <button onClick={addStandaloneZone} disabled={!newZoneLabel.trim() || zoneSaving}
              style={{ padding: '0.45rem 1rem', background: newZoneLabel.trim() ? '#f0a500' : '#f5d98a', color: newZoneLabel.trim() ? '#1a0533' : '#7a5c1a', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: '0.8125rem', cursor: newZoneLabel.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans', sans-serif" }}>
              {zoneSaving ? 'Saving…' : '+ Add station'}
            </button>
          </div>
        )}

        {zones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#bbb', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>No stations yet — add one above to get started.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {zones.map(z => {
              const assignedStaffMember = staff.find(s => s.id === z.staff_profile_id)
              return (
                <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', background: ztBg(z.zone_type), borderRadius: 9, border: `1px solid ${ztColor(z.zone_type)}33` }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: ztColor(z.zone_type), flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{z.label}</div>
                    <div style={{ fontSize: '0.7rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>{ztLabel(z.zone_type)}{z.camera_id ? ' · camera linked' : ''}</div>
                  </div>
                  {staff.length > 0 && (
                    <select value={z.staff_profile_id || ''} onChange={e => assignStaffToZone(z.id, e.target.value || null)}
                      disabled={previewReadOnly}
                      style={{ fontSize: '0.72rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 5, padding: '0.2rem 0.35rem', background: 'white', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", cursor: previewReadOnly ? 'default' : 'pointer', maxWidth: 110 }}>
                      <option value="">Unassigned</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                  {!previewReadOnly && (
                    <button onClick={() => deleteZone(z.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '1rem', lineHeight: 1, padding: '0 0.1rem', flexShrink: 0 }} title="Remove station">×</button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )

    // ── STAFF PANEL ────────────────────────────────────────────────────────────
    if (activePanel === 'staff') return (
      <div>
        <div style={{ fontSize: '0.8125rem', color: '#555', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Assign each team member to their primary station. When Sentry detects activity at a station, it knows whose session it likely belongs to — tightening the accuracy of booking reconciliation.
        </div>
        {staff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#bbb', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>No staff found. Add team members in the Team tab first.</div>
        ) : zones.length === 0 ? (
          <div style={{ background: '#fffbf0', border: '1px solid rgba(240,165,0,0.25)', borderRadius: 9, padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#7a5c00', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
            Define your stations first — then assign staff to them here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {staff.map(s => {
              const assignedZonesList = zones.filter(z => z.staff_profile_id === s.id)
              return (
                <div key={s.id} style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.1)', borderRadius: 9, padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: assignedZonesList.length > 0 ? '0.5rem' : 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#5e3b87', fontFamily: "'Syne', sans-serif" }}>{s.name.charAt(0)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{s.name}</div>
                      {s.role && <div style={{ fontSize: '0.7rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{s.role}</div>}
                    </div>
                    {assignedZonesList.length === 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#bbb', fontFamily: "'DM Sans', sans-serif" }}>No station</span>
                    )}
                  </div>
                  {assignedZonesList.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', paddingLeft: '2.25rem' }}>
                      {assignedZonesList.map(z => (
                        <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.18rem 0.55rem', background: ztBg(z.zone_type), borderRadius: 20, border: `1px solid ${ztColor(z.zone_type)}40` }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ztColor(z.zone_type) }} />
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{z.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!previewReadOnly && (
                    <div style={{ paddingLeft: '2.25rem', marginTop: '0.4rem' }}>
                      <select onChange={e => { if (e.target.value) { assignStaffToZone(e.target.value, s.id); e.target.value = '' } }}
                        style={{ fontSize: '0.72rem', border: '1px dashed rgba(94,59,135,0.25)', borderRadius: 5, padding: '0.2rem 0.4rem', background: 'white', color: '#888', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}>
                        <option value="">+ Assign to station…</option>
                        {zones.filter(z => z.staff_profile_id !== s.id).map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )

    // ── CAMERAS PANEL ──────────────────────────────────────────────────────────
    if (activePanel === 'cameras') {
      if (editorCamera) return (
        <div>
          <button onClick={() => { setEditorCamera(null); setFrameData(null); imgRef.current = null; setPendingRect(null) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", padding: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            ← Back to cameras
          </button>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>Zones — {editorCamera.name}</div>
          <div style={{ fontSize: '0.78rem', color: '#888', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.85rem', lineHeight: 1.5 }}>Hold and drag on the camera view to draw a zone. Give it a name and type when you release.</div>
          {editorCamera.snapshot_url && testStatus === null && (
            <button onClick={() => testCamera(editorCamera.snapshot_url, tenantId)}
              style={{ width: '100%', padding: '0.5rem', border: '1px dashed rgba(94,59,135,0.3)', borderRadius: 8, background: 'transparent', color: '#5e3b87', fontSize: '0.8125rem', cursor: 'pointer', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}>
              Load camera frame →
            </button>
          )}
          {testStatus === 'testing' && <div style={{ textAlign: 'center', padding: '0.5rem', color: '#888', fontSize: '0.8125rem', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}>Connecting to camera…</div>}
          {testStatus === 'unreachable' && (
            <div style={{ background: '#fffbeb', border: '1px solid rgba(240,165,0,0.3)', borderRadius: 8, padding: '0.65rem 0.9rem', marginBottom: '0.75rem', fontSize: '0.8125rem', color: '#7a5c00', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
              Camera isn't reachable from here. It may be on your local network. Draw zones using the grid — connect the camera URL later.
            </div>
          )}
          <ZoneEditorCanvas canvasRef={canvasRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} />
          {pendingRect && (
            <div style={{ background: '#f9f7fc', borderRadius: 10, padding: '0.85rem', border: '1px solid rgba(94,59,135,0.15)', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>Name this zone</div>
              <input ref={zoneLabelRef} value={zoneLabel} onChange={e => setZoneLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveCameraZone()}
                placeholder="e.g. Chair 1, Wash Basin"
                style={{ padding: '0.5rem 0.65rem', border: '1.5px solid rgba(94,59,135,0.25)', borderRadius: 7, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {ZONE_TYPES.map(zt => (
                  <button key={zt.id} onClick={() => setZoneType(zt.id)}
                    style={{ padding: '0.2rem 0.55rem', borderRadius: 20, border: `1.5px solid ${zoneType === zt.id ? zt.color : 'rgba(0,0,0,0.1)'}`, background: zoneType === zt.id ? zt.hex30 : 'white', color: zoneType === zt.id ? zt.color : '#888', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {zt.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setPendingRect(null)} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 7, background: 'white', color: '#888', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                <button onClick={saveCameraZone} disabled={!zoneLabel.trim() || camZoneSaving}
                  style={{ flex: 1, padding: '0.4rem 0.85rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: '0.8rem', cursor: zoneLabel.trim() ? 'pointer' : 'default', opacity: zoneLabel.trim() ? 1 : 0.5, fontFamily: "'DM Sans', sans-serif" }}>
                  {camZoneSaving ? 'Saving…' : 'Save zone'}
                </button>
              </div>
            </div>
          )}
          {editorZones.length > 0 && (
            <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {editorZones.map(z => (
                <div key={z.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: ztBg(z.zone_type), borderRadius: 7, border: `1px solid ${ztColor(z.zone_type)}33` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: ztColor(z.zone_type), flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{z.label}</span>
                    <span style={{ fontSize: '0.68rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>{ztLabel(z.zone_type)}</span>
                  </div>
                  <button onClick={() => deleteCameraZone(z.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '1rem', lineHeight: 1, padding: '0 0.1rem' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )

      return (
        <div>
          <div style={{ fontSize: '0.8125rem', color: '#555', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Cameras are optional. Add one to enable automatic station activity detection. Sentry fetches a snapshot once per minute and checks for movement in your defined zones.
          </div>
          {cameras.length < cameraLimit && !previewReadOnly && (
            <div style={{ marginBottom: '1rem' }}>
              {!showAddCamForm ? (
                <button onClick={() => setShowAddCamForm(true)}
                  style={{ width: '100%', padding: '0.6rem', border: '1px dashed rgba(94,59,135,0.3)', borderRadius: 9, background: 'transparent', color: '#5e3b87', fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  + Add camera
                </button>
              ) : (
                <div style={{ background: '#f9f7fc', borderRadius: 10, padding: '1rem', border: '1px solid rgba(94,59,135,0.12)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>New camera</div>
                  <input value={newCamName} onChange={e => setNewCamName(e.target.value)} placeholder="Camera name (e.g. Main floor)"
                    style={{ padding: '0.55rem 0.7rem', border: '1.5px solid rgba(94,59,135,0.2)', borderRadius: 7, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
                  <div>
                    <input value={newCamUrl} onChange={e => { setNewCamUrl(e.target.value); setTestStatus(null) }} placeholder="Snapshot URL (optional — add later)"
                      style={{ width: '100%', padding: '0.55rem 0.7rem', border: '1.5px solid rgba(94,59,135,0.2)', borderRadius: 7, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box', marginBottom: '0.3rem' }} />
                    <div style={{ fontSize: '0.7rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>http://[camera-ip]/snapshot.jpg — found in your camera app → Settings</div>
                    {newCamUrl.trim() && testStatus === null && (
                      <button onClick={() => testCamera(newCamUrl, tenantId)} style={{ marginTop: '0.4rem', padding: '0.3rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 6, background: 'white', color: '#5e3b87', fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Test URL</button>
                    )}
                    {testStatus === 'testing' && <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>Testing…</div>}
                    {testStatus === 'ok' && <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif" }}>✓ Camera reachable</div>}
                    {testStatus === 'unreachable' && <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#f0a500', fontFamily: "'DM Sans', sans-serif" }}>Camera not reachable — local network? You can save and connect later.</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { setShowAddCamForm(false); setNewCamName(''); setNewCamUrl(''); setTestStatus(null) }}
                      style={{ padding: '0.45rem 0.85rem', border: '1px solid rgba(94,59,135,0.15)', borderRadius: 7, background: 'white', color: '#888', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                    <button onClick={addCamera} disabled={!newCamName.trim() || camSaving}
                      style={{ flex: 1, padding: '0.45rem 0.85rem', background: newCamName.trim() ? '#f0a500' : '#f5d98a', color: newCamName.trim() ? '#1a0533' : '#7a5c1a', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: '0.8125rem', cursor: newCamName.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans', sans-serif" }}>
                      {camSaving ? 'Saving…' : 'Save → draw zones →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {cameras.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#bbb', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>No cameras configured. Add one above, or skip — Sentry works without cameras.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {cameras.map(cam => {
                const camZoneCount = zones.filter(z => z.camera_id === cam.id).length
                return (
                  <div key={cam.id} style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.1)', borderRadius: 9, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{cam.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                        {cam.snapshot_url ? (
                          <span style={{ color: '#3db87a' }}>URL set</span>
                        ) : (
                          <span style={{ color: '#f0a500' }}>No URL</span>
                        )} · {camZoneCount} zone{camZoneCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <button onClick={() => openCameraEditor(cam)}
                      style={{ padding: '0.3rem 0.7rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 6, background: 'white', color: '#5e3b87', fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Edit zones
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    // ── ACTIVITY PANEL ─────────────────────────────────────────────────────────
    if (activePanel === 'activity') return (
      <div>
        <div style={{ fontSize: '0.8125rem', color: '#555', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, marginBottom: '1.25rem' }}>
          When cameras are connected and polling is active, live zone occupancy appears here — showing which stations are currently in use and when they last had activity.
        </div>
        <div style={{ background: '#eff6ff', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '1.25rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📊</div>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1e40af', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.35rem' }}>Live monitoring in setup</div>
          <div style={{ fontSize: '0.8125rem', color: '#3b82f6', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
            {cameras.length === 0
              ? 'Add a camera with a snapshot URL to enable live zone monitoring.'
              : cameras.every(c => !c.snapshot_url)
              ? 'Add snapshot URLs to your cameras to enable live monitoring.'
              : 'Live polling is not yet active. Once connected, zone activity will appear here.'}
          </div>
        </div>
      </div>
    )

    // ── VARIANCES PANEL ────────────────────────────────────────────────────────
    if (activePanel === 'variances') return (
      <div>
        <div style={{ fontSize: '0.8125rem', color: '#555', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Sentry cross-checks physical station activity against your Schedule bookings. A variance means the data didn't match — not an accusation, just a prompt to review the booking record.
        </div>
        {variances.length === 0 ? (
          <div style={{ background: '#f0fdf4', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '1.5rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#065f46', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.3rem' }}>No variances to review</div>
            <div style={{ fontSize: '0.8125rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif" }}>When Sentry detects a gap between station activity and bookings, it will appear here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {variances.map(v => {
              const ss = SEVERITY_STYLES[v.severity] || SEVERITY_STYLES.medium
              const label = VARIANCE_LABELS[v.variance_type] || v.variance_type
              const zoneName = v.sentry_zones?.label || 'Unknown zone'
              const physMins = v.duration_physical_mins
              const bookedMins = v.duration_booked_mins
              const date = new Date(v.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
              return (
                <div key={v.id} style={{ background: ss.bg, borderRadius: 9, padding: '0.75rem 0.85rem', border: `1px solid ${ss.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.65rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: ss.dot, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: ss.text, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
                      <span style={{ fontSize: '0.68rem', color: ss.text, opacity: 0.7, fontFamily: "'DM Sans', sans-serif" }}>· {zoneName} · {date}</span>
                    </div>
                    {(physMins || bookedMins) && (
                      <div style={{ fontSize: '0.78rem', color: '#555', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
                        {physMins && `Station active: ${physMins} min`}
                        {physMins && bookedMins && ' · '}
                        {bookedMins && `Booking: ${bookedMins} min`}
                        {physMins && bookedMins && physMins > bookedMins && <span style={{ color: ss.dot, fontWeight: 700 }}> (+{physMins - bookedMins} min)</span>}
                      </div>
                    )}
                    {v.notes && <div style={{ fontSize: '0.75rem', color: '#777', fontFamily: "'DM Sans', sans-serif", marginTop: '0.15rem' }}>{v.notes}</div>}
                  </div>
                  <button onClick={() => markReviewed(v.id)}
                    style={{ flexShrink: 0, padding: '0.25rem 0.6rem', border: `1px solid ${ss.border}`, borderRadius: 6, background: 'white', color: ss.text, fontSize: '0.68rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Reviewed ✓
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )

    return null
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  const panelOpen = !!activePanel

  return (
    <div style={{ padding: '0 0 3rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: '#1a1a1a', marginBottom: '0.2rem' }}>Sentry</div>
        <div style={{ fontSize: '0.8125rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>
          Station monitoring & booking accuracy · {zones.length} station{zones.length !== 1 ? 's' : ''} · {cameras.length} camera{cameras.length !== 1 ? 's' : ''} · {assignedStaff} of {staff.length} staff assigned
        </div>
      </div>

      {/* Two-column layout when panel open */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

        {/* Tile grid */}
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: panelOpen ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.85rem' }}>
          {TILES.map(tile => {
            const isActive = activePanel === tile.id
            const sub = tileSubs[tile.id]
            const badge = tile.id === 'variances' && variances.length > 0 ? variances.length : null
            return (
              <div key={tile.id} onClick={() => setActivePanel(isActive ? null : tile.id)}
                style={{ background: isActive ? tile.lightBg : 'white', border: isActive ? `1.5px solid ${tile.color}` : '0.5px solid rgba(94,59,135,0.1)', borderRadius: 12, padding: '1.1rem 1rem', cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
                  boxShadow: isActive ? `0 2px 12px ${tile.color}20` : '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{tile.icon}</span>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: isActive ? tile.color : '#1a1a1a' }}>{tile.title}</span>
                  </div>
                  {badge && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#fef2f2', color: '#991b1b', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.08rem 0.4rem', fontFamily: "'DM Sans', sans-serif" }}>{badge}</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: isActive ? tile.color : '#888', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>{sub}</div>
                <div style={{ marginTop: '0.6rem', fontSize: '0.7rem', color: isActive ? tile.color : '#bbb', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                  {isActive ? 'Close ×' : tile.desc + ' →'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Side panel */}
        {panelOpen && (
          <div style={{ flex: '0 0 400px', background: 'white', borderRadius: 12, border: `1.5px solid ${TILES.find(t => t.id === activePanel)?.color || '#5e3b87'}40`, padding: '1.25rem', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{TILES.find(t => t.id === activePanel)?.icon}</span>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: '#1a1a1a' }}>{TILES.find(t => t.id === activePanel)?.title}</span>
              </div>
              <button onClick={() => { setActivePanel(null); setEditorCamera(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '1.1rem', lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
              {renderPanel()}
            </div>
          </div>
        )}
      </div>

      {/* Info strip */}
      <div style={{ marginTop: '1.5rem', background: '#f9f7fc', borderRadius: 10, padding: '0.75rem 1rem', border: '1px solid rgba(94,59,135,0.1)', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
        <QFace size={28} />
        <div style={{ fontSize: '0.8125rem', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
          <strong>Start with Stations.</strong> Define your physical workspace — no cameras needed. Once stations exist, assign staff to them. Cameras are optional: add one to enable automatic activity detection and booking reconciliation.
        </div>
      </div>
    </div>
  )
}
