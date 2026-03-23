import { useState } from 'react';
import { differenceInYears, parseISO } from 'date-fns';
import {
  Phone,
  Mail,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppointmentDetailExtended } from '@/types';

interface PatientInfoSectionProps {
  appointment: AppointmentDetailExtended;
}

export function PatientInfoSection({ appointment }: PatientInfoSectionProps) {
  const [notesExpanded, setNotesExpanded] = useState(false);

  const patientName =
    appointment.patient_last_name && appointment.patient_first_name
      ? `${appointment.patient_last_name}, ${appointment.patient_first_name}`
      : appointment.patient_first_name ||
        appointment.patient_last_name ||
        'Sin nombre';

  const age = appointment.patient_date_of_birth
    ? differenceInYears(new Date(), parseISO(appointment.patient_date_of_birth))
    : null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold leading-tight">{patientName}</h3>
          {age !== null && (
            <p className="text-sm text-muted-foreground">{age} años</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {appointment.patient_phone ? (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>{appointment.patient_phone}</span>
          </div>
        ) : null}

        {appointment.patient_email ? (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{appointment.patient_email}</span>
          </div>
        ) : null}

        {!appointment.patient_phone && !appointment.patient_email && (
          <p className="text-sm text-muted-foreground">Sin datos de contacto</p>
        )}
      </div>

      {appointment.patient_notes && (
        <div className="border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto w-full justify-between p-0 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:bg-transparent"
            onClick={() => setNotesExpanded((prev) => !prev)}
          >
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Notas del paciente
            </div>
            {notesExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          {notesExpanded && (
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {appointment.patient_notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
