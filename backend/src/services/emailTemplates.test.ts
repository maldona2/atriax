import {
  bookedTemplate,
  confirmedTemplate,
  cancelledTemplate,
  reminderTemplate,
} from './emailTemplates.js';

const baseData = {
  patientName: 'Juan Pérez',
  professionalName: 'Dr. García',
  scheduledAt: new Date('2025-03-15T14:00:00.000Z'),
  durationMinutes: 60,
};

describe('emailTemplates', () => {
  describe('bookedTemplate', () => {
    it('includes patient and professional in subject and body', () => {
      const { subject, html, text } = bookedTemplate(baseData);

      expect(subject).toContain('Dr. García');
      expect(subject).toContain('Turno confirmado');
      expect(html).toContain('Juan Pérez');
      expect(html).toContain('Dr. García');
      expect(html).toContain('60 minutos');
      expect(text).toContain('Dr. García');
      expect(text).toContain('60 min');
    });

    it('includes notes when provided', () => {
      const { html, text } = bookedTemplate({
        ...baseData,
        notes: 'Primera consulta',
      });

      expect(html).toContain('Primera consulta');
      expect(text).toContain('Primera consulta');
    });

    it('omits notes when null', () => {
      const { html, text } = bookedTemplate(baseData);

      expect(html).not.toContain('Notas</p>');
      expect(text).not.toMatch(/Notas:\s*null/);
    });

    it('returns valid HTML structure', () => {
      const { html } = bookedTemplate(baseData);

      expect(html).toMatch(/<!DOCTYPE html>/);
      expect(html).toContain('<html lang="es">');
      expect(html).toContain('Turno agendado');
    });
  });

  describe('confirmedTemplate', () => {
    it('includes patient and professional in subject and body', () => {
      const { subject, html, text } = confirmedTemplate(baseData);

      expect(subject).toContain('confirmado');
      expect(html).toContain('Juan Pérez');
      expect(html).toContain('Dr. García');
      expect(html).toContain('60 minutos');
      expect(text).toContain('confirmado');
      expect(text).toContain('Dr. García');
    });

    it('uses confirmation wording', () => {
      const { html } = confirmedTemplate(baseData);

      expect(html).toContain('Turno confirmado');
      expect(html).toContain('confirmado</strong>');
      expect(html).toContain('Te esperamos');
    });
  });

  describe('cancelledTemplate', () => {
    it('includes patient and professional in subject and body', () => {
      const { subject, html, text } = cancelledTemplate(baseData);

      expect(subject).toContain('cancelado');
      expect(html).toContain('Juan Pérez');
      expect(html).toContain('Dr. García');
      expect(text).toContain('cancelado');
      expect(text).toContain('reprogramarlo');
    });

    it('uses cancellation wording', () => {
      const { html } = cancelledTemplate(baseData);

      expect(html).toContain('Turno cancelado');
      expect(html).toContain('Lamentablemente');
      expect(html).toContain('cancelado</strong>');
    });
  });

  describe('reminderTemplate', () => {
    it('includes patient and professional in subject and body', () => {
      const { subject, html, text } = reminderTemplate(baseData);

      expect(subject).toContain('Recordatorio');
      expect(subject).toContain('Dr. García');
      expect(html).toContain('Juan Pérez');
      expect(html).toContain('Dr. García');
      expect(html).toContain('60 minutos');
      expect(text).toContain('Recordatorio');
      expect(text).toContain('mañana');
    });

    it('uses reminder wording', () => {
      const { html } = reminderTemplate(baseData);

      expect(html).toContain('Recordatorio de turno');
      expect(html).toContain('mañana tenés turno');
      expect(html).toContain('avisanos lo antes posible');
    });
  });
});
