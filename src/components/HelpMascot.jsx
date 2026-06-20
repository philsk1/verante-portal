import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import VeraDialogue from './VeraDialogue'
import { useQScore } from '../context/QScoreContext'

// ─── CSS ──────────────────────────────────────────────────────────────────────

const injectStyles = () => {
  if (document.getElementById('vera-styles')) return
  const el = document.createElement('style')
  el.id = 'vera-styles'
  el.textContent = `
    @keyframes veraBob {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-4px); }
    }
    @keyframes veraFlyIn {
      0%   { opacity: 0; transform: translateY(-8px) scale(0.96); }
      100% { opacity: 1; transform: translateY(0)    scale(1); }
    }
    @keyframes veraFlyOut {
      0%   { opacity: 1; transform: translateY(0)   scale(1); }
      100% { opacity: 0; transform: translateY(-8px) scale(0.96); }
    }
    @keyframes veraTyping {
      0%, 100% { opacity: 0.4; transform: translateY(0); }
      50%       { opacity: 1;   transform: translateY(-2px); }
    }
    @keyframes veraGlowPulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.65; }
    }
    @keyframes veraHelpPulse {
      0%, 100% { background: rgba(240,165,0,0.05); outline-color: rgba(240,165,0,0.35); }
      50%       { background: rgba(240,165,0,0.12); outline-color: rgba(240,165,0,0.65); }
    }
    .vera-idle      { animation: veraBob       5s ease-in-out infinite; }
    .vera-bubble-in { animation: veraFlyIn     0.18s ease-out forwards; }
    .vera-glow-zone { animation: veraGlowPulse 1.8s ease-in-out infinite; cursor: pointer; }
    .vera-hover-mode [data-help] {
      cursor: help;
      outline: 1.5px dashed rgba(240,165,0,0.5);
      border-radius: 4px;
      animation: veraHelpPulse 2s ease-in-out infinite;
    }
  `
  document.head.appendChild(el)
}

// ─── Floating hover bubble ────────────────────────────────────────────────────

const FloatingBubble = ({ text, rect, visible, mood = 'smile' }) => {
  if (!rect || !text) return null
  const BUBBLE_W = 280
  const OWL_W   = 30
  const spaceRight = window.innerWidth - rect.right - 16
  const goLeft  = spaceRight < BUBBLE_W + OWL_W + 20
  const top     = Math.min(Math.max(8, rect.top - 4), window.innerHeight - 160)
  const left    = goLeft ? rect.left - BUBBLE_W - OWL_W - 16 : rect.right + 12

  return (
    <div className={visible ? 'vera-bubble-in' : ''} style={{
      position: 'fixed', top, left, zIndex: 9999,
      display: 'flex', alignItems: 'flex-start', gap: '6px',
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transition: visible ? 'none' : 'opacity 0.15s ease-in',
    }}>
      <div style={{ flexShrink: 0, lineHeight: 0 }}><img src={`/qmood/${mood}.png`} alt="Q" style={{ width: 124, height: 124, objectFit: 'contain' }} /></div>
      <div style={{
        position: 'relative', background: 'white',
        border: '1px solid rgba(94,59,135,0.2)', borderRadius: '10px',
        padding: '0.6rem 0.85rem', boxShadow: '0 6px 20px rgba(94,59,135,0.15)',
        width: BUBBLE_W, marginTop: 4,
      }}>
        <div style={{ position: 'absolute', left: -7, top: 12, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '7px solid rgba(94,59,135,0.2)' }} />
        <div style={{ position: 'absolute', left: -5, top: 12, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '6px solid white' }} />
        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#f0a500', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>Q explains</div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#1a1a1a', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{text}</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const TAB_LABELS = {
  dashboard:    'Dashboard',
  profile:      'Business Profile',
  ai:           'AI Behaviour',
  analytics:    'Analytics',
  referrals:    'Partners & Referrals',
  account:      'Account',
  calendar:     'Calendar',
  team:         'Team',
  listen:       'Listen',
  integrations: 'Integrations',
  lines:        'Phone Lines',
  services:     'Services',
  settings:     'Account & Billing',
  command:      'Master Control',
}

const TAB_TAGLINES = {
  dashboard:    'Questions about your results?',
  ai:           'Q can help you set this up',
  analytics:    'Want more from your data?',
  referrals:    'Q can help you build your network',
  account:      'Q can advise on upgrades',
  profile:      'Q can help configure this',
  calendar:     'Q knows every Schedule feature',
  team:         'Q can help with team setup',
  listen:       'Q can explain how Listen works',
  integrations: 'Q can guide you through this',
  lines:        'Questions? Ask Q',
  services:     'Q can help you build your service list',
  settings:     'Q can advise on plan upgrades',
  command:      'Q can see this panel but cannot change it',
}

let dialogueCounter = 0

const MOOD_ORDER = ['crying', 'sad', 'content', 'smile']

function moodFromScore(score) {
  if (score == null) return 'smile'
  if (score >= 86) return 'smile'
  if (score >= 61) return 'content'
  if (score >= 31) return 'sad'
  return 'crying'
}

function colorFromScore(score) {
  if (score == null || score >= 86) return '#3db87a'
  if (score >= 61) return '#eab308'
  if (score >= 31) return '#f97316'
  return '#ef4444'
}

function colorFromSeverity(sev) {
  if (sev === 'high') return '#ef4444'
  if (sev === 'medium') return '#f97316'
  if (sev === 'low') return '#eab308'
  return '#3db87a'
}

function VeraStrip({ compact, handleQClick, needHelpMode, closeAll, mood, showBadge, coachingOpen, activeTab, pageColor, isSmile, helpMode, setNeedHelpMode, setHelpMode, veraAlert, alertDismissed, setAlertDismissed, currentGap, onNavigate, setDismissedGapIds, proactiveSpeech, qMode, proactiveVisible, pagePraise }) {
  return compact ? (
        /* Compact layout (Listen): Q 56px + tagline below, Ask Q beside */
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
            <div
              id="vera-trigger-btn"
              className="vera-idle"
              onClick={handleQClick}
              style={{ lineHeight: 0, cursor: 'pointer', position: 'relative' }}
              title={!isSmile ? 'See what Q needs' : 'Ask Q for help'}
            >
              <img src={`/qmood/${mood}.png`} alt="Q" style={{ width: 56, height: 56, objectFit: 'contain' }} />
              {showBadge && !coachingOpen && (
                <div style={{ position: 'absolute', bottom: 1, right: -2, background: '#ef4444', color: 'white', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>!</div>
              )}
            </div>
            <span style={{ fontSize: '0.66rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic', textAlign: 'center', lineHeight: 1.3, maxWidth: 64 }}>
              {TAB_TAGLINES[activeTab] || 'Q knows everything'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingTop: '0.15rem' }}>
            {!needHelpMode ? (
              <button
                id="vera-ask-btn"
                onClick={() => { setNeedHelpMode(true); setHelpMode(false) }}
                style={{ padding: '0.22rem 0.6rem', background: pageColor, border: `1px solid ${pageColor}`, borderRadius: '999px', fontSize: '0.7rem', color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, alignSelf: 'flex-start', transition: 'background 0.15s' }}
              >
                Ask Q
              </button>
            ) : (
              <button
                onClick={closeAll}
                style={{ padding: '0.25rem 0.65rem', background: '#5e3b87', border: 'none', borderRadius: '999px', fontSize: '0.72rem', color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, alignSelf: 'flex-start' }}
              >
                Done
              </button>
            )}
            {veraAlert && !alertDismissed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid rgba(94,59,135,0.18)', borderLeft: '3px solid #f0a500', borderRadius: '10px', padding: '0.4rem 0.75rem 0.4rem 0.7rem', boxShadow: '0 3px 12px rgba(94,59,135,0.08)', fontSize: '0.75rem', color: '#1a1a1a', lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif", maxWidth: 320 }}>
                <span style={{ flex: 1 }}>{veraAlert}</span>
                <button onClick={() => setAlertDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '0.9rem', lineHeight: 1, padding: '0 0.1rem', flexShrink: 0 }}>×</button>
              </div>
            )}
            {!(veraAlert && !alertDismissed) && currentGap && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid rgba(94,59,135,0.18)', borderLeft: '3px solid #f0a500', borderRadius: '10px', padding: '0.4rem 0.75rem 0.4rem 0.7rem', boxShadow: '0 3px 12px rgba(94,59,135,0.08)', fontSize: '0.75rem', color: '#1a1a1a', lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif", maxWidth: 320 }}>
                <span style={{ flex: 1 }}>{currentGap.message}</span>
                {currentGap.actionTab && onNavigate && (
                  <button onClick={() => onNavigate(currentGap.actionTab)} style={{ background: '#f0a500', border: 'none', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, color: '#1a0533', cursor: 'pointer', flexShrink: 0, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>{currentGap.actionLabel}</button>
                )}
                <button onClick={() => setDismissedGapIds(prev => new Set([...prev, currentGap.id]))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '0.9rem', lineHeight: 1, padding: '0 0.1rem', flexShrink: 0 }}>×</button>
              </div>
            )}
            {!(veraAlert && !alertDismissed) && !currentGap && proactiveSpeech && qMode !== 'mind_own_business' && (
              <div style={{ opacity: proactiveVisible ? 1 : 0, transition: 'opacity 0.4s', background: 'white', border: '1px solid rgba(94,59,135,0.15)', borderRadius: '10px', padding: '0.45rem 0.85rem', boxShadow: '0 4px 16px rgba(94,59,135,0.1)', fontSize: '0.78rem', color: '#1a1a1a', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", maxWidth: 320 }}>
                {proactiveSpeech}
              </div>
            )}
          </div>
        </div>
  ) : (
        /* Normal layout: Q 136px + tagline + Ask Q in a row */
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>

          {/* Q face — click opens coaching (sad/crying) or help mode (happy) */}
          <div
            id="vera-trigger-btn"
            className="vera-idle"
            onClick={handleQClick}
            style={{ lineHeight: 0, cursor: 'pointer', flexShrink: 0, position: 'relative' }}
            title={!isSmile ? 'See what Q needs' : helpMode ? 'Close Q' : 'Ask Q for help'}
          >
            <img src={`/qmood/${mood}.png`} alt="Q" style={{ width: 136, height: 136, objectFit: 'contain' }} />
            {showBadge && !coachingOpen && (
              <div style={{ position: 'absolute', bottom: 2, right: -4, background: '#ef4444', color: 'white', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif", boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>!</div>
            )}
          </div>

          {/* Contextual Q tagline + action */}
          {!needHelpMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>
                {TAB_TAGLINES[activeTab] || 'Q knows everything'}
              </span>
              <button
                id="vera-ask-btn"
                onClick={() => { setNeedHelpMode(true); setHelpMode(false) }}
                style={{
                  padding: '0.22rem 0.6rem',
                  background: pageColor,
                  border: `1px solid ${pageColor}`,
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              >
                Ask Q
              </button>
            </div>
          ) : (
            <button
              onClick={closeAll}
              style={{ padding: '0.25rem 0.65rem', background: '#5e3b87', border: 'none', borderRadius: '999px', fontSize: '0.72rem', color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, flexShrink: 0 }}
            >
              Done
            </button>
          )}

          {/* Alert slot — priority: vera alert > gap messages > proactive speech */}
          {veraAlert && !alertDismissed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid rgba(94,59,135,0.18)', borderLeft: '3px solid #f0a500', borderRadius: '10px', padding: '0.4rem 0.75rem 0.4rem 0.7rem', boxShadow: '0 3px 12px rgba(94,59,135,0.08)', fontSize: '0.75rem', color: '#1a1a1a', lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif", maxWidth: 340, animation: 'veraFlyIn 0.25s ease-out forwards' }}>
              <span style={{ flex: 1 }}>{veraAlert}</span>
              <button onClick={() => setAlertDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '0.9rem', lineHeight: 1, padding: '0 0.1rem', flexShrink: 0 }}>×</button>
            </div>
          )}
          {!(veraAlert && !alertDismissed) && currentGap && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid rgba(94,59,135,0.18)', borderLeft: '3px solid #f0a500', borderRadius: '10px', padding: '0.4rem 0.75rem 0.4rem 0.7rem', boxShadow: '0 3px 12px rgba(94,59,135,0.08)', fontSize: '0.75rem', color: '#1a1a1a', lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif", maxWidth: 400, animation: 'veraFlyIn 0.25s ease-out forwards' }}>
              <span style={{ flex: 1 }}>{currentGap.message}</span>
              {currentGap.actionTab && onNavigate && (
                <button
                  onClick={() => onNavigate(currentGap.actionTab)}
                  style={{ background: '#f0a500', border: 'none', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, color: '#1a0533', cursor: 'pointer', flexShrink: 0, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
                >
                  {currentGap.actionLabel}
                </button>
              )}
              <button onClick={() => setDismissedGapIds(prev => new Set([...prev, currentGap.id]))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '0.9rem', lineHeight: 1, padding: '0 0.1rem', flexShrink: 0 }}>×</button>
            </div>
          )}
          {!(veraAlert && !alertDismissed) && !currentGap && proactiveSpeech && qMode !== 'mind_own_business' && (
            <div style={{ opacity: proactiveVisible ? 1 : 0, transition: 'opacity 0.4s', background: 'white', border: '1px solid rgba(94,59,135,0.15)', borderRadius: '10px', padding: '0.45rem 0.85rem', boxShadow: '0 4px 16px rgba(94,59,135,0.1)', fontSize: '0.78rem', color: '#1a1a1a', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", maxWidth: 360 }}>
              {proactiveSpeech}
            </div>
          )}
          {!(veraAlert && !alertDismissed) && !currentGap && !proactiveSpeech && pagePraise && qMode !== 'mind_own_business' && (
            <div style={{ background: '#f0faf5', border: '1px solid rgba(61,184,122,0.25)', borderLeft: '3px solid #3db87a', borderRadius: '10px', padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: '#1a4d2e', lineHeight: 1.45, fontFamily: "'DM Sans', sans-serif", maxWidth: 340 }}>
              {pagePraise}
            </div>
          )}
        </div>
  )
}

function QCoachingPanel({ mood, pageMoodTitle, pagePillarScore, pagePillarLabel, pageColor, pageCoachingPoints, activeTab, onNavigate, setCoachingOpen, setNeedHelpMode, handleImHappy }) {
  return (
        <div style={{ marginTop: '0.65rem', background: 'white', borderRadius: 14, border: '1px solid rgba(94,59,135,0.15)', boxShadow: '0 4px 20px rgba(94,59,135,0.1)', overflow: 'hidden', animation: 'veraFlyIn 0.2s ease-out forwards' }}>
          {/* Header */}
          <div style={{ padding: '0.85rem 1.1rem 0.75rem', borderBottom: '1px solid rgba(94,59,135,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={`/qmood/${mood}.png`} alt="Q" style={{ width: 54, height: 54, objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: '#1a1a1a' }}>
                {pageMoodTitle}
              </div>
              {pagePillarScore != null && (
                <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '0.1rem', fontFamily: "'DM Sans', sans-serif" }}>{pagePillarLabel}: {pagePillarScore}/100</div>
              )}
            </div>
            <button onClick={() => setCoachingOpen(false)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '1.15rem', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
          </div>

          {/* Page pillar bar */}
          {pagePillarScore != null && (
            <div style={{ padding: '0.5rem 1.1rem', borderBottom: '1px solid rgba(94,59,135,0.06)' }}>
              <div style={{ height: 5, background: '#f0ebf8', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pagePillarScore}%`, background: pagePillarScore >= 70 ? '#3db87a' : pagePillarScore >= 40 ? '#f0a500' : '#ef4444', borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
            </div>
          )}

          {/* Page coaching points */}
          <div style={{ padding: '0.75rem 1.1rem' }}>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.55rem', fontFamily: "'DM Sans', sans-serif" }}>What Q sees on this page</div>
            {pageCoachingPoints.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: '#1a6640', background: '#f0faf5', border: '1px solid rgba(61,184,122,0.2)', borderRadius: 8, padding: '0.55rem 0.7rem', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
                {activeTab === 'integrations'
                  ? "Connect your integrations and Q will have even more context for every call."
                  : "No issues here — this page is well set up."}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {pageCoachingPoints.map((pt, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setCoachingOpen(false)
                      document.dispatchEvent(new CustomEvent('q-open-dialogue', { detail: {
                        zoneText: `Coaching issue: "${pt.label}". ${pt.suggestion || ''} Give practical step-by-step advice on what to do, and offer to research what businesses in their sector typically do about this.`,
                        zoneName: pt.label,
                        tabName: TAB_LABELS[activeTab] || 'Portal',
                        rect: { left: window.innerWidth / 2 - 170, top: 80, width: 0, height: 0 },
                        initialBotMessage: pt.suggestion
                          ? `${pt.suggestion} Want me to walk you through it, or look into what other businesses in your sector do here?`
                          : `Let me help with "${pt.label}". Want me to walk you through it, or look into what businesses like yours typically do here?`,
                      }}))
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.18rem', cursor: 'pointer', borderRadius: 6, padding: '0.3rem 0.4rem', transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f8f5ff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: colorFromSeverity(pt.severity) }} />
                      <span style={{ flex: 1, fontSize: '0.775rem', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.35 }}>{pt.label}</span>
                      {onNavigate && pt.tab !== activeTab && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCoachingOpen(false); onNavigate(pt.tab) }}
                          style={{ fontSize: '0.68rem', fontWeight: 600, color: 'white', background: colorFromSeverity(pt.severity), border: 'none', borderRadius: 5, padding: '0.2rem 0.5rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', flexShrink: 0 }}>
                          Fix →
                        </button>
                      )}
                    </div>
                    {pt.suggestion && (
                      <div style={{ fontSize: '0.7rem', color: '#888', lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif", paddingLeft: '1.1rem' }}>{pt.suggestion}</div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    setCoachingOpen(false)
                    document.dispatchEvent(new CustomEvent('q-open-dialogue', { detail: {
                      zoneText: `Research request: what do businesses in this sector typically do to address these issues: ${pageCoachingPoints.map(p => p.label).join('; ')}. Use training knowledge about small service businesses to give practical, research-backed suggestions.`,
                      zoneName: 'Industry best practices',
                      tabName: TAB_LABELS[activeTab] || 'Portal',
                      rect: { left: window.innerWidth / 2 - 170, top: 80, width: 0, height: 0 },
                      initialBotMessage: `I can look into what businesses like yours typically do about these things and what tends to work. Shall I?`,
                    }}))
                  }}
                  style={{ alignSelf: 'flex-start', marginTop: '0.2rem', fontSize: '0.7rem', color: '#5e3b87', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}
                >
                  Ask Q to research best practices →
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '0.55rem 1.1rem', borderTop: '1px solid rgba(94,59,135,0.06)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleImHappy}
              style={{ padding: '0.32rem 0.75rem', background: '#3db87a', border: 'none', borderRadius: 7, fontSize: '0.73rem', color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
              I'm happy 😊
            </button>
            <button
              onClick={() => { setCoachingOpen(false); setNeedHelpMode(true) }}
              style={{ padding: '0.32rem 0.75rem', background: `${pageColor}18`, border: `1px solid ${pageColor}55`, borderRadius: 7, fontSize: '0.73rem', color: pageColor, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
              Explore with Q
            </button>
            <button
              onClick={() => setCoachingOpen(false)}
              style={{ padding: '0.32rem 0.75rem', background: '#5e3b87', border: 'none', borderRadius: 7, fontSize: '0.73rem', color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
              Close
            </button>
          </div>
        </div>
  )
}


const HelpMascot = ({ contextKey, tenantId, activeTab, veraAlert = null, gaps = [], onNavigate, compact = false }) => {
  const { globalScore, configPillar, perfPillar, coachingPoints = [], channelHealth = [], qDismissals = {}, saveDismissal, qMode = 'jump_in', refresh } = useQScore()

  // ── Per-page mood with dismissal decay ────────────────────────────────────
  const pageScore = (() => {
    const raw = activeTab === 'ai' ? configPillar
      : (activeTab === 'dashboard' || activeTab === 'listen') ? perfPillar
      : activeTab === 'integrations' ? 100
      : globalScore
    return raw ?? globalScore ?? 100
  })()

  const rawMood = moodFromScore(pageScore)
  const rawIndex = MOOD_ORDER.indexOf(rawMood)

  const pageDismissedAt = qDismissals[activeTab] || null
  const effectiveIndex = (() => {
    if (!pageDismissedAt) return rawIndex
    const monthsElapsed = (Date.now() - new Date(pageDismissedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    const stepsDown = Math.floor(monthsElapsed)
    return Math.max(rawIndex, 3 - stepsDown)
  })()
  const mood = MOOD_ORDER[effectiveIndex]
  const isSmile = mood === 'smile'

  // ── Page-specific coaching ────────────────────────────────────────────────
  // Merge Answer issues (coachingPoints) with Schedule + Sentry channel issues
  const allIssues = (() => {
    const extra = channelHealth.flatMap(ch => ch.issues || [])
    const seen = new Set()
    return [...coachingPoints, ...extra].filter(p => {
      if (seen.has(p.label)) return false
      seen.add(p.label); return true
    })
  })()

  const pageCoachingPoints = (() => {
    const tabCoachMap = {
      ai: 'ai', profile: 'profile', account: 'profile',
      dashboard: 'analytics', analytics: 'analytics', listen: 'analytics',
      team: 'team', calendar: 'team',
      sentry: 'sentry',
      services: 'services', referrals: 'analytics',
    }
    const relevantTab = tabCoachMap[activeTab]
    if (!relevantTab) return []
    return allIssues.filter(p => p.tab === relevantTab)
  })()

  const pageMoodTitle = (() => {
    if (activeTab === 'ai') return mood === 'crying' ? "My AI setup needs attention" : "My AI setup could be stronger"
    if (activeTab === 'dashboard' || activeTab === 'listen') return "Call performance needs attention"
    if (activeTab === 'profile' || activeTab === 'services') return "Profile could be more complete"
    return mood === 'crying' ? "I need some attention" : "A few things would help me"
  })()

  const pagePillarScore = { ai: configPillar, dashboard: perfPillar, listen: perfPillar }[activeTab] ?? null
  const pagePillarLabel = { ai: 'Config', dashboard: 'Performance', listen: 'Performance' }[activeTab] ?? null
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [coachingOpen, setCoachingOpen] = useState(false)

  // Vera hover mode
  const [helpMode, setHelpMode]       = useState(false)
  const [floatEl, setFloatEl]         = useState(null)
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const leaveTimer                    = useRef(null)

  // Need more help mode
  const [needHelpMode, setNeedHelpMode] = useState(false)
  const [zones, setZones]             = useState([])   // { text, rect, el }
  const [dialogues, setDialogues]     = useState([])   // open dialogue panels

  // Per-section aggregate score — computed from data-help-score attributes on the current tab
  const [sectionAggregate, setSectionAggregate] = useState(null)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const els = Array.from(document.querySelectorAll('[data-help-score]'))
      if (!els.length) { setSectionAggregate(null); return }
      const scores = els.map(el => parseInt(el.getAttribute('data-help-score'), 10)).filter(n => !isNaN(n))
      setSectionAggregate(scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null)
    })
    return () => cancelAnimationFrame(raf)
  }, [activeTab])

  // Proactive speech
  const [proactiveSpeech, setProactiveSpeech] = useState(null)
  const [proactiveVisible, setProactiveVisible] = useState(false)

  // Gap message rotation
  const [gapIndex, setGapIndex] = useState(0)
  const [dismissedGapIds, setDismissedGapIds] = useState(() => new Set())

  useEffect(() => { injectStyles() }, [])

  // Reset modes on tab change
  useEffect(() => {
    setHelpMode(false)
    setNeedHelpMode(false)
    setFloatEl(null)
    setBubbleVisible(false)
    setZones([])
    setDialogues([])
    setAlertDismissed(false)
    setGapIndex(0)
    setCoachingOpen(false)
  }, [activeTab])

  // Reset dismissed state when the alert message changes
  useEffect(() => {
    setAlertDismissed(false)
  }, [veraAlert])

  // Toggle body class so CSS can highlight all [data-help] elements
  useEffect(() => {
    if (helpMode) {
      document.body.classList.add('vera-hover-mode')
    } else {
      document.body.classList.remove('vera-hover-mode')
    }
    return () => document.body.classList.remove('vera-hover-mode')
  }, [helpMode])

  // ── Vera hover mode — always on when helpMode ────────────────────────────
  useEffect(() => {
    if (!helpMode) return

    const handleOver = (e) => {
      const el = e.target.closest('[data-help]')
      if (!el) return
      clearTimeout(leaveTimer.current)
      setFloatEl({ text: el.getAttribute('data-help'), rect: el.getBoundingClientRect() })
      setBubbleVisible(true)
    }
    const handleOut = (e) => {
      const el = e.target.closest('[data-help]')
      if (!el) return
      leaveTimer.current = setTimeout(() => {
        setBubbleVisible(false)
        setTimeout(() => setFloatEl(null), 180)
      }, 80)
    }

    document.addEventListener('mouseover', handleOver)
    document.addEventListener('mouseout', handleOut)
    return () => {
      document.removeEventListener('mouseover', handleOver)
      document.removeEventListener('mouseout', handleOut)
      clearTimeout(leaveTimer.current)
    }
  }, [helpMode])

  // ── Need more help mode — scan data-help zones ───────────────────────────
  useEffect(() => {
    if (!needHelpMode) { setZones([]); return }

    // Deactivate hover mode
    setHelpMode(false)
    setFloatEl(null)
    setBubbleVisible(false)

    const scan = () => {
      const els = Array.from(document.querySelectorAll('[data-help]'))
      setZones(els.map(el => ({
        text: el.getAttribute('data-help'),
        rect: el.getBoundingClientRect(),
        el,
      })))
    }

    scan()
    window.addEventListener('resize', scan)
    window.addEventListener('scroll', scan, true)
    return () => {
      window.removeEventListener('resize', scan)
      window.removeEventListener('scroll', scan, true)
    }
  }, [needHelpMode])

  const openDialogue = useCallback((zone) => {
    // Don't duplicate if same zone already open
    setDialogues(prev => {
      const exists = prev.find(d => d.zoneText === zone.text)
      if (exists) return prev
      dialogueCounter++
      return [...prev, {
        id: dialogueCounter,
        zoneText: zone.text,
        zoneName: zone.text.split(' ').slice(0, 6).join(' '),
        rect: zone.rect,
        tabName: TAB_LABELS[activeTab] || 'Portal',
      }]
    })
  }, [activeTab])

  const closeDialogue = useCallback((id) => {
    setDialogues(prev => prev.filter(d => d.id !== id))
  }, [])

  const closeAll = () => {
    setNeedHelpMode(false)
    setHelpMode(false)
    setDialogues([])
    setZones([])
  }

  // Global event bus — any component can open a Q dialogue by dispatching 'q-open-dialogue'
  useEffect(() => {
    const handler = (e) => {
      const { zoneText, zoneName, tabName: evtTab, rect, initialBotMessage } = e.detail
      setDialogues(prev => {
        if (prev.find(d => d.zoneText === zoneText)) return prev
        dialogueCounter++
        return [...prev, {
          id: dialogueCounter,
          zoneText,
          zoneName: zoneName || zoneText.split(' ').slice(0, 6).join(' '),
          rect: rect || { left: window.innerWidth / 2 - 170, top: window.innerHeight / 2 - 210, width: 0, height: 0 },
          tabName: evtTab || TAB_LABELS[activeTab] || 'Portal',
          initialBotMessage,
        }]
      })
    }
    document.addEventListener('q-open-dialogue', handler)
    return () => document.removeEventListener('q-open-dialogue', handler)
  }, [activeTab])

  // ── Proactive speech ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!contextKey || !tenantId) return
    let cancelled = false
    const tryShow = async () => {
      const { data: seen } = await supabase.from('vera_seen').select('seen_at')
        .eq('tenant_id', tenantId).eq('speech_key', contextKey).maybeSingle()
      if (seen || cancelled) return
      const { data: s } = await supabase.from('vera_speeches').select('speech_text')
        .eq('context_key', contextKey).maybeSingle()
      if (!s || cancelled) return
      setProactiveSpeech(s.speech_text)
      setProactiveVisible(true)
      setTimeout(() => { setProactiveVisible(false); setTimeout(() => setProactiveSpeech(null), 400) }, 9000)
      await supabase.from('vera_seen').insert({ tenant_id: tenantId, speech_key: contextKey }).then(() => {}).catch(() => {})
    }
    tryShow()
    return () => { cancelled = true }
  }, [contextKey, tenantId])

  // Gap rotation — filter by current tab and dismissed state, cycle every 6 s
  const tabGaps = gaps.filter(g => g.tabs.includes(activeTab) && !dismissedGapIds.has(g.id))
  const currentGap = tabGaps.length > 0 ? tabGaps[gapIndex % tabGaps.length] : null

  useEffect(() => {
    if (tabGaps.length <= 1) return
    const t = setInterval(() => setGapIndex(i => i + 1), 6000)
    return () => clearInterval(t)
  }, [tabGaps.length])

  // Only show sad mood if there are actual issues to report on this page
  const hasPageIssues = pageCoachingPoints.length > 0 || sectionAggregate !== null
  const isSad = !isSmile && hasPageIssues
  // Badge respects Q mode: mind_own_business = never badge; jump_in = only when crying; very_helpful = all sad states
  const showBadge = isSad && qMode !== 'mind_own_business' && (qMode === 'very_helpful' || mood === 'crying')
  const effectivePageScore = sectionAggregate !== null ? sectionAggregate
    : pageCoachingPoints.length > 0 ? pageScore
    : 100
  const pageColor = colorFromScore(effectivePageScore)

  // Page-specific praise — only shown when Q is happy and nothing else is competing for the alert slot
  const pagePraise = (() => {
    if (!isSmile) return null
    if (activeTab === 'ai' && pagePillarScore >= 85) return "Your AI setup is comprehensive — Q has everything it needs to represent your business well."
    if ((activeTab === 'dashboard' || activeTab === 'listen') && pagePillarScore >= 80) return "Strong call performance — Q is converting conversations effectively."
    if ((activeTab === 'profile' || activeTab === 'services') && pageScore >= 86) return "Your business profile is complete — Q can talk about your business with confidence."
    if (activeTab === 'team' && pageScore >= 86) return "Team is set up — Q can match callers to the right person."
    if (pageScore >= 90) return "Everything looks strong on this page."
    return null
  })()

  const handleQClick = () => {
    if (needHelpMode) { closeAll(); setCoachingOpen(false); return }
    if (!isSmile) {
      setCoachingOpen(o => !o)
      setHelpMode(false)
    } else {
      setHelpMode(m => !m)
      setCoachingOpen(false)
    }
  }

  const handleImHappy = () => {
    setCoachingOpen(false)
    if (saveDismissal) saveDismissal(activeTab)
  }

  return (
    <>
      {/* ── Vera strip — compact, non-intrusive ──────────────────────── */}
      <div style={{ marginBottom: compact ? '0.5rem' : '1.5rem' }}>
      <VeraStrip compact={compact} handleQClick={handleQClick} needHelpMode={needHelpMode} closeAll={closeAll} mood={mood} showBadge={showBadge} coachingOpen={coachingOpen} activeTab={activeTab} pageColor={pageColor} isSmile={isSmile} helpMode={helpMode} setNeedHelpMode={setNeedHelpMode} setHelpMode={setHelpMode} veraAlert={veraAlert} alertDismissed={alertDismissed} setAlertDismissed={setAlertDismissed} currentGap={currentGap} onNavigate={onNavigate} setDismissedGapIds={setDismissedGapIds} proactiveSpeech={proactiveSpeech} qMode={qMode} proactiveVisible={proactiveVisible} pagePraise={pagePraise} />

      {coachingOpen && <QCoachingPanel mood={mood} pageMoodTitle={pageMoodTitle} pagePillarScore={pagePillarScore} pagePillarLabel={pagePillarLabel} pageColor={pageColor} pageCoachingPoints={pageCoachingPoints} activeTab={activeTab} onNavigate={onNavigate} setCoachingOpen={setCoachingOpen} setNeedHelpMode={setNeedHelpMode} handleImHappy={handleImHappy} />}
      </div>

      {/* ── Hover bubble (Vera mode) ─────────────────────────────────── */}
      {floatEl && (
        <FloatingBubble text={floatEl.text} rect={floatEl.rect} visible={bubbleVisible} mood={mood} />
      )}

      {/* ── Glowing overlays (Need more help mode) ──────────────────── */}
      {needHelpMode && zones.map((zone, i) => {
        const r = zone.rect
        if (r.width < 4 || r.height < 4) return null
        const scoreAttr = zone.el.getAttribute('data-help-score')
        const sevAttr = zone.el.getAttribute('data-help-severity')
        const zoneColor = scoreAttr !== null
          ? colorFromScore(parseInt(scoreAttr, 10))
          : sevAttr ? colorFromSeverity(sevAttr) : '#5e3b87'
        return (
          <div
            key={i}
            className="vera-glow-zone"
            onClick={() => openDialogue(zone)}
            style={{
              position: 'fixed',
              left: r.left - 3,
              top: r.top - 3,
              width: r.width + 6,
              height: r.height + 6,
              borderRadius: '6px',
              border: `2px solid ${zoneColor}80`,
              background: `${zoneColor}10`,
              zIndex: 9000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'all',
            }}
          >
            <span style={{
              background: zoneColor,
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.04em',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
            }}>
              Ask here
            </span>
          </div>
        )
      })}

      {/* ── Dialogue panels ──────────────────────────────────────────── */}
      {dialogues.map(d => (
        <VeraDialogue
          key={d.id}
          id={d.id}
          zoneText={d.zoneText}
          zoneName={d.zoneName}
          tabName={d.tabName}
          initialRect={d.rect}
          onClose={() => closeDialogue(d.id)}
          initialBotMessage={d.initialBotMessage}
        />
      ))}
    </>
  )
}

export default HelpMascot
