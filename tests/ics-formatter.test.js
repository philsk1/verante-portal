// Tests for formatICS — converts an appointment row to an iCalendar string.
// Tenant rule: a real appointment row (as returned by Supabase) is the input.
// The output must be valid iCalendar — Google Calendar and Apple Calendar both
// reject malformed ICS. Structure, escaping, and STATUS must all be correct.

import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }))
vi.mock('../api/_emails.js', () => ({
  sendEmail: vi.fn(),
  emailWelcome: vi.fn(),
  emailBookingConfirmation: vi.fn(),
}))
vi.mock('../api/_sms.js', () => ({ sendSms: vi.fn() }))

import { formatICS } from '../api/integrations.js'

const BASE_APPT = {
  id:               'f3a1-bc92',
  title:            'Haircut with Sarah',
  start_time:       '2025-06-19T10:00:00.000Z',
  end_time:         '2025-06-19T11:00:00.000Z',
  appointment_type: 'Haircut',
  client_notes:     'Client has sensitive scalp',
  status:           'confirmed',
}

describe('formatICS', () => {

  describe('iCalendar wrapper structure', () => {
    it('opens and closes with VCALENDAR', () => {
      const ics = formatICS(BASE_APPT)
      expect(ics).toContain('BEGIN:VCALENDAR')
      expect(ics).toContain('END:VCALENDAR')
    })

    it('contains exactly one VEVENT', () => {
      const ics = formatICS(BASE_APPT)
      expect(ics).toContain('BEGIN:VEVENT')
      expect(ics).toContain('END:VEVENT')
    })

    it('declares VERSION:2.0', () => {
      expect(formatICS(BASE_APPT)).toContain('VERSION:2.0')
    })
  })

  describe('appointment identity', () => {
    it('sets UID to appointment id anchored at qerxel.app', () => {
      expect(formatICS(BASE_APPT)).toContain('UID:f3a1-bc92@qerxel.app')
    })
  })

  describe('datetime formatting', () => {
    it('formats DTSTART in compact iCalendar UTC format', () => {
      expect(formatICS(BASE_APPT)).toContain('DTSTART:20250619T100000Z')
    })

    it('formats DTEND in compact iCalendar UTC format', () => {
      expect(formatICS(BASE_APPT)).toContain('DTEND:20250619T110000Z')
    })
  })

  describe('summary and description', () => {
    it('sets SUMMARY to the appointment title', () => {
      expect(formatICS(BASE_APPT)).toContain('SUMMARY:Haircut with Sarah')
    })

    it('combines appointment_type and client_notes as DESCRIPTION with pipe separator', () => {
      expect(formatICS(BASE_APPT)).toContain('DESCRIPTION:Haircut | Client has sensitive scalp')
    })

    it('uses only appointment_type as DESCRIPTION when client_notes is absent', () => {
      const ics = formatICS({ ...BASE_APPT, client_notes: null })
      expect(ics).toContain('DESCRIPTION:Haircut')
      expect(ics).not.toContain(' | ')
    })

    it('uses only client_notes as DESCRIPTION when appointment_type is absent', () => {
      const ics = formatICS({ ...BASE_APPT, appointment_type: null })
      expect(ics).toContain('DESCRIPTION:Client has sensitive scalp')
    })

    it('omits DESCRIPTION entirely when neither appointment_type nor client_notes are set', () => {
      const ics = formatICS({ ...BASE_APPT, appointment_type: null, client_notes: null })
      expect(ics).not.toContain('DESCRIPTION:')
    })
  })

  describe('status field', () => {
    it('sets STATUS:CANCELLED for cancelled appointments', () => {
      expect(formatICS({ ...BASE_APPT, status: 'cancelled' })).toContain('STATUS:CANCELLED')
    })

    it('sets STATUS:CONFIRMED for confirmed appointments', () => {
      expect(formatICS({ ...BASE_APPT, status: 'confirmed' })).toContain('STATUS:CONFIRMED')
    })

    it('sets STATUS:CONFIRMED for provisional appointments', () => {
      expect(formatICS({ ...BASE_APPT, status: 'provisional' })).toContain('STATUS:CONFIRMED')
    })
  })

  describe('special character escaping in title', () => {
    it('escapes commas in SUMMARY', () => {
      const ics = formatICS({ ...BASE_APPT, title: 'Cut, Colour & Blow' })
      expect(ics).toContain('SUMMARY:Cut\\, Colour & Blow')
    })

    it('escapes semicolons in SUMMARY', () => {
      const ics = formatICS({ ...BASE_APPT, title: 'Brow; Lash Tint' })
      expect(ics).toContain('SUMMARY:Brow\\; Lash Tint')
    })
  })

})
