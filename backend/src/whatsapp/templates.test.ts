import { cycleReminderTemplate } from './templates.js';

describe('cycleReminderTemplate', () => {
  it('builds the recordatorio_ciclo template with ordered params', () => {
    const msg = cycleReminderTemplate({
      patientName: 'Ana Pérez',
      treatmentName: 'Botox',
      professionalName: 'Dra. López',
      address: 'Av. Siempreviva 742',
    });
    expect(msg.templateName).toBe('recordatorio_ciclo');
    expect(msg.languageCode).toBe('es_AR');
    expect(msg.bodyParameters).toEqual([
      'Ana Pérez',
      'Botox',
      'Dra. López',
      'Av. Siempreviva 742',
    ]);
  });

  it('falls back to "A confirmar" when address is null', () => {
    const msg = cycleReminderTemplate({
      patientName: 'Ana Pérez',
      treatmentName: 'Botox',
      professionalName: 'Dra. López',
      address: null,
    });
    expect(msg.bodyParameters[3]).toBe('A confirmar');
  });
});
