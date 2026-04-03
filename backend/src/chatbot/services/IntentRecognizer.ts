import OpenAI from 'openai';
import { Intent, IntentOperation, IntentEntity } from '../types.js';
import logger from '../../utils/logger.js';

interface OpenAIIntentResponse {
  operation: IntentOperation;
  entity: IntentEntity;
  params: Record<string, unknown>;
  confidence: number;
}

function buildSystemPrompt(): string {
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split('T')[0];

  return `Eres un clasificador de intenciones EXCLUSIVO para un sistema de gestión de turnos médicos.

IMPORTANTE: Solo puedes procesar mensajes relacionados con:
- Gestión de turnos/citas médicas (crear, listar, actualizar, cancelar)
- Gestión de pacientes (crear, buscar, actualizar, eliminar)
- Historial de sesiones clínicas
- Comandos del sistema: ayuda, reiniciar

Si el mensaje NO está relacionado con estas operaciones (por ejemplo: preguntas generales, conversación, clima, recetas, diagnósticos médicos, noticias, matemáticas, etc.), devuelve SIEMPRE:
{"operation":"unknown","entity":"none","params":{},"confidence":0}

Para mensajes válidos, devuelve un JSON con:
{
  "operation": "create|read|update|delete|list|search|help|reset|unknown",
  "entity": "appointment|patient|session|none",
  "params": {
    // Parámetros extraídos del mensaje según la operación:
    // Para citas (appointment):
    //   patient_name, patient_id, date (ISO YYYY-MM-DD), time (HH:MM), status, payment_status,
    //   duration_minutes, appointment_id, date_from, date_to, notes
    // Para pacientes (patient):
    //   first_name, last_name, phone, email, date_of_birth, patient_notes, patient_id, search_query
    // Para sesiones (session):
    //   appointment_id, procedures_performed, recommendations
    // Para actualizaciones (update):
    //   field, value
    // Para cancelaciones: status="cancelled"
  },
  "confidence": 0.0-1.0
}

Fecha actual del sistema: ${todayISO}
Reglas de extracción:
- Fechas relativas: "hoy" → ${todayISO}, "mañana" → ${tomorrowISO}, usar SIEMPRE la fecha actual del sistema como referencia
- "el paciente" / "ella" / "él" → usar contexto previo (patient_id = "__CONTEXT__")
- "esa cita" / "el turno" → usar contexto previo (appointment_id = "__CONTEXT__")
- Estado de citas: "confirmar"→"confirmed", "completar"→"completed", "cancelar"→"cancelled", "no vino"→"no-show"
- Estado de pago: "pagado"→"paid", "sin pagar"→"unpaid", "parcial"→"partial", "reembolso"→"refunded"
- Para búsquedas sin ID específico, buscar por nombre
- Nombres de pacientes: extraer siempre como patient_name, incluso en formato "Apellido, Nombre"

Mapeo OBLIGATORIO de operaciones:
- "cancelar/anular turno/cita" → operation:"update" + entity:"appointment" + params:{status:"cancelled", patient_name:"..."} — NUNCA usar operation:"delete" para cancelaciones
- "eliminar/borrar turno/cita" → operation:"delete" + entity:"appointment"
- "eliminar/borrar paciente" → operation:"delete" + entity:"patient"
- "confirmar turno" → operation:"update" + entity:"appointment" + params:{status:"confirmed"}
- "reprogramar/mover turno" → operation:"update" + entity:"appointment"
- "cancelar turno de [Apellido, Nombre]" → operation:"update", entity:"appointment", params:{status:"cancelled", patient_name:"Apellido, Nombre"}
- "elimina todos los turnos de [fecha]" → operation:"delete", entity:"appointment", params:{date:"YYYY-MM-DD"}

Solo devuelve el JSON, sin texto adicional.`;
}

/**
 * Fallback pattern matching when OpenAI is unavailable.
 * Provides basic intent recognition for common Spanish commands.
 */
function patternMatchIntent(text: string): Intent {
  const lower = text.toLowerCase().trim();
  const rawText = text;

  // Reset commands
  if (
    /\b(reiniciar|resetear|limpiar|nueva conversaci[oó]n|empezar de nuevo|borrar historial)\b/.test(
      lower
    )
  ) {
    return {
      operation: 'reset',
      entity: 'none',
      params: {},
      confidence: 0.9,
      rawText,
    };
  }

  // Help commands
  if (
    /\b(ayuda|help|qu[eé] puedes|c[oó]mo funciona|comandos|qu[eé] haces)\b/.test(
      lower
    )
  ) {
    return {
      operation: 'help',
      entity: 'none',
      params: {},
      confidence: 0.9,
      rawText,
    };
  }

  // Patient creation
  if (
    /\b(crear|nuevo|agregar|dar de alta|registrar)\b.*\b(paciente|persona)\b/.test(
      lower
    ) ||
    /\b(paciente|persona)\b.*\b(crear|nuevo|agregar|registrar)\b/.test(lower)
  ) {
    const nameMatch = lower.match(
      /(?:paciente|llamad[ao]|nombre|llama)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)/i
    );
    return {
      operation: 'create',
      entity: 'patient',
      params: nameMatch ? { full_name: nameMatch[1] } : {},
      confidence: 0.7,
      rawText,
    };
  }

  // Patient search
  if (
    /\b(buscar|encontrar|busca|encontr[aá]|ver|mostrar)\b.*\b(paciente|persona)\b/.test(
      lower
    ) ||
    /\b(paciente|persona)\b.*\b(buscar|encontrar)\b/.test(lower)
  ) {
    const nameMatch = lower.match(
      /(?:paciente|llamad[ao]|nombre|llama)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)/i
    );
    return {
      operation: 'search',
      entity: 'patient',
      params: nameMatch ? { search_query: nameMatch[1] } : {},
      confidence: 0.7,
      rawText,
    };
  }

  // Appointment creation
  if (
    /\b(crear|nuevo|agendar|programar|reservar|agregar)\b.*\b(turno|cita|consulta)\b/.test(
      lower
    ) ||
    /\b(turno|cita|consulta)\b.*\b(crear|nuevo|agendar|programar)\b/.test(lower)
  ) {
    const params = extractDateTimeParams(lower);
    // Extract patient name: text after "para" that ends before a date/time keyword
    const nameMatch = rawText.match(
      /\bpara\s+([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+(?:\s+[A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)*)(?=\s+(?:el\s+\d|\d{1,2}[\/\-]|hoy|ma[nñ]ana|pasado|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|esta|pr[oó]ximo|a\s+las|\d{1,2}(?::\d{2})?(?:\s*(?:hs?|am|pm))))/i
    );
    if (nameMatch) {
      params.patient_name = nameMatch[1].trim();
    }
    return {
      operation: 'create',
      entity: 'appointment',
      params,
      confidence: 0.7,
      rawText,
    };
  }

  // List appointments
  if (
    /\b(listar|mostrar|ver|cu[aá]les son|qu[eé] turnos)\b.*\b(turnos|citas|consultas)\b/.test(
      lower
    ) ||
    /\b(turnos|citas|consultas)\b.*\b(hoy|ma[nñ]ana|esta semana)\b/.test(lower)
  ) {
    return {
      operation: 'list',
      entity: 'appointment',
      params: extractDateTimeParams(lower),
      confidence: 0.7,
      rawText,
    };
  }

  // Cancel appointment
  if (
    /\b(cancelar|anular)\b.*\b(turno|cita|consulta)\b/.test(lower) ||
    /\b(turno|cita|consulta)\b.*\b(cancelar|anular)\b/.test(lower)
  ) {
    return {
      operation: 'update',
      entity: 'appointment',
      params: { status: 'cancelled', ...extractDateTimeParams(lower) },
      confidence: 0.7,
      rawText,
    };
  }

  // Update appointment
  if (
    /\b(actualizar|modificar|cambiar|editar)\b.*\b(turno|cita|consulta)\b/.test(
      lower
    )
  ) {
    return {
      operation: 'update',
      entity: 'appointment',
      params: extractDateTimeParams(lower),
      confidence: 0.6,
      rawText,
    };
  }

  // Delete patient
  if (/\b(eliminar|borrar|dar de baja)\b.*\b(paciente)\b/.test(lower)) {
    return {
      operation: 'delete',
      entity: 'patient',
      params: {},
      confidence: 0.7,
      rawText,
    };
  }

  return {
    operation: 'unknown',
    entity: 'none',
    params: {},
    confidence: 0.0,
    rawText,
  };
}

function extractDateTimeParams(text: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const today = new Date();

  if (/\bhoy\b/.test(text)) {
    params.date = today.toISOString().split('T')[0];
  } else if (/\bma[nñ]ana\b/.test(text)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    params.date = tomorrow.toISOString().split('T')[0];
  }

  // Extract time HH:MM or HH hs
  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(?:hs?|horas?)?\b/);
  if (timeMatch) {
    const hour = timeMatch[1].padStart(2, '0');
    const min = timeMatch[2] || '00';
    params.time = `${hour}:${min}`;
  }

  return params;
}

/**
 * Resolves relative temporal references in params to absolute dates.
 */
function resolveTemporalParams(
  params: Record<string, unknown>
): Record<string, unknown> {
  const resolved = { ...params };
  const today = new Date();

  // Handle relative date strings that might come from OpenAI
  if (typeof resolved.date === 'string') {
    const dateStr = resolved.date.toLowerCase();
    if (dateStr === 'hoy' || dateStr === 'today') {
      resolved.date = today.toISOString().split('T')[0];
    } else if (dateStr === 'mañana' || dateStr === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      resolved.date = tomorrow.toISOString().split('T')[0];
    } else if (
      /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo)$/i.test(dateStr)
    ) {
      resolved.date = getNextWeekday(dateStr.toLowerCase(), today);
    }
  }

  return resolved;
}

function getNextWeekday(dayName: string, from: Date): string {
  const days: Record<string, number> = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sábado: 6,
  };
  const target = days[dayName];
  if (target === undefined) return from.toISOString().split('T')[0];

  const result = new Date(from);
  const current = result.getDay();
  let diff = target - current;
  if (diff <= 0) diff += 7;
  result.setDate(result.getDate() + diff);
  return result.toISOString().split('T')[0];
}

export class IntentRecognizer {
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      logger.warn('OPENAI_API_KEY not set, using pattern matching fallback');
    }
  }

  async recognize(text: string): Promise<Intent> {
    if (!this.client) {
      return patternMatchIntent(text);
    }

    try {
      const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
      const maxTokens = Number(process.env.OPENAI_MAX_TOKENS) || 500;
      const temperature = Number(process.env.OPENAI_TEMPERATURE) || 0.3;

      const completion = await this.client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: text },
        ],
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) {
        logger.warn({ text }, 'OpenAI returned empty response');
        return patternMatchIntent(text);
      }

      const parsed = JSON.parse(content) as OpenAIIntentResponse;

      // Validate and sanitize
      const validOperations: IntentOperation[] = [
        'create',
        'read',
        'update',
        'delete',
        'list',
        'search',
        'help',
        'reset',
        'unknown',
      ];
      const validEntities: IntentEntity[] = [
        'appointment',
        'patient',
        'session',
        'none',
      ];

      const operation = validOperations.includes(parsed.operation)
        ? parsed.operation
        : 'unknown';
      const entity = validEntities.includes(parsed.entity)
        ? parsed.entity
        : 'none';
      const confidence =
        typeof parsed.confidence === 'number' &&
        parsed.confidence >= 0 &&
        parsed.confidence <= 1
          ? parsed.confidence
          : 0.5;

      const params = resolveTemporalParams(
        typeof parsed.params === 'object' && parsed.params !== null
          ? (parsed.params as Record<string, unknown>)
          : {}
      );

      logger.info(
        { text, operation, entity, confidence },
        'Intent recognized via OpenAI'
      );

      return { operation, entity, params, confidence, rawText: text };
    } catch (err) {
      logger.error(
        { err, text },
        'OpenAI intent recognition failed, using fallback'
      );
      return patternMatchIntent(text);
    }
  }
}
