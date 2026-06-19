// Tests for the element registry — _elements.js is the DNA of the system.
// Tenant rule: there is no tenant input here — this is a schema test.
// If the registry drifts (wrong LLM, phantom entries, bad signal type values),
// wardens make decisions based on false information. These tests lock the shape.

import { describe, it, expect } from 'vitest'
import { ELEMENTS, LLMS, SIGNAL_TYPES } from '../api/_elements.js'

describe('ELEMENTS registry', () => {

  it('contains exactly the five defined elements', () => {
    expect(Object.keys(ELEMENTS).sort()).toEqual(['answer', 'listen', 'q', 'schedule', 'support'])
  })

  it('each element id matches its registry key', () => {
    for (const [key, el] of Object.entries(ELEMENTS)) {
      expect(el.id).toBe(key)
    }
  })

  it('each element has a name and description', () => {
    for (const el of Object.values(ELEMENTS)) {
      expect(typeof el.name).toBe('string')
      expect(el.name.length).toBeGreaterThan(0)
      expect(typeof el.description).toBe('string')
    }
  })

  describe('answer element', () => {
    it('uses gpt-4o-mini — not gemini, not claude', () => {
      expect(ELEMENTS.answer.llm).toBe('gpt-4o-mini')
    })
  })

  describe('support element', () => {
    it('uses gpt-4o for higher-stakes support calls', () => {
      expect(ELEMENTS.support.llm).toBe('gpt-4o')
    })
  })

  describe('q element', () => {
    it('uses claude-haiku for the portal advisor', () => {
      expect(ELEMENTS.q.llm).toBe('claude-haiku')
    })
  })

})

describe('LLMS registry', () => {

  it('does not contain gemini-flash (removed during decoupling audit)', () => {
    expect(Object.keys(LLMS)).not.toContain('gemini-flash')
  })

  it('contains exactly gpt-4o, gpt-4o-mini, and claude-haiku', () => {
    expect(Object.keys(LLMS).sort()).toEqual(['claude-haiku', 'gpt-4o', 'gpt-4o-mini'])
  })

  it('every LLM entry declares a provider and model', () => {
    for (const [id, llm] of Object.entries(LLMS)) {
      expect(typeof llm.provider, `${id}.provider`).toBe('string')
      expect(typeof llm.model,    `${id}.model`).toBe('string')
    }
  })

  it('claude-haiku maps to the correct model ID', () => {
    expect(LLMS['claude-haiku'].model).toBe('claude-haiku-4-5-20251001')
  })

})

describe('SIGNAL_TYPES', () => {

  it('all values are lowercase snake_case strings', () => {
    for (const [key, val] of Object.entries(SIGNAL_TYPES)) {
      expect(typeof val, key).toBe('string')
      expect(val, key).toBe(val.toLowerCase())
      expect(val, key).not.toContain(' ')
    }
  })

  it('contains the five expected signal type values', () => {
    const values = Object.values(SIGNAL_TYPES)
    expect(values).toContain('call_completed')
    expect(values).toContain('call_support_done')
    expect(values).toContain('chat_turn')
    expect(values).toContain('error')
    expect(values).toContain('warden_snapshot')
  })

  it('ELEMENTS keys and SIGNAL_TYPES values are non-overlapping namespaces', () => {
    const elementIds    = new Set(Object.keys(ELEMENTS))
    const signalValues  = new Set(Object.values(SIGNAL_TYPES))
    const intersection  = [...elementIds].filter(id => signalValues.has(id))
    expect(intersection).toHaveLength(0)
  })

})
