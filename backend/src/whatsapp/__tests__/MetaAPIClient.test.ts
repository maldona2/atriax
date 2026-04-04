/**
 * Unit + property tests for MetaAPIClient
 *
 * Feature: whatsapp-bot
 * Validates: Requirements 5.1–5.7, 13.1–13.3, 13.6, 13.7
 */

import * as fc from 'fast-check';
import { MetaAPIClient } from '../services/MetaAPIClient.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFetchMock(
  responses: Array<{
    ok: boolean;
    status: number;
    body?: unknown;
    retryAfter?: string;
  }>
) {
  let callIndex = 0;
  return jest.fn(async () => {
    const r = responses[Math.min(callIndex++, responses.length - 1)];
    return {
      ok: r.ok,
      status: r.status,
      headers: {
        get: (h: string) =>
          h === 'Retry-After' ? (r.retryAfter ?? null) : null,
      },
      json: async () => r.body ?? {},
      text: async () => JSON.stringify(r.body ?? {}),
    } as unknown as Response;
  });
}

// ─── normalisePhone ───────────────────────────────────────────────────────────

describe('MetaAPIClient.normalisePhone', () => {
  it('strips non-digits and adds + prefix', () => {
    expect(MetaAPIClient.normalisePhone('(11) 5555-1234')).toBe('+1155551234');
    expect(MetaAPIClient.normalisePhone('+54 9 11 1234-5678')).toBe(
      '+5491112345678'
    );
    expect(MetaAPIClient.normalisePhone('5491112345678')).toBe(
      '+5491112345678'
    );
  });

  it('handles already-normalised E.164 numbers', () => {
    expect(MetaAPIClient.normalisePhone('+5491112345678')).toBe(
      '+5491112345678'
    );
  });
});

// ─── sendTextMessage ──────────────────────────────────────────────────────────

describe('MetaAPIClient - sendTextMessage', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns success with messageId on 200 response', async () => {
    global.fetch = makeFetchMock([
      { ok: true, status: 200, body: { messages: [{ id: 'wamid.123' }] } },
    ]) as unknown as typeof fetch;

    const client = new MetaAPIClient('phone-id', 'api-key');
    const result = await client.sendTextMessage('+5491112345678', 'Hello');
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('wamid.123');
  });

  it('returns failure on non-retryable 4xx error', async () => {
    global.fetch = makeFetchMock([
      { ok: false, status: 400, body: { error: { message: 'bad request' } } },
    ]) as unknown as typeof fetch;

    const client = new MetaAPIClient('phone-id', 'api-key');
    const result = await client.sendTextMessage('+5491112345678', 'Hello');
    expect(result.success).toBe(false);
    expect(result.error).toContain('400');
  });

  it('retries on 5xx and succeeds on second attempt', async () => {
    const fetchMock = makeFetchMock([
      { ok: false, status: 500 },
      { ok: true, status: 200, body: { messages: [{ id: 'wamid.456' }] } },
    ]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new MetaAPIClient('phone-id', 'api-key');
    // Override sleep to speed up test
    (client as unknown as { _sleep: (ms: number) => Promise<void> })._sleep =
      () => Promise.resolve();
    const result = await client.sendTextMessage('+5491112345678', 'Hello');
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('exhausts all retries and returns failure', async () => {
    const fetchMock = makeFetchMock([
      { ok: false, status: 500 },
      { ok: false, status: 500 },
      { ok: false, status: 500 },
    ]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new MetaAPIClient('phone-id', 'api-key');
    (client as unknown as { _sleep: (ms: number) => Promise<void> })._sleep =
      () => Promise.resolve();
    const result = await client.sendTextMessage('+5491112345678', 'Hello');
    expect(result.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('opens circuit breaker after threshold failures', async () => {
    const fetchMock = makeFetchMock([{ ok: false, status: 500 }]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new MetaAPIClient('phone-id', 'api-key');
    (client as unknown as { _sleep: (ms: number) => Promise<void> })._sleep =
      () => Promise.resolve();

    // Drive failures past the threshold (5)
    for (let i = 0; i < 5; i++) {
      await client.sendTextMessage('+1', 'test');
    }
    expect(client.circuitState).toBe('open');

    // Next call should be blocked immediately
    fetchMock.mockClear();
    const blockedResult = await client.sendTextMessage('+1', 'blocked');
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.error).toContain('Circuit breaker');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('transitions circuit from open to half-open after cooldown', async () => {
    const fetchMock = makeFetchMock([{ ok: false, status: 500 }]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new MetaAPIClient('phone-id', 'api-key');
    (client as unknown as { _sleep: (ms: number) => Promise<void> })._sleep =
      () => Promise.resolve();

    // Open the circuit
    for (let i = 0; i < 5; i++) await client.sendTextMessage('+1', 'test');
    expect(client.circuitState).toBe('open');

    // Manually wind forward the nextAttemptAt
    (client as unknown as { cb: { nextAttemptAt: number } }).cb.nextAttemptAt =
      Date.now() - 1;
    expect(client.circuitState).toBe('half-open');
  });
});

// ─── Property tests ───────────────────────────────────────────────────────────

/**
 * Property 21: Retry with Exponential Backoff
 * For any sequence of initial failures followed by a success, the client must
 * eventually succeed and the number of fetch calls must equal failures + 1.
 * Validates: Requirements 5.5, 5.6, 13.1, 13.2
 */
describe('Property 21: Retry with Exponential Backoff', () => {
  let originalFetch: typeof global.fetch;
  beforeEach(() => {
    originalFetch = global.fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('retries up to MAX_RETRIES and succeeds when last attempt succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 2 }), // 1 or 2 initial failures (max retries = 3)
        async (failCount) => {
          const responses = [
            ...Array.from({ length: failCount }, () => ({
              ok: false,
              status: 500,
            })),
            { ok: true, status: 200, body: { messages: [{ id: 'wamid.ok' }] } },
          ];
          const fetchMock = makeFetchMock(responses);
          global.fetch = fetchMock as unknown as typeof fetch;

          const client = new MetaAPIClient('phone-id', 'api-key');
          (
            client as unknown as { _sleep: (ms: number) => Promise<void> }
          )._sleep = () => Promise.resolve();

          const result = await client.sendTextMessage('+5491112345678', 'test');
          return (
            result.success === true &&
            fetchMock.mock.calls.length === failCount + 1
          );
        }
      )
    );
  });
});

/**
 * Property 22: Rate Limit Handling
 * When the API returns 429, the client must not count it as a permanent failure
 * and must wait before retrying.
 * Validates: Requirements 5.7
 */
describe('Property 22: Rate Limit Handling', () => {
  let originalFetch: typeof global.fetch;
  beforeEach(() => {
    originalFetch = global.fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('retries after 429 and succeeds on next attempt', async () => {
    const fetchMock = makeFetchMock([
      { ok: false, status: 429, retryAfter: '0' },
      { ok: true, status: 200, body: { messages: [{ id: 'wamid.rl' }] } },
    ]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new MetaAPIClient('phone-id', 'api-key');
    (client as unknown as { _sleep: (ms: number) => Promise<void> })._sleep =
      () => Promise.resolve();

    const result = await client.sendTextMessage('+1', 'test');
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

/**
 * Property 41: Circuit Breaker Pattern
 * After CB_FAILURE_THRESHOLD consecutive failures, the circuit opens and
 * subsequent calls are rejected without hitting the network.
 * Validates: Requirements 13.6, 13.7
 */
describe('Property 41: Circuit Breaker Pattern', () => {
  let originalFetch: typeof global.fetch;
  beforeEach(() => {
    originalFetch = global.fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('blocks requests when circuit is open regardless of payload', async () => {
    const fetchMock = makeFetchMock([{ ok: false, status: 500 }]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new MetaAPIClient('phone-id', 'api-key');
    (client as unknown as { _sleep: (ms: number) => Promise<void> })._sleep =
      () => Promise.resolve();

    for (let i = 0; i < 5; i++) await client.sendTextMessage('+1', 'open');

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (text) => {
          fetchMock.mockClear();
          const result = await client.sendTextMessage('+5491112345678', text);
          return result.success === false && fetchMock.mock.calls.length === 0;
        }
      ),
      { numRuns: 20 }
    );
  });
});
