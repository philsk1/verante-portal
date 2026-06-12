import React from 'react'

const STATES = [
  {
    min: 0, max: 30,
    src: '/qmood/crying.svg',
    caption: "I don't know what to say yet…",
  },
  {
    min: 31, max: 60,
    src: '/qmood/sad.svg',
    caption: "Nearly there — I'm missing a few things",
  },
  {
    min: 61, max: 85,
    src: '/qmood/content.svg',
    caption: "I'm ready. You could make me better though.",
  },
  {
    min: 86, max: 100,
    src: '/qmood/smile.svg',
    caption: "I'm ready — you can always fine-tune me later",
  },
]

export default function QMood({ score = 0, size = 80, showCaption = true }) {
  const clamped = Math.max(0, Math.min(100, score))
  const state = STATES.find(s => clamped >= s.min && clamped <= s.max) || STATES[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <img
        src={state.src}
        alt={`Q mood: ${state.caption}`}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
      {showCaption && (
        <div style={{
          fontSize: '0.72rem',
          color: '#7a5a8a',
          textAlign: 'center',
          maxWidth: 160,
          lineHeight: 1.4,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {state.caption}
        </div>
      )}
    </div>
  )
}
