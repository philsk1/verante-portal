// Tests for emitSignal — the nervous system's validation layer.
// Tenant rule: element and signalType strings come from callers across the codebase.
// A typo in a caller produces a silent bad row in system_signals — wardens read garbage.
// These tests verify the warning fires, and that DB failure never propagates to the caller.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockInsert = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ insert: mockInsert }),
  }),
}))

import { emitSignal } from '../api/_signals.js'

describe('emitSignal', () => {

  beforeEach(() => {
    mockInsert.mockClear()
    mockInsert.mockResolvedValue({})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('valid signals — no warnings', () => {
    it('emits answer/call_completed without any console.warn', async () => {
      await emitSignal('answer', 'call_completed', { tenant_id: 'abc-123', duration_seconds: 95 })
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('emits support/call_support_done without any console.warn', async () => {
      await emitSignal('support', 'call_support_done', { tenant_id: 'abc-123' })
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('emits q/chat_turn without any console.warn', async () => {
      await emitSignal('q', 'chat_turn', { tenant_id: 'abc-123' })
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('emits any element/error without any console.warn', async () => {
      await emitSignal('answer', 'error', { tenant_id: 'abc-123', message: 'timeout' })
      expect(console.warn).not.toHaveBeenCalled()
    })
  })

  describe('invalid element — warns', () => {
    it('warns when element is unknown', async () => {
      await emitSignal('weather_service', 'call_completed', {})
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('unknown element')
      )
    })

    it('warn message includes the bad element name', async () => {
      await emitSignal('weather_service', 'call_completed', {})
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('weather_service')
      )
    })

    it('still attempts the DB insert despite the warning', async () => {
      await emitSignal('weather_service', 'call_completed', {})
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })
  })

  describe('invalid signal type — warns', () => {
    it('warns when signal type is unknown', async () => {
      await emitSignal('answer', 'ping', {})
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('unknown signal_type')
      )
    })

    it('warn message includes the bad signal type', async () => {
      await emitSignal('answer', 'ping', {})
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('ping')
      )
    })
  })

  describe('fire-and-forget contract — DB failure must not propagate', () => {
    it('resolves without throwing when Supabase insert rejects', async () => {
      mockInsert.mockRejectedValue(new Error('DB unreachable'))
      await expect(
        emitSignal('answer', 'call_completed', { tenant_id: 'abc-123' })
      ).resolves.not.toThrow()
    })

    it('logs a console.error when Supabase insert fails', async () => {
      mockInsert.mockRejectedValue(new Error('DB unreachable'))
      await emitSignal('answer', 'call_completed', { tenant_id: 'abc-123' })
      expect(console.error).toHaveBeenCalled()
    })

    it('resolves without throwing even for an unknown element with DB failure', async () => {
      mockInsert.mockRejectedValue(new Error('DB unreachable'))
      await expect(
        emitSignal('ghost_element', 'ping', {})
      ).resolves.not.toThrow()
    })
  })

})
