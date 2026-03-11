# Implementation Plan: Appointment Calendar ICS

## Overview

This implementation adds iCalendar (.ics) file attachments to appointment emails by creating two new service modules (ICS Generator and ICS Formatter) and updating the existing mail service to attach generated ICS files. The implementation follows RFC 5545 specifications for maximum email client compatibility.

## Tasks

- [x] 1. Set up ICS formatter module with RFC 5545 formatting utilities
  - Create `backend/src/services/icsFormatter.ts`
  - Implement special character escaping function (comma, semicolon, backslash, newline)
  - Implement line folding function (75 octet limit with continuation)
  - Implement CRLF line break formatting
  - Implement timestamp formatting (UTC and TZID formats)
  - Export formatter interface and functions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 1.5_

- [x] 1.1 Write property test for special character escaping
  - **Property 13: Special Character Escaping**
  - **Validates: Requirements 5.3, 5.4**

- [x] 1.2 Write property test for line folding
  - **Property 12: Line Folding**
  - **Validates: Requirements 5.2**

- [ ]* 1.3 Write property test for CRLF line breaks
  - **Property 11: CRLF Line Breaks**
  - **Validates: Requirements 5.1**

- [ ]* 1.4 Write property test for timestamp format compliance
  - **Property 4: Timestamp Format Compliance**
  - **Validates: Requirements 1.5**

- [x] 2. Implement UID generator with deterministic generation
  - Create UID generation function in `backend/src/services/icsGenerator.ts`
  - Implement format: `appointment-{appointmentId}@anamnesia.pro`
  - Add input validation for appointment ID
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 2.1 Write property test for UID uniqueness
  - **Property 9: UID Uniqueness**
  - **Validates: Requirements 4.1**

- [ ]* 2.2 Write property test for UID determinism
  - **Property 10: UID Determinism**
  - **Validates: Requirements 4.2, 4.3, 3.3**

- [ ] 3. Implement ICS generator core functionality
  - [x] 3.1 Create ICS generator module structure
    - Create `backend/src/services/icsGenerator.ts` with interfaces
    - Define `ICSEventData` and `ICSGeneratorOptions` interfaces
    - Implement `generateICS` main function signature
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Implement VCALENDAR and VTIMEZONE components
    - Generate VCALENDAR wrapper with VERSION, PRODID, METHOD, CALSCALE
    - Generate VTIMEZONE component for America/Argentina/Buenos_Aires
    - Include STANDARD component with timezone offset (-0300)
    - _Requirements: 1.1, 1.3_

  - [x] 3.3 Implement VEVENT component generation
    - Generate UID using UID generator function
    - Calculate and format DTSTAMP (current time in UTC)
    - Calculate and format DTSTART with TZID parameter
    - Calculate DTEND from start time and duration
    - Generate SUMMARY with professional name
    - Generate ORGANIZER with professional name
    - Generate ATTENDEE with patient name and email
    - Set STATUS to CONFIRMED for active appointments
    - Set SEQUENCE to 0 for new events
    - _Requirements: 1.2, 1.4, 1.6, 1.7, 7.1, 7.3, 7.4_

  - [x] 3.4 Implement optional DESCRIPTION field for notes
    - Check if notes exist and are non-null
    - Escape special characters in notes using formatter
    - Add DESCRIPTION field to VEVENT when notes present
    - Omit DESCRIPTION field when notes are null/undefined
    - _Requirements: 7.2_

  - [x] 3.5 Implement cancellation event generation
    - Set METHOD to CANCEL in VCALENDAR for cancelled appointments
    - Set STATUS to CANCELLED in VEVENT for cancelled appointments
    - Increment SEQUENCE to 1 for cancellation events
    - Maintain same UID as original event
    - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 3.6 Write property test for required fields presence
  - **Property 2: Required Fields Presence**
  - **Validates: Requirements 1.2, 1.3, 1.6, 1.7, 7.1, 7.3**

- [ ]* 3.7 Write property test for end time calculation
  - **Property 3: End Time Calculation**
  - **Validates: Requirements 1.4**

- [ ]* 3.8 Write property test for notes inclusion
  - **Property 5: Notes Inclusion**
  - **Validates: Requirements 7.2**

- [ ]* 3.9 Write property test for cancellation method and status
  - **Property 8: Cancellation Method and Status**
  - **Validates: Requirements 3.1, 3.2**

- [ ]* 3.10 Write property test for confirmed status
  - **Property 14: Confirmed Status for Active Appointments**
  - **Validates: Requirements 7.4**

- [x] 4. Checkpoint - Ensure ICS generation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Update mail service to support ICS attachments
  - [x] 5.1 Add attachment support to mail service interface
    - Update `backend/src/services/mailService.ts`
    - Define `EmailAttachment` interface (filename, content, type)
    - Update `send` function signature to accept optional attachments array
    - _Requirements: 2.4, 2.5_

  - [x] 5.2 Integrate ICS generator with mail service
    - Import ICS generator functions
    - Generate ICS data from appointment information
    - Create attachment object with filename "appointment.ics"
    - Set MIME type to "text/calendar"
    - Pass attachment to Resend API in email payload
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.3 Implement graceful degradation for ICS failures
    - Wrap ICS generation in try-catch block
    - Log errors if ICS generation fails
    - Send email without attachment if generation fails
    - Ensure email delivery is not blocked by attachment failures
    - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 5.4 Write property test for attachment presence
  - **Property 6: Attachment Presence for Non-Cancellation Emails**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ]* 5.5 Write property test for attachment format
  - **Property 7: Attachment Format**
  - **Validates: Requirements 2.4, 2.5**

- [ ] 6. Implement round-trip validation for ICS generation
  - [x] 6.1 Add ICS parsing utility for testing
    - Create basic ICS parser in test utilities
    - Parse VEVENT component fields
    - Extract timestamps, summary, description, status
    - Return parsed data structure for comparison
    - _Requirements: 5.5_

  - [ ]* 6.2 Write property test for round-trip preservation
    - **Property 1: ICS Round-Trip Preservation**
    - **Validates: Requirements 1.1, 5.5**

- [x] 7. Add error handling and input validation
  - Add validation for required fields (appointmentId, scheduledAt, durationMinutes)
  - Throw appropriate errors for missing or invalid inputs
  - Handle edge cases (empty names, very long notes, null values)
  - Add logging for error conditions
  - Implement text truncation for notes exceeding 10,000 characters
  - _Requirements: 1.1, 1.2, 1.4, 7.2_

- [ ]* 7.1 Write unit tests for error handling
  - Test missing appointment ID throws error
  - Test invalid date throws error
  - Test invalid duration throws error
  - Test empty names use default values
  - Test very long notes are truncated

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across random inputs
- Unit tests validate specific examples and error conditions
- ICS formatter is implemented first as it's a dependency for the generator
- Round-trip validation ensures RFC 5545 compliance
- Graceful degradation ensures email delivery even if ICS generation fails
