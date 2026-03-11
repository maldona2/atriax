import { generateUID, generateICS } from './icsGenerator.js';
import fc from 'fast-check';

describe('icsGenerator', () => {
  describe('generateUID', () => {
    // Unit Tests
    
    it('generates UID from valid UUID', () => {
      const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
      const result = generateUID(appointmentId);
      
      expect(result).toBe('appointment-550e8400-e29b-41d4-a716-446655440000@anamnesia.pro');
    });

    it('generates same UID for same appointment ID', () => {
      const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
      const result1 = generateUID(appointmentId);
      const result2 = generateUID(appointmentId);
      
      expect(result1).toBe(result2);
    });

    it('generates different UIDs for different appointment IDs', () => {
      const appointmentId1 = '550e8400-e29b-41d4-a716-446655440000';
      const appointmentId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      
      const result1 = generateUID(appointmentId1);
      const result2 = generateUID(appointmentId2);
      
      expect(result1).not.toBe(result2);
    });

    it('handles UUID with uppercase letters', () => {
      const appointmentId = '550E8400-E29B-41D4-A716-446655440000';
      const result = generateUID(appointmentId);
      
      expect(result).toBe('appointment-550E8400-E29B-41D4-A716-446655440000@anamnesia.pro');
    });

    it('handles UUID with mixed case', () => {
      const appointmentId = '550e8400-E29b-41D4-a716-446655440000';
      const result = generateUID(appointmentId);
      
      expect(result).toBe('appointment-550e8400-E29b-41D4-a716-446655440000@anamnesia.pro');
    });

    it('trims whitespace from appointment ID', () => {
      const appointmentId = '  550e8400-e29b-41d4-a716-446655440000  ';
      const result = generateUID(appointmentId);
      
      expect(result).toBe('appointment-550e8400-e29b-41d4-a716-446655440000@anamnesia.pro');
    });

    // Error handling tests
    
    it('throws error for empty string', () => {
      expect(() => generateUID('')).toThrow('Invalid appointment ID: must be a non-empty string');
    });

    it('throws error for whitespace-only string', () => {
      expect(() => generateUID('   ')).toThrow('Invalid appointment ID: must not be empty or whitespace');
    });

    it('throws error for null input', () => {
      expect(() => generateUID(null as any)).toThrow('Invalid appointment ID: must be a non-empty string');
    });

    it('throws error for undefined input', () => {
      expect(() => generateUID(undefined as any)).toThrow('Invalid appointment ID: must be a non-empty string');
    });

    it('throws error for non-string input', () => {
      expect(() => generateUID(123 as any)).toThrow('Invalid appointment ID: must be a non-empty string');
    });

    it('throws error for invalid UUID format - too short', () => {
      expect(() => generateUID('550e8400-e29b-41d4-a716')).toThrow('Invalid appointment ID: must be a valid UUID format');
    });

    it('throws error for invalid UUID format - missing hyphens', () => {
      expect(() => generateUID('550e8400e29b41d4a716446655440000')).toThrow('Invalid appointment ID: must be a valid UUID format');
    });

    it('throws error for invalid UUID format - wrong hyphen positions', () => {
      expect(() => generateUID('550e8400-e29b41-d4a7-16-446655440000')).toThrow('Invalid appointment ID: must be a valid UUID format');
    });

    it('throws error for invalid UUID format - non-hex characters', () => {
      expect(() => generateUID('550e8400-e29b-41d4-a716-44665544000g')).toThrow('Invalid appointment ID: must be a valid UUID format');
    });

    it('throws error for invalid UUID format - special characters', () => {
      expect(() => generateUID('550e8400-e29b-41d4-a716-446655440000!')).toThrow('Invalid appointment ID: must be a valid UUID format');
    });

    // Property-Based Tests

    /**
     * **Validates: Requirements 4.1**
     * 
     * Property 9: UID Uniqueness
     * For any two appointments with different appointment IDs, their generated UIDs must be different.
     */
    it('property: different appointment IDs produce different UIDs', () => {
      // Arbitrary generator for valid UUIDs
      const uuidArbitrary = fc.uuid();

      fc.assert(
        fc.property(
          fc.tuple(uuidArbitrary, uuidArbitrary).filter(([id1, id2]) => id1 !== id2),
          ([appointmentId1, appointmentId2]) => {
            const uid1 = generateUID(appointmentId1);
            const uid2 = generateUID(appointmentId2);
            
            // Different appointment IDs must produce different UIDs
            expect(uid1).not.toBe(uid2);
            
            // Both UIDs should follow the correct format
            expect(uid1).toMatch(/^appointment-[0-9a-f-]+@anamnesia\.pro$/i);
            expect(uid2).toMatch(/^appointment-[0-9a-f-]+@anamnesia\.pro$/i);
            
            // UIDs should contain their respective appointment IDs
            expect(uid1).toContain(appointmentId1);
            expect(uid2).toContain(appointmentId2);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 4.2, 4.3, 3.3**
     * 
     * Property 10: UID Determinism
     * For any appointment ID, generating the UID multiple times should always produce the same result.
     */
    it('property: same appointment ID always produces same UID', () => {
      const uuidArbitrary = fc.uuid();

      fc.assert(
        fc.property(uuidArbitrary, (appointmentId) => {
          // Generate UID multiple times
          const uid1 = generateUID(appointmentId);
          const uid2 = generateUID(appointmentId);
          const uid3 = generateUID(appointmentId);
          
          // All UIDs must be identical
          expect(uid1).toBe(uid2);
          expect(uid2).toBe(uid3);
          
          // UID should follow the correct format
          expect(uid1).toBe(`appointment-${appointmentId}@anamnesia.pro`);
          
          // UID should contain the appointment ID
          expect(uid1).toContain(appointmentId);
          
          // UID should end with domain
          expect(uid1.endsWith('@anamnesia.pro')).toBe(true);
          
          // UID should start with prefix
          expect(uid1.startsWith('appointment-')).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Additional property: UID format validation
     * 
     * Verifies that all generated UIDs follow RFC 5545 format requirements:
     * - Contains @ symbol (domain portion)
     * - No whitespace
     * - Contains the original appointment ID
     */
    it('property: generated UIDs follow RFC 5545 format', () => {
      const uuidArbitrary = fc.uuid();

      fc.assert(
        fc.property(uuidArbitrary, (appointmentId) => {
          const uid = generateUID(appointmentId);
          
          // Must contain @ symbol for domain portion (RFC 5545 requirement)
          expect(uid).toContain('@');
          
          // Must not contain whitespace
          expect(uid).not.toMatch(/\s/);
          
          // Must contain the original appointment ID
          expect(uid).toContain(appointmentId);
          
          // Must have correct structure: prefix-id@domain
          const parts = uid.split('@');
          expect(parts).toHaveLength(2);
          expect(parts[0].startsWith('appointment-')).toBe(true);
          expect(parts[1]).toBe('anamnesia.pro');
          
          // The ID portion should be extractable
          const extractedId = parts[0].replace('appointment-', '');
          expect(extractedId).toBe(appointmentId);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Additional property: UID case preservation
     * 
     * Verifies that the UID preserves the case of the appointment ID.
     */
    it('property: UID preserves appointment ID case', () => {
      // Generate UUIDs with various case combinations
      const uuidWithCaseArbitrary = fc.uuid().map(uuid => {
        // Randomly uppercase some characters
        return uuid.split('').map(char => {
          if (Math.random() > 0.5 && /[a-f]/.test(char)) {
            return char.toUpperCase();
          }
          return char;
        }).join('');
      });

      fc.assert(
        fc.property(uuidWithCaseArbitrary, (appointmentId) => {
          const uid = generateUID(appointmentId);
          
          // The UID should contain the exact appointment ID (case preserved)
          expect(uid).toContain(appointmentId);
          
          // Extract the ID portion and verify it matches exactly
          const extractedId = uid.replace('appointment-', '').replace('@anamnesia.pro', '');
          expect(extractedId).toBe(appointmentId);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('generateICS', () => {
    // Helper function to create valid test options
    const createTestOptions = (overrides = {}) => ({
      appointmentId: '550e8400-e29b-41d4-a716-446655440000',
      patientName: 'Ana Martínez',
      patientEmail: 'ana@example.com',
      professionalName: 'Dr. María González',
      scheduledAt: new Date('2024-03-15T11:30:00-03:00'),
      durationMinutes: 60,
      notes: null,
      isCancellation: false,
      ...overrides,
    });

    describe('VCALENDAR component', () => {
      it('generates VCALENDAR wrapper with VERSION', () => {
        const options = createTestOptions();
        const result = generateICS(options);
        
        expect(result).toContain('BEGIN:VCALENDAR');
        expect(result).toContain('VERSION:2.0');
        expect(result).toContain('END:VCALENDAR');
      });

      it('includes PRODID in VCALENDAR', () => {
        const options = createTestOptions();
        const result = generateICS(options);
        
        expect(result).toContain('PRODID:-//AnamnesIA//Appointment Calendar//ES');
      });

      it('includes METHOD:REQUEST for non-cancellation events', () => {
        const options = createTestOptions({ isCancellation: false });
        const result = generateICS(options);
        
        expect(result).toContain('METHOD:REQUEST');
      });

      it('includes METHOD:CANCEL for cancellation events', () => {
        const options = createTestOptions({ isCancellation: true });
        const result = generateICS(options);
        
        expect(result).toContain('METHOD:CANCEL');
      });

      it('includes CALSCALE:GREGORIAN', () => {
        const options = createTestOptions();
        const result = generateICS(options);
        
        expect(result).toContain('CALSCALE:GREGORIAN');
      });
    });

    describe('VTIMEZONE component', () => {
      it('generates VTIMEZONE component for America/Argentina/Buenos_Aires', () => {
        const options = createTestOptions();
        const result = generateICS(options);
        
        expect(result).toContain('BEGIN:VTIMEZONE');
        expect(result).toContain('TZID:America/Argentina/Buenos_Aires');
        expect(result).toContain('END:VTIMEZONE');
      });

      it('includes STANDARD component with timezone offset', () => {
        const options = createTestOptions();
        const result = generateICS(options);
        
        expect(result).toContain('BEGIN:STANDARD');
        expect(result).toContain('DTSTART:19700101T000000');
        expect(result).toContain('TZOFFSETFROM:-0300');
        expect(result).toContain('TZOFFSETTO:-0300');
        expect(result).toContain('END:STANDARD');
      });

      it('places VTIMEZONE before VEVENT', () => {
        const options = createTestOptions();
        const result = generateICS(options);
        
        const vtimezoneIndex = result.indexOf('BEGIN:VTIMEZONE');
        const vcalendarIndex = result.indexOf('BEGIN:VCALENDAR');
        const endVcalendarIndex = result.indexOf('END:VCALENDAR');
        
        // VTIMEZONE should be after VCALENDAR begins
        expect(vtimezoneIndex).toBeGreaterThan(vcalendarIndex);
        // VTIMEZONE should be before VCALENDAR ends
        expect(vtimezoneIndex).toBeLessThan(endVcalendarIndex);
      });
    });

    describe('RFC 5545 formatting', () => {
      it('uses CRLF line breaks', () => {
        const options = createTestOptions();
        const result = generateICS(options);
        
        // Should contain CRLF (\r\n)
        expect(result).toContain('\r\n');
        
        // Should not have standalone LF without CR
        const lines = result.split('\r\n');
        lines.forEach(line => {
          expect(line).not.toContain('\n');
        });
      });

      it('has proper component nesting structure', () => {
        const options = createTestOptions();
        const result = generateICS(options);
        
        // Check proper nesting order
        const lines = result.split('\r\n');
        const beginVcalendar = lines.indexOf('BEGIN:VCALENDAR');
        const beginVtimezone = lines.findIndex(l => l === 'BEGIN:VTIMEZONE');
        const endVtimezone = lines.findIndex(l => l === 'END:VTIMEZONE');
        const endVcalendar = lines.indexOf('END:VCALENDAR');
        
        expect(beginVcalendar).toBe(0);
        expect(beginVtimezone).toBeGreaterThan(beginVcalendar);
        expect(endVtimezone).toBeGreaterThan(beginVtimezone);
        expect(endVcalendar).toBeGreaterThan(endVtimezone);
        expect(endVcalendar).toBe(lines.length - 1);
      });
    });

    describe('input validation', () => {
      it('throws error for missing appointmentId', () => {
        const options = createTestOptions({ appointmentId: '' });
        
        expect(() => generateICS(options)).toThrow('Missing required field: appointmentId');
      });

      it('throws error for missing scheduledAt', () => {
        const options = createTestOptions({ scheduledAt: null });
        
        expect(() => generateICS(options as any)).toThrow('Missing or invalid required field: scheduledAt');
      });

      it('throws error for invalid scheduledAt (not a Date)', () => {
        const options = createTestOptions({ scheduledAt: '2024-03-15' });
        
        expect(() => generateICS(options as any)).toThrow('Missing or invalid required field: scheduledAt');
      });

      it('throws error for invalid Date object (NaN)', () => {
        const options = createTestOptions({ scheduledAt: new Date('invalid') });
        
        expect(() => generateICS(options)).toThrow('Invalid date: scheduledAt is not a valid Date object');
      });

      it('throws error for missing durationMinutes', () => {
        const options = createTestOptions({ durationMinutes: 0 });
        
        expect(() => generateICS(options)).toThrow('Missing or invalid required field: durationMinutes');
      });

      it('throws error for negative durationMinutes', () => {
        const options = createTestOptions({ durationMinutes: -30 });
        
        expect(() => generateICS(options)).toThrow('Missing or invalid required field: durationMinutes');
      });

      it('throws error for missing patientEmail', () => {
        const options = createTestOptions({ patientEmail: '' });
        
        expect(() => generateICS(options)).toThrow('Missing required field: patientEmail');
      });

      it('accepts very long duration without throwing', () => {
        const options = createTestOptions({ durationMinutes: 2000 });
        
        // Should not throw, just log a warning
        expect(() => generateICS(options)).not.toThrow();
      });

      it('truncates notes exceeding 10,000 characters', () => {
        const longNotes = 'A'.repeat(10500);
        const options = createTestOptions({ notes: longNotes });
        
        const result = generateICS(options);
        
        // Should contain truncated notes with "..." suffix
        expect(result).toContain('DESCRIPTION:' + 'A'.repeat(9997) + '...');
        expect(result).not.toContain('A'.repeat(10500));
      });

      it('does not truncate notes at exactly 10,000 characters', () => {
        const notes = 'A'.repeat(10000);
        const options = createTestOptions({ notes });
        
        const result = generateICS(options);
        
        // Should contain full notes without truncation
        expect(result).toContain('DESCRIPTION:' + notes);
        expect(result).not.toContain('...');
      });

      it('does not truncate notes below 10,000 characters', () => {
        const notes = 'A'.repeat(9999);
        const options = createTestOptions({ notes });
        
        const result = generateICS(options);
        
        // Should contain full notes without truncation
        expect(result).toContain('DESCRIPTION:' + notes);
        expect(result).not.toContain('...');
      });

      it('handles null professional name', () => {
        const options = createTestOptions({ professionalName: null });
        
        const result = generateICS(options as any);
        
        expect(result).toContain('SUMMARY:Unknown - Consulta');
      });

      it('handles undefined professional name', () => {
        const options = createTestOptions({ professionalName: undefined });
        
        const result = generateICS(options as any);
        
        expect(result).toContain('SUMMARY:Unknown - Consulta');
      });

      it('handles null patient name', () => {
        const options = createTestOptions({ patientName: null });
        
        const result = generateICS(options as any);
        
        expect(result).toContain('ATTENDEE;CN=Unknown;RSVP=FALSE:mailto:');
      });

      it('handles undefined patient name', () => {
        const options = createTestOptions({ patientName: undefined });
        
        const result = generateICS(options as any);
        
        expect(result).toContain('ATTENDEE;CN=Unknown;RSVP=FALSE:mailto:');
      });
    });

    describe('VEVENT component', () => {
      it('generates VEVENT component', () => {
        const options = createTestOptions();
        const result = generateICS(options);
        
        expect(result).toContain('BEGIN:VEVENT');
        expect(result).toContain('END:VEVENT');
      });

      it('includes UID generated from appointment ID', () => {
        const options = createTestOptions({
          appointmentId: '550e8400-e29b-41d4-a716-446655440000'
        });
        const result = generateICS(options);
        
        expect(result).toContain('UID:appointment-550e8400-e29b-41d4-a716-446655440000@anamnesia.pro');
      });

      it('includes DTSTAMP in UTC format', () => {
        const options = createTestOptions();
        const result = generateICS(options);
        
        // Should contain DTSTAMP with UTC format (ends with Z)
        expect(result).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
      });

      it('includes DTSTART with TZID parameter', () => {
        const options = createTestOptions({
          scheduledAt: new Date('2024-03-15T11:30:00-03:00')
        });
        const result = generateICS(options);
        
        expect(result).toContain('DTSTART;TZID=America/Argentina/Buenos_Aires:20240315T113000');
      });

      it('calculates DTEND from start time and duration', () => {
        const options = createTestOptions({
          scheduledAt: new Date('2024-03-15T11:30:00-03:00'),
          durationMinutes: 60
        });
        const result = generateICS(options);
        
        // 11:30 + 60 minutes = 12:30
        expect(result).toContain('DTEND;TZID=America/Argentina/Buenos_Aires:20240315T123000');
      });

      it('calculates DTEND correctly for 30 minute duration', () => {
        const options = createTestOptions({
          scheduledAt: new Date('2024-03-15T14:00:00-03:00'),
          durationMinutes: 30
        });
        const result = generateICS(options);
        
        // 14:00 + 30 minutes = 14:30
        expect(result).toContain('DTEND;TZID=America/Argentina/Buenos_Aires:20240315T143000');
      });

      it('calculates DTEND correctly for 90 minute duration', () => {
        const options = createTestOptions({
          scheduledAt: new Date('2024-03-15T10:00:00-03:00'),
          durationMinutes: 90
        });
        const result = generateICS(options);
        
        // 10:00 + 90 minutes = 11:30
        expect(result).toContain('DTEND;TZID=America/Argentina/Buenos_Aires:20240315T113000');
      });

      it('includes SUMMARY with professional name', () => {
        const options = createTestOptions({
          professionalName: 'Dr. María González'
        });
        const result = generateICS(options);
        
        expect(result).toContain('SUMMARY:Dr. María González - Consulta');
      });

      it('includes ORGANIZER with professional name', () => {
        const options = createTestOptions({
          professionalName: 'Dr. María González'
        });
        const result = generateICS(options);
        
        expect(result).toContain('ORGANIZER;CN=Dr. María González:noreply@anamnesia.pro');
      });

      it('includes ATTENDEE with patient name and email', () => {
        const options = createTestOptions({
          patientName: 'Ana Martínez',
          patientEmail: 'ana@example.com'
        });
        const result = generateICS(options);
        
        expect(result).toContain('ATTENDEE;CN=Ana Martínez;RSVP=FALSE:mailto:ana@example.com');
      });

      it('sets STATUS to CONFIRMED for non-cancellation events', () => {
        const options = createTestOptions({
          isCancellation: false
        });
        const result = generateICS(options);
        
        expect(result).toContain('STATUS:CONFIRMED');
      });

      it('sets STATUS to CANCELLED for cancellation events', () => {
        const options = createTestOptions({
          isCancellation: true
        });
        const result = generateICS(options);
        
        expect(result).toContain('STATUS:CANCELLED');
      });

      it('sets SEQUENCE to 0 for new events', () => {
        const options = createTestOptions({
          isCancellation: false
        });
        const result = generateICS(options);
        
        expect(result).toContain('SEQUENCE:0');
      });

      it('sets SEQUENCE to 1 for cancellation events', () => {
        const options = createTestOptions({
          isCancellation: true
        });
        const result = generateICS(options);
        
        expect(result).toContain('SEQUENCE:1');
      });

      it('uses default "Unknown" for empty professional name', () => {
        const options = createTestOptions({
          professionalName: ''
        });
        const result = generateICS(options);
        
        expect(result).toContain('SUMMARY:Unknown - Consulta');
        expect(result).toContain('ORGANIZER;CN=Unknown:noreply@anamnesia.pro');
      });

      it('uses default "Unknown" for empty patient name', () => {
        const options = createTestOptions({
          patientName: ''
        });
        const result = generateICS(options);
        
        expect(result).toContain('ATTENDEE;CN=Unknown;RSVP=FALSE:mailto:');
      });

      it('escapes special characters in professional name', () => {
        const options = createTestOptions({
          professionalName: 'Dr. Smith, PhD; MD'
        });
        const result = generateICS(options);
        
        // Comma and semicolon should be escaped
        expect(result).toContain('SUMMARY:Dr. Smith\\, PhD\\; MD - Consulta');
        expect(result).toContain('ORGANIZER;CN=Dr. Smith\\, PhD\\; MD:noreply@anamnesia.pro');
      });

      it('escapes special characters in patient name', () => {
        const options = createTestOptions({
          patientName: 'John, Jr.; Smith'
        });
        const result = generateICS(options);
        
        // Comma and semicolon should be escaped
        expect(result).toContain('ATTENDEE;CN=John\\, Jr.\\; Smith;RSVP=FALSE:mailto:');
      });

      it('places VEVENT after VTIMEZONE', () => {
        const options = createTestOptions();
        const result = generateICS(options);
        
        const vtimezoneIndex = result.indexOf('BEGIN:VTIMEZONE');
        const endVtimezoneIndex = result.indexOf('END:VTIMEZONE');
        const veventIndex = result.indexOf('BEGIN:VEVENT');
        
        expect(veventIndex).toBeGreaterThan(endVtimezoneIndex);
        expect(veventIndex).toBeGreaterThan(vtimezoneIndex);
      });

      it('generates complete ICS with all required fields', () => {
        const options = createTestOptions({
          appointmentId: '550e8400-e29b-41d4-a716-446655440000',
          patientName: 'Ana Martínez',
          patientEmail: 'ana@example.com',
          professionalName: 'Dr. María González',
          scheduledAt: new Date('2024-03-15T11:30:00-03:00'),
          durationMinutes: 60,
          isCancellation: false
        });
        const result = generateICS(options);
        
        // Verify all required components are present
        expect(result).toContain('BEGIN:VCALENDAR');
        expect(result).toContain('VERSION:2.0');
        expect(result).toContain('METHOD:REQUEST');
        expect(result).toContain('BEGIN:VTIMEZONE');
        expect(result).toContain('TZID:America/Argentina/Buenos_Aires');
        expect(result).toContain('END:VTIMEZONE');
        expect(result).toContain('BEGIN:VEVENT');
        expect(result).toContain('UID:appointment-550e8400-e29b-41d4-a716-446655440000@anamnesia.pro');
        expect(result).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
        expect(result).toContain('DTSTART;TZID=America/Argentina/Buenos_Aires:20240315T113000');
        expect(result).toContain('DTEND;TZID=America/Argentina/Buenos_Aires:20240315T123000');
        expect(result).toContain('SUMMARY:Dr. María González - Consulta');
        expect(result).toContain('ORGANIZER;CN=Dr. María González:noreply@anamnesia.pro');
        expect(result).toContain('ATTENDEE;CN=Ana Martínez;RSVP=FALSE:mailto:ana@example.com');
        expect(result).toContain('STATUS:CONFIRMED');
        expect(result).toContain('SEQUENCE:0');
        expect(result).toContain('END:VEVENT');
        expect(result).toContain('END:VCALENDAR');
      });
    });

    describe('DESCRIPTION field (notes)', () => {
      it('includes DESCRIPTION field when notes are provided', () => {
        const options = createTestOptions({
          notes: 'Patient has allergies to penicillin'
        });
        const result = generateICS(options);
        
        expect(result).toContain('DESCRIPTION:Patient has allergies to penicillin');
      });

      it('omits DESCRIPTION field when notes are null', () => {
        const options = createTestOptions({
          notes: null
        });
        const result = generateICS(options);
        
        expect(result).not.toContain('DESCRIPTION:');
      });

      it('omits DESCRIPTION field when notes are undefined', () => {
        const options = createTestOptions({
          notes: undefined
        });
        const result = generateICS(options);
        
        expect(result).not.toContain('DESCRIPTION:');
      });

      it('omits DESCRIPTION field when notes are empty string', () => {
        const options = createTestOptions({
          notes: ''
        });
        const result = generateICS(options);
        
        expect(result).not.toContain('DESCRIPTION:');
      });

      it('omits DESCRIPTION field when notes are whitespace only', () => {
        const options = createTestOptions({
          notes: '   '
        });
        const result = generateICS(options);
        
        expect(result).not.toContain('DESCRIPTION:');
      });

      it('escapes special characters in notes', () => {
        const options = createTestOptions({
          notes: 'Patient has allergies, needs special care; important note'
        });
        const result = generateICS(options);
        
        expect(result).toContain('DESCRIPTION:Patient has allergies\\, needs special care\\; important note');
      });

      it('escapes newlines in notes', () => {
        const options = createTestOptions({
          notes: 'Line 1\nLine 2\nLine 3'
        });
        const result = generateICS(options);
        
        expect(result).toContain('DESCRIPTION:Line 1\\nLine 2\\nLine 3');
      });

      it('escapes backslashes in notes', () => {
        const options = createTestOptions({
          notes: 'Path\\to\\file'
        });
        const result = generateICS(options);
        
        expect(result).toContain('DESCRIPTION:Path\\\\to\\\\file');
      });

      it('handles notes with multiple special characters', () => {
        const options = createTestOptions({
          notes: 'Important: Patient has allergies, see notes;\nFollow up required\\urgent'
        });
        const result = generateICS(options);
        
        expect(result).toContain('DESCRIPTION:Important: Patient has allergies\\, see notes\\;\\nFollow up required\\\\urgent');
      });

      it('places DESCRIPTION after SUMMARY and before ORGANIZER', () => {
        const options = createTestOptions({
          notes: 'Test notes'
        });
        const result = generateICS(options);
        
        const summaryIndex = result.indexOf('SUMMARY:');
        const descriptionIndex = result.indexOf('DESCRIPTION:');
        const organizerIndex = result.indexOf('ORGANIZER;');
        
        expect(descriptionIndex).toBeGreaterThan(summaryIndex);
        expect(organizerIndex).toBeGreaterThan(descriptionIndex);
      });

      it('handles very long notes', () => {
        const longNotes = 'A'.repeat(500);
        const options = createTestOptions({
          notes: longNotes
        });
        const result = generateICS(options);
        
        expect(result).toContain('DESCRIPTION:' + longNotes);
      });

      it('handles notes with Spanish characters and accents', () => {
        const options = createTestOptions({
          notes: 'Paciente tiene alergias a la penicilina. Requiere atención especial.'
        });
        const result = generateICS(options);
        
        expect(result).toContain('DESCRIPTION:Paciente tiene alergias a la penicilina. Requiere atención especial.');
      });
    });
  });
});
