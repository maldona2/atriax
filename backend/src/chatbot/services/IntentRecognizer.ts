import OpenAI from 'openai';
import { Intent, IntentOperation, IntentEntity } from '../types.js';
import logger from '../../utils/logger.js';

interface OpenAIIntentResponse {
  operation: IntentOperation;
  entity: IntentEntity;
  params: Record<string, unknown>;
  confidence: number;
}

function getLocalDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function buildSystemPrompt(): string {
  const todayISO = getLocalDateString();
  const [y, m, d] = todayISO.split('-').map(Number);
  const tomorrowISO = getLocalDateString(new Date(y, m - 1, d + 1));

  return `Eres un clasificador de intenciones EXCLUSIVO para un sistema de gestión de turnos médicos.

IMPORTANTE: Solo puedes procesar mensajes relacionados con:
- Gestión de turnos/citas médicas (crear, listar, actualizar, cancelar)
- Gestión de pacientes (crear, buscar, actualizar, eliminar)
- Gestión de tratamientos (crear, listar, ver, actualizar, eliminar)
- Historial de sesiones clínicas
- Comandos del sistema: ayuda, reiniciar

Si el mensaje NO está relacionado con estas operaciones (por ejemplo: preguntas generales, conversación, clima, recetas, diagnósticos médicos, noticias, matemáticas, etc.), devuelve SIEMPRE:
{"operation":"unknown","entity":"none","params":{},"confidence":0}

Para mensajes válidos, devuelve un JSON con:
{
  "operation": "create|read|update|delete|list|search|help|reset|unknown",
  "entity": "appointment|patient|session|treatment|none",
  "params": {
    // Parámetros extraídos del mensaje según la operación:
    // Para citas (appointment):
    //   patient_name, patient_id, date (ISO YYYY-MM-DD), time (HH:MM), status, payment_status,
    //   duration_minutes, appointment_id, date_from, date_to, notes, treatment_name (nombre del tratamiento)
    // Para pacientes (patient):
    //   first_name, last_name, phone, email, date_of_birth, patient_notes, patient_id, search_query
    // Para sesiones (session):
    //   appointment_id, procedures_performed, recommendations
    // Para tratamientos (treatment):
    //   name, price_cents (convertir precio a centavos: $400 → 40000, $1500 → 150000),
    //   initial_frequency_weeks (frecuencia inicial en semanas enteras: "una vez por mes"→4,
    //     "cada 2 semanas"→2, "una vez por semana"→1, "cada 3 meses"→13),
    //   initial_sessions_count (cantidad de sesiones en la fase inicial:
    //     "durante 3 meses con frecuencia mensual"→3, "durante 6 semanas cada 2 semanas"→3),
    //   maintenance_frequency_weeks (frecuencia de mantenimiento en semanas enteras:
    //     "una vez al año"→52, "cada 3 meses"→13, "cada 6 meses"→26),
    //   protocol_notes, treatment_id
    // Para actualizaciones (update):
    //   field, value
    // Para cancelaciones: status="cancelled"
  },
  "confidence": 0.0-1.0
}

Fecha actual del sistema: ${todayISO}
Reglas de extracción:
- Fechas relativas: "hoy" → ${todayISO}, "mañana" → ${tomorrowISO}, usar SIEMPRE la fecha actual del sistema como referencia
- Horas: extraer SIEMPRE en formato 24 horas (HH:MM). Ejemplos: "21hs" → "21:00", "9:30" → "09:30", "15hs" → "15:00"
- "el paciente" / "ella" / "él" → usar contexto previo (patient_id = "__CONTEXT__")
- "esa cita" / "el turno" → usar contexto previo (appointment_id = "__CONTEXT__")
- Estado de citas: "confirmar"→"confirmed", "completar"→"completed", "cancelar"→"cancelled", "no vino"→"no-show"
- Estado de pago: "pagado"→"paid", "sin pagar"→"unpaid", "parcial"→"partial", "reembolso"→"refunded"
- Para búsquedas sin ID específico, buscar por nombre
- Nombres de pacientes: extraer siempre como patient_name, incluso en formato "Apellido, Nombre"

Mapeo OBLIGATORIO de operaciones:
- "cancelar/anular turno/cita" → operation:"update" + entity:"appointment" + params:{status:"cancelled", patient_name:"..."} — NUNCA usar operation:"delete" para cancelaciones
- "eliminar/borrar turno/cita" → operation:"delete" + entity:"appointment"
- "crear/nuevo/registrar paciente [nombre] [apellido]" → operation:"create", entity:"patient", params:{first_name:"...", last_name:"..."}
- "nuevo paciente" / "crear paciente" → operation:"create", entity:"patient", params:{}
- "listar/mostrar/ver pacientes" → operation:"list", entity:"patient"
- "ver/mostrar paciente [nombre]" → operation:"read", entity:"patient", params:{patient_name:"..."}
- "actualizar/modificar paciente [nombre]" → operation:"update", entity:"patient", params:{patient_name:"..."}
- "eliminar/borrar paciente" → operation:"delete" + entity:"patient"
- "confirmar turno" → operation:"update" + entity:"appointment" + params:{status:"confirmed"}
- "reprogramar/mover turno" → operation:"update" + entity:"appointment"
- "cancelar turno de [Apellido, Nombre]" → operation:"update", entity:"appointment", params:{status:"cancelled", patient_name:"Apellido, Nombre"}
- "elimina todos los turnos de [fecha]" → operation:"delete", entity:"appointment", params:{date:"YYYY-MM-DD"}
- "crear/nuevo tratamiento [nombre] con precio $X" → operation:"create", entity:"treatment", params:{name:"...", price_cents:X*100, ...}
- "listar/mostrar/ver tratamientos" → operation:"list", entity:"treatment"
- "ver tratamiento [nombre]" → operation:"read", entity:"treatment", params:{name:"..."}
- "eliminar/borrar tratamiento [nombre]" → operation:"delete", entity:"treatment", params:{name:"..."}
- "actualizar tratamiento [nombre]" → operation:"update", entity:"treatment", params:{name:"..."}

IMPORTANTE: Devuelve ÚNICAMENTE el objeto JSON, sin texto adicional antes o después.`;
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
    // Extract treatment name: text after "con tratamiento" or "tratamiento de"
    const treatmentMatch = rawText.match(
      /\b(?:con\s+)?tratamiento\s+(?:de\s+)?([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+(?:\s+[A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)*)/i
    );
    if (treatmentMatch) {
      params.treatment_name = treatmentMatch[1].trim();
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

  // Create treatment
  if (
    /\b(crear|nuevo|agregar|registrar)\b.*\b(tratamiento)\b/.test(lower) ||
    /\b(tratamiento)\b.*\b(crear|nuevo|agregar|registrar)\b/.test(lower)
  ) {
    return {
      operation: 'create',
      entity: 'treatment',
      params: {},
      confidence: 0.7,
      rawText,
    };
  }

  // List treatments
  if (
    /\b(listar|mostrar|ver|cu[aá]les son)\b.*\b(tratamientos)\b/.test(lower) ||
    /\b(tratamientos)\b/.test(lower)
  ) {
    return {
      operation: 'list',
      entity: 'treatment',
      params: {},
      confidence: 0.7,
      rawText,
    };
  }

  // Delete treatment
  if (/\b(eliminar|borrar)\b.*\b(tratamiento)\b/.test(lower)) {
    return {
      operation: 'delete',
      entity: 'treatment',
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
  const todayISO = getLocalDateString();
  const [y, m, d] = todayISO.split('-').map(Number);
  const todayLocal = new Date(y, m - 1, d);

  if (/\bhoy\b/.test(text)) {
    params.date = todayISO;
  } else if (/\bma[nñ]ana\b/.test(text)) {
    params.date = getLocalDateString(new Date(y, m - 1, d + 1));
  } else {
    // Try to extract specific date like "8 de abril" or "abril 8"
    const dateMatch = text.match(
      /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i
    );
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const monthNames: Record<string, number> = {
        enero: 0,
        febrero: 1,
        marzo: 2,
        abril: 3,
        mayo: 4,
        junio: 5,
        julio: 6,
        agosto: 7,
        septiembre: 8,
        octubre: 9,
        noviembre: 10,
        diciembre: 11,
      };
      const month = monthNames[dateMatch[2].toLowerCase()];
      if (month !== undefined) {
        const date = new Date(y, month, day);
        // If the date is in the past, assume next year
        if (date < todayLocal) {
          date.setFullYear(y + 1);
        }
        params.date = getLocalDateString(date);
      }
    }
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
  const todayISO = getLocalDateString();
  const [y, m, d] = todayISO.split('-').map(Number);
  const todayLocal = new Date(y, m - 1, d);

  // Handle relative date strings that might come from OpenAI
  if (typeof resolved.date === 'string') {
    const dateStr = resolved.date.toLowerCase();
    if (dateStr === 'hoy' || dateStr === 'today') {
      resolved.date = todayISO;
    } else if (dateStr === 'mañana' || dateStr === 'tomorrow') {
      resolved.date = getLocalDateString(new Date(y, m - 1, d + 1));
    } else if (
      /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo)$/i.test(dateStr)
    ) {
      resolved.date = getNextWeekday(dateStr.toLowerCase(), todayLocal);
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
  if (target === undefined) return getLocalDateString(from);

  const result = new Date(from);
  const current = result.getDay();
  let diff = target - current;
  if (diff <= 0) diff += 7;
  result.setDate(result.getDate() + diff);
  return getLocalDateString(result);
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

      // Extract JSON from response (handle cases where OpenAI adds extra text)
      let jsonContent = content;

      // Try to find JSON object boundaries
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonContent = content.substring(jsonStart, jsonEnd + 1);
      }

      const parsed = JSON.parse(jsonContent) as OpenAIIntentResponse;

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
        'treatment',
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

      if (operation === 'unknown') {
        const fallback = patternMatchIntent(text);
        if (fallback.operation !== 'unknown') {
          logger.info(
            { text, operation: fallback.operation, entity: fallback.entity },
            'OpenAI returned unknown, pattern matching rescued intent'
          );
          return fallback;
        }
      }

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
