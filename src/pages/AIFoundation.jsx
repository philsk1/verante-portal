// ─── AI Foundation — annotated view of all guardrails and computed config ──────

const DEFAULT_RULES = {
  new_customer:        { mode: 'open',     booking_link: true,  callback: true,  email: true  },
  partner_service:     { mode: 'balanced', booking_link: false, callback: false, email: false },
  sales_call:          { mode: 'strict',   booking_link: false, callback: false, email: false },
  supplier_delivery:   { mode: 'balanced', booking_link: false, callback: true,  email: true  },
  invoice_authorities: { mode: 'strict',   booking_link: false, callback: true,  email: true  },
}

function computeGreeting(tone, name, owner, outcomeType, bLink, callbackNote) {
  const n = name || 'your business'
  const o = owner || 'the owner'
  if (tone === 'formal') {
    return `Good morning. You have reached ${n}. ${o} is currently unavailable — I am their virtual assistant. I will be taking a brief note of your enquiry to ensure it receives ${o}'s personal attention. How may I assist you?`
  }
  let resolution
  if (outcomeType === 'booking' && bLink) {
    resolution = "I'll be taking a brief note and sending you a booking link."
  } else if (outcomeType === 'booking') {
    resolution = "I'll be taking a brief note to get you booked in."
  } else if (outcomeType === 'custom' && callbackNote) {
    resolution = `I'll be taking a brief note — ${callbackNote.trim()}.`
  } else if (callbackNote) {
    resolution = `I'll be taking a brief note, ${o} will call you back ${callbackNote}.`
  } else {
    resolution = `I'll be taking a brief note so ${o} can call you back to discuss what you need.`
  }
  return `Good morning, ${n}. ${o} is busy — I'm their virtual assistant. ${resolution} How can I help you?`
}

function computePleaseAllowMe(tone, owner, outcomeType, customText, callbackNote, bLink) {
  const o = owner || 'the owner'
  const timeframe = callbackNote || 'as soon as possible'
  if (tone === 'formal') {
    return `"Please allow me to record your name and contact details."`
  }
  if (outcomeType === 'booking' && bLink) {
    return `"Please allow me to take your details to get you booked in."`
  }
  if (outcomeType === 'custom' && customText) {
    return `"Please allow me to take your details — ${customText.trim()}."`
  }
  return `"Please allow me to take your details — ${o} will call you back ${timeframe}."`
}

// ─── Reusable layout pieces ───────────────────────────────────────────────────

function FixedBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#ede9f8', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#5e3b87', display: 'inline-block' }} />
      Fixed · Qerxel owned
    </span>
  )
}

function Directive({ text }) {
  return (
    <div style={{ margin: '0.6rem 0', padding: '0.75rem 1rem', background: '#f5f3ff', borderLeft: '3px solid #5e3b87', borderRadius: '0 8px 8px 0', fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#2d1a4a', lineHeight: 1.6, fontStyle: 'italic' }}>
      {text}
    </div>
  )
}

function Philosophy({ children }) {
  return (
    <div style={{ fontSize: '0.8rem', color: '#555', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.75, marginTop: '0.5rem' }}>
      {children}
    </div>
  )
}

function GuardrailCard({ title, children }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(94,59,135,0.07)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a' }}>{title}</span>
        <FixedBadge />
      </div>
      {children}
    </div>
  )
}

function SectionHeader({ label, note }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
      {note && <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif", marginTop: '0.2rem', lineHeight: 1.5 }}>{note}</div>}
    </div>
  )
}

function ComputedLine({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem 0', borderBottom: '1px solid rgba(94,59,135,0.06)' }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#888', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55, fontStyle: 'italic' }}>"{value}"</span>
    </div>
  )
}

function ConfigRow({ label, value, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.55rem 0', borderBottom: '1px solid rgba(94,59,135,0.05)' }}>
      <span style={{ fontSize: '0.8rem', color: '#444', fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      {active !== undefined ? (
        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: active ? '#e6f5ee' : '#f5f3ff', color: active ? '#166534' : '#999', fontFamily: "'DM Sans', sans-serif" }}>
          {active ? 'Active' : 'Off'}
        </span>
      ) : (
        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", maxWidth: '55%', textAlign: 'right' }}>{value}</span>
      )}
    </div>
  )
}

const CALL_TYPE_LABELS = {
  new_customer:        'New customer enquiry',
  partner_service:     'Partner service call',
  sales_call:          'Sales / cold call',
  supplier_delivery:   'Supplier / delivery',
  invoice_authorities: 'Invoice / authorities',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIFoundation({
  businessName, ownerName, toneRegister, businessOutcomeType,
  customOutcomeText, callbackPrefNote, greetingMessage,
  additionalInstructions, keywords, rules, spamFilter,
  salesHandling, autodialerDetection, blockedNumbers,
  provisionalBookingEnabled, provisionalBookingRule, bookingLink,
  onGoToSettings,
}) {
  const greeting = computeGreeting(
    toneRegister, businessName, ownerName,
    businessOutcomeType, bookingLink, callbackPrefNote
  )
  const pleaseAllowMe = computePleaseAllowMe(
    toneRegister, ownerName, businessOutcomeType,
    customOutcomeText, callbackPrefNote, bookingLink
  )

  const card = { background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1.25rem 1.5rem', marginBottom: '1rem' }

  return (
    <div style={{ maxWidth: 760, paddingBottom: '3rem' }}>

      {/* ── Intro ──────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: '#1a1a1a', margin: '0 0 0.4rem' }}>AI Foundation</h2>
        <p style={{ fontSize: '0.83rem', color: '#666', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, margin: 0 }}>
          Every Qerxel AI is built in layers. The foundation layer is fixed — it represents deliberate design decisions about how an AI should behave when it represents a business. These decisions were made from first principles, not convention, and they are not configurable. The layers above are yours. This page shows you both: what is fixed and why, and what your configuration currently produces.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
           ZONE 1 — QERXEL FOUNDATION LAYER
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div style={card}>
        <SectionHeader
          label="Qerxel foundation layer"
          note="These elements are active for every business on the platform. They cannot be changed, removed, or overridden."
        />

        {/* 1. Core character */}
        <GuardrailCard title="Core character">
          <Directive text="You are a warm, professional, and considerate assistant. You speak in human terms at all times — with kindness, willingness, and genuine care for the person you are speaking with. You are never robotic, never bureaucratic, never cold. You do not perform warmth — you express it naturally through the way you phrase things, the pace you set, and the care you take with every caller. Even in your most formal register you remain considerate and human. You never claim to be a person but you always behave like one worth trusting." />
          <Philosophy>
            The founding problem this instruction solves is the "robotic AI" effect. Research into customer psychology shows that the most damaging aspect of AI call handling is not the absence of a human voice — it is the presence of a mechanical manner. A caller who feels processed rather than heard will not return, and may not stay silent about the experience.
            <br /><br />
            The instruction operates at the level of identity rather than script. It does not tell the AI what words to use — it tells the AI what kind of entity to be. The phrase <em>"you do not perform warmth — you express it naturally"</em> is deliberate and considered. Performed warmth — scripted empathy, hollow affirmations ("absolutely!", "great question!"), reflexive apologies — is detectable. Callers recognise it immediately, and it works against you. Natural expression of warmth emerges from how the AI structures its responses: the questions it chooses to ask, the pace it sets, the absence of bureaucratic language, the willingness to sit with a caller's need before closing.
            <br /><br />
            The closing phrase — <em>"never claims to be a person but always behaves like one worth trusting"</em> — defines the precise territory Qerxel occupies. Not deception. Not cold automation. Something more useful than either.
          </Philosophy>
        </GuardrailCard>

        {/* 2. Judgement override */}
        <GuardrailCard title="Human judgement override">
          <Directive text="You are an intelligent assistant, not a rule-following robot. If a caller's tone, words, or situation clearly falls outside the scope of normal business enquiries — personal urgency, distress, safety concerns, or anything that common sense tells you requires immediate human attention — escalate immediately regardless of any other instructions. Always err on the side of the human." />
          <Philosophy>
            Any rule system can be defeated by edge cases. A caller in genuine distress who happens to be enquiring about a service, an emergency that surfaces mid-conversation, a situation that no call type template was designed to handle — these will come. The instructions that precede and follow this directive are carefully constructed, but they are still rules. Rules require judgement at their edges.
            <br /><br />
            This instruction is placed before all other call-handling rules deliberately: it establishes the hierarchy. Human safety and welfare sit above business process. Always. The AI cannot be instructed into ignoring a caller in crisis, not even by a well-intentioned owner who wanted their AI to stay on-topic.
            <br /><br />
            <em>"Always err on the side of the human"</em> is the distillation of the whole directive. When the situation is ambiguous, act as a concerned person would — not as a compliant system would. This protects your callers. It also protects you.
          </Philosophy>
        </GuardrailCard>

        {/* 3. Please allow me */}
        <GuardrailCard title='"Please allow me" — the transition phrase'>
          <Directive text={`When you begin taking details, use: ${pleaseAllowMe}`} />
          <Philosophy>
            This is the most architecturally considered phrase in the system. When an AI begins to collect personal information from a caller, a psychological threshold is crossed: the interaction shifts from conversation to transaction. Left unmanaged, that shift creates discomfort. The caller feels processed. The warmth built up in the greeting is partially undone.
            <br /><br />
            The phrase <em>"please allow me"</em> resolves this in three words.
            <br /><br />
            <strong>"Please"</strong> is a personal appeal. It positions the AI as asking, not instructing. The caller is not being directed to provide information — they are being asked.
            <br /><br />
            <strong>"Allow"</strong> hands agency to the caller. They are not being asked to comply — they are being invited to permit. The distinction is subtle but felt. A caller who gives permission is a participant; a caller who complies is a subject.
            <br /><br />
            <strong>"Me"</strong> is the second appeal, and the most deliberate. It asserts personhood without claiming it. The AI does not say "please allow the system to record" — it says "please allow <em>me</em>." That single word carries an enormous amount of relational weight. It closes the distance between the caller and the AI at exactly the moment the interaction risks becoming transactional.
            <br /><br />
            The phrase is hard-coded because its effect depends on consistency. It should never be absent, never paraphrased away. The completion — <em>"to get you booked in," "to take your details so [owner] can call you back"</em> — is configurable and adapts to your business outcome type, so the phrase always remains truthful.
          </Philosophy>
        </GuardrailCard>

        {/* 4. Honest AI identity */}
        <GuardrailCard title="Honest AI identity">
          <Directive text={`If asked whether you are an AI: be honest. You are ${businessName || 'this business'}'s virtual assistant.`} />
          <Philosophy>
            Deception about AI identity is both ethically wrong and strategically counterproductive. A caller who discovers they have been misled — even about something they half-suspected — experiences a trust collapse that damages the business the AI represents, not just the AI. The damage is not proportional to the deception; it is amplified by the sense of having been played.
            <br /><br />
            Honesty about being an AI, delivered with the warmth and competence already established in the conversation, does not erode trust. It builds it. A caller who knows they are speaking to an AI and is nonetheless impressed by the interaction becomes an advocate — they tell other people that this business's AI was "actually good." That is more valuable than a deceived caller who never found out.
            <br /><br />
            The instruction is to be honest — not to volunteer the information unprompted, not to apologise for it, not to diminish the interaction by foregrounding the AI-ness. Simply: if asked, confirm clearly and continue with the same quality of engagement.
          </Philosophy>
        </GuardrailCard>

        {/* 5. British English + efficiency */}
        <GuardrailCard title="British English and caller efficiency">
          <Directive text="Use British English. Be efficient — callers are often busy." />
          <Philosophy>
            Qerxel is built for UK businesses. American English phrasings — <em>"I apologize," "how can I assist you today," "absolutely"</em> as a filler word, <em>"you're welcome"</em> in response to a thanks — are detectable markers of generic AI. They are not wrong, but they signal template. British English is not just vocabulary — it is cadence, idiom, and register. It signals that this tool was built for you, not adapted for you from something built for someone else.
            <br /><br />
            The efficiency directive exists because callers are interrupting their day to make a call. Every unnecessary word is a micro-friction. Efficiency is not curtness — it is respect. The AI's job is to serve the caller's time, not to fill it with formalities that benefit nobody. A caller who reaches the end of the interaction having had exactly what they needed — no more, no less — will form a better impression of your business than one who experienced a fluent but padded performance.
          </Philosophy>
        </GuardrailCard>

        {/* 6. Call type defaults */}
        <GuardrailCard title="Call type defaults">
          <Directive text="Not every caller deserves the same response energy. The AI recognises five call types and applies a considered default to each one. These defaults can be adjusted, but the framework itself is fixed." />
          <Philosophy>
            The five call types represent every category of incoming call a UK service business receives. The defaults were not chosen arbitrarily:
            <br /><br />
            <strong>New customer enquiry → Open mode.</strong> This is the caller your business exists to serve. They deserve an open, exploratory conversation — the AI should discover their need, not just capture their details. Closing too early loses the relationship before it has started.
            <br /><br />
            <strong>Partner service call → Balanced mode.</strong> A caller who needs something you refer to an associate is a genuine enquiry deserving warm handling, but the goal is a warm referral — not an extended conversation about a service you cannot deliver.
            <br /><br />
            <strong>Sales call → Strict mode.</strong> An unsolicited commercial caller is consuming your AI's time — a resource with a real cost — with no value exchange. The response is polite but firm. There is no obligation to be accommodating.
            <br /><br />
            <strong>Supplier / delivery → Balanced mode.</strong> A trade contact has a legitimate relationship with the business. Take their details and reason. Someone will follow up.
            <br /><br />
            <strong>Invoice / authorities → Strict mode.</strong> Legal or financial consequence attaches to these calls. Formal, thorough logging. Someone of authority will be in touch.
          </Philosophy>
        </GuardrailCard>

        {/* 7. Triage outcome taxonomy */}
        <GuardrailCard title="Triage outcome taxonomy">
          <Directive text="At the end of every call, the AI assigns exactly one outcome: lead_captured · booked · referred_out · filtered · escalated · hard_close · spam" />
          <Philosophy>
            The forcing of exactly one outcome per call is a deliberate design decision. An AI that can attach ambiguous or multiple outcomes produces data that cannot be actioned. The taxonomy was designed to be exhaustive without being granular — seven outcomes that cover every case a UK service business encounters, without introducing the edge-case ambiguity that comes from fine-grained categorisation.
            <br /><br />
            <strong>lead_captured</strong> — A new customer expressed interest and left contact details. This is the primary commercial outcome.
            <br /><br />
            <strong>booked</strong> — The call resulted in a confirmed or provisional appointment. A stronger commercial signal than a captured lead.
            <br /><br />
            <strong>referred_out</strong> — The caller needed something from your referral list. They were directed to a partner. Relationship value preserved even when a sale was not possible.
            <br /><br />
            <strong>filtered</strong> — A sales call, wrong number, or out-of-scope request. Closed politely. No commercial loss — these calls have no value to capture.
            <br /><br />
            <strong>escalated</strong> — An urgent, sensitive, or official call. A human must follow up. The highest-priority outcome from an operational standpoint.
            <br /><br />
            <strong>hard_close</strong> — An out-of-scope request declined with clarity and without apology. Different from filtered in that the caller may have had a legitimate but mis-directed need.
            <br /><br />
            <strong>spam</strong> — Automated, nuisance, or blocked caller. Ended immediately.
          </Philosophy>
        </GuardrailCard>

        {/* 8. Sensitive business protocol — note only */}
        <div style={{ background: '#faf9fc', borderRadius: 8, border: '1px solid rgba(94,59,135,0.1)', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#5e3b87' }}>Sensitive business protocol</span>
            <FixedBadge />
            <span style={{ fontSize: '0.7rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>Applied automatically to specific business categories</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#555', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.65, margin: 0 }}>
            Some business categories — legal, medical, counselling, financial advice — operate under professional confidentiality obligations that make standard lead capture inappropriate. For these businesses, the AI strips the interaction back to the absolute minimum: name, number, and urgency. No details of the caller's enquiry are captured, repeated, or referenced. The caller is protected. The business is protected. This protocol activates automatically based on your registered business type and cannot be disabled.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
           ZONE 2 — COMPUTED AI VOICE
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div style={card}>
        <SectionHeader
          label="Your computed AI voice"
          note="This is what your AI will actually say, derived from your current configuration. Change your settings and this view updates."
        />

        <ComputedLine label="Opening greeting" value={greeting} />
        <ComputedLine label='"Please allow me" phrase' value={pleaseAllowMe.replace(/^"|"$/g, '')} />

        {greetingMessage && (
          <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.9rem', background: '#fef9ee', border: '1px solid rgba(240,165,0,0.2)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#b07d00', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Your greeting addition (appended)</div>
            <div style={{ fontSize: '0.8rem', color: '#78460a', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>"{greetingMessage}"</div>
          </div>
        )}

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ padding: '0.65rem 0.85rem', background: '#f5f3ff', borderRadius: 8, border: '1px solid rgba(94,59,135,0.1)' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#888', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Register</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif" }}>{toneRegister === 'formal' ? 'Formal & professional' : 'Warm & natural'}</div>
          </div>
          <div style={{ padding: '0.65rem 0.85rem', background: '#f5f3ff', borderRadius: 8, border: '1px solid rgba(94,59,135,0.1)' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#888', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Primary outcome</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif" }}>
              {businessOutcomeType === 'booking' ? 'Book appointment' : businessOutcomeType === 'custom' ? (customOutcomeText || 'Custom') : 'Callback / quote'}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
           ZONE 3 — ACTIVE CONFIGURATION
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div style={card}>
        <SectionHeader
          label="Active configuration"
          note="A summary of your current settings. All of these can be changed in AI Settings."
        />

        {/* Call handling rules */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Call handling rules</div>
          {Object.entries(CALL_TYPE_LABELS).map(([key, label]) => {
            const r = rules?.[key] || DEFAULT_RULES[key]
            const mode = r?.mode || DEFAULT_RULES[key].mode
            const closings = []
            if (r?.booking_link) closings.push('booking link')
            if (r?.callback) closings.push('callback')
            if (r?.email) closings.push('email capture')
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(94,59,135,0.05)' }}>
                <span style={{ fontSize: '0.8rem', color: '#333', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 20, background: mode === 'open' ? '#bbf7d0' : mode === 'balanced' ? '#bfdbfe' : '#fde8d8', color: mode === 'open' ? '#166534' : mode === 'balanced' ? '#1e3a8a' : '#7c3007', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{mode}</span>
                  {closings.map(c => <span key={c} style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: 20, background: '#f0ebf8', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif" }}>{c}</span>)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Active protections</div>
          <ConfigRow label="Spam detection" active={spamFilter !== false} />
          <ConfigRow label="Sales call handling" active={salesHandling !== false} />
          <ConfigRow label="Autodialler detection" active={autodialerDetection !== false} />
          {provisionalBookingEnabled && (
            <div style={{ marginTop: '0.5rem', padding: '0.65rem 0.85rem', background: '#f0fdf4', border: '1px solid rgba(61,184,122,0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#166534', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.2rem' }}>Provisional booking active</div>
              {provisionalBookingRule && <div style={{ fontSize: '0.78rem', color: '#444', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>Rule: "{provisionalBookingRule}"</div>}
            </div>
          )}
        </div>

        {/* Emergency keywords */}
        {keywords?.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Emergency keywords</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {keywords.map((k, i) => (
                <span key={i} style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: 20, background: '#fef2f2', color: '#b91c1c', border: '1px solid rgba(185,28,28,0.15)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{k}</span>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: '#888', fontFamily: "'DM Sans', sans-serif", margin: '0.4rem 0 0', lineHeight: 1.5 }}>
              When the AI detects any of these words or phrases in conversation, it treats the call as urgent and escalates immediately — regardless of the call type or any other instruction.
            </p>
          </div>
        )}

        {/* Blocked numbers */}
        {blockedNumbers?.filter(Boolean).length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Blocked numbers ({blockedNumbers.filter(Boolean).length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {blockedNumbers.filter(Boolean).map((n, i) => (
                <span key={i} style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: 20, background: '#f5f3ff', color: '#5e3b87', border: '1px solid rgba(94,59,135,0.15)', fontFamily: "'DM Sans', sans-serif" }}>{n}</span>
              ))}
            </div>
          </div>
        )}

        {/* Additional instructions */}
        {additionalInstructions && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Additional instructions</div>
            <div style={{ padding: '0.75rem 1rem', background: '#faf9fc', border: '1px solid rgba(94,59,135,0.1)', borderRadius: 8, fontSize: '0.8rem', color: '#333', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.65, fontStyle: 'italic' }}>
              "{additionalInstructions}"
            </div>
            <p style={{ fontSize: '0.72rem', color: '#888', fontFamily: "'DM Sans', sans-serif", margin: '0.35rem 0 0', lineHeight: 1.5 }}>
              These instructions are appended to the end of the system prompt and take effect on every call. They override defaults where there is a conflict.
            </p>
          </div>
        )}

        {/* Go to settings link */}
        {onGoToSettings && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(94,59,135,0.07)' }}>
            <button onClick={onGoToSettings}
              style={{ background: 'none', border: 'none', color: '#5e3b87', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              ← Back to AI Settings
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
