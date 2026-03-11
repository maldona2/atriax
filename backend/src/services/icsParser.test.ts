/**
 * Tests for ICS Parser Utility
 * 
 * Validates that the parser can correctly extract event data from ICS files.
 * These tests ensure the parser works correctly for round-trip validation.
 */

import { parseICS, ParsedICSEvent } from './icsParser.js';

describe('icsParser', () => {
  describe('parseICS', () => {
    it('parses basic ICS with required fields', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Dr. Smith - Consulta',
        'DTSTART:20240315T113000',
        'DTEND:20240315T123000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.uid).toBe('appointment-123@anamnesia.pro');
      expect(result.summary).toBe('Dr. Smith - Consulta');
      expect(result.status).toBe('CONFIRMED');
      expect(result.method).toBe('REQUEST');
      expect(result.startTime).toEqual(new Date(2024, 2, 15, 11, 30, 0));
      expect(result.endTime).toEqual(new Date(2024, 2, 15, 12, 30, 0));
      expect(result.durationMinutes).toBe(60);
    });

    it('parses ICS with timezone information', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'DTSTART;TZID=America/Argentina/Buenos_Aires:20240315T113000',
        'DTEND;TZID=America/Argentina/Buenos_Aires:20240315T123000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.timezone).toBe('America/Argentina/Buenos_Aires');
      expect(result.startTime).toEqual(new Date(2024, 2, 15, 11, 30, 0));
      expect(result.endTime).toEqual(new Date(2024, 2, 15, 12, 30, 0));
    });

    it('parses ICS with UTC timestamps', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'DTSTART:20240315T143000Z',
        'DTEND:20240315T153000Z',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.startTime).toEqual(new Date(Date.UTC(2024, 2, 15, 14, 30, 0)));
      expect(result.endTime).toEqual(new Date(Date.UTC(2024, 2, 15, 15, 30, 0)));
      expect(result.durationMinutes).toBe(60);
    });

    it('parses ICS with description field', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'DESCRIPTION:Important meeting notes',
        'DTSTART:20240315T113000',
        'DTEND:20240315T123000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.description).toBe('Important meeting notes');
    });

    it('parses ICS with organizer information', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'ORGANIZER;CN=Dr. Smith:noreply@anamnesia.pro',
        'DTSTART:20240315T113000',
        'DTEND:20240315T123000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.organizerName).toBe('Dr. Smith');
    });

    it('parses ICS with attendee information', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'ATTENDEE;CN=John Doe;RSVP=FALSE:mailto:john@example.com',
        'DTSTART:20240315T113000',
        'DTEND:20240315T123000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.attendeeName).toBe('John Doe');
      expect(result.attendeeEmail).toBe('john@example.com');
    });

    it('parses ICS with cancellation method', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:CANCEL',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'DTSTART:20240315T113000',
        'DTEND:20240315T123000',
        'STATUS:CANCELLED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.method).toBe('CANCEL');
      expect(result.status).toBe('CANCELLED');
    });

    it('unescapes special characters in text fields', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Dr. Smith\\, PhD\\; MD - Consulta',
        'DESCRIPTION:Line 1\\nLine 2\\nPath\\\\to\\\\file',
        'ORGANIZER;CN=Dr. Smith\\, PhD:noreply@anamnesia.pro',
        'DTSTART:20240315T113000',
        'DTEND:20240315T123000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.summary).toBe('Dr. Smith, PhD; MD - Consulta');
      expect(result.description).toBe('Line 1\nLine 2\nPath\\to\\file');
      expect(result.organizerName).toBe('Dr. Smith, PhD');
    });

    it('unfolds long lines', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:This is a very long summary that has been folded across multiple',
        ' lines according to RFC 5545 specifications',
        'DTSTART:20240315T113000',
        'DTEND:20240315T123000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.summary).toBe(
        'This is a very long summary that has been folded across multiple' +
        'lines according to RFC 5545 specifications'
      );
    });

    it('calculates duration correctly for 30 minutes', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'DTSTART:20240315T140000',
        'DTEND:20240315T143000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.durationMinutes).toBe(30);
    });

    it('calculates duration correctly for 90 minutes', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'DTSTART:20240315T100000',
        'DTEND:20240315T113000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.durationMinutes).toBe(90);
    });

    it('throws error for missing UID', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'SUMMARY:Meeting',
        'DTSTART:20240315T113000',
        'DTEND:20240315T123000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      expect(() => parseICS(ics)).toThrow('Missing required field: UID');
    });

    it('throws error for missing SUMMARY', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'DTSTART:20240315T113000',
        'DTEND:20240315T123000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      expect(() => parseICS(ics)).toThrow('Missing required field: SUMMARY');
    });

    it('throws error for missing DTSTART', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'DTEND:20240315T123000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      expect(() => parseICS(ics)).toThrow('Missing required field: DTSTART');
    });

    it('throws error for missing DTEND', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'DTSTART:20240315T113000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      expect(() => parseICS(ics)).toThrow('Missing required field: DTEND');
    });

    it('throws error for missing STATUS', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'DTSTART:20240315T113000',
        'DTEND:20240315T123000',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      expect(() => parseICS(ics)).toThrow('Missing required field: STATUS');
    });

    it('throws error for missing METHOD', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'UID:appointment-123@anamnesia.pro',
        'SUMMARY:Meeting',
        'DTSTART:20240315T113000',
        'DTEND:20240315T123000',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      expect(() => parseICS(ics)).toThrow('Missing required field: METHOD');
    });

    it('handles ICS with complete appointment data', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AnamnesIA//Appointment Calendar//ES',
        'METHOD:REQUEST',
        'CALSCALE:GREGORIAN',
        'BEGIN:VTIMEZONE',
        'TZID:America/Argentina/Buenos_Aires',
        'BEGIN:STANDARD',
        'DTSTART:19700101T000000',
        'TZOFFSETFROM:-0300',
        'TZOFFSETTO:-0300',
        'END:STANDARD',
        'END:VTIMEZONE',
        'BEGIN:VEVENT',
        'UID:appointment-550e8400-e29b-41d4-a716-446655440000@anamnesia.pro',
        'DTSTAMP:20240315T143000Z',
        'DTSTART;TZID=America/Argentina/Buenos_Aires:20240315T113000',
        'DTEND;TZID=America/Argentina/Buenos_Aires:20240315T123000',
        'SUMMARY:Dr. María González - Consulta',
        'DESCRIPTION:Patient has allergies to penicillin',
        'ORGANIZER;CN=Dr. María González:noreply@anamnesia.pro',
        'ATTENDEE;CN=Ana Martínez;RSVP=FALSE:mailto:ana@example.com',
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const result = parseICS(ics);

      expect(result.uid).toBe('appointment-550e8400-e29b-41d4-a716-446655440000@anamnesia.pro');
      expect(result.summary).toBe('Dr. María González - Consulta');
      expect(result.description).toBe('Patient has allergies to penicillin');
      expect(result.organizerName).toBe('Dr. María González');
      expect(result.attendeeName).toBe('Ana Martínez');
      expect(result.attendeeEmail).toBe('ana@example.com');
      expect(result.status).toBe('CONFIRMED');
      expect(result.method).toBe('REQUEST');
      expect(result.timezone).toBe('America/Argentina/Buenos_Aires');
      expect(result.durationMinutes).toBe(60);
    });
  });
});
