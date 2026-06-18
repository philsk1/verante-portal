import { useState, useRef, useEffect } from 'react'

export default function MoodQ({ mood = 'smile', reason = '', tip = '', size = 44 }) {
  const [open, setOpen]   = useState(false)
  const [pos, setPos]     = useState(null)
  const imgRef            = useRef(null)
  const isSmiling         = mood === 'smile'

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (imgRef.current && !imgRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = () => {
    if (isSmiling) return
    if (imgRef.current) {
      const r = imgRef.current.getBoundingClientRect()
      setPos({ top: r.top, left: r.left + r.width / 2 })
    }
    setOpen(o => !o)
  }

  return (
    <>
      <img
        ref={imgRef}
        src={`/qmood/${mood}.png`}
        alt={`Q is ${mood}`}
        style={{ width: size, height: size, objectFit: 'contain', cursor: isSmiling ? 'default' : 'pointer', flexShrink: 0, display: 'block' }}
        onClick={handleClick}
        title={isSmiling ? undefined : "Click to see Q's feedback"}
      />
      {open && pos && (
        <div style={{
          position: 'fixed',
          top: pos.top - 8,
          left: pos.left,
          transform: 'translate(-50%, -100%)',
          background: 'white',
          border: '1px solid rgba(94,59,135,0.18)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(94,59,135,0.18)',
          padding: '0.85rem 1rem',
          width: 230,
          zIndex: 9999,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <div style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 10,
            height: 10,
            background: 'white',
            borderRight: '1px solid rgba(94,59,135,0.18)',
            borderBottom: '1px solid rgba(94,59,135,0.18)',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Q says</span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '1rem', lineHeight: 1, padding: '0 0 0 0.5rem', display: 'flex', alignItems: 'center' }}
            >×</button>
          </div>
          {reason && (
            <p style={{ margin: '0 0 0.45rem', fontSize: '0.8rem', color: '#1a1a1a', lineHeight: 1.5 }}>
              {reason}
            </p>
          )}
          {tip && (
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#5e3b87', lineHeight: 1.45 }}>
              {tip}
            </p>
          )}
        </div>
      )}
    </>
  )
}
