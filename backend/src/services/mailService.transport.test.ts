const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn((_options: unknown) => ({
  sendMail: mockSendMail,
}));
const mockLog = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: mockCreateTransport },
}));

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { ...mockLog, child: () => mockLog },
}));

const MAIL_KEYS = [
  'NODE_ENV',
  'MAIL_FROM',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
];
const savedEnv = { ...process.env };

function setEnv(env: Record<string, string>): void {
  for (const key of MAIL_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
}

async function loadMailService() {
  jest.resetModules();
  return import('./mailService.js');
}

const sesEnv = {
  NODE_ENV: 'production',
  MAIL_FROM: 'Atriax <no-reply@mail.example.com>',
  SMTP_HOST: 'email-smtp.us-east-1.amazonaws.com',
  SMTP_USER: 'AKIAEXAMPLE',
  SMTP_PASS: 'smtp-secret',
};

const appointment = {
  patientName: 'Juan Pérez',
  professionalName: 'Dra. Gómez',
  scheduledAt: new Date('2024-03-15T14:30:00-03:00'),
  durationMinutes: 60,
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  process.env = savedEnv;
});

describe('mailService transport', () => {
  it('rejects with "Mail not configured" when no mail env is set', async () => {
    setEnv({ NODE_ENV: 'production' });
    const mail = await loadMailService();

    await expect(
      mail.sendWelcomeEmail('juan@example.com', 'Juan')
    ).rejects.toThrow('Mail not configured');
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  it('does not leave an unhandled rejection for fire-and-forget sends', async () => {
    setEnv({ NODE_ENV: 'production' });
    const mail = await loadMailService();
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    mail.sendAppointmentBooked('juan@example.com', appointment, 'appt-1');
    await new Promise((resolve) => setImmediate(resolve));

    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('fails at import when SMTP config is partial', async () => {
    setEnv({ MAIL_FROM: sesEnv.MAIL_FROM, SMTP_HOST: sesEnv.SMTP_HOST });

    await expect(loadMailService()).rejects.toThrow(/Invalid mail config/);
  });

  it('sends through SES SMTP on 587 with STARTTLS and MAIL_FROM', async () => {
    setEnv(sesEnv);
    mockSendMail.mockResolvedValue({ messageId: '<id@ses>' });
    const mail = await loadMailService();

    await mail.sendPasswordResetEmail(
      'juan@example.com',
      'https://app.test/reset?t=1'
    );

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: sesEnv.SMTP_HOST,
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: sesEnv.SMTP_USER, pass: sesEnv.SMTP_PASS },
      })
    );
    const sent = mockSendMail.mock.calls[0][0];
    expect(sent.from).toBe(sesEnv.MAIL_FROM);
    expect(sent.to).toBe('juan@example.com');
    expect(sent.html).toContain('https://app.test/reset?t=1');
    expect(sent.text).toContain('https://app.test/reset?t=1');
  });

  it('maps the ICS attachment type to contentType', async () => {
    setEnv(sesEnv);
    mockSendMail.mockResolvedValue({ messageId: '<id@ses>' });
    const mail = await loadMailService();

    await mail.sendAppointmentReminder(
      'juan@example.com',
      appointment,
      '123e4567-e89b-12d3-a456-426614174000'
    );

    const [attachment] = mockSendMail.mock.calls[0][0].attachments;
    expect(attachment).toMatchObject({
      filename: 'appointment.ics',
      contentType: 'text/calendar',
    });
    expect(attachment.content).toContain('BEGIN:VCALENDAR');
  });
});
