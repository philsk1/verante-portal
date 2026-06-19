// Formal registry of Qerxel's elements.
//
// An element is a bounded domain: one responsibility, one policy source,
// one LLM connection, one warden slot. Clients connect to one element at a
// time. Millions of clients interact with all elements simultaneously.
//
// This file is the DNA notation — it formalises what exists and names what
// will. Nothing in this file invents new structure; it describes the structure
// that already operates and gives it a shared language.

export const ELEMENTS = {
  answer: {
    id:            'answer',
    name:          'Answer',
    description:   'Handles inbound missed calls for tenant businesses. The core revenue element.',
    llm:           'gpt-4o-mini',            // both standard and premium tiers; voice differs via Cartesia/Deepgram config
    policy_source: 'tenants.additional_instructions',
    api:           'vapi-assistant-request.js (main branch)',
    warden:        null,                      // slot reserved — watches call volume and error rate
  },

  support: {
    id:            'support',
    name:          'Support',
    description:   'Handles inbound support calls from Qerxel customers. Complaint triage, gift logic, escalation.',
    llm:           'gpt-4o',
    policy_source: 'support_policy.policy_text',
    api:           'vapi-assistant-request.js (support branch) + vapi-webhook.js',
    warden:        null,                      // slot reserved — watches Category A rate and escalation load
  },

  schedule: {
    id:            'schedule',
    name:          'Schedule',
    description:   'Calendar, booking, and appointment management. Entry point for new tenants.',
    llm:           null,                      // no LLM yet; booking is rule-based
    policy_source: null,
    api:           'integrations.js + booking page',
    warden:        null,                      // slot reserved — watches booking failure rate
  },

  q: {
    id:            'q',
    name:          'Q',
    description:   'AI advisor embedded in the portal. Helps tenants configure, understand, and improve.',
    llm:           'claude-haiku',
    policy_source: 'QERXEL_KNOWLEDGE in chat.js (pending migration to DB)',
    api:           'chat.js',
    warden:        null,                      // slot reserved — watches dialogue quality and unanswered intent
  },

  listen: {
    id:            'listen',
    name:          'Listen',
    description:   'Live screen copilot for owner-answered calls. Surfaces context in real time.',
    llm:           null,                      // not yet assigned — likely claude-sonnet for reasoning speed
    policy_source: null,
    api:           null,                      // not yet built
    warden:        null,
  },
}

// LLMs currently in use across the system.
// Each entry names the provider, model, and the role it plays.
// When a warden needs to route to a different LLM under load, it reads this map.
export const LLMS = {
  'gpt-4o': {
    provider: 'openai',
    model:    'gpt-4o',
    role:     'telephony-support',
    cost_per_min_pence: 18,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model:    'gpt-4o-mini',
    role:     'telephony-premium',
    cost_per_min_pence: 18,
  },
  'claude-haiku': {
    provider: 'anthropic',
    model:    'claude-haiku-4-5-20251001',
    role:     'portal-advisor',
    cost_per_min_pence: null,                 // per-token, not per-minute
  },
}

// Signal types — the vocabulary the elements use to describe what they observe.
// All signals are written to system_signals. Wardens read this table.
export const SIGNAL_TYPES = {
  CALL_COMPLETED:       'call_completed',      // Answer: a call was handled
  CALL_SUPPORT_DONE:    'call_support_done',   // Support: a support call was processed
  CHAT_TURN:            'chat_turn',           // Q: a chat exchange completed
  ERROR:                'error',               // Any element: something failed
  WARDEN_SNAPSHOT:      'warden_snapshot',     // Warden: periodic system health summary
}
