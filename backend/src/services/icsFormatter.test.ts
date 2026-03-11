import {
  escapeICSText,
  foldLine,
  formatICSLine,
  formatICSTimestamp,
  formatUTCTimestamp,
} from './icsFormatter.js';
import fc from 'fast-check';

describe('icsFormatter', () => {
  describe('escapeICSText', () => {
    it('escapes comma in text', () => {
      const result = escapeICSText('Hello, World');
      expect(result).toBe('Hello\\, World');
    });

    it('escapes semicolon in text', () => {
      const result = escapeICSText('Meeting; Important');
      expect(result).toBe('Meeting\\; Important');
    });

    it('escapes backslash in text', () => {
      const result = escapeICSText('Path\\to\\file');
      expect(result).toBe('Path\\\\to\\\\file');
    });

    it('escapes newline in text', () => {
      const result = escapeICSText('Line 1\nLine 2');
      expect(result).toBe('Line 1\\nLine 2');
    });

    it('escapes multiple special characters', () => {
      const result = escapeICSText('Hello, World; Test\\Path\nNew Line');
      expect(result).toBe('Hello\\, World\\; Test\\\\Path\\nNew Line');
    });

    it('removes carriage returns', () => {
      const result = escapeICSText('Line 1\r\nLine 2');
      expect(result).toBe('Line 1\\nLine 2');
    });

    it('handles text without special characters', () => {
      const result = escapeICSText('Simple text');
      expect(result).toBe('Simple text');
    });

    it('handles empty string', () => {
      const result = escapeICSText('');
      expect(result).toBe('');
    });

    it('escapes backslash before other special characters', () => {
      // Backslash should be escaped first to avoid double-escaping
      const result = escapeICSText('\\,');
      expect(result).toBe('\\\\\\,');
    });

    /**
     * **Validates: Requirements 5.3, 5.4**
     * 
     * Property 13: Special Character Escaping
     * For any text field containing special characters (comma, semicolon, backslash, newline),
     * those characters must be properly escaped in the generated ICS.
     */
    it('property: escapes all special characters correctly', () => {
      // Arbitrary generator for text with special characters
      const textWithSpecialChars = fc.string().map((baseText: string) => {
        // Inject special characters at random positions
        const chars = [',', ';', '\\', '\n'];
        let result = baseText;
        
        // Add 0-5 special characters at random positions
        const numSpecialChars = Math.floor(Math.random() * 6);
        for (let i = 0; i < numSpecialChars; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const pos = Math.floor(Math.random() * (result.length + 1));
          result = result.slice(0, pos) + char + result.slice(pos);
        }
        
        return result;
      });

      fc.assert(
        fc.property(textWithSpecialChars, (text: string) => {
          const escaped = escapeICSText(text);
          
          // Count occurrences of special characters in original
          const commaCount = (text.match(/,/g) || []).length;
          const semicolonCount = (text.match(/;/g) || []).length;
          const backslashCount = (text.match(/\\/g) || []).length;
          const newlineCount = (text.match(/\n/g) || []).length;
          
          // Verify each special character is properly escaped
          // Comma: , → \,
          const escapedCommaCount = (escaped.match(/\\,/g) || []).length;
          expect(escapedCommaCount).toBe(commaCount);
          
          // Semicolon: ; → \;
          const escapedSemicolonCount = (escaped.match(/\\;/g) || []).length;
          expect(escapedSemicolonCount).toBe(semicolonCount);
          
          // Verify no unescaped special characters remain
          // No actual newline characters (should all be escaped to literal \n)
          expect(escaped).not.toContain('\n');
          // No carriage returns
          expect(escaped).not.toContain('\r');
          
          // Verify that the escaped string can be unescaped back to original
          // (minus carriage returns which are removed)
          const unescaped = escaped
            .replace(/\\n/g, '\n')
            .replace(/\\;/g, ';')
            .replace(/\\,/g, ',')
            .replace(/\\\\/g, '\\');
          
          const expectedUnescaped = text.replace(/\r/g, '');
          expect(unescaped).toBe(expectedUnescaped);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('foldLine', () => {
    it('does not fold lines shorter than 75 characters', () => {
      const line = 'SUMMARY:Short meeting';
      const result = foldLine(line);
      expect(result).toBe('SUMMARY:Short meeting');
    });

    it('folds line at 75 characters', () => {
      const line = 'DESCRIPTION:' + 'A'.repeat(70); // Total 82 characters
      const result = foldLine(line);
      
      const lines = result.split('\r\n');
      expect(lines.length).toBe(2);
      expect(lines[0].length).toBe(75);
      expect(lines[1]).toMatch(/^ /); // Second line starts with space
      expect(lines[1].length).toBe(8); // 1 space + 7 characters
    });

    it('folds very long lines into multiple segments', () => {
      const line = 'DESCRIPTION:' + 'A'.repeat(200); // Total 212 characters
      const result = foldLine(line);
      
      const lines = result.split('\r\n');
      expect(lines.length).toBeGreaterThan(2);
      expect(lines[0].length).toBe(75);
      
      // All continuation lines should start with space
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i]).toMatch(/^ /);
        expect(lines[i].length).toBeLessThanOrEqual(75);
      }
    });

    it('respects custom maxLength parameter', () => {
      const line = 'SUMMARY:' + 'A'.repeat(50);
      const result = foldLine(line, 40);
      
      const lines = result.split('\r\n');
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0].length).toBe(40);
    });

    it('handles line exactly at maxLength', () => {
      const line = 'A'.repeat(75);
      const result = foldLine(line);
      expect(result).toBe(line);
    });

    it('handles line one character over maxLength', () => {
      const line = 'A'.repeat(76);
      const result = foldLine(line);
      
      const lines = result.split('\r\n');
      expect(lines.length).toBe(2);
      expect(lines[0].length).toBe(75);
      expect(lines[1]).toBe(' A');
    });

    /**
     * **Validates: Requirements 5.2**
     * 
     * Property 12: Line Folding
     * For any generated ICS file, no unfolded line should exceed 75 octets in length.
     */
    it('property: no line exceeds 75 octets after folding', () => {
      // Arbitrary generator for lines of various lengths
      const longLineArbitrary = fc.tuple(
        fc.constantFrom('SUMMARY', 'DESCRIPTION', 'LOCATION', 'COMMENT'),
        fc.string({ minLength: 0, maxLength: 500 })
      ).map(([key, value]) => `${key}:${value}`);

      fc.assert(
        fc.property(longLineArbitrary, (line: string) => {
          const folded = foldLine(line);
          const lines = folded.split('\r\n');
          
          // Every line in the folded output must be <= 75 octets
          for (const foldedLine of lines) {
            expect(foldedLine.length).toBeLessThanOrEqual(75);
          }
          
          // Continuation lines (all except first) must start with space
          for (let i = 1; i < lines.length; i++) {
            expect(lines[i][0]).toBe(' ');
          }
          
          // Unfolding should reconstruct the original line
          // (remove CRLF and leading space from continuation lines)
          const unfolded = lines.map((l, i) => i === 0 ? l : l.slice(1)).join('');
          expect(unfolded).toBe(line);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('formatICSLine', () => {
    it('formats simple key-value pair', () => {
      const result = formatICSLine('SUMMARY', 'Meeting');
      expect(result).toBe('SUMMARY:Meeting');
    });

    it('escapes special characters by default', () => {
      const result = formatICSLine('SUMMARY', 'Meeting, Important');
      expect(result).toBe('SUMMARY:Meeting\\, Important');
    });

    it('folds long lines by default', () => {
      const longValue = 'A'.repeat(100);
      const result = formatICSLine('DESCRIPTION', longValue);
      
      expect(result).toContain('\r\n');
      const lines = result.split('\r\n');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('skips escaping when escapeSpecialChars is false', () => {
      const result = formatICSLine('SUMMARY', 'Meeting, Important', {
        escapeSpecialChars: false,
      });
      expect(result).toBe('SUMMARY:Meeting, Important');
    });

    it('skips folding when foldLines is false', () => {
      const longValue = 'A'.repeat(100);
      const result = formatICSLine('DESCRIPTION', longValue, {
        foldLines: false,
      });
      
      expect(result).not.toContain('\r\n');
      expect(result.length).toBeGreaterThan(75);
    });

    it('applies both escaping and folding', () => {
      const longValue = 'Meeting, ' + 'A'.repeat(100);
      const result = formatICSLine('DESCRIPTION', longValue);
      
      expect(result).toContain('\\,');
      expect(result).toContain('\r\n');
    });
  });

  describe('formatICSTimestamp', () => {
    it('formats date in local format when timezone is provided', () => {
      const date = new Date('2024-03-15T14:30:00');
      const result = formatICSTimestamp(date, 'America/Argentina/Buenos_Aires');
      
      expect(result).toMatch(/^\d{8}T\d{6}$/);
      expect(result).not.toContain('Z');
      expect(result).toBe('20240315T143000');
    });

    it('formats date in UTC format when timezone is not provided', () => {
      const date = new Date('2024-03-15T14:30:00');
      const result = formatICSTimestamp(date);
      
      expect(result).toMatch(/^\d{8}T\d{6}Z$/);
      expect(result).toContain('Z');
    });

    it('pads single-digit months and days', () => {
      const date = new Date('2024-01-05T09:05:03');
      const result = formatICSTimestamp(date, 'America/Argentina/Buenos_Aires');
      
      expect(result).toBe('20240105T090503');
    });

    it('handles midnight correctly', () => {
      const date = new Date('2024-03-15T00:00:00');
      const result = formatICSTimestamp(date, 'America/Argentina/Buenos_Aires');
      
      expect(result).toBe('20240315T000000');
    });

    it('handles end of day correctly', () => {
      const date = new Date('2024-03-15T23:59:59');
      const result = formatICSTimestamp(date, 'America/Argentina/Buenos_Aires');
      
      expect(result).toBe('20240315T235959');
    });
  });

  describe('formatUTCTimestamp', () => {
    it('formats date in UTC format', () => {
      const date = new Date('2024-03-15T14:30:00.000Z');
      const result = formatUTCTimestamp(date);
      
      expect(result).toBe('20240315T143000Z');
    });

    it('converts local time to UTC', () => {
      // Create a date in local time
      const date = new Date('2024-03-15T14:30:00');
      const result = formatUTCTimestamp(date);
      
      // Result should be in UTC
      expect(result).toMatch(/^\d{8}T\d{6}Z$/);
      expect(result).toContain('Z');
    });

    it('pads single-digit values', () => {
      const date = new Date('2024-01-05T09:05:03.000Z');
      const result = formatUTCTimestamp(date);
      
      expect(result).toBe('20240105T090503Z');
    });
  });
});
