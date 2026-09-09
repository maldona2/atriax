import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewAppointmentSheet } from './NewAppointmentSheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { AppointmentFormData } from '@/hooks/useAppointments';

vi.mock('@/lib/api');
vi.mock('@/hooks/useSuggestedAppointmentDate', () => ({
  useSuggestedAppointmentDate: () => ({
    suggestedDate: null,
    loading: false,
    error: null,
    calculationDetails: null,
  }),
}));

const patient = {
  id: 'p1',
  tenant_id: 't1',
  first_name: 'Guadalupe',
  last_name: 'Montaldi',
  phone: '543816540004',
  email: null,
  date_of_birth: null,
  notes: null,
  created_at: null,
  updated_at: null,
};

function renderSheet(overrides: Partial<AppointmentFormData>, onSubmit = vi.fn()) {
  const form: AppointmentFormData = {
    patient_id: 'p1',
    date: new Date(2026, 8, 10),
    time: '16:30',
    duration_minutes: 60,
    notes: '',
    ...overrides,
  };
  render(
    <Sheet open>
      <SheetContent>
        <NewAppointmentSheet
      form={form}
      setForm={vi.fn()}
      patients={[patient] as never}
      treatments={[]}
      submitting={false}
      onSubmit={onSubmit}
          onPatientCreated={vi.fn()}
        />
      </SheetContent>
    </Sheet>
  );
  return onSubmit;
}

describe('NewAppointmentSheet confirmation step', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not save until the professional confirms date and time', async () => {
    const user = userEvent.setup();
    const onSubmit = renderSheet({});

    await user.click(screen.getByRole('button', { name: 'Crear turno' }));
    expect(onSubmit).not.toHaveBeenCalled();

    expect(
      screen.getByText('jueves 10 de septiembre de 2026')
    ).toBeInTheDocument();
    expect(screen.getByText('16:30')).toBeInTheDocument();
    expect(screen.getByText('Guadalupe Montaldi')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Confirmar y crear' })
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('warns when the chosen date is already in the past', async () => {
    const user = userEvent.setup();
    renderSheet({ date: new Date(2020, 0, 15) });

    await user.click(screen.getByRole('button', { name: 'Crear turno' }));
    expect(
      screen.getByText('Esta fecha y hora ya pasaron.')
    ).toBeInTheDocument();
  });
});
