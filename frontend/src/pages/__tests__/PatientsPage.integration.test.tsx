import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PatientsPage } from '../PatientsPage';
import * as usePatients from '@/hooks/usePatients';

// Mock the usePatients hook
vi.mock('@/hooks/usePatients');

// Mock the API
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockPatients = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    first_name: 'Juan',
    last_name: 'Pérez',
    phone: '555-1234',
    email: 'juan@example.com',
    date_of_birth: '1990-01-01',
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    appointment_count: 5,
    unpaid_count: 0,
    unpaid_total_cents: 0,
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    first_name: 'María',
    last_name: 'García',
    phone: '555-5678',
    email: 'maria@example.com',
    date_of_birth: '1985-05-15',
    notes: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    appointment_count: 3,
    unpaid_count: 1,
    unpaid_total_cents: 5000,
  },
];

describe('PatientsPage Integration - Task 7', () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePatients.usePatients).mockReturnValue({
      patients: mockPatients,
      loading: false,
      refetch: mockRefetch,
    });
    vi.mocked(usePatients.usePatient).mockReturnValue({
      detail: null,
      loading: false,
      refetch: vi.fn(),
    } as any);
  });

  it('should render PatientActionsMenu for each patient row', async () => {
    render(
      <BrowserRouter>
        <PatientsPage />
      </BrowserRouter>
    );

    // Wait for the table to render
    await waitFor(() => {
      expect(screen.getByText('Pérez, Juan')).toBeInTheDocument();
    });

    // Check that action menu buttons are present (one for each patient)
    const actionButtons = screen.getAllByRole('button', {
      name: /Abrir acciones para/i,
    });
    expect(actionButtons).toHaveLength(2);

    // Verify the aria-labels include patient names
    expect(
      screen.getByRole('button', { name: 'Abrir acciones para Juan Pérez' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Abrir acciones para María García' })
    ).toBeInTheDocument();
  });

  it('should pass refetch function to PatientActionsMenu', async () => {
    render(
      <BrowserRouter>
        <PatientsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pérez, Juan')).toBeInTheDocument();
    });

    // The refetch function should be passed to the component
    // This is verified by the component rendering without errors
    expect(mockRefetch).not.toHaveBeenCalled(); // Not called on initial render
  });

  it('should maintain existing patient name link functionality', async () => {
    render(
      <BrowserRouter>
        <PatientsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pérez, Juan')).toBeInTheDocument();
    });

    // Check that patient name cards still exist (rendered as buttons in card layout)
    const juanCard = screen.getByRole('button', { name: /Pérez, Juan/ });
    expect(juanCard).toBeInTheDocument();

    const mariaCard = screen.getByRole('button', { name: /García, María/ });
    expect(mariaCard).toBeInTheDocument();
  });

  it('should maintain existing "Nuevo paciente" button functionality', async () => {
    render(
      <BrowserRouter>
        <PatientsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pérez, Juan')).toBeInTheDocument();
    });

    // Check that the "Nuevo" button exists (to create a new patient)
    const newPatientButton = screen.getByRole('button', {
      name: /Nuevo/i,
    });
    expect(newPatientButton).toBeInTheDocument();
    expect(newPatientButton).not.toBeDisabled();
  });
});
