/**
 * ICS Parser Utility for Testing
 * 
 * Provides basic parsing functionality for ICS (iCalendar) files to support
 * round-trip validation in tests. This parser extracts key fields from VEVENT
 * components to verify that generated ICS data can be parsed back correctly.
 * 
 * Note: This is a simplified parser designed for testing purposes only.
 * It does not implement full RFC 5545 parsing capabilities.
 * 
 * Requirements: 5.5
 */

/**
 * Parsed event data structure extracted from an ICS file.
 * Contains the key fields needed for round-trip validation.
 */
export interface ParsedICSEvent {
  /** Unique identifier for the event */
  uid: string;
  /** Event summary/title */
  summary: string;
  /** Optional event description */
  description?: string;
  /** Event start time */
  startTime: Date;
  /** Event end time */
  endTime: Date;
  /** Duration in minutes (calculated from start and end times) */
  durationMinutes: number;
  /** Organizer name */
  organizerName: string;
  /** Attendee name */
  attendeeName: string;
  /** Attendee email */
  attendeeEmail: string;
  /** Event status (CONFIRMED or CANCELLED) */
  status: 'CONFIRMED' | 'CANCELLED';
  /** Calendar method (REQUEST or CANCEL) */
  method: 'REQUEST' | 'CANCEL';
  /** Timezone ID used for the event */
  timezone?: string;
}

/**
 * Unescapes ICS text by converting escaped sequences back to their original characters.
 * 
 * Handles the following escape sequences per RFC 5545:
 * - \\n → newline
 * - \\, → comma
 * - \\; → semicolon
 * - \\\\ → backslash
 * 
 * @param text - The escaped ICS text
 * @returns The unescaped text
 */
function unescapeICSText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Unfolds ICS lines by removing continuation line breaks.
 * 
 * Per RFC 5545, long lines are folded by inserting CRLF followed by a space.
 * This function reverses that process by removing CRLF+space sequences.
 * 
 * @param icsContent - The raw ICS content with folded lines
 * @returns The unfolded content
 */
function unfoldLines(icsContent: string): string {
  // Remove CRLF followed by space (line continuation)
  return icsContent.replace(/\r\n /g, '');
}

/**
 * Parses an ICS timestamp string into a Date object.
 * 
 * Supports two formats:
 * - UTC format: YYYYMMDDTHHmmssZ
 * - Local format: YYYYMMDDTHHmmss
 * 
 * @param timestamp - The ICS timestamp string
 * @param isUTC - Whether the timestamp is in UTC format (default: false)
 * @returns The parsed Date object
 */
function parseICSTimestamp(timestamp: string, isUTC: boolean = false): Date {
  // Extract date and time components
  const year = parseInt(timestamp.substring(0, 4), 10);
  const month = parseInt(timestamp.substring(4, 6), 10) - 1; // Month is 0-indexed
  const day = parseInt(timestamp.substring(6, 8), 10);
  const hour = parseInt(timestamp.substring(9, 11), 10);
  const minute = parseInt(timestamp.substring(11, 13), 10);
  const second = parseInt(timestamp.substring(13, 15), 10);

  if (isUTC || timestamp.endsWith('Z')) {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  } else {
    return new Date(year, month, day, hour, minute, second);
  }
}

/**
 * Extracts the value from a CN (Common Name) parameter.
 * 
 * Example: "CN=Dr. Smith;RSVP=FALSE" → "Dr. Smith"
 * 
 * Note: The CN value may contain escaped semicolons (\;) which should not
 * be treated as parameter separators. We need to match until we find an
 * unescaped semicolon or colon.
 * 
 * @param line - The ICS line containing CN parameter
 * @returns The extracted CN value, or empty string if not found
 */
function extractCN(line: string): string {
  // Match CN= followed by characters until we hit an unescaped semicolon or colon
  // This regex matches: CN= followed by any characters, but stops at ; or : that aren't preceded by \
  const cnMatch = line.match(/CN=([^:]+?)(?:;[A-Z]|:)/);
  if (cnMatch) {
    return unescapeICSText(cnMatch[1]);
  }
  return '';
}

/**
 * Extracts the email address from an ATTENDEE line.
 * 
 * Example: "ATTENDEE;CN=John;RSVP=FALSE:mailto:john@example.com" → "john@example.com"
 * 
 * @param line - The ATTENDEE line
 * @returns The extracted email address, or empty string if not found
 */
function extractEmail(line: string): string {
  const emailMatch = line.match(/mailto:([^\s]+)/);
  if (emailMatch) {
    return emailMatch[1];
  }
  return '';
}

/**
 * Parses an ICS file and extracts event data from the VEVENT component.
 * 
 * This parser handles:
 * - Line unfolding (CRLF + space continuation)
 * - Special character unescaping
 * - Timestamp parsing (UTC and local formats)
 * - VEVENT field extraction
 * - Duration calculation
 * 
 * @param icsContent - The complete ICS file content as a string
 * @returns Parsed event data structure
 * @throws {Error} If the ICS content is invalid or missing required fields
 */
export function parseICS(icsContent: string): ParsedICSEvent {
  // Unfold lines first
  const unfolded = unfoldLines(icsContent);
  
  // Split into lines
  const lines = unfolded.split(/\r\n/);

  // Initialize result object
  const result: Partial<ParsedICSEvent> = {};

  // Track if we're inside a VEVENT component
  let inVEvent = false;

  // Parse each line
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inVEvent = true;
      continue;
    }

    if (line === 'END:VEVENT') {
      inVEvent = false;
      continue;
    }

    // Only parse lines inside VEVENT
    if (!inVEvent) {
      // Check for METHOD in VCALENDAR
      if (line.startsWith('METHOD:')) {
        const method = line.substring(7).trim();
        result.method = method as 'REQUEST' | 'CANCEL';
      }
      continue;
    }

    // Parse VEVENT fields
    if (line.startsWith('UID:')) {
      result.uid = line.substring(4).trim();
    } else if (line.startsWith('SUMMARY:')) {
      result.summary = unescapeICSText(line.substring(8));
    } else if (line.startsWith('DESCRIPTION:')) {
      result.description = unescapeICSText(line.substring(12));
    } else if (line.startsWith('DTSTART')) {
      // Extract timezone if present
      const tzidMatch = line.match(/TZID=([^:]+)/);
      if (tzidMatch) {
        result.timezone = tzidMatch[1];
      }
      
      // Extract timestamp
      const timestampMatch = line.match(/:(\d{8}T\d{6}Z?)/);
      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        result.startTime = parseICSTimestamp(timestamp, timestamp.endsWith('Z'));
      }
    } else if (line.startsWith('DTEND')) {
      // Extract timestamp
      const timestampMatch = line.match(/:(\d{8}T\d{6}Z?)/);
      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        result.endTime = parseICSTimestamp(timestamp, timestamp.endsWith('Z'));
      }
    } else if (line.startsWith('ORGANIZER')) {
      result.organizerName = extractCN(line);
    } else if (line.startsWith('ATTENDEE')) {
      result.attendeeName = extractCN(line);
      result.attendeeEmail = extractEmail(line);
    } else if (line.startsWith('STATUS:')) {
      const status = line.substring(7).trim();
      result.status = status as 'CONFIRMED' | 'CANCELLED';
    }
  }

  // Validate required fields
  if (!result.uid) {
    throw new Error('Missing required field: UID');
  }
  if (!result.summary) {
    throw new Error('Missing required field: SUMMARY');
  }
  if (!result.startTime) {
    throw new Error('Missing required field: DTSTART');
  }
  if (!result.endTime) {
    throw new Error('Missing required field: DTEND');
  }
  if (!result.status) {
    throw new Error('Missing required field: STATUS');
  }
  if (!result.method) {
    throw new Error('Missing required field: METHOD');
  }

  // Calculate duration in minutes
  const durationMs = result.endTime.getTime() - result.startTime.getTime();
  result.durationMinutes = Math.round(durationMs / (60 * 1000));

  // Set default values for optional fields
  if (!result.organizerName) {
    result.organizerName = '';
  }
  if (!result.attendeeName) {
    result.attendeeName = '';
  }
  if (!result.attendeeEmail) {
    result.attendeeEmail = '';
  }

  return result as ParsedICSEvent;
}
