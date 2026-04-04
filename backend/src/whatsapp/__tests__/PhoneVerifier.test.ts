/**
 * Unit + property tests for PhoneVerifier
 *
 * Feature: whatsapp-bot
 * Validates: Requirements 6.1–6.8, 14.5
 */

import * as fc from 'fast-check';
import bcrypt from 'bcrypt';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../db/client.js', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockSelect,
          orderBy: () => ({ limit: mockSelect }),
        }),
        orderBy: () => ({ limit: mockSelect }),
      }),
    }),
    insert: () => ({ values: mockInsert }),
    update: () => ({ set: () => ({ where: mockUpdate }) }),
  },
  whatsappVerifications: {},
}));

const mockSendVerificationCode = jest
  .fn()
  .mockResolvedValue({ success: true, messageId: 'wamid.test' });
jest.mock('../services/MetaAPIClient.js', () => ({
  MetaAPIClient: jest.fn().mockImplementation(() => ({
    sendVerificationCode: mockSendVerificationCode,
  })),
  // static method
}));

// Restore static method after mock
import { MetaAPIClient } from '../services/MetaAPIClient.js';
(
  MetaAPIClient as unknown as { normalisePhone: (p: string) => string }
).normalisePhone = (phone: string) => `+${phone.replace(/\D/g, '')}`;

import { PhoneVerifier } from '../services/PhoneVerifier.js';

const USER_ID = 'user-001';
const TENANT_ID = 'tenant-001';
const PHONE = '+5491112345678';

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('PhoneVerifier - initiateVerification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends OTP and returns success when phone is not already verified by another user', async () => {
    mockSelect.mockResolvedValueOnce([]); // no conflicting verification
    mockInsert.mockResolvedValueOnce([]);
    mockSendVerificationCode.mockResolvedValueOnce({ success: true });

    const verifier = new PhoneVerifier();
    const result = await verifier.initiateVerification(
      TENANT_ID,
      USER_ID,
      PHONE
    );
    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockSendVerificationCode).toHaveBeenCalledTimes(1);
  });

  it('rejects when phone is already verified by another user', async () => {
    mockSelect.mockResolvedValueOnce([{ id: 'existing' }]); // conflict found
    const verifier = new PhoneVerifier();
    const result = await verifier.initiateVerification(
      TENANT_ID,
      USER_ID,
      PHONE
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain('ya está asociado');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns failure when Meta API send fails', async () => {
    mockSelect.mockResolvedValueOnce([]); // no conflict
    mockInsert.mockResolvedValueOnce([]);
    mockSendVerificationCode.mockResolvedValueOnce({
      success: false,
      error: 'network error',
    });

    const verifier = new PhoneVerifier();
    const result = await verifier.initiateVerification(
      TENANT_ID,
      USER_ID,
      PHONE
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain('No se pudo enviar');
  });
});

describe('PhoneVerifier - confirmVerification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('verifies successfully with correct OTP', async () => {
    const otp = '123456';
    const hash = await bcrypt.hash(otp, 10);
    mockSelect.mockResolvedValueOnce([
      {
        id: 'ver-1',
        otpHash: hash,
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
      },
    ]);
    mockUpdate.mockResolvedValueOnce([]); // increment attempts
    mockUpdate.mockResolvedValueOnce([]); // mark verified

    const verifier = new PhoneVerifier();
    const result = await verifier.confirmVerification(USER_ID, PHONE, otp);
    expect(result.success).toBe(true);
  });

  it('rejects with incorrect OTP', async () => {
    const hash = await bcrypt.hash('654321', 10);
    mockSelect.mockResolvedValueOnce([
      {
        id: 'ver-2',
        otpHash: hash,
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
      },
    ]);
    mockUpdate.mockResolvedValueOnce([]);

    const verifier = new PhoneVerifier();
    const result = await verifier.confirmVerification(USER_ID, PHONE, '000000');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Código incorrecto');
  });

  it('rejects when OTP is expired', async () => {
    mockSelect.mockResolvedValueOnce([
      {
        id: 'ver-3',
        otpHash: 'doesnt-matter',
        expiresAt: new Date(Date.now() - 1_000), // past
        attempts: 0,
      },
    ]);

    const verifier = new PhoneVerifier();
    const result = await verifier.confirmVerification(USER_ID, PHONE, '123456');
    expect(result.success).toBe(false);
    expect(result.message).toContain('expirado');
  });

  it('rejects when max attempts exceeded', async () => {
    mockSelect.mockResolvedValueOnce([
      {
        id: 'ver-4',
        otpHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 3, // already at max
      },
    ]);

    const verifier = new PhoneVerifier();
    const result = await verifier.confirmVerification(USER_ID, PHONE, '123456');
    expect(result.success).toBe(false);
    expect(result.message).toContain('máximo');
  });

  it('returns failure when no pending verification exists', async () => {
    mockSelect.mockResolvedValueOnce([]);
    const verifier = new PhoneVerifier();
    const result = await verifier.confirmVerification(USER_ID, PHONE, '123456');
    expect(result.success).toBe(false);
    expect(result.message).toContain('No se encontró');
  });
});

// ─── Property tests ───────────────────────────────────────────────────────────

/**
 * Property 23: OTP Generation Format
 * The internal OTP generator must always produce a 6-digit string.
 * Validates: Requirements 6.1
 */
describe('Property 23: OTP Generation Format', () => {
  it('generates 6-digit numeric strings', () => {
    // Access private method via type coercion for testing
    const verifier = new PhoneVerifier() as unknown as {
      _generateOtp: () => string;
    };
    fc.assert(
      fc.property(fc.constant(null), () => {
        const otp = verifier._generateOtp();
        return (
          /^\d{6}$/.test(otp) &&
          Number(otp) >= 100_000 &&
          Number(otp) <= 999_999
        );
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 45: OTP Hash Storage
 * The OTP must be stored as a bcrypt hash, never as plaintext.
 * Validates: Requirements 14.5
 */
describe('Property 45: OTP Hash Storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores a bcrypt hash, not the raw OTP', async () => {
    let storedHash = '';
    mockSelect.mockResolvedValueOnce([]); // no conflict
    mockInsert.mockImplementationOnce(async (values: { otpHash: string }) => {
      storedHash = values.otpHash;
      return [];
    });
    mockSendVerificationCode.mockResolvedValueOnce({ success: true });

    const verifier = new PhoneVerifier();
    await verifier.initiateVerification(TENANT_ID, USER_ID, PHONE);

    expect(storedHash).toBeTruthy();
    // Must be a bcrypt hash (starts with $2b$)
    expect(storedHash).toMatch(/^\$2[ab]\$/);
  });
});

/**
 * Property 26: OTP Comprehensive Validation
 * Any incorrect OTP must be rejected, correct OTP within time window must be accepted.
 * Validates: Requirements 6.4, 6.5, 6.6, 6.7
 */
describe('Property 26: OTP Comprehensive Validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects any OTP that does not match the stored hash', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^\d{6}$/),
        fc.stringMatching(/^\d{6}$/),
        async (storedOtp, submittedOtp) => {
          fc.pre(storedOtp !== submittedOtp);
          const hash = await bcrypt.hash(storedOtp, 10);
          mockSelect.mockResolvedValueOnce([
            {
              id: 'ver-test',
              otpHash: hash,
              expiresAt: new Date(Date.now() + 60_000),
              attempts: 0,
            },
          ]);
          mockUpdate.mockResolvedValueOnce([]);

          const verifier = new PhoneVerifier();
          const result = await verifier.confirmVerification(
            USER_ID,
            PHONE,
            submittedOtp
          );
          return result.success === false;
        }
      ),
      { numRuns: 20 }
    );
  });
});
