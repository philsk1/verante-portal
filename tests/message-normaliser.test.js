// Tests for toClaudeMessages — normalises frontend message arrays before sending to Anthropic.
// Tenant rule: a real conversation history from the portal chat is the input.
// The output must be a clean Anthropic-compatible messages array — bad roles or missing
// content fields cause the Anthropic API to reject the request with a 400.

import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }))
vi.mock('@anthropic-ai/sdk',     () => ({ default: class { messages = { create: vi.fn() } } }))
vi.mock('../api/_kb.js',      () => ({ ragSearch: vi.fn(() => []), formatChunks: vi.fn(() => '') }))
vi.mock('../api/_audit.js',   () => ({ logChatTurn: vi.fn() }))
vi.mock('../api/_master.js',  () => ({ isQWriteEnabled: vi.fn(), getMasterConfig: vi.fn() }))
vi.mock('../api/_signals.js', () => ({ emitSignal: vi.fn() }))
vi.mock('../api/_ratelimit.js', () => ({ checkRateLimit: vi.fn(() => false), getClientIP: vi.fn(() => '127.0.0.1') }))

import { toClaudeMessages } from '../api/chat.js'

describe('toClaudeMessages', () => {

  describe('role normalisation', () => {
    it('converts role ai → assistant', () => {
      expect(toClaudeMessages([{ role: 'ai', content: 'hello' }]))
        .toEqual([{ role: 'assistant', content: 'hello' }])
    })

    it('passes role assistant through unchanged', () => {
      expect(toClaudeMessages([{ role: 'assistant', content: 'hello' }]))
        .toEqual([{ role: 'assistant', content: 'hello' }])
    })

    it('passes role user through unchanged', () => {
      expect(toClaudeMessages([{ role: 'user', content: 'hello' }]))
        .toEqual([{ role: 'user', content: 'hello' }])
    })

    it('treats any unrecognised role as user', () => {
      const result = toClaudeMessages([{ role: 'system', content: 'hello' }])
      expect(result[0].role).toBe('user')
    })
  })

  describe('content field normalisation', () => {
    it('uses m.content when present', () => {
      expect(toClaudeMessages([{ role: 'user', content: 'primary content' }])[0].content)
        .toBe('primary content')
    })

    it('falls back to m.text when m.content is absent', () => {
      expect(toClaudeMessages([{ role: 'user', text: 'fallback text' }])[0].content)
        .toBe('fallback text')
    })

    it('prefers m.content over m.text when both are present', () => {
      expect(toClaudeMessages([{ role: 'user', content: 'content wins', text: 'text loses' }])[0].content)
        .toBe('content wins')
    })
  })

  describe('filtering', () => {
    it('removes messages with empty string content', () => {
      const result = toClaudeMessages([
        { role: 'user', content: '' },
        { role: 'user', content: 'non-empty' },
      ])
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('non-empty')
    })

    it('removes messages where both content and text are absent', () => {
      const result = toClaudeMessages([{ role: 'user' }])
      expect(result).toHaveLength(0)
    })
  })

  describe('real conversation shape', () => {
    it('handles a full portal support conversation with mixed ai/user roles', () => {
      const input = [
        { role: 'user',      content: 'How do I change my opening hours?' },
        { role: 'ai',        content: 'Go to Account Settings → Business Profile.' },
        { role: 'user',      content: 'I cannot find Business Profile.' },
        { role: 'assistant', content: 'It is under the gear icon in the sidebar.' },
      ]
      const result = toClaudeMessages(input)
      expect(result).toEqual([
        { role: 'user',      content: 'How do I change my opening hours?' },
        { role: 'assistant', content: 'Go to Account Settings → Business Profile.' },
        { role: 'user',      content: 'I cannot find Business Profile.' },
        { role: 'assistant', content: 'It is under the gear icon in the sidebar.' },
      ])
    })

    it('handles a single first message — the minimum valid input', () => {
      const result = toClaudeMessages([{ role: 'user', content: 'hello' }])
      expect(result).toEqual([{ role: 'user', content: 'hello' }])
    })

    it('returns empty array for empty input', () => {
      expect(toClaudeMessages([])).toEqual([])
    })
  })

})
