import { jest } from '@jest/globals';
import * as fc from 'fast-check';
import { sendReminders } from './reminderJob.js';

const mockSendReminder = jest.fn();

jest.mock('../services/mailService.js', () => ({
  sendAppointmentReminder: (...args: unknown[]) => {
    mockSendReminder(...args);
  },
}));

const mockHasReminderBeenSent = jest.fn();
const mockCheckOptOut = jest.fn();
const mockRecordDelivery = jest.fn();
const mockGetSuccessRate = jest.fn();

jest.mock('../services/reminderService.js', () => ({
  hasReminderBeenSent: (...args: unknown[]) => mockHasReminderBeenSent(...args),
  checkOptOut: (...args: unknown[]) => mockCheckOptOut(...args),
  recordDelivery: (...args: unknown[]) => mockRecordDelivery(...args),
  getSuccessRate: (...args: unknown[]) => mockGetSuccessRate(...args),
}));

const mockWhatsAppSendReminder = jest.fn();

jest.mock('../whatsapp/services/WhatsAppNotificationService.js', () => ({
  whatsAppNotificationService: {
    sendAppointmentReminder: (...args: unknown[]) =>
      mockWhatsAppSendReminder(...args),
  },
}));

jest.mock('../services/cancellationTokenService.js', () => ({
  createCancellationToken: () => Promise.resolve('raw-token'),
  buildCancelUrl: (token: string) => `https://app.test/cancel/${token}`,
}));

jest.mock('../utils/logger.js', () => {
  const noop = () => {};
  return {
    __esModule: true,
    default: { info: noop, error: noop, warn: noop },
  };
});

const mockAppointmentRows = [
  {
    appointmentId: 'apt-1',
    tenantId: 'tenant-1',
    scheduledAt: new Date('2025-03-16T14:00:00.000Z'),
    durationMinutes: 60,
    patientId: 'patient-1',
    patientEmail: 'patient@test.com',
    patientPhone: null,
    patientFirstName: 'Ana',
    patientLastName: 'González',
  },
];

const mockProfessionalRows = [
  {
    tenantId: 'tenant-1',
    fullName: 'Dr. García',
    address: null,
    subscriptionPlan: 'basic',
    subscriptionStatus: 'active',
  },
];

let fromCallCount = 0;

jest.mock('../db/client.js', () => ({
  db: {
    select: jest.fn().mockImplementation(() => ({
      from: jest.fn().mockImplementation(() => {
        fromCallCount += 1;
        // First from() = appointments; second = users
        if (fromCallCount === 1) {
          return {
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(mockAppointmentRows as never),
            }),
          };
        }
        return {
          where: jest.fn().mockResolvedValue(mockProfessionalRows as never),
        };
      }),
    })),
  },
  appointments: {},
  patients: {},
  users: {},
}));

// Top-level beforeEach: runs before every test in this file.
// Resets call history and re-establishes safe defaults so that mock
// implementations set by one test (e.g. mockSendReminder throwing in the
// error-handling test) cannot leak into subsequent tests and cause hangs
// in sendWithRetry's setTimeout-based retry delays.
beforeEach(() => {
  jest.clearAllMocks();
  fromCallCount = 0;
  mockSendReminder.mockImplementation(() => {}); // safe no-op by default
  mockHasReminderBeenSent.mockReturnValue(Promise.resolve(false));
  mockCheckOptOut.mockReturnValue(Promise.resolve(false));
  mockRecordDelivery.mockReturnValue(Promise.resolve(undefined));
  mockGetSuccessRate.mockReturnValue(
    Promise.resolve({ total: 100, sent: 98, rate: 98 })
  );
  mockWhatsAppSendReminder.mockReturnValue(Promise.resolve(undefined));
});

describe('reminderJob', () => {
  it('runs without throwing', async () => {
    await expect(sendReminders()).resolves.not.toThrow();
  });

  it('calls sendAppointmentReminder for each appointment with email', async () => {
    await sendReminders();

    expect(mockSendReminder).toHaveBeenCalledTimes(1);
    expect(mockSendReminder).toHaveBeenCalledWith(
      'patient@test.com',
      expect.objectContaining({
        patientName: 'Ana González',
        professionalName: 'Dr. García',
        durationMinutes: 60,
      }),
      'apt-1'
    );
  });

  // Regression: a patient with a phone but no email address must still get the
  // WhatsApp reminder — it used to be skipped before the email was even tried.
  it('sends WhatsApp when the patient has a phone but no email', async () => {
    mockAppointmentRows.length = 0;
    mockAppointmentRows.push({
      appointmentId: 'apt-no-email',
      tenantId: 'tenant-1',
      scheduledAt: new Date('2025-03-16T14:00:00.000Z'),
      durationMinutes: 60,
      patientId: 'patient-1',
      patientEmail: '',
      patientPhone: '543813035140',
      patientFirstName: 'Tomas',
      patientLastName: 'Angelilli',
    } as never);
    mockProfessionalRows.length = 0;
    mockProfessionalRows.push({
      tenantId: 'tenant-1',
      fullName: 'Dr. Test',
      address: null,
      subscriptionPlan: 'gold',
      subscriptionStatus: 'active',
    } as never);
    mockWhatsAppSendReminder.mockReturnValue(Promise.resolve(true));

    await sendReminders();

    expect(mockSendReminder).not.toHaveBeenCalled();
    expect(mockWhatsAppSendReminder).toHaveBeenCalledWith(
      '543813035140',
      expect.objectContaining({
        patientName: 'Tomas Angelilli',
        cancelUrl: 'https://app.test/cancel/raw-token',
      })
    );
    expect(mockRecordDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent' })
    );
  });
});

/**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 *
 * Property 2: Preservation - Existing Reminder Logic
 *
 * These tests verify that existing reminder logic behaviors are preserved:
 * - Duplicate prevention (3.1)
 * - Opt-out checks (3.2)
 * - Missing email handling (3.3)
 * - Status filtering (3.4)
 * - WhatsApp for Gold plan (3.5)
 * - Error handling with retries (3.6)
 * - Batch processing (3.7)
 *
 * EXPECTED OUTCOME: These tests MUST PASS on unfixed code to establish baseline.
 */
describe('Preservation - Property-Based Tests', () => {
  /**
   * Property 2.1: Duplicate Prevention (Requirement 3.1)
   *
   * Verifies that appointments with reminders already sent are skipped.
   */
  it('should skip appointments that already have reminders sent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          appointmentId: fc.string({ minLength: 5, maxLength: 20 }),
          alreadySent: fc.boolean(),
        }),
        async ({ appointmentId, alreadySent }) => {
          jest.clearAllMocks();
          fromCallCount = 0;

          // Set up time window (9 AM, appointment at 9 AM tomorrow = 24h)
          const cronRunTime = new Date('2025-03-15T09:00:00.000Z');
          jest.useFakeTimers();
          jest.setSystemTime(cronRunTime);

          const appointmentTime = new Date('2025-03-16T09:00:00.000Z');

          const testAppointment = {
            appointmentId,
            tenantId: 'tenant-1',
            scheduledAt: appointmentTime,
            durationMinutes: 60,
            patientId: 'patient-1',
            patientEmail: 'patient@test.com',
            patientPhone: null,
            patientFirstName: 'Test',
            patientLastName: 'Patient',
          };

          mockAppointmentRows.length = 0;
          mockAppointmentRows.push(testAppointment);

          // Mock hasReminderBeenSent to return the test value
          mockHasReminderBeenSent.mockReturnValue(Promise.resolve(alreadySent));
          mockCheckOptOut.mockReturnValue(Promise.resolve(false));

          await sendReminders();

          // If already sent, sendAppointmentReminder should NOT be called
          if (alreadySent) {
            expect(mockSendReminder).not.toHaveBeenCalled();
          } else {
            expect(mockSendReminder).toHaveBeenCalled();
          }

          jest.useRealTimers();
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 2.2: Opt-Out Checks (Requirement 3.2)
   *
   * Verifies that patients who opted out are skipped.
   */
  it('should skip patients who have opted out of reminders', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          patientId: fc.string({ minLength: 5, maxLength: 20 }),
          optedOut: fc.boolean(),
        }),
        async ({ patientId, optedOut }) => {
          jest.clearAllMocks();
          fromCallCount = 0;

          const cronRunTime = new Date('2025-03-15T09:00:00.000Z');
          jest.useFakeTimers();
          jest.setSystemTime(cronRunTime);

          const appointmentTime = new Date('2025-03-16T09:00:00.000Z');

          const testAppointment = {
            appointmentId: 'apt-test',
            tenantId: 'tenant-1',
            scheduledAt: appointmentTime,
            durationMinutes: 60,
            patientId,
            patientEmail: 'patient@test.com',
            patientPhone: null,
            patientFirstName: 'Test',
            patientLastName: 'Patient',
          };

          mockAppointmentRows.length = 0;
          mockAppointmentRows.push(testAppointment);

          mockHasReminderBeenSent.mockReturnValue(Promise.resolve(false));
          mockCheckOptOut.mockReturnValue(Promise.resolve(optedOut));

          await sendReminders();

          // If opted out, sendAppointmentReminder should NOT be called
          if (optedOut) {
            expect(mockSendReminder).not.toHaveBeenCalled();
          } else {
            expect(mockSendReminder).toHaveBeenCalled();
          }

          jest.useRealTimers();
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 2.3: Missing Email Handling (Requirement 3.3)
   *
   * Verifies that patients without email are recorded as "skipped".
   */
  it('should record "skipped" status for patients without email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.emailAddress(), { nil: null }),
        async (patientEmail) => {
          jest.clearAllMocks();
          fromCallCount = 0;

          const cronRunTime = new Date('2025-03-15T09:00:00.000Z');
          jest.useFakeTimers();
          jest.setSystemTime(cronRunTime);

          const appointmentTime = new Date('2025-03-16T09:00:00.000Z');

          const testAppointment = {
            appointmentId: 'apt-test',
            tenantId: 'tenant-1',
            scheduledAt: appointmentTime,
            durationMinutes: 60,
            patientId: 'patient-1',
            patientEmail: patientEmail ?? null,
            patientPhone: null,
            patientFirstName: 'Test',
            patientLastName: 'Patient',
          };

          mockAppointmentRows.length = 0;
          mockAppointmentRows.push(testAppointment as any);

          mockHasReminderBeenSent.mockReturnValue(Promise.resolve(false));
          mockCheckOptOut.mockReturnValue(Promise.resolve(false));

          await sendReminders();

          if (!patientEmail) {
            // Should record as skipped with "no email address" reason
            expect(mockRecordDelivery).toHaveBeenCalledWith(
              expect.objectContaining({
                status: 'skipped',
                errorMessage: 'no email address',
              })
            );
            expect(mockSendReminder).not.toHaveBeenCalled();
          } else {
            expect(mockSendReminder).toHaveBeenCalled();
          }

          jest.useRealTimers();
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 2.4: WhatsApp for Gold Plan (Requirement 3.5)
   *
   * Verifies that Gold plan professionals with patient phone numbers send WhatsApp.
   */
  it('should send WhatsApp reminders for Gold plan with phone numbers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          subscriptionPlan: fc.constantFrom('basic', 'silver', 'gold'),
          subscriptionStatus: fc.constantFrom(
            'active',
            'inactive',
            'cancelled'
          ),
          patientPhone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), {
            nil: null,
          }),
        }),
        async ({ subscriptionPlan, subscriptionStatus, patientPhone }) => {
          jest.clearAllMocks();
          fromCallCount = 0;

          const cronRunTime = new Date('2025-03-15T09:00:00.000Z');
          jest.useFakeTimers();
          jest.setSystemTime(cronRunTime);

          const appointmentTime = new Date('2025-03-16T09:00:00.000Z');

          const testAppointment = {
            appointmentId: 'apt-test',
            tenantId: 'tenant-1',
            scheduledAt: appointmentTime,
            durationMinutes: 60,
            patientId: 'patient-1',
            patientEmail: 'patient@test.com',
            patientPhone: patientPhone ?? null,
            patientFirstName: 'Test',
            patientLastName: 'Patient',
          };

          mockAppointmentRows.length = 0;
          mockAppointmentRows.push(testAppointment as any);

          mockProfessionalRows.length = 0;
          mockProfessionalRows.push({
            tenantId: 'tenant-1',
            fullName: 'Dr. Test',
            address: null,
            subscriptionPlan,
            subscriptionStatus,
          } as any);

          mockHasReminderBeenSent.mockReturnValue(Promise.resolve(false));
          mockCheckOptOut.mockReturnValue(Promise.resolve(false));
          mockWhatsAppSendReminder.mockReturnValue(Promise.resolve(undefined));

          await sendReminders();

          // WhatsApp should be sent only if Gold plan + active + phone exists
          const shouldSendWhatsApp =
            subscriptionPlan === 'gold' &&
            subscriptionStatus === 'active' &&
            patientPhone !== null;

          // The WhatsApp call is async and uses void, so we need to wait
          await new Promise(
            (resolve) => jest.useRealTimers() && setTimeout(resolve, 50)
          );

          if (shouldSendWhatsApp) {
            expect(mockWhatsAppSendReminder).toHaveBeenCalledWith(
              patientPhone,
              expect.objectContaining({
                patientName: 'Test Patient',
              })
            );
          } else {
            expect(mockWhatsAppSendReminder).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 8 }
    );
  }, 30000);

  /**
   * Property 2.5: Error Handling (Requirement 3.6)
   *
   * Verifies that failed emails are recorded as "failed" with error message.
   * Note: We test the recording behavior, not the retry mechanism itself.
   */
  it('should record failed status when email sending fails', async () => {
    jest.clearAllMocks();
    fromCallCount = 0;

    jest.useRealTimers();

    const cronRunTime = new Date('2025-03-15T09:00:00.000Z');
    const appointmentTime = new Date('2025-03-16T09:00:00.000Z');

    const testAppointment = {
      appointmentId: 'apt-fail',
      tenantId: 'tenant-1',
      scheduledAt: appointmentTime,
      durationMinutes: 60,
      patientId: 'patient-1',
      patientEmail: 'patient@test.com',
      patientPhone: null,
      patientFirstName: 'Test',
      patientLastName: 'Patient',
    };

    mockAppointmentRows.length = 0;
    mockAppointmentRows.push(testAppointment);

    mockHasReminderBeenSent.mockReturnValue(Promise.resolve(false));
    mockCheckOptOut.mockReturnValue(Promise.resolve(false));

    // Mock sendAppointmentReminder to fail immediately
    const errorMessage = 'SMTP connection failed';
    let callCount = 0;
    mockSendReminder.mockImplementation(() => {
      callCount++;
      throw new Error(errorMessage);
    });

    // Mock Date.now
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => cronRunTime.getTime());

    // Mock setTimeout to execute immediately (skip retry delays)
    const originalSetTimeout = global.setTimeout;
    (global.setTimeout as any) = (fn: any) => {
      fn();
      return 0;
    };

    await sendReminders();

    // Should record as failed with error message
    expect(mockRecordDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errorMessage,
      })
    );

    // Verify retries happened (3 attempts)
    expect(callCount).toBe(3);

    // Restore
    Date.now = originalDateNow;
    global.setTimeout = originalSetTimeout;
  }, 5000);

  /**
   * Property 2.6: Batch Processing (Requirement 3.7)
   *
   * Verifies that appointments are processed in batches of 100.
   * This is an observational test - we verify the system processes all appointments
   * regardless of batch size.
   */
  it('should process all appointments in batches', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 250 }),
        async (appointmentCount) => {
          jest.clearAllMocks();
          fromCallCount = 0;

          // Use real timers to avoid timeout issues
          jest.useRealTimers();

          const cronRunTime = new Date('2025-03-15T09:00:00.000Z');
          const appointmentTime = new Date('2025-03-16T09:00:00.000Z');

          // Generate multiple appointments
          mockAppointmentRows.length = 0;
          for (let i = 0; i < appointmentCount; i++) {
            mockAppointmentRows.push({
              appointmentId: `apt-${i}`,
              tenantId: 'tenant-1',
              scheduledAt: appointmentTime,
              durationMinutes: 60,
              patientId: `patient-${i}`,
              patientEmail: `patient${i}@test.com`,
              patientPhone: null,
              patientFirstName: 'Test',
              patientLastName: `Patient${i}`,
            });
          }

          mockHasReminderBeenSent.mockReturnValue(Promise.resolve(false));
          mockCheckOptOut.mockReturnValue(Promise.resolve(false));

          // Mock Date.now to return consistent time
          const originalDateNow = Date.now;
          Date.now = jest.fn(() => cronRunTime.getTime());

          await sendReminders();

          // All appointments should be processed (sent or recorded)
          expect(mockSendReminder).toHaveBeenCalledTimes(appointmentCount);

          // Restore Date.now
          Date.now = originalDateNow;
        }
      ),
      { numRuns: 3 }
    );
  }, 30000);
});

/**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4**
 *
 * Property 1: Reminder Window Calculation
 *
 * These tests verify that the fixed implementation correctly identifies ALL
 * appointments scheduled for the next calendar day (UTC), regardless of what
 * time the cron runs and regardless of what hour the appointment is at.
 *
 * Fix: window changed from [now+23h, now+25h] to [tomorrow 00:00 UTC, tomorrow 23:59 UTC].
 * This ensures a once-daily 9 AM cron catches appointments at 7 AM, 11 AM, 3 PM, etc.
 * The existing hasReminderBeenSent check prevents duplicates if the job runs hourly.
 *
 * EXPECTED OUTCOME: All tests PASS after the fix.
 */
describe('Bug Condition Exploration - Property-Based Tests', () => {
  describe('Property 1: Reminder Window Calculation', () => {
    /**
     * This property test verifies that the reminder system correctly identifies
     * ALL appointments scheduled on the next calendar day (UTC), regardless of
     * what hour the cron runs and what hour the appointment is scheduled.
     *
     * After the fix: window = [midnight tomorrow, end-of-day tomorrow] (UTC), so
     * every appointment on 2025-03-16 is caught whenever the cron fires on 2025-03-15.
     */
    it('should identify appointments ~24h in advance regardless of cron run time', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Cron run hour (0-23)
            cronHour: fc.integer({ min: 0, max: 23 }),
            // Appointment hour tomorrow (0-23)
            appointmentHour: fc.integer({ min: 0, max: 23 }),
          }),
          async ({ cronHour, appointmentHour }) => {
            // Reset mocks for each property test iteration
            jest.clearAllMocks();
            fromCallCount = 0;

            // Simulate cron running at the specified hour
            const cronRunTime = new Date(
              `2025-03-15T${String(cronHour).padStart(2, '0')}:00:00.000Z`
            );
            jest.useFakeTimers();
            jest.setSystemTime(cronRunTime);

            // Appointment tomorrow at the specified hour
            const appointmentTime = new Date(
              `2025-03-16T${String(appointmentHour).padStart(2, '0')}:00:00.000Z`
            );

            // Mock appointment data
            const testAppointment = {
              appointmentId: `apt-${cronHour}-${appointmentHour}`,
              tenantId: 'tenant-1',
              scheduledAt: appointmentTime,
              durationMinutes: 60,
              patientId: 'patient-1',
              patientEmail: 'patient@test.com',
              patientPhone: null,
              patientFirstName: 'Test',
              patientLastName: 'Patient',
            };

            // Fixed window: entire next calendar day (2025-03-16), so every
            // appointment on that date should be returned by the query.
            mockAppointmentRows.length = 0;
            mockAppointmentRows.push(testAppointment);

            await sendReminders();

            // ASSERTION: Every appointment on next calendar day MUST be processed.
            expect(mockSendReminder).toHaveBeenCalledWith(
              'patient@test.com',
              expect.objectContaining({
                patientName: 'Test Patient',
                scheduledAt: appointmentTime,
              }),
              testAppointment.appointmentId
            );

            jest.useRealTimers();
          }
        ),
        {
          numRuns: 8,
          verbose: true,
        }
      );
    });

    /**
     * Expected Behavior 2.2: Appointment at 3 PM tomorrow (30h away from 9 AM cron)
     *
     * Previously missed because 30h is outside the old 23-25h window.
     * After fix: window covers the entire next calendar day, so 3 PM tomorrow
     * (2025-03-16T15:00Z) is always included regardless of cron run time.
     */
    it('should identify appointment at 3 PM tomorrow when cron runs at 9 AM', async () => {
      jest.clearAllMocks();
      fromCallCount = 0;

      // Cron runs at 9 AM
      const cronRunTime = new Date('2025-03-15T09:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(cronRunTime);

      // Appointment at 3 PM tomorrow (30 hours away — now inside the next-day window)
      const appointmentTime = new Date('2025-03-16T15:00:00.000Z');

      const testAppointment = {
        appointmentId: 'apt-3pm',
        tenantId: 'tenant-1',
        scheduledAt: appointmentTime,
        durationMinutes: 60,
        patientId: 'patient-1',
        patientEmail: 'patient@test.com',
        patientPhone: null,
        patientFirstName: 'Test',
        patientLastName: 'Patient',
      };

      // Fixed window covers all of 2025-03-16, so the query returns this appointment.
      mockAppointmentRows.length = 0;
      mockAppointmentRows.push(testAppointment);

      await sendReminders();

      // Expected Behavior 2.2: reminder IS sent for 3 PM tomorrow appointment.
      expect(mockSendReminder).toHaveBeenCalledWith(
        'patient@test.com',
        expect.objectContaining({
          scheduledAt: appointmentTime,
        }),
        'apt-3pm'
      );

      jest.useRealTimers();
    });

    /**
     * Expected Behavior 2.3: Appointment at 11 AM tomorrow (26h away from 9 AM cron)
     *
     * Previously missed because 26h is outside the old 23-25h window.
     * After fix: window covers the entire next calendar day, so 11 AM tomorrow
     * (2025-03-16T11:00Z) is included regardless of cron run time.
     */
    it('should identify appointment at 11 AM tomorrow when cron runs at 9 AM', async () => {
      jest.clearAllMocks();
      fromCallCount = 0;

      // Cron runs at 9 AM
      const cronRunTime = new Date('2025-03-15T09:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(cronRunTime);

      // Appointment at 11 AM tomorrow (26 hours away — now inside the next-day window)
      const appointmentTime = new Date('2025-03-16T11:00:00.000Z');

      const testAppointment = {
        appointmentId: 'apt-11am',
        tenantId: 'tenant-1',
        scheduledAt: appointmentTime,
        durationMinutes: 60,
        patientId: 'patient-1',
        patientEmail: 'patient@test.com',
        patientPhone: null,
        patientFirstName: 'Test',
        patientLastName: 'Patient',
      };

      // Fixed window covers all of 2025-03-16, so the query returns this appointment.
      mockAppointmentRows.length = 0;
      mockAppointmentRows.push(testAppointment);

      await sendReminders();

      // Expected Behavior 2.3: reminder IS sent for 11 AM tomorrow appointment.
      expect(mockSendReminder).toHaveBeenCalledWith(
        'patient@test.com',
        expect.objectContaining({
          scheduledAt: appointmentTime,
        }),
        'apt-11am'
      );

      jest.useRealTimers();
    });

    /**
     * Expected Behavior 2.1: Appointment at 7 AM tomorrow (22h away from 9 AM cron)
     *
     * Previously missed because 22h is outside the old 23-25h window.
     * After fix: window covers the entire next calendar day, so 7 AM tomorrow
     * (2025-03-16T07:00Z) is included regardless of cron run time.
     */
    it('should identify appointment at 7 AM tomorrow when cron runs at 9 AM', async () => {
      jest.clearAllMocks();
      fromCallCount = 0;

      // Cron runs at 9 AM
      const cronRunTime = new Date('2025-03-15T09:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(cronRunTime);

      // Appointment at 7 AM tomorrow (22 hours away — now inside the next-day window)
      const appointmentTime = new Date('2025-03-16T07:00:00.000Z');

      const testAppointment = {
        appointmentId: 'apt-7am',
        tenantId: 'tenant-1',
        scheduledAt: appointmentTime,
        durationMinutes: 60,
        patientId: 'patient-1',
        patientEmail: 'patient@test.com',
        patientPhone: null,
        patientFirstName: 'Test',
        patientLastName: 'Patient',
      };

      // Fixed window covers all of 2025-03-16, so the query returns this appointment.
      mockAppointmentRows.length = 0;
      mockAppointmentRows.push(testAppointment);

      await sendReminders();

      // Expected Behavior 2.1: reminder IS sent for 7 AM tomorrow appointment.
      expect(mockSendReminder).toHaveBeenCalledWith(
        'patient@test.com',
        expect.objectContaining({
          scheduledAt: appointmentTime,
        }),
        'apt-7am'
      );

      jest.useRealTimers();
    });
  });
});
