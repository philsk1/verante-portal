import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "I'm Q — the AI that powers Qerxel. Ask me anything about the platform, or tell me what kind of business you run and I'll show you exactly how it works for you. Want to hear me answer a real call? Click 'Hear Q live' above.",
}

export default function SalesChat() {
  const navigate = useNavigate()
  const [messages, setMessages]     = useState([INITIAL_MESSAGE])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [phone, setPhone]           = useState('')
  const [bizType, setBizType]       = useState('')
  const [detectedBizType, setDetectedBizType] = useState('')
  const [calling, setCalling]       = useState(false)
  const [callStatus, setCallStatus] = useState(null)
  const [buildingDemo, setBuildingDemo] = useState(false)
  const bottomRef                   = useRef(null)
  const inputRef                    = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sales', messages: next }),
      })
      const data = await res.json()
      if (data.message) {
        // Parse [BIZ:sector] tag — strip from display, store for modal pre-fill
        const bizMatch = data.message.match(/\[BIZ:([^\]]+)\]/)
        if (bizMatch) {
          const sector = bizMatch[1].trim()
          setDetectedBizType(sector)
        }
        const cleanMessage = data.message.replace(/\n?\[BIZ:[^\]]+\]/g, '').trim()
        setMessages(prev => [...prev, { role: 'assistant', content: cleanMessage }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong on my end. Try again in a moment." }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  async function requestCall(e) {
    e.preventDefault()
    const num = phone.trim()
    if (!num || calling) return

    setCalling(true)
    setCallStatus(null)

    try {
      const res = await fetch('/api/vapi-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sales-demo', phoneNumber: num, businessType: bizType.trim() || undefined }),
      })
      const data = await res.json()
      if (data.ok) {
        setCallStatus('success')
        setShowCallModal(false)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Calling you now${bizType.trim() ? ` — I'll match you with a ${bizType.trim()} demo business` : ''}. Pick up and we can continue the conversation live.`,
        }])
      } else {
        setCallStatus('error')
      }
    } catch {
      setCallStatus('error')
    } finally {
      setCalling(false)
    }
  }

  async function buildDemo() {
    if (buildingDemo) return
    setBuildingDemo(true)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Building your personalised${detectedBizType ? ` ${detectedBizType}` : ''} workspace — give me one moment…`,
    }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'demo-build', sector: detectedBizType || 'general' }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Build failed')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (signInError) throw signInError

      navigate('/portal')
    } catch {
      setBuildingDemo(false)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I hit a snag building your demo. Try again in a moment.",
      }])
    }
  }

  const s = {
    page: {
      minHeight: '100vh',
      background: '#0d0d14',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', system-ui, sans-serif",
    },
    header: {
      background: '#12111f',
      borderBottom: '1px solid #1e1d30',
      padding: '0 24px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    logoQ: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #6c31a8 0%, #3b1a6e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 15,
      fontWeight: 800,
      color: '#fff',
      letterSpacing: '-0.5px',
    },
    logoName: {
      fontSize: 16,
      fontWeight: 700,
      color: '#e2e0f0',
      letterSpacing: '-0.3px',
    },
    logoSub: {
      fontSize: 12,
      color: '#4b5563',
      marginLeft: 4,
    },
    callBtn: {
      background: '#5e3b87',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'background 0.15s',
    },
    messages: {
      flex: 1,
      overflowY: 'auto',
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    },
    msgRow: (role) => ({
      display: 'flex',
      justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
      padding: '4px 24px',
    }),
    bubble: (role) => ({
      maxWidth: 'min(520px, 82%)',
      background: role === 'user' ? '#2a1f45' : '#161424',
      border: role === 'user' ? '1px solid #3d2a6a' : '1px solid #1e1d30',
      borderRadius: role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      padding: '12px 16px',
      fontSize: 14,
      lineHeight: 1.65,
      color: role === 'user' ? '#c9c0e8' : '#d1cfe8',
    }),
    avatar: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #6c31a8 0%, #3b1a6e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 800,
      color: '#fff',
      flexShrink: 0,
      marginRight: 10,
      marginTop: 2,
    },
    msgGroup: (role) => ({
      display: 'flex',
      alignItems: 'flex-start',
      maxWidth: 'min(560px, 86%)',
      flexDirection: role === 'user' ? 'row-reverse' : 'row',
    }),
    typing: {
      display: 'flex',
      gap: 4,
      padding: '12px 16px',
      alignItems: 'center',
    },
    dot: (i) => ({
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#5e3b87',
      animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
    }),
    inputBar: {
      background: '#12111f',
      borderTop: '1px solid #1e1d30',
      padding: '16px 24px',
      flexShrink: 0,
    },
    inputForm: {
      display: 'flex',
      gap: 10,
      maxWidth: 720,
      margin: '0 auto',
    },
    input: {
      flex: 1,
      background: '#1a1828',
      border: '1px solid #2d2a45',
      borderRadius: 10,
      color: '#e2e0f0',
      fontSize: 14,
      padding: '11px 14px',
      outline: 'none',
      fontFamily: 'inherit',
    },
    sendBtn: {
      background: '#5e3b87',
      border: 'none',
      borderRadius: 10,
      color: '#fff',
      fontSize: 14,
      fontWeight: 600,
      padding: '11px 20px',
      cursor: 'pointer',
      flexShrink: 0,
      opacity: loading ? 0.6 : 1,
    },
    overlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 24,
    },
    modal: {
      background: '#161424',
      border: '1px solid #2d2a45',
      borderRadius: 16,
      padding: 28,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: '#e2e0f0',
      marginBottom: 6,
    },
    modalSub: {
      fontSize: 13,
      color: '#6b7280',
      marginBottom: 20,
      lineHeight: 1.5,
    },
    label: {
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: '#9ca3af',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    },
    modalInput: {
      width: '100%',
      background: '#1a1828',
      border: '1px solid #2d2a45',
      borderRadius: 8,
      color: '#e2e0f0',
      fontSize: 14,
      padding: '10px 12px',
      outline: 'none',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
      marginBottom: 14,
    },
    modalActions: {
      display: 'flex',
      gap: 10,
      marginTop: 4,
    },
    callNowBtn: {
      flex: 1,
      background: '#5e3b87',
      border: 'none',
      borderRadius: 8,
      color: '#fff',
      fontSize: 14,
      fontWeight: 600,
      padding: '11px',
      cursor: calling ? 'not-allowed' : 'pointer',
      opacity: calling ? 0.6 : 1,
    },
    cancelBtn: {
      background: 'transparent',
      border: '1px solid #2d2a45',
      borderRadius: 8,
      color: '#6b7280',
      fontSize: 14,
      padding: '11px 16px',
      cursor: 'pointer',
    },
    errorMsg: {
      color: '#f87171',
      fontSize: 12,
      marginTop: 8,
    },
    tagline: {
      textAlign: 'center',
      color: '#374151',
      fontSize: 12,
      padding: '8px 0 0',
    },
  }

  return (
    <div style={s.page}>
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>

      <div style={s.header}>
        <div style={s.logo}>
          <div style={s.logoQ}>Q</div>
          <div>
            <span style={s.logoName}>Qerxel</span>
            <span style={s.logoSub}>AI call-handling</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            style={{ ...s.callBtn, background: 'transparent', border: '1px solid #2d2a45', color: '#9ca3af', opacity: buildingDemo ? 0.6 : 1 }}
            onClick={buildDemo}
            disabled={buildingDemo}
          >
            {buildingDemo ? 'Building…' : 'Explore the portal'}
          </button>
          <button style={s.callBtn} onClick={() => { setBizType(detectedBizType); setShowCallModal(true) }}>
            Hear Q live
          </button>
        </div>
      </div>

      <div style={s.messages}>
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '0' }}>
          {messages.map((m, i) => (
            <div key={i} style={s.msgRow(m.role)}>
              <div style={s.msgGroup(m.role)}>
                {m.role === 'assistant' && <div style={s.avatar}>Q</div>}
                <div style={s.bubble(m.role)}>{m.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={s.msgRow('assistant')}>
              <div style={s.msgGroup('assistant')}>
                <div style={s.avatar}>Q</div>
                <div style={{ ...s.bubble('assistant'), padding: '8px 16px' }}>
                  <div style={s.typing}>
                    <div style={s.dot(0)} />
                    <div style={s.dot(1)} />
                    <div style={s.dot(2)} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div style={s.inputBar}>
        <form style={s.inputForm} onSubmit={sendMessage}>
          <input
            ref={inputRef}
            style={s.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Q anything..."
            disabled={loading}
            autoFocus
          />
          <button style={s.sendBtn} type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
        <div style={s.tagline}>Ask Q anything about the product · or click Hear Q live for a real call demo</div>
      </div>

      {showCallModal && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowCallModal(false) }}>
          <div style={s.modal}>
            <div style={s.modalTitle}>Hear Q live</div>
            <div style={s.modalSub}>
              Q will call you now and demonstrate exactly what your callers would hear — then offer to demo as a real business in your sector.
            </div>
            <form onSubmit={requestCall}>
              <label style={s.label}>Your phone number</label>
              <input
                style={s.modalInput}
                type="tel"
                placeholder="+44 7700 900000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoFocus
                required
              />
              <label style={s.label}>
                What kind of business?
                {detectedBizType && bizType === detectedBizType && (
                  <span style={{ color: '#7c5cbf', fontWeight: 400, marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>— Q matched from your conversation</span>
                )}
              </label>
              <input
                style={s.modalInput}
                type="text"
                placeholder="e.g. hair salon, plumber, personal trainer"
                value={bizType}
                onChange={e => setBizType(e.target.value)}
              />
              {callStatus === 'error' && (
                <div style={s.errorMsg}>Something went wrong starting the call. Try again or continue in chat.</div>
              )}
              <div style={s.modalActions}>
                <button style={s.callNowBtn} type="submit" disabled={calling || !phone.trim()}>
                  {calling ? 'Calling...' : 'Call me now'}
                </button>
                <button style={s.cancelBtn} type="button" onClick={() => setShowCallModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
