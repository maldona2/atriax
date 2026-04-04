/**
 * Unit + property tests for WebhookValidator
 *
 * Feature: whatsapp-bot
 * Validates: Requirements 1.1, 1.3, 1.4, 2.2, 2.3, 14.1
 */

import * as fc from 'fast-check';
import { createHmac } from 'crypto';
import { WebhookValidator } from '../services/WebhookValidator.js';

const APP_SECRET = 'test-app-secret';
const VERIFY_TOKEN = 'test-verify-token';

function makeValidator() {
  return new WebhookValidator(APP_SECRET, VERIFY_TOKEN);
}

function signBody(body: Buffer, secret: string): string {
  const hex = createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${hex}`;
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('WebhookValidator - validateChallenge', () => {
  it('returns challenge when mode=subscribe and token matches', () => {
    const v = makeValidator();
    const result = v.validateChallenge('subscribe', VERIFY_TOKEN, 'abc123');
    expect(result).toBe('abc123');
  });

  it('returns null when mode is not subscribe', () => {
    const v = makeValidator();
    expect(
      v.validateChallenge('unsubscribe', VERIFY_TOKEN, 'abc123')
    ).toBeNull();
  });

  it('returns null when token does not match', () => {
    const v = makeValidator();
    expect(
      v.validateChallenge('subscribe', 'wrong-token', 'abc123')
    ).toBeNull();
  });

  it('returns null when challenge is empty', () => {
    const v = makeValidator();
    expect(v.validateChallenge('subscribe', VERIFY_TOKEN, '')).toBeNull();
  });

  it('returns null when all params are undefined', () => {
    const v = makeValidator();
    expect(v.validateChallenge(undefined, undefined, undefined)).toBeNull();
  });
});

describe('WebhookValidator - validateSignature', () => {
  it('accepts a valid HMAC-SHA256 signature', () => {
    const v = makeValidator();
    const body = Buffer.from('{"test":"payload"}');
    const sig = signBody(body, APP_SECRET);
    expect(v.validateSignature(body, sig)).toBe(true);
  });

  it('rejects a missing signature header', () => {
    const v = makeValidator();
    const body = Buffer.from('test');
    expect(v.validateSignature(body, undefined)).toBe(false);
  });

  it('rejects a signature without sha256= prefix', () => {
    const v = makeValidator();
    const body = Buffer.from('test');
    expect(v.validateSignature(body, 'deadbeef')).toBe(false);
  });

  it('rejects a tampered payload', () => {
    const v = makeValidator();
    const originalBody = Buffer.from('{"original":"payload"}');
    const tamperedBody = Buffer.from('{"tampered":"payload"}');
    const sig = signBody(originalBody, APP_SECRET);
    expect(v.validateSignature(tamperedBody, sig)).toBe(false);
  });

  it('rejects a signature produced with wrong secret', () => {
    const v = makeValidator();
    const body = Buffer.from('test');
    const sig = signBody(body, 'wrong-secret');
    expect(v.validateSignature(body, sig)).toBe(false);
  });
});

// ─── Property tests ───────────────────────────────────────────────────────────

/**
 * Property 1: Webhook Verification Challenge Response
 * For any valid challenge string, validateChallenge must echo it back exactly
 * when mode='subscribe' and the correct token is provided.
 * Validates: Requirements 1.1, 1.3
 */
describe('Property 1: Webhook Verification Challenge Response', () => {
  it('echoes any non-empty challenge string when credentials are valid', () => {
    const v = makeValidator();
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (challenge) => {
        const result = v.validateChallenge(
          'subscribe',
          VERIFY_TOKEN,
          challenge
        );
        return result === challenge;
      })
    );
  });

  it('always returns null for any wrong token regardless of challenge', () => {
    const v = makeValidator();
    fc.assert(
      fc.property(
        fc.string(),
        fc.string({ minLength: 1 }),
        (wrongToken, challenge) => {
          fc.pre(wrongToken !== VERIFY_TOKEN);
          const result = v.validateChallenge(
            'subscribe',
            wrongToken,
            challenge
          );
          return result === null;
        }
      )
    );
  });
});

/**
 * Property 4: Webhook Signature Validation
 * For any raw body buffer, a signature produced by the correct secret must be accepted,
 * and a signature produced by any other secret must be rejected.
 * Validates: Requirements 2.2, 2.3, 14.1
 */
describe('Property 4: Webhook Signature Validation', () => {
  it('accepts HMAC-SHA256 signed with the correct secret for any payload', () => {
    const v = makeValidator();
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 500 }), (bytes) => {
        const body = Buffer.from(bytes);
        const sig = signBody(body, APP_SECRET);
        return v.validateSignature(body, sig) === true;
      })
    );
  });

  it('rejects signatures produced by a different secret for any payload', () => {
    const v = makeValidator();
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 64 }),
        (bytes, wrongSecret) => {
          fc.pre(wrongSecret !== APP_SECRET);
          const body = Buffer.from(bytes);
          const sig = signBody(body, wrongSecret);
          return v.validateSignature(body, sig) === false;
        }
      )
    );
  });
});
