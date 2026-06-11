import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import * as appointmentService from './appointmentService.js';
import { db } from '../db/client.js';
import { CLINIC_TIME_ZONE } from '../config/timezone.js';

// Keep the real schema (so SQL fragments reference real columns) but replace the
// drizzle instance with a mock whose `.where()` argument we can capture and
// serialize back to SQL for assertions.
jest.mock('../db/client.js', () => {
  const actual = jest.requireActual('../db/client.js');
  return { ...actual, db: { select: jest.fn() } };
});

function captureListWhere(): { current: SQL | undefined } {
  const captured: { current: SQL | undefined } = { current: undefined };
  (db.select as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnValue({
        where: jest.fn().mockImplementation((cond: SQL) => {
          captured.current = cond;
          return { orderBy: jest.fn().mockResolvedValue([]) };
        }),
      }),
    }),
  });
  return captured;
}

function toQuery(where: SQL | undefined) {
  if (!where) throw new Error('where clause was not captured');
  const query = new PgDialect().sqlToQuery(where);
  return { sql: query.sql.toLowerCase(), params: query.params };
}

describe('appointmentService.list date filters', () => {
  beforeEach(() => jest.clearAllMocks());

  it('buckets the `date` filter by the clinic timezone, not the session TZ', async () => {
    const captured = captureListWhere();

    await appointmentService.list('tenant-1', { date: '2026-06-11' });

    const { sql, params } = toQuery(captured.current);
    expect(sql).toContain('at time zone');
    expect(sql).toContain('::date');
    expect(params).toContain(CLINIC_TIME_ZONE);
    expect(params).toContain('2026-06-11');
  });

  it('applies the timezone-aware cast to `dateFrom`', async () => {
    const captured = captureListWhere();

    await appointmentService.list('tenant-1', { dateFrom: '2026-06-01' });

    const { sql, params } = toQuery(captured.current);
    expect(sql).toContain('at time zone');
    expect(sql).toContain('>=');
    expect(params).toContain(CLINIC_TIME_ZONE);
    expect(params).toContain('2026-06-01');
  });

  it('applies the timezone-aware cast to `dateTo`', async () => {
    const captured = captureListWhere();

    await appointmentService.list('tenant-1', { dateTo: '2026-06-30' });

    const { sql, params } = toQuery(captured.current);
    expect(sql).toContain('at time zone');
    expect(sql).toContain('<=');
    expect(params).toContain(CLINIC_TIME_ZONE);
    expect(params).toContain('2026-06-30');
  });

  it('does not add a timezone cast when no date filter is provided', async () => {
    const captured = captureListWhere();

    await appointmentService.list('tenant-1', {});

    const { sql, params } = toQuery(captured.current);
    expect(sql).not.toContain('at time zone');
    expect(params).toContain('tenant-1');
  });
});
