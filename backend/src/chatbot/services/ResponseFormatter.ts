/**
 * ResponseFormatter - Generates Spanish-language responses for all chatbot operations.
 */

import type { Intent, DisambiguationOption } from '../types.js';

interface AppointmentData {
  id?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  scheduled_at?: string;
  status?: string;
  payment_status?: string;
  duration_minutes?: number | null;
  notes?: string | null;
  total_amount_cents?: number | null;
  treatments?: Array<{
    id?: string;
    treatment_id?: string;
    treatment_name?: string;
    quantity?: number;
    unit_price_cents?: number;
  }>;
}

interface PatientData {
  id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
}

interface TreatmentData {
  id?: string;
  name?: string;
  price_cents?: number;
  initial_frequency_weeks?: number | null;
  initial_sessions_count?: number | null;
  maintenance_frequency_weeks?: number | null;
  protocol_notes?: string | null;
}

/**
 * Format a date string in Spanish locale (DD/MM/YYYY HH:MM)
 */
export function formatDateTimeES(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  } catch {
    return isoString;
  }
}

export function formatDateES(isoString: string): string {
  try {
    const date = new Date(isoString + 'T00:00:00');
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatCurrencyARS(cents: number): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    completed: 'Completado',
    cancelled: 'Cancelado',
    'no-show': 'No se presentó',
  };
  return map[status] ?? status;
}

function translatePaymentStatus(status: string | null | undefined): string {
  if (!status) return 'Sin estado';
  const map: Record<string, string> = {
    unpaid: 'Sin pagar',
    paid: 'Pagado',
    partial: 'Pago parcial',
    refunded: 'Reembolsado',
  };
  return map[status] ?? status;
}

function appointmentSummary(apt: AppointmentData): string {
  const patient =
    apt.patient_first_name && apt.patient_last_name
      ? `${apt.patient_first_name} ${apt.patient_last_name}`
      : 'Paciente';
  const dateTime = apt.scheduled_at
    ? formatDateTimeES(apt.scheduled_at)
    : 'Fecha no disponible';
  const status = apt.status ? ` — ${translateStatus(apt.status)}` : '';
  return `• ${patient} — ${dateTime}${status}`;
}

function patientSummary(p: PatientData): string {
  const name =
    p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : 'Paciente';
  const phone = p.phone ? ` — Tel: ${p.phone}` : '';
  const email = p.email ? ` — Email: ${p.email}` : '';
  return `• ${name}${phone}${email}`;
}

const MAX_LIST_ITEMS = 10;

export class ResponseFormatter {
  // ─── Appointment responses ──────────────────────────────────────────────────

  appointmentCreated(apt: AppointmentData): string {
    const patient =
      apt.patient_first_name && apt.patient_last_name
        ? `${apt.patient_first_name} ${apt.patient_last_name}`
        : 'el paciente';
    const dateTime = apt.scheduled_at
      ? formatDateTimeES(apt.scheduled_at)
      : 'la fecha indicada';

    let treatmentInfo = '';
    if (apt.treatments && apt.treatments.length > 0) {
      const treatmentNames = apt.treatments
        .map((t) => t.treatment_name)
        .filter(Boolean)
        .join(', ');
      if (treatmentNames) {
        treatmentInfo = ` con tratamiento de ${treatmentNames}`;
      }
    }

    return `✅ Turno creado correctamente para ${patient} el ${dateTime}${treatmentInfo}.`;
  }

  appointmentsList(appointments: AppointmentData[], total?: number): string {
    if (!appointments.length) {
      return 'No se encontraron turnos con los criterios indicados.';
    }
    const items = appointments
      .slice(0, MAX_LIST_ITEMS)
      .map(appointmentSummary)
      .join('\n');
    const showing = Math.min(appointments.length, MAX_LIST_ITEMS);
    const totalCount = total ?? appointments.length;
    const suffix =
      totalCount > MAX_LIST_ITEMS
        ? `\n\n_(Mostrando ${showing} de ${totalCount} turnos)_`
        : '';
    return `📅 **Turnos encontrados:**\n\n${items}${suffix}`;
  }

  appointmentDetail(apt: AppointmentData): string {
    const patient =
      apt.patient_first_name && apt.patient_last_name
        ? `${apt.patient_first_name} ${apt.patient_last_name}`
        : 'Paciente';
    const dateTime = apt.scheduled_at
      ? formatDateTimeES(apt.scheduled_at)
      : 'No disponible';
    const status = apt.status ? translateStatus(apt.status) : 'No disponible';
    const payment = translatePaymentStatus(apt.payment_status);
    const duration = apt.duration_minutes
      ? `${apt.duration_minutes} minutos`
      : 'No especificada';
    const amount = apt.total_amount_cents
      ? formatCurrencyARS(apt.total_amount_cents)
      : 'No especificado';

    return `📋 **Detalle del turno:**\n\n• **Paciente:** ${patient}\n• **Fecha/Hora:** ${dateTime}\n• **Estado:** ${status}\n• **Pago:** ${payment}\n• **Duración:** ${duration}\n• **Monto:** ${amount}`;
  }

  appointmentUpdated(apt: AppointmentData): string {
    const patient =
      apt.patient_first_name && apt.patient_last_name
        ? `${apt.patient_first_name} ${apt.patient_last_name}`
        : 'el turno';
    return `✅ Turno de ${patient} actualizado correctamente.`;
  }

  appointmentCancelled(apt: AppointmentData): string {
    const patient =
      apt.patient_first_name && apt.patient_last_name
        ? `${apt.patient_first_name} ${apt.patient_last_name}`
        : 'el paciente';
    const dateTime = apt.scheduled_at ? formatDateTimeES(apt.scheduled_at) : '';
    return `✅ Turno de ${patient}${dateTime ? ` del ${dateTime}` : ''} cancelado correctamente.`;
  }

  // ─── Patient responses ──────────────────────────────────────────────────────

  patientCreated(patient: PatientData): string {
    const name =
      patient.first_name && patient.last_name
        ? `${patient.first_name} ${patient.last_name}`
        : 'el paciente';
    return `✅ Paciente **${name}** registrado correctamente.`;
  }

  patientsList(patients: PatientData[], total?: number): string {
    if (!patients.length) {
      return 'No se encontraron pacientes con los criterios indicados.';
    }
    const items = patients
      .slice(0, MAX_LIST_ITEMS)
      .map(patientSummary)
      .join('\n');
    const showing = Math.min(patients.length, MAX_LIST_ITEMS);
    const totalCount = total ?? patients.length;
    const suffix =
      totalCount > MAX_LIST_ITEMS
        ? `\n\n_(Mostrando ${showing} de ${totalCount} pacientes)_`
        : '';
    return `👥 **Pacientes encontrados:**\n\n${items}${suffix}`;
  }

  patientDetail(patient: PatientData): string {
    const name =
      patient.first_name && patient.last_name
        ? `${patient.first_name} ${patient.last_name}`
        : 'Paciente';
    const phone = patient.phone || 'No registrado';
    const email = patient.email || 'No registrado';
    const dob = patient.date_of_birth
      ? formatDateES(patient.date_of_birth)
      : 'No registrado';

    return `👤 **Paciente: ${name}**\n\n• **Teléfono:** ${phone}\n• **Email:** ${email}\n• **Fecha de nacimiento:** ${dob}`;
  }

  patientUpdated(patient: PatientData): string {
    const name =
      patient.first_name && patient.last_name
        ? `${patient.first_name} ${patient.last_name}`
        : 'el paciente';
    return `✅ Datos de **${name}** actualizados correctamente.`;
  }

  patientDeleted(patient: PatientData): string {
    const name =
      patient.first_name && patient.last_name
        ? `${patient.first_name} ${patient.last_name}`
        : 'el paciente';
    return `✅ Paciente **${name}** eliminado correctamente.`;
  }

  // ─── Treatment responses ────────────────────────────────────────────────────

  treatmentCreated(t: TreatmentData): string {
    const name = t.name ?? 'el tratamiento';
    const price =
      t.price_cents !== undefined ? formatCurrencyARS(t.price_cents) : '';
    const priceStr = price ? ` — Precio: ${price}` : '';
    return `✅ Tratamiento **${name}** creado correctamente.${priceStr}`;
  }

  treatmentsList(treatments: TreatmentData[]): string {
    if (!treatments.length) {
      return 'No se encontraron tratamientos registrados.';
    }
    const items = treatments
      .slice(0, MAX_LIST_ITEMS)
      .map((t) => {
        const price =
          t.price_cents !== undefined ? formatCurrencyARS(t.price_cents) : '';
        return `• **${t.name ?? 'Sin nombre'}**${price ? ` — ${price}` : ''}`;
      })
      .join('\n');
    const showing = Math.min(treatments.length, MAX_LIST_ITEMS);
    const totalCount = treatments.length;
    const suffix =
      totalCount > MAX_LIST_ITEMS
        ? `\n\n_(Mostrando ${showing} de ${totalCount} tratamientos)_`
        : '';
    return `💊 **Tratamientos:**\n\n${items}${suffix}`;
  }

  treatmentDetail(t: TreatmentData): string {
    const name = t.name ?? 'Sin nombre';
    const price =
      t.price_cents !== undefined
        ? formatCurrencyARS(t.price_cents)
        : 'No especificado';

    const formatFreq = (weeks: number | null | undefined): string => {
      if (!weeks) return 'No especificada';
      if (weeks === 1) return 'Semanal';
      if (weeks === 2) return 'Quincenal';
      if (weeks === 4) return 'Mensual';
      if (weeks === 13) return 'Cada 3 meses';
      if (weeks === 26) return 'Cada 6 meses';
      if (weeks === 52) return 'Anual';
      return `Cada ${weeks} semanas`;
    };

    const initialPhase =
      t.initial_frequency_weeks || t.initial_sessions_count
        ? `${formatFreq(t.initial_frequency_weeks)}${t.initial_sessions_count ? `, ${t.initial_sessions_count} sesiones` : ''}`
        : 'No especificada';

    const maintenancePhase = t.maintenance_frequency_weeks
      ? formatFreq(t.maintenance_frequency_weeks)
      : 'No especificada';

    const notes = t.protocol_notes ?? 'Sin notas';

    return `💊 **Tratamiento: ${name}**\n\n• **Precio:** ${price}\n• **Fase inicial:** ${initialPhase}\n• **Mantenimiento:** ${maintenancePhase}\n• **Notas:** ${notes}`;
  }

  treatmentUpdated(t: TreatmentData): string {
    const name = t.name ?? 'el tratamiento';
    return `✅ Tratamiento **${name}** actualizado correctamente.`;
  }

  treatmentDeleted(t: TreatmentData): string {
    const name = t.name ?? 'el tratamiento';
    return `✅ Tratamiento **${name}** eliminado correctamente.`;
  }

  // ─── Confirmation responses ─────────────────────────────────────────────────

  confirmationRequest(action: string, details: string): string {
    return `⚠️ **Confirmación requerida**\n\n${action}\n\n${details}\n\n¿Confirmas esta acción? Responde **sí** para continuar o **no** para cancelar.`;
  }

  confirmationCancellationRequest(
    patientName: string,
    dateTime: string
  ): string {
    return this.confirmationRequest(
      `Estás por cancelar el turno de **${patientName}** del **${dateTime}**.`,
      'Esta acción no se puede deshacer fácilmente.'
    );
  }

  confirmationDeletePatientRequest(patientName: string): string {
    return this.confirmationRequest(
      `Estás por eliminar al paciente **${patientName}** y todos sus datos.`,
      'Esta acción es irreversible.'
    );
  }

  confirmationDeclined(): string {
    return '❌ Acción cancelada. ¿En qué más puedo ayudarte?';
  }

  confirmationTimeout(): string {
    return '⏰ La confirmación expiró. Por favor, repite la acción si deseas continuar.';
  }

  // ─── Disambiguation responses ───────────────────────────────────────────────

  disambiguationPatients(
    options: DisambiguationOption[],
    question?: string
  ): string {
    const q =
      question ||
      'Encontré varios pacientes con ese nombre. ¿Cuál es el correcto?';
    const items = options.map((opt, i) => `${i + 1}. ${opt.label}`).join('\n');
    return `🔍 ${q}\n\n${items}\n\nResponde con el número o nombre del paciente correcto.`;
  }

  disambiguationAppointments(
    options: DisambiguationOption[],
    question?: string
  ): string {
    const q = question || 'Encontré varios turnos. ¿Cuál es el correcto?';
    const items = options.map((opt, i) => `${i + 1}. ${opt.label}`).join('\n');
    return `🔍 ${q}\n\n${items}\n\nResponde con el número del turno correcto.`;
  }

  // ─── Missing parameter prompts ──────────────────────────────────────────────

  missingPatientName(): string {
    return '¿Cuál es el nombre del paciente?';
  }

  missingAppointmentDate(): string {
    return '¿Para qué fecha deseas programar el turno? (ej: hoy, mañana, DD/MM/YYYY)';
  }

  missingAppointmentTime(): string {
    return '¿A qué hora deseas programar el turno? (ej: 09:00, 14:30)';
  }

  missingField(fieldName: string): string {
    const fieldNames: Record<string, string> = {
      patient_name: 'nombre del paciente',
      date: 'fecha',
      time: 'hora',
      status: 'estado',
      payment_status: 'estado de pago',
      first_name: 'nombre',
      last_name: 'apellido',
      email: 'email',
      phone: 'teléfono',
    };
    const label = fieldNames[fieldName] ?? fieldName;
    return `¿Puedes indicarme ${label}?`;
  }

  // ─── Error responses ────────────────────────────────────────────────────────

  errorGeneral(message?: string): string {
    if (message) {
      return `❌ Ocurrió un error: ${message}. Por favor, intenta nuevamente.`;
    }
    return '❌ Ocurrió un error inesperado. Por favor, intenta nuevamente.';
  }

  errorNotFound(entity: string): string {
    const entityNames: Record<string, string> = {
      appointment: 'turno',
      patient: 'paciente',
      session: 'sesión',
      treatment: 'tratamiento',
    };
    const label = entityNames[entity] ?? entity;
    return `❌ No se encontró el ${label} indicado.`;
  }

  errorPatientLimit(): string {
    return '❌ Se alcanzó el límite de pacientes para tu plan. Por favor, actualiza tu suscripción.';
  }

  errorAppointmentLimit(): string {
    return '❌ Se alcanzó el límite diario de turnos para tu plan. Por favor, actualiza tu suscripción.';
  }

  errorValidation(detail: string): string {
    return `❌ Datos inválidos: ${detail}`;
  }

  errorInvalidDate(): string {
    return '❌ El formato de fecha no es válido. Por favor, usa el formato DD/MM/YYYY o indica "hoy", "mañana", etc.';
  }

  errorInvalidEmail(): string {
    return '❌ El formato de email no es válido. Por favor, verifica e intenta nuevamente.';
  }

  errorInvalidPhone(): string {
    return '❌ El formato de teléfono no es válido. Por favor, verifica e intenta nuevamente.';
  }

  errorInvalidDuration(): string {
    return '❌ La duración debe estar entre 5 y 480 minutos.';
  }

  // ─── Help response ──────────────────────────────────────────────────────────

  help(): string {
    return `🤖 **Asistente de IA — Comandos disponibles**

Puedo ayudarte con las siguientes operaciones:

**📅 Turnos:**
• "Crear turno para Juan Pérez el lunes a las 10:00"
• "Mostrar turnos de hoy"
• "Listar turnos de esta semana"
• "Cancelar el turno de Ana García"
• "Confirmar turno del 15/04"
• "Marcar turno como pagado"

**👥 Pacientes:**
• "Nuevo paciente: María López, tel 011-1234-5678"
• "Buscar paciente García"
• "Ver datos de Juan Pérez"
• "Actualizar email de María López a maria@ejemplo.com"
• "Eliminar paciente Juan Pérez"

**📋 Sesiones:**
• "Ver historial de sesiones de Ana García"

**💊 Tratamientos:**
• "Crear tratamiento Fisioterapia con precio $400, una vez por mes durante 3 meses, luego una vez al año"
• "Listar tratamientos"
• "Ver tratamiento Fisioterapia"
• "Actualizar precio del tratamiento Kinesiología a $600"
• "Eliminar tratamiento Acupuntura"

**Otros:**
• "Ayuda" — Muestra este mensaje
• "Reiniciar" — Limpia el historial de conversación

¿En qué puedo ayudarte?`;
  }

  // ─── Reset response ─────────────────────────────────────────────────────────

  reset(): string {
    return '🔄 Conversación reiniciada. ¿En qué puedo ayudarte?';
  }

  // ─── Unknown command fallback ───────────────────────────────────────────────

  unknown(originalText?: string): string {
    const examples = [
      '"Crear turno para [nombre] el [fecha] a las [hora]"',
      '"Nuevo paciente [nombre] [apellido]"',
      '"Buscar paciente [nombre]"',
      '"Mostrar turnos de hoy"',
      '"Cancelar turno de [nombre]"',
    ];
    return `Solo puedo ayudarte con la gestión de turnos y pacientes${originalText ? ` ("${originalText}" no es una operación reconocida)` : ''}.\n\nPuedes intentar con comandos como:\n${examples.join('\n')}\n\nO escribe **"ayuda"** para ver todos los comandos disponibles.`;
  }
}
