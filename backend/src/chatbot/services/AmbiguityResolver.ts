/**
 * AmbiguityResolver - Detects missing parameters and multiple matches,
 * generates clarifying questions in Spanish.
 */

import type {
  Intent,
  IntentOperation,
  IntentEntity,
  PendingDisambiguation,
  DisambiguationOption,
  ConversationContext,
} from '../types.js';
import { MAX_DISAMBIGUATION_OPTIONS } from '../types.js';
import { ResponseFormatter } from './ResponseFormatter.js';

const formatter = new ResponseFormatter();

interface RequiredParamSpec {
  field: string;
  prompt: string;
}

/**
 * Returns required parameters for each operation/entity combination.
 */
function getRequiredParams(
  operation: IntentOperation,
  entity: IntentEntity
): RequiredParamSpec[] {
  switch (entity) {
    case 'appointment': {
      if (operation === 'create') {
        return [
          {
            field: 'patient_name_or_id',
            prompt: formatter.missingPatientName(),
          },
          { field: 'date', prompt: formatter.missingAppointmentDate() },
          { field: 'time', prompt: formatter.missingAppointmentTime() },
        ];
      }
      if (operation === 'update' || operation === 'delete') {
        return [
          {
            field: 'appointment_id_or_ref',
            prompt:
              '¿Cuál es el turno que deseas modificar? Indica el paciente o la fecha.',
          },
        ];
      }
      break;
    }
    case 'patient': {
      if (operation === 'create') {
        return [
          { field: 'first_name', prompt: '¿Cuál es el nombre del paciente?' },
          { field: 'last_name', prompt: '¿Cuál es el apellido del paciente?' },
        ];
      }
      if (operation === 'update' || operation === 'delete') {
        return [
          {
            field: 'patient_name_or_id',
            prompt: formatter.missingPatientName(),
          },
        ];
      }
      if (operation === 'search' || operation === 'read') {
        return [
          {
            field: 'search_query',
            prompt: '¿Qué paciente deseas buscar? Indica el nombre o apellido.',
          },
        ];
      }
      break;
    }
  }
  return [];
}

/**
 * Checks if a required field is present in the intent params.
 * Returns the first missing field or null if all present.
 */
export function findMissingParam(
  intent: Intent,
  context: ConversationContext
): RequiredParamSpec | null {
  const required = getRequiredParams(intent.operation, intent.entity);

  for (const spec of required) {
    const field = spec.field;

    // Check composite fields
    if (field === 'patient_name_or_id') {
      const hasId =
        !!intent.params.patient_id &&
        intent.params.patient_id !== '__CONTEXT__';
      const hasName =
        !!intent.params.patient_name ||
        !!intent.params.full_name ||
        (!!intent.params.first_name && !!intent.params.last_name);
      const hasContextId = !!context.lastPatientId;
      if (!hasId && !hasName && !hasContextId) return spec;
    } else if (field === 'appointment_id_or_ref') {
      const hasId =
        !!intent.params.appointment_id &&
        intent.params.appointment_id !== '__CONTEXT__';
      const hasDate = !!intent.params.date;
      const hasContextId = !!context.lastAppointmentId;
      if (!hasId && !hasDate && !hasContextId) return spec;
    } else if (field === 'date') {
      if (!intent.params.date) return spec;
    } else if (field === 'time') {
      if (!intent.params.time) return spec;
    } else if (field === 'search_query') {
      const hasQuery =
        !!intent.params.search_query ||
        !!intent.params.patient_name ||
        !!intent.params.first_name;
      if (!hasQuery) return spec;
    } else {
      if (!intent.params[field]) return spec;
    }
  }

  return null;
}

/**
 * Creates a PendingDisambiguation for patient matches.
 */
export function createPatientDisambiguation(
  intent: Intent,
  patients: Array<{
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
  }>,
  context: ConversationContext
): PendingDisambiguation {
  const options: DisambiguationOption[] = patients
    .slice(0, MAX_DISAMBIGUATION_OPTIONS)
    .map((p) => ({
      id: p.id,
      label: `${p.first_name} ${p.last_name}${p.phone ? ` — ${p.phone}` : ''}`,
    }));

  return {
    intent,
    options,
    question: 'Encontré varios pacientes con ese nombre. ¿Cuál es el correcto?',
    field: 'patient_id',
  };
}

/**
 * Creates a PendingDisambiguation for appointment matches.
 */
export function createAppointmentDisambiguation(
  intent: Intent,
  appointments: Array<{
    id: string;
    patient_first_name?: string;
    patient_last_name?: string;
    scheduled_at: Date | string | null;
    status: string;
  }>,
  _context: ConversationContext
): PendingDisambiguation {
  const options: DisambiguationOption[] = appointments
    .slice(0, MAX_DISAMBIGUATION_OPTIONS)
    .map((apt) => {
      const patient =
        apt.patient_first_name && apt.patient_last_name
          ? `${apt.patient_first_name} ${apt.patient_last_name}`
          : 'Paciente';
      const date = apt.scheduled_at
        ? new Date(apt.scheduled_at).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Argentina/Buenos_Aires',
          })
        : 'Fecha no disponible';
      return {
        id: apt.id,
        label: `${patient} — ${date} — ${translateStatus(apt.status)}`,
      };
    });

  return {
    intent,
    options,
    question: '¿A cuál de los siguientes turnos te refieres?',
    field: 'appointment_id',
  };
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

/**
 * Formats a disambiguation as a response string.
 */
export function formatDisambiguationResponse(
  disambiguation: PendingDisambiguation
): string {
  if (disambiguation.field === 'patient_id') {
    return formatter.disambiguationPatients(
      disambiguation.options,
      disambiguation.question
    );
  }
  return formatter.disambiguationAppointments(
    disambiguation.options,
    disambiguation.question
  );
}
