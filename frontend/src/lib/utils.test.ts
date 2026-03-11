import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'block')).toBe('base block');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});
