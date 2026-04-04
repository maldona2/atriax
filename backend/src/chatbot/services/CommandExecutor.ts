/**
 * CommandExecutor - Maps intents to service layer calls.
 * Handles entity resolution (patient names → IDs) and executes operations.
 */

import * as appointmentService from '../../services/appointmentService.js';
import * as patientService from '../../services/patientService.js';
import * as treatmentService from '../../services/treatmentService.js';
import type { Intent, ConversationContext } from '../types.js';
import logger from '../../utils/logger.js';

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  statusCode?: number;
  patientId?: string;
  appointmentId?: string;
  treatmentId?: string;
}

/**
 * Combines date and time strings into a full ISO datetime string.
 * Assumes Argentina timezone (UTC-3).
 */
function buildScheduledAt(date: string, time: string): string {
  // If already an ISO string, return as-is
  if (date.includes('T')) return date;
  // Build ISO string with timezone offset
  return `${date}T${time}:00-03:00`;
}

/**
 * Resolves a patient name to an ID by searching the tenant's patients.
 * Returns the patient ID if exactly one match found, or null for ambiguity/not found.
 */
async function resolvePatientName(
  tenantId: string,
  name: string
): Promise<
  { id: string; first_name: string; last_name: string } | null | 'ambiguous'
> {
  const trimmedName = name.trim();

  // 1. Try full string first (handles single-word or exact DB substring match)
  let results = await patientService.list(tenantId, trimmedName);
  if (results.length > 0) {
    if (results.length === 1)
      return {
        id: results[0].id,
        first_name: results[0].first_name,
        last_name: results[0].last_name,
      };
    return 'ambiguous';
  }

  // 2. Handle "Apellido, Nombre" format (e.g. "Maldonado, Matias")
  if (trimmedName.includes(',')) {
    const parts = trimmedName
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const lastNamePart = parts[0];
    const firstNamePart = parts[1];

    if (lastNamePart) {
      results = await patientService.list(tenantId, lastNamePart);
      if (results.length > 1 && firstNamePart) {
        const fnLower = firstNamePart.toLowerCase();
        const filtered = results.filter(
          (r) =>
            r.first_name.toLowerCase().startsWith(fnLower) ||
            fnLower.startsWith(r.first_name.toLowerCase())
        );
        if (filtered.length > 0) results = filtered;
      }
    }
  }

  // 3. Handle "Nombre Apellido" format (e.g. "Matias Maldonado")
  if (results.length === 0 && trimmedName.includes(' ')) {
    const words = trimmedName.split(/\s+/).filter((w) => w.length >= 2);
    if (words.length >= 2) {
      for (const primaryWord of words) {
        const candidates = await patientService.list(tenantId, primaryWord);
        if (candidates.length === 0) continue;

        const otherWords = words.filter((w) => w !== primaryWord);
        const filtered = candidates.filter((r) =>
          otherWords.every(
            (w) =>
              r.first_name.toLowerCase().includes(w.toLowerCase()) ||
              r.last_name.toLowerCase().includes(w.toLowerCase())
          )
        );
        if (filtered.length > 0) {
          results = filtered;
          break;
        }
      }
    }
  }

  if (results.length === 0) return null;
  if (results.length === 1)
    return {
      id: results[0].id,
      first_name: results[0].first_name,
      last_name: results[0].last_name,
    };
  return 'ambiguous';
}

/**
 * Validates an email format.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates a phone format (allows +, digits, spaces, hyphens).
 */
function isValidPhone(phone: string): boolean {
  return /^[+\d\s\-().]{6,20}$/.test(phone);
}

/**
 * Validates a date string in DD/MM/YYYY or YYYY-MM-DD format.
 */
function isValidDate(dateStr: string): boolean {
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    const d = new Date(year, month - 1, day);
    return !isNaN(d.getTime()) && d.getDate() === day;
  }
  return false;
}

/**
 * Converts DD/MM/YYYY to YYYY-MM-DD.
 */
function normalizeDate(dateStr: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

export class CommandExecutor {
  async execute(
    intent: Intent,
    context: ConversationContext,
    tenantId: string,
    userId: string
  ): Promise<ExecutionResult> {
    try {
      switch (intent.entity) {
        case 'appointment':
          return await this.executeAppointmentIntent(intent, context, tenantId);
        case 'patient':
          return await this.executePatientIntent(intent, context, tenantId);
        case 'session':
          return await this.executeSessionIntent(intent, context, tenantId);
        case 'treatment':
          return await this.executeTreatmentIntent(intent, context, tenantId);
        default:
          return {
            success: false,
            error: 'Operación no soportada',
            statusCode: 400,
          };
      }
    } catch (err: unknown) {
      logger.error({ err, intent, tenantId }, 'CommandExecutor error');
      const error = err as Error & { statusCode?: number };
      return {
        success: false,
        error: error.message ?? 'Error inesperado',
        statusCode: error.statusCode ?? 500,
      };
    }
  }

  // ─── Appointment operations ─────────────────────────────────────────────────

  private async executeAppointmentIntent(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    switch (intent.operation) {
      case 'create':
        return this.createAppointment(intent, context, tenantId);
      case 'list':
        return this.listAppointments(intent, context, tenantId);
      case 'read':
        return this.getAppointment(intent, context, tenantId);
      case 'update':
        return this.updateAppointment(intent, context, tenantId);
      case 'delete':
        return this.cancelAppointment(intent, context, tenantId);
      case 'search':
        return this.listAppointments(intent, context, tenantId);
      default:
        return {
          success: false,
          error: 'Operación de turno no soportada',
          statusCode: 400,
        };
    }
  }

  private async createAppointment(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const params = intent.params;

    // Resolve patient ID
    let patientId =
      (params.patient_id as string | undefined) ?? context.lastPatientId;

    if (!patientId) {
      // Try resolving by name
      const name =
        (params.patient_name as string | undefined) ??
        (params.full_name as string | undefined) ??
        (params.first_name && params.last_name
          ? `${params.first_name} ${params.last_name}`
          : undefined);

      if (!name) {
        return { success: false, error: 'MISSING_PATIENT', statusCode: 400 };
      }

      const resolved = await resolvePatientName(tenantId, name);
      if (!resolved) {
        return { success: false, error: 'PATIENT_NOT_FOUND', statusCode: 404 };
      }
      if (resolved === 'ambiguous') {
        return { success: false, error: 'AMBIGUOUS_PATIENT', statusCode: 300 };
      }
      patientId = resolved.id;
    }

    // Resolve date/time
    const dateStr = params.date as string | undefined;
    const timeStr = params.time as string | undefined;

    if (!dateStr) {
      return { success: false, error: 'MISSING_DATE', statusCode: 400 };
    }
    if (!timeStr) {
      return { success: false, error: 'MISSING_TIME', statusCode: 400 };
    }

    // Validate date format
    const normalizedDate = normalizeDate(dateStr);
    if (!isValidDate(normalizedDate)) {
      return { success: false, error: 'INVALID_DATE', statusCode: 400 };
    }

    const scheduledAt = buildScheduledAt(normalizedDate, timeStr);

    // Validate duration if provided
    const durationMinutes = params.duration_minutes as number | undefined;
    if (
      durationMinutes !== undefined &&
      (durationMinutes < 5 || durationMinutes > 480)
    ) {
      return { success: false, error: 'INVALID_DURATION', statusCode: 400 };
    }

    // Validate email if provided
    const email = params.email as string | undefined;
    if (email && !isValidEmail(email)) {
      return { success: false, error: 'INVALID_EMAIL', statusCode: 400 };
    }

    const input: appointmentService.CreateAppointmentInput = {
      patient_id: patientId,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      notes: (params.notes as string | null | undefined) ?? null,
      payment_status: params.payment_status as
        | appointmentService.PaymentStatus
        | undefined,
      userRole: 'professional',
    };

    const result = await appointmentService.create(tenantId, input);

    // Fetch with patient name for response
    const detail = await appointmentService.getById(tenantId, result.id);

    return {
      success: true,
      data: detail ?? result,
      appointmentId: result.id,
      patientId,
    };
  }

  private async listAppointments(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const params = intent.params;

    const filters: appointmentService.ListFilters = {};

    if (params.date) filters.date = normalizeDate(params.date as string);
    if (params.date_from)
      filters.dateFrom = normalizeDate(params.date_from as string);
    if (params.date_to)
      filters.dateTo = normalizeDate(params.date_to as string);
    if (params.status)
      filters.status = params.status as appointmentService.AppointmentStatus;

    // Resolve patient filter
    if (params.patient_id && params.patient_id !== '__CONTEXT__') {
      filters.patientId = params.patient_id as string;
    } else if (params.patient_name || params.full_name) {
      const name =
        (params.patient_name as string) ?? (params.full_name as string);
      const resolved = await resolvePatientName(tenantId, name);
      if (resolved && resolved !== 'ambiguous') {
        filters.patientId = resolved.id;
      }
    } else if (context.lastPatientId && intent.params.use_context_patient) {
      filters.patientId = context.lastPatientId;
    }

    const results = await appointmentService.list(tenantId, filters);
    return { success: true, data: results };
  }

  private async getAppointment(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const appointmentId =
      (intent.params.appointment_id as string | undefined) ??
      context.lastAppointmentId;

    if (!appointmentId) {
      return {
        success: false,
        error: 'MISSING_APPOINTMENT_ID',
        statusCode: 400,
      };
    }

    const result = await appointmentService.getDetailById(
      tenantId,
      appointmentId
    );
    if (!result) {
      return { success: false, error: 'NOT_FOUND', statusCode: 404 };
    }

    return { success: true, data: result, appointmentId };
  }

  private async updateAppointment(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const params = intent.params;

    // Find appointment ID
    let appointmentId =
      (params.appointment_id as string | undefined) ??
      context.lastAppointmentId;

    if (!appointmentId) {
      // Try to find by patient + date
      if (!params.date && !params.patient_name) {
        return {
          success: false,
          error: 'MISSING_APPOINTMENT_REF',
          statusCode: 400,
        };
      }

      // Search for the appointment
      const searchFilters: appointmentService.ListFilters = {};
      if (params.date)
        searchFilters.date = normalizeDate(params.date as string);

      if (params.patient_id && params.patient_id !== '__CONTEXT__') {
        searchFilters.patientId = params.patient_id as string;
      } else if (params.patient_name) {
        const resolved = await resolvePatientName(
          tenantId,
          params.patient_name as string
        );
        if (resolved && resolved !== 'ambiguous') {
          searchFilters.patientId = resolved.id;
        } else if (resolved === 'ambiguous') {
          return {
            success: false,
            error: 'AMBIGUOUS_PATIENT',
            statusCode: 300,
          };
        }
      } else if (context.lastPatientId) {
        searchFilters.patientId = context.lastPatientId;
      }

      const results = await appointmentService.list(tenantId, searchFilters);
      if (results.length === 0) {
        return { success: false, error: 'NOT_FOUND', statusCode: 404 };
      }
      if (results.length > 1) {
        return {
          success: false,
          error: 'AMBIGUOUS_APPOINTMENT',
          statusCode: 300,
          data: results,
        };
      }
      appointmentId = results[0].id;
    }

    const updateData: appointmentService.UpdateAppointmentInput = {};
    if (params.status)
      updateData.status = params.status as appointmentService.AppointmentStatus;
    if (params.payment_status)
      updateData.payment_status =
        params.payment_status as appointmentService.PaymentStatus;
    if (params.scheduled_at)
      updateData.scheduled_at = params.scheduled_at as string;
    if (params.date && params.time) {
      updateData.scheduled_at = buildScheduledAt(
        normalizeDate(params.date as string),
        params.time as string
      );
    }
    if (params.duration_minutes)
      updateData.duration_minutes = params.duration_minutes as number;
    if (params.notes !== undefined)
      updateData.notes = params.notes as string | null;

    const result = await appointmentService.update(
      tenantId,
      appointmentId,
      updateData
    );
    if (!result) {
      return { success: false, error: 'NOT_FOUND', statusCode: 404 };
    }

    // Fetch with patient name
    const detail = await appointmentService.getById(tenantId, result.id);

    return {
      success: true,
      data: detail ?? result,
      appointmentId: result.id,
      patientId: result.patient_id,
    };
  }

  private async cancelAppointment(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const params = intent.params;
    const appointmentId =
      (params.appointment_id as string | undefined) ??
      context.lastAppointmentId;

    // Single specific appointment — delegate to updateAppointment as before
    if (appointmentId) {
      return this.updateAppointment(
        { ...intent, params: { ...params, status: 'cancelled' } },
        context,
        tenantId
      );
    }

    // No specific appointment — search and bulk cancel all matching
    const filters: appointmentService.ListFilters = {};
    if (params.date) filters.date = normalizeDate(params.date as string);
    if (params.date_from)
      filters.dateFrom = normalizeDate(params.date_from as string);
    if (params.date_to)
      filters.dateTo = normalizeDate(params.date_to as string);

    if (params.patient_id && params.patient_id !== '__CONTEXT__') {
      filters.patientId = params.patient_id as string;
    } else if (params.patient_name) {
      const resolved = await resolvePatientName(
        tenantId,
        params.patient_name as string
      );
      if (!resolved) {
        return { success: false, error: 'PATIENT_NOT_FOUND', statusCode: 404 };
      }
      if (resolved === 'ambiguous') {
        return { success: false, error: 'AMBIGUOUS_PATIENT', statusCode: 300 };
      }
      filters.patientId = resolved.id;
    }

    // Require at least one filter to avoid wiping everything
    if (
      !filters.date &&
      !filters.dateFrom &&
      !filters.dateTo &&
      !filters.patientId
    ) {
      return {
        success: false,
        error: 'MISSING_APPOINTMENT_REF',
        statusCode: 400,
      };
    }

    const results = await appointmentService.list(tenantId, filters);
    if (results.length === 0) {
      return { success: false, error: 'NOT_FOUND', statusCode: 404 };
    }

    // Single result — normal path with full detail fetch
    if (results.length === 1) {
      const updated = await appointmentService.update(tenantId, results[0].id, {
        status: 'cancelled',
      });
      if (!updated)
        return { success: false, error: 'NOT_FOUND', statusCode: 404 };
      const detail = await appointmentService.getById(tenantId, updated.id);
      return {
        success: true,
        data: detail ?? updated,
        appointmentId: updated.id,
        patientId: updated.patient_id,
      };
    }

    // Multiple results — bulk cancel
    const cancelled: appointmentService.AppointmentRow[] = [];
    for (const appt of results) {
      try {
        const updated = await appointmentService.update(tenantId, appt.id, {
          status: 'cancelled',
        });
        if (updated) cancelled.push(updated);
      } catch {
        // Skip appointments that can't transition (e.g. already cancelled)
      }
    }

    return { success: true, data: cancelled };
  }

  // ─── Patient operations ─────────────────────────────────────────────────────

  private async executePatientIntent(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    switch (intent.operation) {
      case 'create':
        return this.createPatient(intent, context, tenantId);
      case 'list':
        return this.listPatients(intent, context, tenantId);
      case 'search':
        return this.searchPatients(intent, context, tenantId);
      case 'read':
        return this.getPatient(intent, context, tenantId);
      case 'update':
        return this.updatePatient(intent, context, tenantId);
      case 'delete':
        return this.deletePatient(intent, context, tenantId);
      default:
        return {
          success: false,
          error: 'Operación de paciente no soportada',
          statusCode: 400,
        };
    }
  }

  private async createPatient(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const params = intent.params;

    // Parse name
    let firstName = params.first_name as string | undefined;
    let lastName = params.last_name as string | undefined;

    if (!firstName || !lastName) {
      const fullName =
        (params.full_name as string | undefined) ??
        (params.patient_name as string | undefined);
      if (fullName) {
        const parts = fullName.trim().split(/\s+/);
        firstName = parts[0];
        lastName = parts.slice(1).join(' ') || parts[0];
      }
    }

    if (!firstName) {
      return { success: false, error: 'MISSING_FIRST_NAME', statusCode: 400 };
    }
    if (!lastName) {
      return { success: false, error: 'MISSING_LAST_NAME', statusCode: 400 };
    }

    // Validate optional fields
    const email = params.email as string | undefined;
    if (email && !isValidEmail(email)) {
      return { success: false, error: 'INVALID_EMAIL', statusCode: 400 };
    }

    const phone = params.phone as string | undefined;
    if (phone && !isValidPhone(phone)) {
      return { success: false, error: 'INVALID_PHONE', statusCode: 400 };
    }

    const dob = params.date_of_birth as string | undefined;
    if (dob && !isValidDate(normalizeDate(dob))) {
      return { success: false, error: 'INVALID_DATE', statusCode: 400 };
    }

    const input: patientService.CreatePatientInput = {
      first_name: firstName,
      last_name: lastName,
      phone: phone ?? null,
      email: email ?? null,
      date_of_birth: dob ? normalizeDate(dob) : null,
      notes: (params.patient_notes as string | null | undefined) ?? null,
    };

    const result = await patientService.create(tenantId, input);
    return { success: true, data: result, patientId: result.id };
  }

  private async listPatients(
    intent: Intent,
    _context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const results = await patientService.list(tenantId);
    return { success: true, data: results };
  }

  private async searchPatients(
    intent: Intent,
    _context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const query =
      (intent.params.search_query as string | undefined) ??
      (intent.params.patient_name as string | undefined) ??
      (intent.params.full_name as string | undefined) ??
      (intent.params.first_name as string | undefined);

    // Also support search by email/phone
    const email = intent.params.email as string | undefined;
    const phone = intent.params.phone as string | undefined;

    const searchTerm = query ?? email ?? phone ?? '';
    const results = await patientService.list(tenantId, searchTerm);
    return { success: true, data: results };
  }

  private async getPatient(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    let patientId =
      (intent.params.patient_id as string | undefined) ?? context.lastPatientId;

    if (!patientId) {
      const name =
        (intent.params.patient_name as string | undefined) ??
        (intent.params.full_name as string | undefined);
      if (name) {
        const resolved = await resolvePatientName(tenantId, name);
        if (!resolved) {
          return { success: false, error: 'NOT_FOUND', statusCode: 404 };
        }
        if (resolved === 'ambiguous') {
          return {
            success: false,
            error: 'AMBIGUOUS_PATIENT',
            statusCode: 300,
          };
        }
        patientId = resolved.id;
      } else {
        return { success: false, error: 'MISSING_PATIENT', statusCode: 400 };
      }
    }

    const result = await patientService.getById(tenantId, patientId);
    if (!result) {
      return { success: false, error: 'NOT_FOUND', statusCode: 404 };
    }

    return { success: true, data: result, patientId };
  }

  private async updatePatient(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const params = intent.params;
    let patientId =
      (params.patient_id as string | undefined) ?? context.lastPatientId;

    if (!patientId) {
      const name =
        (params.patient_name as string | undefined) ??
        (params.full_name as string | undefined);
      if (name) {
        const resolved = await resolvePatientName(tenantId, name);
        if (!resolved) {
          return { success: false, error: 'NOT_FOUND', statusCode: 404 };
        }
        if (resolved === 'ambiguous') {
          return {
            success: false,
            error: 'AMBIGUOUS_PATIENT',
            statusCode: 300,
          };
        }
        patientId = resolved.id;
      } else {
        return { success: false, error: 'MISSING_PATIENT', statusCode: 400 };
      }
    }

    const updateData: Partial<patientService.CreatePatientInput> = {};
    if (params.first_name) updateData.first_name = params.first_name as string;
    if (params.last_name) updateData.last_name = params.last_name as string;
    if (params.phone !== undefined)
      updateData.phone = params.phone as string | null;
    if (params.email !== undefined)
      updateData.email = params.email as string | null;
    if (params.date_of_birth !== undefined)
      updateData.date_of_birth = params.date_of_birth
        ? normalizeDate(params.date_of_birth as string)
        : null;
    if (params.patient_notes !== undefined)
      updateData.notes = params.patient_notes as string | null;

    // Handle field/value update pattern
    if (params.field && params.value !== undefined) {
      const field = params.field as string;
      const value = params.value as string;
      const fieldMap: Record<string, keyof patientService.CreatePatientInput> =
        {
          nombre: 'first_name',
          apellido: 'last_name',
          telefono: 'phone',
          email: 'email',
          nacimiento: 'date_of_birth',
          notas: 'notes',
        };
      const mapped = fieldMap[field.toLowerCase()];
      if (mapped) {
        (updateData as Record<string, unknown>)[mapped] = value;
      }
    }

    // Validate email if present
    if (updateData.email && !isValidEmail(updateData.email)) {
      return { success: false, error: 'INVALID_EMAIL', statusCode: 400 };
    }

    const result = await patientService.update(tenantId, patientId, updateData);
    if (!result) {
      return { success: false, error: 'NOT_FOUND', statusCode: 404 };
    }

    return { success: true, data: result, patientId: result.id };
  }

  private async deletePatient(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const params = intent.params;
    let patientId =
      (params.patient_id as string | undefined) ?? context.lastPatientId;

    if (!patientId) {
      const name =
        (params.patient_name as string | undefined) ??
        (params.full_name as string | undefined);
      if (name) {
        const resolved = await resolvePatientName(tenantId, name);
        if (!resolved) {
          return { success: false, error: 'NOT_FOUND', statusCode: 404 };
        }
        if (resolved === 'ambiguous') {
          return {
            success: false,
            error: 'AMBIGUOUS_PATIENT',
            statusCode: 300,
          };
        }
        patientId = resolved.id;
      } else {
        return { success: false, error: 'MISSING_PATIENT', statusCode: 400 };
      }
    }

    // Get patient before deleting for response
    const patientData = await patientService.getById(tenantId, patientId);
    if (!patientData) {
      return { success: false, error: 'NOT_FOUND', statusCode: 404 };
    }

    const deleted = await patientService.remove(tenantId, patientId);
    if (!deleted) {
      return { success: false, error: 'NOT_FOUND', statusCode: 404 };
    }

    return { success: true, data: patientData.patient };
  }

  // ─── Treatment operations ────────────────────────────────────────────────────

  private async executeTreatmentIntent(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    switch (intent.operation) {
      case 'create':
        return this.createTreatment(intent, context, tenantId);
      case 'list':
        return this.listTreatments(tenantId);
      case 'read':
      case 'search':
        return this.getTreatment(intent, context, tenantId);
      case 'update':
        return this.updateTreatment(intent, context, tenantId);
      case 'delete':
        return this.deleteTreatment(intent, context, tenantId);
      default:
        return {
          success: false,
          error: 'Operación de tratamiento no soportada',
          statusCode: 400,
        };
    }
  }

  private async resolveTreatmentName(
    tenantId: string,
    name: string
  ): Promise<treatmentService.TreatmentRow | null | 'ambiguous'> {
    const all = await treatmentService.list(tenantId);
    const lower = name.toLowerCase().trim();
    const matches = all.filter((t) => t.name.toLowerCase().includes(lower));
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];
    // Prefer exact match
    const exact = matches.find((t) => t.name.toLowerCase() === lower);
    if (exact) return exact;
    return 'ambiguous';
  }

  private async createTreatment(
    intent: Intent,
    _context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const params = intent.params;

    const name = params.name as string | undefined;
    if (!name) {
      return { success: false, error: 'MISSING_NAME', statusCode: 400 };
    }

    // price_cents may come as integer cents (from AI) or as price in pesos (fallback)
    let priceCents = params.price_cents as number | undefined;
    if (priceCents === undefined && params.price !== undefined) {
      priceCents = Math.round(Number(params.price) * 100);
    }
    if (priceCents === undefined || isNaN(priceCents) || priceCents < 0) {
      return { success: false, error: 'MISSING_PRICE', statusCode: 400 };
    }

    const initialFrequencyWeeks =
      params.initial_frequency_weeks !== undefined
        ? Math.round(Number(params.initial_frequency_weeks))
        : null;
    const initialSessionsCount =
      params.initial_sessions_count !== undefined
        ? Math.round(Number(params.initial_sessions_count))
        : null;
    const maintenanceFrequencyWeeks =
      params.maintenance_frequency_weeks !== undefined
        ? Math.round(Number(params.maintenance_frequency_weeks))
        : null;
    const protocolNotes =
      (params.protocol_notes as string | null | undefined) ?? null;

    const input: treatmentService.CreateTreatmentInput = {
      name,
      price_cents: priceCents,
      initial_frequency_weeks:
        initialFrequencyWeeks !== null && initialFrequencyWeeks > 0
          ? initialFrequencyWeeks
          : null,
      initial_sessions_count:
        initialSessionsCount !== null && initialSessionsCount > 0
          ? initialSessionsCount
          : null,
      maintenance_frequency_weeks:
        maintenanceFrequencyWeeks !== null && maintenanceFrequencyWeeks > 0
          ? maintenanceFrequencyWeeks
          : null,
      protocol_notes: protocolNotes,
    };

    const result = await treatmentService.create(tenantId, input);
    return { success: true, data: result, treatmentId: result.id };
  }

  private async listTreatments(tenantId: string): Promise<ExecutionResult> {
    const results = await treatmentService.list(tenantId);
    return { success: true, data: results };
  }

  private async getTreatment(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const treatmentId =
      (intent.params.treatment_id as string | undefined) ??
      context.lastTreatmentId;

    if (treatmentId) {
      const result = await treatmentService.getById(tenantId, treatmentId);
      if (!result) {
        return { success: false, error: 'NOT_FOUND', statusCode: 404 };
      }
      return { success: true, data: result, treatmentId: result.id };
    }

    const name = intent.params.name as string | undefined;
    if (!name) {
      return { success: false, error: 'MISSING_NAME', statusCode: 400 };
    }

    const resolved = await this.resolveTreatmentName(tenantId, name);
    if (!resolved) {
      return { success: false, error: 'NOT_FOUND', statusCode: 404 };
    }
    if (resolved === 'ambiguous') {
      return { success: false, error: 'AMBIGUOUS_TREATMENT', statusCode: 300 };
    }
    return { success: true, data: resolved, treatmentId: resolved.id };
  }

  private async updateTreatment(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const params = intent.params;

    let treatmentId =
      (params.treatment_id as string | undefined) ?? context.lastTreatmentId;

    if (!treatmentId) {
      const name = params.name as string | undefined;
      if (!name) {
        return { success: false, error: 'MISSING_NAME', statusCode: 400 };
      }
      const resolved = await this.resolveTreatmentName(tenantId, name);
      if (!resolved) {
        return { success: false, error: 'NOT_FOUND', statusCode: 404 };
      }
      if (resolved === 'ambiguous') {
        return {
          success: false,
          error: 'AMBIGUOUS_TREATMENT',
          statusCode: 300,
        };
      }
      treatmentId = resolved.id;
    }

    const updateData: treatmentService.UpdateTreatmentInput = {};
    if (params.name !== undefined) updateData.name = params.name as string;

    let priceCents = params.price_cents as number | undefined;
    if (priceCents === undefined && params.price !== undefined) {
      priceCents = Math.round(Number(params.price) * 100);
    }
    if (priceCents !== undefined && !isNaN(priceCents) && priceCents >= 0) {
      updateData.price_cents = priceCents;
    }

    if (params.initial_frequency_weeks !== undefined) {
      updateData.initial_frequency_weeks = Math.round(
        Number(params.initial_frequency_weeks)
      );
    }
    if (params.initial_sessions_count !== undefined) {
      updateData.initial_sessions_count = Math.round(
        Number(params.initial_sessions_count)
      );
    }
    if (params.maintenance_frequency_weeks !== undefined) {
      updateData.maintenance_frequency_weeks = Math.round(
        Number(params.maintenance_frequency_weeks)
      );
    }
    if (params.protocol_notes !== undefined) {
      updateData.protocol_notes = params.protocol_notes as string | null;
    }

    const result = await treatmentService.update(
      tenantId,
      treatmentId,
      updateData
    );
    if (!result) {
      return { success: false, error: 'NOT_FOUND', statusCode: 404 };
    }
    return { success: true, data: result, treatmentId: result.id };
  }

  private async deleteTreatment(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    const params = intent.params;

    let treatmentId =
      (params.treatment_id as string | undefined) ?? context.lastTreatmentId;
    let treatmentData: treatmentService.TreatmentRow | null = null;

    if (!treatmentId) {
      const name = params.name as string | undefined;
      if (!name) {
        return { success: false, error: 'MISSING_NAME', statusCode: 400 };
      }
      const resolved = await this.resolveTreatmentName(tenantId, name);
      if (!resolved) {
        return { success: false, error: 'NOT_FOUND', statusCode: 404 };
      }
      if (resolved === 'ambiguous') {
        return {
          success: false,
          error: 'AMBIGUOUS_TREATMENT',
          statusCode: 300,
        };
      }
      treatmentId = resolved.id;
      treatmentData = resolved;
    } else {
      treatmentData = await treatmentService.getById(tenantId, treatmentId);
      if (!treatmentData) {
        return { success: false, error: 'NOT_FOUND', statusCode: 404 };
      }
    }

    const deleted = await treatmentService.remove(tenantId, treatmentId);
    if (!deleted) {
      return { success: false, error: 'NOT_FOUND', statusCode: 404 };
    }

    return { success: true, data: treatmentData };
  }

  // ─── Session operations ─────────────────────────────────────────────────────

  private async executeSessionIntent(
    intent: Intent,
    context: ConversationContext,
    tenantId: string
  ): Promise<ExecutionResult> {
    if (intent.operation === 'read' || intent.operation === 'list') {
      // Get session history for patient
      const patientId =
        (intent.params.patient_id as string | undefined) ??
        context.lastPatientId;

      if (!patientId) {
        return { success: false, error: 'MISSING_PATIENT', statusCode: 400 };
      }

      const sessions = await patientService.getPatientSessions(
        tenantId,
        patientId
      );
      return { success: true, data: sessions, patientId };
    }

    return {
      success: false,
      error: 'Operación de sesión no soportada',
      statusCode: 400,
    };
  }
}
