/**
 * IANA timezone of the clinic.
 *
 * All "calendar day" logic — filtering appointments by date, computing
 * "today" — must be evaluated in this zone. Otherwise a `timestamptz` close to
 * midnight is bucketed using the Postgres session timezone (UTC in production),
 * which lands the appointment in the wrong day for an Argentina-based clinic.
 *
 * TODO(multi-tenant): this is a single hardcoded zone shared by every tenant.
 * If the product expands beyond Argentina, promote this to a per-tenant value
 * (e.g. a `tenants.time_zone` column) and thread it through every consumer that
 * currently hardcodes the zone: appointmentService.list,
 * dashboardService.getDashboard, the email/WhatsApp templates and ICS
 * generation.
 */
export const CLINIC_TIME_ZONE = 'America/Argentina/Buenos_Aires';
