/**
 * ICS Generator Module
 * 
 * Generates RFC 5545-compliant iCalendar data for appointment events.
 * Provides UID generation with deterministic format based on appointment ID.
 * 
 * Requirements: 1.1, 1.2, 4.1, 4.2, 4.3
 */

import { formatUTCTimestamp, formatICSTimestamp, escapeICSText } from './icsFormatter.js';
import logger from '../utils/logger.js';

/**
 * Maximum allowed length for notes field (10,000 characters).
 * Notes exceeding this length will be truncated with "..." suffix.
 */
const MAX_NOTES_LENGTH = 10000;

/**
 * Internal event data structure used for ICS generation.
 * Contains all necessary fields for creating a VEVENT component.
 */
export interface ICSEventData {
  /** Unique identifier for the event (RFC 5545 UID) */
  uid: string;
  /** Event title/summary */
  summary: string;
  /** Optional event description */
  description?: string;
  /** Event start time */
  startTime: Date;
  /** Duration of the event in minutes */
  durationMinutes: number;
  /** Name of the event organizer */
  organizerName: string;
  /** Name of the attendee */
  attendeeName: string;
  /** Email address of the attendee */
  attendeeEmail: string;
  /** Event status (CONFIRMED or CANCELLED) */
  status: 'CONFIRMED' | 'CANCELLED';
  /** Calendar method (REQUEST for new/updated events, CANCEL for cancellations) */
  method: 'REQUEST' | 'CANCEL';
  /** Optional appointment notes */
  notes?: string | null;
}

/**
 * Options for generating an ICS file from appointment data.
 * This is the public interface used by the mail service.
 */
export interface ICSGeneratorOptions {
  /** Unique appointment identifier (UUID) */
  appointmentId: string;
  /** Patient's full name */
  patientName: string;
  /** Patient's email address */
  patientEmail: string;
  /** Professional's full name */
  professionalName: string;
  /** Appointment scheduled date and time */
  scheduledAt: Date;
  /** Appointment duration in minutes */
  durationMinutes: number;
  /** Optional appointment notes */
  notes?: string | null;
  /** Whether this is a cancellation event (default: false) */
  isCancellation?: boolean;
}

/**
 * Generates a deterministic UID for an appointment event.
 * 
 * The UID format follows RFC 5545 requirements and ensures:
 * - Uniqueness: Different appointment IDs produce different UIDs
 * - Determinism: Same appointment ID always produces the same UID
 * - RFC compliance: Includes domain portion for global uniqueness
 * 
 * Format: appointment-{appointmentId}@anamnesia.pro
 * 
 * Requirement 4.1: Generate a unique UID for each appointment event
 * Requirement 4.2: Use a deterministic UID format based on appointment ID and system domain
 * Requirement 4.3: Use the same UID value for all emails related to the same appointment
 * 
 * @param appointmentId - The unique identifier for the appointment (UUID format)
 * @returns The generated UID string
 * @throws {Error} If appointmentId is empty or invalid
 */
export function generateUID(appointmentId: string): string {
  // Validate input
  if (!appointmentId || typeof appointmentId !== 'string') {
    logger.error({ appointmentId }, 'Invalid appointment ID: must be a non-empty string');
    throw new Error('Invalid appointment ID: must be a non-empty string');
  }

  // Trim whitespace
  const trimmedId = appointmentId.trim();
  
  if (trimmedId.length === 0) {
    logger.error({ appointmentId }, 'Invalid appointment ID: must not be empty or whitespace');
    throw new Error('Invalid appointment ID: must not be empty or whitespace');
  }

  // Validate UUID format (basic check for UUID v4 pattern)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(trimmedId)) {
    logger.error({ appointmentId: trimmedId }, 'Invalid appointment ID: must be a valid UUID format');
    throw new Error('Invalid appointment ID: must be a valid UUID format');
  }

  // Generate deterministic UID
  return `appointment-${trimmedId}@anamnesia.pro`;
}

/**
 * Generates RFC 5545-compliant iCalendar data for an appointment.
 * 
 * This is the main entry point for ICS generation. It takes appointment data
 * and produces a complete ICS file string that can be attached to emails.
 * 
 * The generated ICS includes:
 * - VCALENDAR wrapper with version and product information
 * - VTIMEZONE component for America/Argentina/Buenos_Aires
 * - VEVENT component with all appointment details
 * - Proper formatting (CRLF line breaks, line folding, character escaping)
 * 
 * Requirement 1.1: Generate valid iCalendar format data conforming to RFC 5545
 * Requirement 1.2: Include VEVENT component with required fields
 * Requirement 1.3: Include VTIMEZONE component for America/Argentina/Buenos_Aires
 * 
 * @param options - Appointment data and generation options
 * @returns Complete ICS file content as a string
 * @throws {Error} If required fields are missing or invalid
 */
export function generateICS(options: ICSGeneratorOptions): string {
  // Validate required fields
  if (!options.appointmentId) {
    logger.error({ options }, 'Missing required field: appointmentId');
    throw new Error('Missing required field: appointmentId');
  }
  if (!options.scheduledAt || !(options.scheduledAt instanceof Date)) {
    logger.error({ options }, 'Missing or invalid required field: scheduledAt');
    throw new Error('Missing or invalid required field: scheduledAt');
  }
  if (isNaN(options.scheduledAt.getTime())) {
    logger.error({ options }, 'Invalid date: scheduledAt is not a valid Date object');
    throw new Error('Invalid date: scheduledAt is not a valid Date object');
  }
  if (!options.durationMinutes || options.durationMinutes <= 0) {
    logger.error({ options }, 'Missing or invalid required field: durationMinutes');
    throw new Error('Missing or invalid required field: durationMinutes');
  }
  if (!options.patientEmail) {
    logger.error({ options }, 'Missing required field: patientEmail');
    throw new Error('Missing required field: patientEmail');
  }

  // Log warnings for edge cases
  if (options.durationMinutes > 1440) {
    logger.warn(
      { appointmentId: options.appointmentId, durationMinutes: options.durationMinutes },
      'Duration exceeds 24 hours'
    );
  }

  if (!options.professionalName || options.professionalName.trim() === '') {
    logger.warn(
      { appointmentId: options.appointmentId },
      'Professional name is empty, using default "Unknown"'
    );
  }

  if (!options.patientName || options.patientName.trim() === '') {
    logger.warn(
      { appointmentId: options.appointmentId },
      'Patient name is empty, using default "Unknown"'
    );
  }

  // Handle notes truncation
  let processedNotes = options.notes;
  if (processedNotes && processedNotes.length > MAX_NOTES_LENGTH) {
    logger.warn(
      { 
        appointmentId: options.appointmentId, 
        originalLength: processedNotes.length,
        truncatedLength: MAX_NOTES_LENGTH 
      },
      'Notes exceed maximum length, truncating'
    );
    processedNotes = processedNotes.substring(0, MAX_NOTES_LENGTH - 3) + '...';
  }

  // Determine METHOD based on cancellation status
  const method = options.isCancellation ? 'CANCEL' : 'REQUEST';

  // Build ICS components
  const lines: string[] = [];

  // VCALENDAR wrapper
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//AnamnesIA//Appointment Calendar//ES');
  lines.push(`METHOD:${method}`);
  lines.push('CALSCALE:GREGORIAN');

  // VTIMEZONE component for America/Argentina/Buenos_Aires
  lines.push('BEGIN:VTIMEZONE');
  lines.push('TZID:America/Argentina/Buenos_Aires');
  lines.push('BEGIN:STANDARD');
  lines.push('DTSTART:19700101T000000');
  lines.push('TZOFFSETFROM:-0300');
  lines.push('TZOFFSETTO:-0300');
  lines.push('END:STANDARD');
  lines.push('END:VTIMEZONE');

  // VEVENT component
  lines.push('BEGIN:VEVENT');

  // Generate UID using UID generator function
  const uid = generateUID(options.appointmentId);
  lines.push(`UID:${uid}`);

  // Calculate and format DTSTAMP (current time in UTC)
  const dtstamp = formatUTCTimestamp(new Date());
  lines.push(`DTSTAMP:${dtstamp}`);

  // Calculate and format DTSTART with TZID parameter
  const dtstart = formatICSTimestamp(options.scheduledAt, 'America/Argentina/Buenos_Aires');
  lines.push(`DTSTART;TZID=America/Argentina/Buenos_Aires:${dtstart}`);

  // Calculate DTEND from start time and duration
  const endTime = new Date(options.scheduledAt.getTime() + options.durationMinutes * 60 * 1000);
  const dtend = formatICSTimestamp(endTime, 'America/Argentina/Buenos_Aires');
  lines.push(`DTEND;TZID=America/Argentina/Buenos_Aires:${dtend}`);

  // Generate SUMMARY with professional name
  const professionalName = options.professionalName || 'Unknown';
  const summary = escapeICSText(`${professionalName} - Consulta`);
  lines.push(`SUMMARY:${summary}`);

  // Add DESCRIPTION field if notes exist and are non-null (Requirement 7.2)
  if (processedNotes !== null && processedNotes !== undefined && processedNotes.trim() !== '') {
    const escapedNotes = escapeICSText(processedNotes);
    lines.push(`DESCRIPTION:${escapedNotes}`);
  }

  // Generate ORGANIZER with professional name
  const organizerName = escapeICSText(professionalName);
  lines.push(`ORGANIZER;CN=${organizerName}:noreply@anamnesia.pro`);

  // Generate ATTENDEE with patient name and email
  const patientName = options.patientName || 'Unknown';
  const attendeeName = escapeICSText(patientName);
  lines.push(`ATTENDEE;CN=${attendeeName};RSVP=FALSE:mailto:${options.patientEmail}`);

  // Set STATUS to CONFIRMED for active appointments
  const status = options.isCancellation ? 'CANCELLED' : 'CONFIRMED';
  lines.push(`STATUS:${status}`);

  // Set SEQUENCE to 0 for new events (1 for cancellations)
  const sequence = options.isCancellation ? 1 : 0;
  lines.push(`SEQUENCE:${sequence}`);

  lines.push('END:VEVENT');

  // Close VCALENDAR
  lines.push('END:VCALENDAR');

  // Join with CRLF line breaks per RFC 5545
  return lines.join('\r\n');
}
