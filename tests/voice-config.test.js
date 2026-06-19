// Tests for getVoiceConfig — maps a tenant row to a Vapi voice payload.
// Tenant rule: a real tenant row from the DB is the input. The output must always
// include provider, voiceId, and speed — missing any field breaks the Vapi call.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }))

import { getVoiceConfig } from '../api/_tenant-data.js'

const BLOOM = {
  business_name: 'Bloom & Co',
  subscription_tier: 'standard',
  speech_pace: 'natural',
  overage_voice_preference: 'standard',
}

describe('getVoiceConfig', () => {

  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  describe('standard path — no Cartesia env vars set', () => {
    it('returns deepgram stella at normal speed for a typical standard tenant', () => {
      expect(getVoiceConfig(BLOOM)).toEqual({
        provider: 'deepgram',
        voiceId:  'stella',
        speed:    'normal',
      })
    })

    it('returns deepgram luna when preference is premium', () => {
      expect(getVoiceConfig({ ...BLOOM, overage_voice_preference: 'premium' })).toEqual({
        provider: 'deepgram',
        voiceId:  'luna',
        speed:    'normal',
      })
    })

    it('maps speech_pace slow → speed: slow', () => {
      expect(getVoiceConfig({ ...BLOOM, speech_pace: 'slow' }).speed).toBe('slow')
    })

    it('maps speech_pace fast → speed: fast', () => {
      expect(getVoiceConfig({ ...BLOOM, speech_pace: 'fast' }).speed).toBe('fast')
    })

    it('maps speech_pace natural → speed: normal', () => {
      expect(getVoiceConfig({ ...BLOOM, speech_pace: 'natural' }).speed).toBe('normal')
    })

    it('defaults unrecognised speech_pace to normal', () => {
      expect(getVoiceConfig({ ...BLOOM, speech_pace: 'moderate' }).speed).toBe('normal')
    })

    it('defaults missing speech_pace to normal', () => {
      const { speech_pace: _, ...nopace } = BLOOM
      expect(getVoiceConfig(nopace).speed).toBe('normal')
    })

    it('handles null tenant without throwing — returns stella standard defaults', () => {
      expect(getVoiceConfig(null)).toEqual({
        provider: 'deepgram',
        voiceId:  'stella',
        speed:    'normal',
      })
    })
  })

  describe('Cartesia standard voice', () => {
    it('uses cartesia when CARTESIA_STANDARD_VOICE_ID is set', () => {
      vi.stubEnv('CARTESIA_STANDARD_VOICE_ID', 'cartesia-voice-abc')
      expect(getVoiceConfig(BLOOM)).toEqual({
        provider: 'cartesia',
        voiceId:  'cartesia-voice-abc',
        speed:    'normal',
      })
    })

    it('carries speed through to cartesia provider', () => {
      vi.stubEnv('CARTESIA_STANDARD_VOICE_ID', 'cartesia-voice-abc')
      expect(getVoiceConfig({ ...BLOOM, speech_pace: 'slow' }).speed).toBe('slow')
    })
  })

  describe('Cartesia premium voice', () => {
    it('uses cartesia premium when env var set and preference is premium', () => {
      vi.stubEnv('CARTESIA_PREMIUM_VOICE_ID', 'cartesia-premium-xyz')
      expect(getVoiceConfig({ ...BLOOM, overage_voice_preference: 'premium', speech_pace: 'fast' })).toEqual({
        provider: 'cartesia',
        voiceId:  'cartesia-premium-xyz',
        speed:    'fast',
      })
    })

    it('falls back to deepgram luna when CARTESIA_PREMIUM_VOICE_ID is not set', () => {
      expect(getVoiceConfig({ ...BLOOM, overage_voice_preference: 'premium' })).toEqual({
        provider: 'deepgram',
        voiceId:  'luna',
        speed:    'normal',
      })
    })

    it('does not use premium cartesia voice for standard preference even if env var is set', () => {
      vi.stubEnv('CARTESIA_PREMIUM_VOICE_ID', 'cartesia-premium-xyz')
      const result = getVoiceConfig(BLOOM)
      expect(result.voiceId).not.toBe('cartesia-premium-xyz')
    })
  })

})
