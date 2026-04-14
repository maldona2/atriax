import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickAddPatientDialog } from './QuickAddPatientDialog';
import api from '@/lib/api';

vi.mock('@/lib/api');

describe('QuickAddPatientDialog - Country Code Selector', () => {
  const mockOnPatientCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should format phone number correctly on submission', async () => {
    const mockPost = vi.mocked(api.post).mockResolvedValue({
      data: {
        id: '123',
        tenant_id: 'tenant-1',
        first_name: 'Juan',
        last_name: 'Pérez',
        phone: '543813000120',
        email: 'juan@ejemplo.com',
        date_of_birth: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    render(<QuickAddPatientDialog onPatientCreated={mockOnPatientCreated} />);

    const trigger = screen.getByRole('button', {
      name: /crear nuevo paciente/i,
    });
    await userEvent.click(trigger);

    // Fill in the form
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Juan');
    await userEvent.type(screen.getByLabelText(/apellido/i), 'Pérez');
    await userEvent.type(
      screen.getByPlaceholderText('3813000120'),
      '3813000120'
    );

    // Submit the form
    const submitButton = screen.getByRole('button', {
      name: /crear paciente/i,
    });
    await userEvent.click(submitButton);

    // Verify API was called with formatted phone
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/patients', {
        first_name: 'Juan',
        last_name: 'Pérez',
        phone: '543813000120', // Country code 54 + phone number
        email: '',
        date_of_birth: '',
        notes: '',
      });
    });
  });

  it('should strip non-numeric characters from phone number', async () => {
    const mockPost = vi.mocked(api.post).mockResolvedValue({
      data: {
        id: '123',
        tenant_id: 'tenant-1',
        first_name: 'Juan',
        last_name: 'Pérez',
        phone: '543813000120',
        email: '',
        date_of_birth: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    render(<QuickAddPatientDialog onPatientCreated={mockOnPatientCreated} />);

    const trigger = screen.getByRole('button', {
      name: /crear nuevo paciente/i,
    });
    await userEvent.click(trigger);

    // Fill in the form with formatted phone number
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Juan');
    await userEvent.type(screen.getByLabelText(/apellido/i), 'Pérez');
    await userEvent.type(
      screen.getByPlaceholderText('3813000120'),
      '381-300-0120'
    );

    // Submit the form
    const submitButton = screen.getByRole('button', {
      name: /crear paciente/i,
    });
    await userEvent.click(submitButton);

    // Verify API was called with stripped phone
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/patients', {
        first_name: 'Juan',
        last_name: 'Pérez',
        phone: '543813000120', // Dashes removed
        email: '',
        date_of_birth: '',
        notes: '',
      });
    });
  });

  it('should handle empty phone number', async () => {
    const mockPost = vi.mocked(api.post).mockResolvedValue({
      data: {
        id: '123',
        tenant_id: 'tenant-1',
        first_name: 'Juan',
        last_name: 'Pérez',
        phone: null,
        email: '',
        date_of_birth: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    render(<QuickAddPatientDialog onPatientCreated={mockOnPatientCreated} />);

    const trigger = screen.getByRole('button', {
      name: /crear nuevo paciente/i,
    });
    await userEvent.click(trigger);

    // Fill in only required fields
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Juan');
    await userEvent.type(screen.getByLabelText(/apellido/i), 'Pérez');

    // Submit the form without phone
    const submitButton = screen.getByRole('button', {
      name: /crear paciente/i,
    });
    await userEvent.click(submitButton);

    // Verify API was called with empty phone
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/patients', {
        first_name: 'Juan',
        last_name: 'Pérez',
        phone: '', // Empty string
        email: '',
        date_of_birth: '',
        notes: '',
      });
    });
  });

  it('should remove whitespace from phone number', async () => {
    const mockPost = vi.mocked(api.post).mockResolvedValue({
      data: {
        id: '123',
        tenant_id: 'tenant-1',
        first_name: 'Juan',
        last_name: 'Pérez',
        phone: '543813000120',
        email: '',
        date_of_birth: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    render(<QuickAddPatientDialog onPatientCreated={mockOnPatientCreated} />);

    const trigger = screen.getByRole('button', {
      name: /crear nuevo paciente/i,
    });
    await userEvent.click(trigger);

    // Fill in the form with whitespace in phone
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Juan');
    await userEvent.type(screen.getByLabelText(/apellido/i), 'Pérez');
    await userEvent.type(
      screen.getByPlaceholderText('3813000120'),
      ' 381 300 0120 '
    );

    // Submit the form
    const submitButton = screen.getByRole('button', {
      name: /crear paciente/i,
    });
    await userEvent.click(submitButton);

    // Verify API was called with cleaned phone
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/patients', {
        first_name: 'Juan',
        last_name: 'Pérez',
        phone: '543813000120', // Whitespace removed
        email: '',
        date_of_birth: '',
        notes: '',
      });
    });
  });

  it('should reset country code to default after successful submission', async () => {
    const mockPost = vi.mocked(api.post).mockResolvedValue({
      data: {
        id: '123',
        tenant_id: 'tenant-1',
        first_name: 'Juan',
        last_name: 'Pérez',
        phone: '543813000120',
        email: '',
        date_of_birth: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    render(<QuickAddPatientDialog onPatientCreated={mockOnPatientCreated} />);

    // Open dialog
    const trigger = screen.getByRole('button', {
      name: /crear nuevo paciente/i,
    });
    await userEvent.click(trigger);

    // Fill in the form
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Juan');
    await userEvent.type(screen.getByLabelText(/apellido/i), 'Pérez');
    await userEvent.type(
      screen.getByPlaceholderText('3813000120'),
      '3813000120'
    );

    // Submit the form
    const submitButton = screen.getByRole('button', {
      name: /crear paciente/i,
    });
    await userEvent.click(submitButton);

    // Wait for submission to complete
    await waitFor(() => {
      expect(mockOnPatientCreated).toHaveBeenCalled();
    });

    // Verify API was called with Argentina country code (default)
    expect(mockPost).toHaveBeenCalledWith('/patients', {
      first_name: 'Juan',
      last_name: 'Pérez',
      phone: '543813000120', // Default country code 54
      email: '',
      date_of_birth: '',
      notes: '',
    });
  });
});
