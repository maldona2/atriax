import { describe, expect, it } from 'vitest';

import { statusConfig } from './constants';
import type { Appointment } from '@/types';

// Every valid appointment status must have a config entry — a missing one
// crashed AppointmentsWeekGrid (blank page) when a 'no-show' turn rendered.
const ALL_STATUSES: Appointment['status'][] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no-show',
];

describe('statusConfig', () => {
  it.each(ALL_STATUSES)('has entry for status "%s"', (status) => {
    const config = statusConfig[status];
    expect(config).toBeDefined();
    expect(config.label).toBeTruthy();
    expect(config.className).toBeTruthy();
    expect(config.dotColor).toBeTruthy();
  });
});
