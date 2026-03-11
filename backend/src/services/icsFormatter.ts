/**
 * ICS Formatter Module
 * 
 * Implements RFC 5545 formatting utilities for iCalendar data generation.
 * Provides functions for special character escaping, line folding, CRLF formatting,
 * and timestamp formatting according to RFC 5545 specifications.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 1.5
 */

export interface ICSFormatterOptions {
  foldLines?: boolean;
  escapeSpecialChars?: boolean;
}

/**
 * Escapes special characters in ICS text fields per RFC 5545.
 * 
 * Escapes:
 * - Backslash (\) → \\
 * - Comma (,) → \,
 * - Semicolon (;) → \;
 * - Newline (\n) → \n (literal backslash-n)
 * 
 * Requirement 5.3: Escape special characters (comma, semicolon, backslash, newline)
 * Requirement 5.4: Replace newline characters with escaped newline sequences
 * 
 * @param text - The text to escape
 * @returns The escaped text
 */
export function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')      // Backslash must be escaped first
    .replace(/,/g, '\\,')         // Escape comma
    .replace(/;/g, '\\;')         // Escape semicolon
    .replace(/\n/g, '\\n')        // Escape newline as literal \n
    .replace(/\r/g, '');          // Remove carriage returns (will be added by CRLF formatting)
}

/**
 * Folds a line at the specified maximum length per RFC 5545 folding rules.
 * 
 * Lines longer than maxLength octets are broken and continued on the next line
 * with a space prefix. This ensures compatibility with RFC 5545 parsers.
 * 
 * Requirement 5.2: Fold lines longer than 75 octets per RFC 5545 folding rules
 * 
 * @param line - The line to fold
 * @param maxLength - Maximum line length in octets (default: 75)
 * @returns The folded line with CRLF line breaks
 */
export function foldLine(line: string, maxLength: number = 75): string {
  if (line.length <= maxLength) {
    return line;
  }

  const result: string[] = [];
  let currentPos = 0;

  // First line gets full maxLength
  result.push(line.substring(0, maxLength));
  currentPos = maxLength;

  // Subsequent lines get maxLength - 1 (to account for leading space)
  while (currentPos < line.length) {
    const chunkSize = maxLength - 1;
    result.push(' ' + line.substring(currentPos, currentPos + chunkSize));
    currentPos += chunkSize;
  }

  return result.join('\r\n');
}

/**
 * Formats an ICS line with key-value pair, applying optional escaping and folding.
 * 
 * Requirement 5.1: Format line breaks using CRLF (\r\n)
 * Requirement 5.2: Fold lines longer than 75 octets
 * Requirement 5.3: Escape special characters in text fields
 * 
 * @param key - The property key (e.g., "SUMMARY", "DESCRIPTION")
 * @param value - The property value
 * @param options - Formatting options
 * @returns The formatted ICS line with CRLF
 */
export function formatICSLine(
  key: string,
  value: string,
  options: ICSFormatterOptions = {}
): string {
  const { foldLines = true, escapeSpecialChars = true } = options;

  // Escape special characters if enabled
  const processedValue = escapeSpecialChars ? escapeICSText(value) : value;

  // Construct the line
  const line = `${key}:${processedValue}`;

  // Apply line folding if enabled
  return foldLines ? foldLine(line) : line;
}

/**
 * Formats a Date object as an ICS timestamp.
 * 
 * Supports two formats:
 * - UTC format: YYYYMMDDTHHmmssZ (when timezone is not provided)
 * - Local format with TZID: DTSTART;TZID=America/Argentina/Buenos_Aires:YYYYMMDDTHHmmss
 * 
 * Requirement 1.5: Format timestamps in UTC with TZID parameter for local timezone
 * 
 * @param date - The date to format
 * @param timezone - Optional timezone identifier (e.g., "America/Argentina/Buenos_Aires")
 * @returns The formatted timestamp string
 */
export function formatICSTimestamp(date: Date, timezone?: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  const timestamp = `${year}${month}${day}T${hours}${minutes}${seconds}`;

  if (timezone) {
    // Local time with TZID parameter
    return timestamp;
  } else {
    // UTC format
    return `${timestamp}Z`;
  }
}

/**
 * Formats a Date object as a UTC timestamp (convenience function).
 * 
 * @param date - The date to format
 * @returns The formatted UTC timestamp (YYYYMMDDTHHmmssZ)
 */
export function formatUTCTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}
