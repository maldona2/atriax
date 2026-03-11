export interface AppointmentEmailData {
  patientName: string;
  professionalName: string;
  scheduledAt: Date;
  durationMinutes: number;
  notes?: string | null;
}

function formatDate(date: Date): string {
  return date.toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function baseHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 32px auto; background: #fff;
                 border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #1a1a2e; color: #fff; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .body { padding: 28px 32px; color: #333; line-height: 1.6; }
    .detail { background: #f9f9f9; border-radius: 6px; padding: 16px 20px;
              margin: 20px 0; font-size: 15px; }
    .detail p { margin: 6px 0; }
    .label { color: #666; font-size: 13px; text-transform: uppercase;
             letter-spacing: .04em; }
    .footer { padding: 16px 32px; font-size: 12px; color: #999;
              border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    ${body}
    <div class="footer">Este es un mensaje automático, no responda a este email.</div>
  </div>
</body>
</html>`;
}

export function bookedTemplate(data: AppointmentEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const dateStr = formatDate(data.scheduledAt);
  const subject = `Turno confirmado con ${data.professionalName}`;

  const html = baseHtml(
    subject,
    `<div class="header"><h1>✅ Turno agendado</h1></div>
     <div class="body">
       <p>Hola <strong>${data.patientName}</strong>,</p>
       <p>Tu turno ha sido agendado exitosamente.</p>
       <div class="detail">
         <p class="label">Profesional</p>
         <p><strong>${data.professionalName}</strong></p>
         <p class="label">Fecha y hora</p>
         <p><strong>${dateStr}</strong></p>
         <p class="label">Duración</p>
         <p>${data.durationMinutes} minutos</p>
         ${data.notes ? `<p class="label">Notas</p><p>${data.notes}</p>` : ''}
       </div>
       <p>Si necesitás cancelar o reprogramar, ponete en contacto a la brevedad.</p>
     </div>`
  );

  const text = `Turno agendado con ${data.professionalName}\n\nFecha: ${dateStr}\nDuración: ${data.durationMinutes} min\n${data.notes ? `Notas: ${data.notes}\n` : ''}`;

  return { subject, html, text };
}

export function confirmedTemplate(data: AppointmentEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const dateStr = formatDate(data.scheduledAt);
  const subject = `Tu turno está confirmado — ${dateStr}`;

  const html = baseHtml(
    subject,
    `<div class="header"><h1>🗓 Turno confirmado</h1></div>
     <div class="body">
       <p>Hola <strong>${data.patientName}</strong>,</p>
       <p>Tu turno ha sido <strong>confirmado</strong>.</p>
       <div class="detail">
         <p class="label">Profesional</p>
         <p><strong>${data.professionalName}</strong></p>
         <p class="label">Fecha y hora</p>
         <p><strong>${dateStr}</strong></p>
         <p class="label">Duración</p>
         <p>${data.durationMinutes} minutos</p>
       </div>
       <p>Te esperamos. ¡Hasta pronto!</p>
     </div>`
  );

  const text = `Tu turno con ${data.professionalName} está confirmado.\n\nFecha: ${dateStr}\nDuración: ${data.durationMinutes} min`;

  return { subject, html, text };
}

export function cancelledTemplate(data: AppointmentEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const dateStr = formatDate(data.scheduledAt);
  const subject = `Tu turno del ${dateStr} fue cancelado`;

  const html = baseHtml(
    subject,
    `<div class="header" style="background:#b91c1c"><h1>❌ Turno cancelado</h1></div>
     <div class="body">
       <p>Hola <strong>${data.patientName}</strong>,</p>
       <p>Lamentablemente tu turno del <strong>${dateStr}</strong> con <strong>${data.professionalName}</strong> ha sido <strong>cancelado</strong>.</p>
       <p>Comunicate para reprogramarlo cuando quieras.</p>
     </div>`
  );

  const text = `Tu turno del ${dateStr} con ${data.professionalName} fue cancelado. Comunicate para reprogramarlo.`;

  return { subject, html, text };
}

export function reminderTemplate(data: AppointmentEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const dateStr = formatDate(data.scheduledAt);
  const subject = `Recordatorio: turno mañana con ${data.professionalName}`;

  const html = baseHtml(
    subject,
    `<div class="header" style="background:#0369a1"><h1>⏰ Recordatorio de turno</h1></div>
     <div class="body">
       <p>Hola <strong>${data.patientName}</strong>,</p>
       <p>Te recordamos que mañana tenés turno.</p>
       <div class="detail">
         <p class="label">Profesional</p>
         <p><strong>${data.professionalName}</strong></p>
         <p class="label">Fecha y hora</p>
         <p><strong>${dateStr}</strong></p>
         <p class="label">Duración</p>
         <p>${data.durationMinutes} minutos</p>
       </div>
       <p>Si no podés asistir, avisanos lo antes posible.</p>
     </div>`
  );

  const text = `Recordatorio: turno mañana con ${data.professionalName}.\n\nFecha: ${dateStr}\nDuración: ${data.durationMinutes} min`;

  return { subject, html, text };
}
