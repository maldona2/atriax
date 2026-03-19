import { googleCalendarConfig } from '../config/googleCalendar.js';

export interface AppointmentData {
  id: string;
  scheduledAt: Date;
  durationMinutes: number;
  notes?: string | null;
  patientFirstName: string;
  patientLastName: string;
  patientPhone?: string | null;
  patientEmail?: string | null;
  appointmentType?: string | null;
}

export interface GoogleCalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  source?: { title: string; url: string };
}

export interface GoogleCalendarEventUpdate {
  summary?: string;
  description?: string;
  start?: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string };
}

export class EventFormatter {
  private timezone: string;

  constructor(timezone = 'UTC') {
    this.timezone = timezone;
  }

  formatEvent(appointment: AppointmentData): GoogleCalendarEvent {
    const patientName = `${appointment.patientFirstName} ${appointment.patientLastName}`;
    const appointmentType = appointment.appointmentType ?? 'Appointment';
    const summary = `${patientName} - ${appointmentType}`;

    const descriptionParts: string[] = [];
    if (appointment.patientPhone) {
      descriptionParts.push(`Phone: ${appointment.patientPhone}`);
    }
    if (appointment.patientEmail) {
      descriptionParts.push(`Email: ${appointment.patientEmail}`);
    }
    if (appointment.notes) {
      descriptionParts.push(`Notes: ${appointment.notes}`);
    }
    const appUrl = `${googleCalendarConfig.appBaseUrl}/appointments/${appointment.id}`;
    descriptionParts.push(`View appointment: ${appUrl}`);

    const startTime = appointment.scheduledAt;
    const endTime = new Date(
      startTime.getTime() + appointment.durationMinutes * 60 * 1000
    );

    return {
      summary,
      description: descriptionParts.join('\n'),
      start: {
        dateTime: startTime.toISOString(),
        timeZone: this.timezone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: this.timezone,
      },
      source: {
        title: 'Atriax',
        url: appUrl,
      },
    };
  }

  formatEventUpdate(
    appointment: Partial<AppointmentData> & { id: string }
  ): GoogleCalendarEventUpdate {
    const update: GoogleCalendarEventUpdate = {};

    if (
      appointment.patientFirstName !== undefined &&
      appointment.patientLastName !== undefined
    ) {
      const patientName = `${appointment.patientFirstName} ${appointment.patientLastName}`;
      const appointmentType = appointment.appointmentType ?? 'Appointment';
      update.summary = `${patientName} - ${appointmentType}`;
    }

    if (appointment.scheduledAt !== undefined) {
      const startTime = appointment.scheduledAt;
      const durationMs = (appointment.durationMinutes ?? 60) * 60 * 1000;
      const endTime = new Date(startTime.getTime() + durationMs);
      update.start = {
        dateTime: startTime.toISOString(),
        timeZone: this.timezone,
      };
      update.end = {
        dateTime: endTime.toISOString(),
        timeZone: this.timezone,
      };
    }

    if (
      appointment.notes !== undefined ||
      appointment.patientPhone !== undefined ||
      appointment.patientEmail !== undefined
    ) {
      const descriptionParts: string[] = [];
      if (appointment.patientPhone) {
        descriptionParts.push(`Phone: ${appointment.patientPhone}`);
      }
      if (appointment.patientEmail) {
        descriptionParts.push(`Email: ${appointment.patientEmail}`);
      }
      if (appointment.notes) {
        descriptionParts.push(`Notes: ${appointment.notes}`);
      }
      const appUrl = `${googleCalendarConfig.appBaseUrl}/appointments/${appointment.id}`;
      descriptionParts.push(`View appointment: ${appUrl}`);
      update.description = descriptionParts.join('\n');
    }

    return update;
  }
}

export const eventFormatter = new EventFormatter();
