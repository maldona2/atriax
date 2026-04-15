/**
 * Unit tests for WhatsAppReplyHandler
 */

// ─── DB mock ──────────────────────────────────────────────────────────────────

const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();

jest.mock('../../db/client.js', () => ({
  db: {
    select: mockSelect,
  },
  appointments: {
    id: 'appointments.id',
    tenantId: 'appointments.tenantId',
    patientId: 'appointments.patientId',
    status: 'appointments.status',
    scheduledAt: 'appointments.scheduledAt',
    durationMinutes: 'appointments.durationMinutes',
  },
  patients: {
    id: 'patients.id',
    tenantId: 'patients.tenantId',
    phone: 'patients.phone',
    firstName: 'patients.firstName',
  },
  users: {
    id: 'users.id',
    tenantId: 'users.tenantId',
    fullName: 'users.fullName',
    phone: 'users.phone',
  },
}));

// ─── appointmentService mock ──────────────────────────────────────────────────

const mockUpdateAppointment = jest.fn();
jest.mock('../../services/appointmentService.js', () => ({
  update: mockUpdateAppointment,
}));

// ─── drizzle-orm mock ─────────────────────────────────────────────────────────

jest.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => ({ and: args }),
  desc: (col: unknown) => ({ desc: col }),
  eq: (a: unknown, b: unknown) => ({ eq: [a, b] }),
  or: (...args: unknown[]) => ({ or: args }),
}));

// ─── imports ──────────────────────────────────────────────────────────────────

import { WhatsAppReplyHandler } from '../services/WhatsAppReplyHandler.js';
import type { MetaAPIClient } from '../services/MetaAPIClient.js';

function makeClient(): jest.Mocked<
  Pick<MetaAPIClient, 'sendTextMessage' | 'sendTemplateMessage'>
> {
  return {
    sendTextMessage: jest
      .fn()
      .mockResolvedValue({ success: true, messageId: 'mid-1' }),
    sendTemplateMessage: jest
      .fn()
      .mockResolvedValue({ success: true, messageId: 'mid-2' }),
  };
}

function setupDbChain(results: unknown[]) {
  // Each call to db.select().from().where()...limit() resolves to the next result
  let callIdx = 0;
  const chain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest
      .fn()
      .mockImplementation(() => Promise.resolve(results[callIdx++] ?? [])),
  };
  mockSelect.mockReturnValue(chain);
  return chain;
}

const APPT = {
  id: 'appt-1',
  scheduledAt: new Date('2026-04-20T13:00:00Z'),
  durationMinutes: 30,
};

describe('WhatsAppReplyHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateAppointment.mockResolvedValue({
      id: 'appt-1',
      status: 'confirmed',
    });
  });

  it('confirms appointment on SI reply', async () => {
    setupDbChain([
      [{ id: 'patient-1', firstName: 'María', tenantId: 'tenant-1' }], // patient lookup
      [APPT], // appointment lookup
      [{ fullName: 'Dr. Juan Pérez', phone: '5491100000000' }], // professional lookup
    ]);
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await handler.handle('tenant-1', '5491112345678', 'SI');

    expect(mockUpdateAppointment).toHaveBeenCalledWith('tenant-1', 'appt-1', {
      status: 'confirmed',
    });
    // Patient reply via sendTextMessage
    expect(client.sendTextMessage).toHaveBeenCalledTimes(1);
    const [, text] = (client.sendTextMessage as jest.Mock).mock.calls[0]!;
    expect(text).toContain('confirmado');
    // Doctor notification via sendTemplateMessage
    expect(client.sendTemplateMessage).toHaveBeenCalledTimes(1);
  });

  it('cancels appointment on CANCELAR reply', async () => {
    setupDbChain([
      [{ id: 'patient-1', firstName: 'María', tenantId: 'tenant-1' }],
      [APPT],
      [{ fullName: 'Dr. Juan Pérez', phone: '5491100000000' }],
    ]);
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await handler.handle('tenant-1', '5491112345678', 'CANCELAR');

    expect(mockUpdateAppointment).toHaveBeenCalledWith('tenant-1', 'appt-1', {
      status: 'cancelled',
    });
    const [, text] = (client.sendTextMessage as jest.Mock).mock.calls[0]!;
    expect(text).toContain('cancelado');
    // Doctor notified via template
    expect(client.sendTemplateMessage).toHaveBeenCalledTimes(1);
    const [, templateName] = (client.sendTemplateMessage as jest.Mock).mock
      .calls[0]!;
    expect(templateName).toBe('turno_cancelado_doctor');
  });

  it('accepts CONFIRMAR as synonym for SI', async () => {
    setupDbChain([
      [{ id: 'patient-1', firstName: 'María', tenantId: 'tenant-1' }],
      [APPT],
      [{ fullName: 'Dr. Juan', phone: null }],
    ]);
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await handler.handle('tenant-1', '5491112345678', 'CONFIRMAR');
    expect(mockUpdateAppointment).toHaveBeenCalledWith('tenant-1', 'appt-1', {
      status: 'confirmed',
    });
  });

  it('accepts NO as synonym for CANCELAR', async () => {
    setupDbChain([
      [{ id: 'patient-1', firstName: 'María', tenantId: 'tenant-1' }],
      [APPT],
      [{ fullName: 'Dr. Juan', phone: null }],
    ]);
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await handler.handle('tenant-1', '5491112345678', 'no');
    expect(mockUpdateAppointment).toHaveBeenCalledWith('tenant-1', 'appt-1', {
      status: 'cancelled',
    });
  });

  it('ignores unrecognised keywords', async () => {
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await handler.handle('tenant-1', '5491112345678', 'Hola, ¿cómo están?');
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockUpdateAppointment).not.toHaveBeenCalled();
  });

  it('does nothing when patient is not found', async () => {
    setupDbChain([
      [], // patient not found
    ]);
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await handler.handle('tenant-1', '5491112345678', 'SI');
    expect(mockUpdateAppointment).not.toHaveBeenCalled();
    expect(client.sendTextMessage).not.toHaveBeenCalled();
  });

  it('does nothing when no pending appointment is found', async () => {
    setupDbChain([
      [{ id: 'patient-1', firstName: 'María', tenantId: 'tenant-1' }],
      [], // no pending appointment
    ]);
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await handler.handle('tenant-1', '5491112345678', 'SI');
    expect(mockUpdateAppointment).not.toHaveBeenCalled();
  });

  it('does not throw when updateAppointment fails', async () => {
    setupDbChain([
      [{ id: 'patient-1', firstName: 'María', tenantId: 'tenant-1' }],
      [APPT],
      [{ fullName: 'Dr. Juan', phone: null }],
    ]);
    mockUpdateAppointment.mockRejectedValue(new Error('DB error'));
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await expect(
      handler.handle('tenant-1', '5491112345678', 'SI')
    ).resolves.not.toThrow();
    expect(client.sendTextMessage).not.toHaveBeenCalled();
  });

  it('notifies doctor when patient replies SI', async () => {
    const doctorPhone = '5491199990000';
    setupDbChain([
      [{ id: 'patient-1', firstName: 'María', tenantId: 'tenant-1' }],
      [APPT],
      [{ fullName: 'Dr. Juan Pérez', phone: doctorPhone }],
    ]);
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await handler.handle('tenant-1', '5491112345678', 'SI');

    // Patient reply goes via sendTextMessage
    expect(client.sendTextMessage).toHaveBeenCalledTimes(1);
    // Doctor notification goes via sendTemplateMessage
    expect(client.sendTemplateMessage).toHaveBeenCalledTimes(1);
    const [callPhone, templateName, , bodyParams] = (
      client.sendTemplateMessage as jest.Mock
    ).mock.calls[0]!;
    expect(callPhone).toBe(doctorPhone);
    expect(templateName).toBe('turno_confirmado_doctor');
    expect(bodyParams[0]).toBe('María'); // patient name as first param
  });

  it('skips doctor notification if professional has no phone', async () => {
    setupDbChain([
      [{ id: 'patient-1', firstName: 'María', tenantId: 'tenant-1' }],
      [APPT],
      [{ fullName: 'Dr. Juan Pérez', phone: null }],
    ]);
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await handler.handle('tenant-1', '5491112345678', 'SI');

    // Only sendTextMessage for patient; no doctor template notification
    expect(client.sendTextMessage).toHaveBeenCalledTimes(1);
    expect(client.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it('notifies doctor when patient replies CANCELAR', async () => {
    const doctorPhone = '5491199990000';
    setupDbChain([
      [{ id: 'patient-1', firstName: 'María', tenantId: 'tenant-1' }],
      [APPT],
      [{ fullName: 'Dr. Juan Pérez', phone: doctorPhone }],
    ]);
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await handler.handle('tenant-1', '5491112345678', 'CANCELAR');

    expect(client.sendTextMessage).toHaveBeenCalledTimes(1);
    expect(client.sendTemplateMessage).toHaveBeenCalledTimes(1);
    const [callPhone, templateName, , bodyParams] = (
      client.sendTemplateMessage as jest.Mock
    ).mock.calls[0]!;
    expect(callPhone).toBe(doctorPhone);
    expect(templateName).toBe('turno_cancelado_doctor');
    expect(bodyParams[0]).toBe('María');
  });

  it('skips doctor cancel notification if professional has no phone', async () => {
    setupDbChain([
      [{ id: 'patient-1', firstName: 'María', tenantId: 'tenant-1' }],
      [APPT],
      [{ fullName: 'Dr. Juan Pérez', phone: null }],
    ]);
    const client = makeClient();
    const handler = new WhatsAppReplyHandler(
      client as unknown as MetaAPIClient
    );
    await handler.handle('tenant-1', '5491112345678', 'CANCELAR');

    expect(client.sendTextMessage).toHaveBeenCalledTimes(1);
    expect(client.sendTemplateMessage).not.toHaveBeenCalled();
  });
});
