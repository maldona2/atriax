import { jest } from '@jest/globals';
import { sendReminders } from './reminderJob.js';

const mockSendReminder = jest.fn();

jest.mock('../services/mailService.js', () => ({
  sendAppointmentReminder: (...args: unknown[]) => {
    mockSendReminder(...args);
  },
}));

jest.mock('../utils/logger.js', () => {
  const noop = () => {};
  return {
    __esModule: true,
    default: { info: noop, error: noop },
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
    patientFirstName: 'Ana',
    patientLastName: 'González',
  },
];

const mockProfessionalRows = [
  { tenantId: 'tenant-1', fullName: 'Dr. García' },
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

describe('reminderJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fromCallCount = 0;
  });

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
});
