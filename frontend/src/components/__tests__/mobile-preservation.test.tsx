/**
 * Preservation Property Tests — Mobile Responsive Fixes
 *
 * These tests assert BASELINE desktop/non-mobile behavior that must be PRESERVED after the fix.
 * They MUST PASS on unfixed code — passing confirms the baseline behavior to preserve.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
} from '@tanstack/react-table';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'admin',
    },
    isLoading: false,
    logout: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { LandingHeader } from '@/components/landing/LandingHeader';
import { DataTable } from '@/components/data-table/data-table';
import { AppointmentDetailSheet } from '@/components/appointments/AppointmentDetailSheet';
import api from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal Appointment fixture */
const mockAppointment = {
  id: 'apt-1',
  scheduled_at: '2024-06-15T10:00:00',
  status: 'confirmed' as const,
  patient_id: 'patient-1',
  patient_first_name: 'Ana',
  patient_last_name: 'García',
  duration_minutes: 60,
  notes: null,
  tenant_id: 'tenant-1',
  payment_status: 'unpaid' as const,
  total_amount_cents: 5000,
};

/** Minimal DataTable wrapper that creates a real table instance */
function MinimalDataTable() {
  const columnHelper = createColumnHelper<{ name: string }>();
  const columns = [columnHelper.accessor('name', { header: 'Name' })];
  const table = useReactTable({
    data: [{ name: 'Row 1' }],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  return <DataTable table={table} />;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Preservation Property Tests — Desktop Layout and Behavior Unchanged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...mockAppointment },
    });
  });

  /**
   * Test 1 — LandingHeader authenticated branch: "Ir al panel" button
   *
   * PRESERVATION: The authenticated "Ir al panel" button intentionally keeps
   * `hidden sm:inline-flex` so it is hidden on mobile (the dropdown covers that case).
   * This class MUST NOT be removed by the fix.
   *
   * This test PASSES on unfixed code (the class is present) and MUST STILL PASS after fix.
   *
   * Validates: Requirements 3.1
   */
  it('Test 1: LandingHeader authenticated — "Ir al panel" button retains hidden sm:inline-flex', () => {
    render(
      <BrowserRouter>
        <LandingHeader />
      </BrowserRouter>
    );

    // The authenticated branch renders "Ir al panel" as a Link inside a Button with asChild.
    // With asChild, the Button's classes (including hidden sm:inline-flex) are applied
    // directly to the <a> element rendered by Link.
    const panelLinks = screen.getAllByRole('link', { name: /ir al panel/i });
    // The header link is the one with the hidden sm:inline-flex class
    const headerPanelLink = panelLinks.find((el) =>
      el.classList.contains('hidden')
    );

    // PRESERVATION: this button intentionally hides on mobile — must keep hidden sm:inline-flex
    expect(headerPanelLink).toBeDefined();
    expect(headerPanelLink).toHaveClass('hidden');
    expect(headerPanelLink).toHaveClass('sm:inline-flex');
  });

  /**
   * Test 2 — DataTable: `rounded-md border` class is still present on the wrapper div
   *
   * PRESERVATION: Adding `overflow-x-auto` is additive — it must NOT replace the
   * existing `rounded-md border` classes. The border and rounded corners must remain.
   *
   * This test PASSES on unfixed code (the classes are present) and MUST STILL PASS after fix.
   *
   * Validates: Requirements 3.2
   */
  it('Test 2: DataTable — rounded-md border class is still present on the wrapper div', () => {
    const { container } = render(
      <BrowserRouter>
        <MinimalDataTable />
      </BrowserRouter>
    );

    // The wrapper div must always have rounded-md and border
    const tableWrapper = container.querySelector('.rounded-md.border');
    expect(tableWrapper).not.toBeNull();
    expect(tableWrapper).toHaveClass('rounded-md');
    expect(tableWrapper).toHaveClass('border');
  });

  /**
   * Test 3 — AppointmentDetailSheet: both grids contain sm:grid-cols-2 (AFTER fix)
   *
   * NOTE: On UNFIXED code the grids have bare `grid-cols-2` (no sm: prefix).
   * This test checks for `sm:grid-cols-2` which will PASS after the fix.
   * Since this test must PASS on unfixed code, we instead verify the structural
   * preservation: both grid containers exist and have the `gap-3` / `gap-2` classes
   * that identify them — these classes must not be removed by the fix.
   *
   * Validates: Requirements 3.3
   */
  it('Test 3: AppointmentDetailSheet — both grid containers are present with their gap classes', () => {
    const { container } = render(
      <BrowserRouter>
        <AppointmentDetailSheet
          appointment={mockAppointment as any}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );

    const gridDivs = container.querySelectorAll('.grid');

    // Date/time grid has gap-3
    const dateTimeGrid = Array.from(gridDivs).find((el) =>
      el.classList.contains('gap-3')
    );
    expect(dateTimeGrid).not.toBeNull();
    expect(dateTimeGrid).toHaveClass('grid');
    expect(dateTimeGrid).toHaveClass('gap-3');

    // Status change grid has gap-2
    const statusGrid = Array.from(gridDivs).find((el) =>
      el.classList.contains('gap-2')
    );
    expect(statusGrid).not.toBeNull();
    expect(statusGrid).toHaveClass('grid');
    expect(statusGrid).toHaveClass('gap-2');
  });

  /**
   * Test 4 — AppointmentDetailSheet: payment button click handlers fire handlePaymentChange
   *
   * PRESERVATION: Clicking a payment button must call the API with the correct
   * PaymentStatus key. This behavior must be unchanged after the fix.
   *
   * This test PASSES on unfixed code and MUST STILL PASS after fix.
   *
   * Validates: Requirements 3.4
   */
  it('Test 4: AppointmentDetailSheet — payment button click fires API with correct PaymentStatus key', async () => {
    const mockPut = api.put as ReturnType<typeof vi.fn>;
    mockPut.mockResolvedValue({
      data: { ...mockAppointment, payment_status: 'paid' },
    });

    render(
      <BrowserRouter>
        <AppointmentDetailSheet
          appointment={mockAppointment as any}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );

    // Click the "Pagado" button (payment_status = 'paid')
    const pagadoButton = screen.getByRole('button', { name: /pagado/i });
    fireEvent.click(pagadoButton);

    // The API must be called with the correct payment_status key
    expect(mockPut).toHaveBeenCalledWith(
      `/appointments/${mockAppointment.id}`,
      { payment_status: 'paid' }
    );
  });

  /**
   * Test 5 — AppointmentDetailSheet: status button click handlers fire handleStatusChange
   *
   * PRESERVATION: Clicking a status button must call the API with the correct
   * status key. This behavior must be unchanged after the fix.
   *
   * This test PASSES on unfixed code and MUST STILL PASS after fix.
   *
   * Validates: Requirements 3.4
   */
  it('Test 5: AppointmentDetailSheet — status button click fires API with correct status key', async () => {
    const mockPut = api.put as ReturnType<typeof vi.fn>;
    mockPut.mockResolvedValue({
      data: { ...mockAppointment, status: 'completed' },
    });

    render(
      <BrowserRouter>
        <AppointmentDetailSheet
          appointment={mockAppointment as any}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );

    // Click the "Completado" button (status = 'completed')
    const completadoButton = screen.getByRole('button', {
      name: /completado/i,
    });
    fireEvent.click(completadoButton);

    // The API must be called with the correct status key
    expect(mockPut).toHaveBeenCalledWith(
      `/appointments/${mockAppointment.id}`,
      { status: 'completed' }
    );
  });
});
