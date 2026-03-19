/**
 * Bug Condition Exploration Tests — Mobile Responsive Fixes
 *
 * These tests assert the CORRECT/FIXED behavior.
 * They MUST FAIL on unfixed code — failure confirms the bugs exist.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { render, screen } from '@testing-library/react';
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
    user: null,
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

describe('Bug Condition Exploration — Mobile Responsive Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 1 — LandingHeader unauthenticated login button
   *
   * BUG: "Iniciar sesión" button has className="hidden sm:inline-flex"
   * which hides it on mobile viewports.
   *
   * CORRECT behavior: the button should NOT have `hidden` in its className.
   * This test FAILS on unfixed code (button has `hidden` class).
   *
   * Validates: Requirements 1.1
   */
  it('Test 1: LandingHeader — "Iniciar sesión" button should NOT have hidden class', () => {
    render(
      <BrowserRouter>
        <LandingHeader />
      </BrowserRouter>
    );

    // Find the "Iniciar sesión" link/button
    const loginButton = screen.getByRole('link', { name: /iniciar sesión/i });

    // CORRECT behavior: no `hidden` class
    // FAILS on unfixed code because className="hidden sm:inline-flex"
    expect(loginButton).not.toHaveClass('hidden');
  });

  /**
   * Test 2 — DataTable table wrapper overflow
   *
   * BUG: <div className="rounded-md border"> has no overflow-x-auto,
   * causing the table to overflow the viewport on narrow screens.
   *
   * CORRECT behavior: the wrapper div SHOULD have `overflow-x-auto`.
   * This test FAILS on unfixed code (wrapper lacks overflow-x-auto).
   *
   * Validates: Requirements 1.2
   */
  it('Test 2: DataTable — table wrapper div should have overflow-x-auto class', () => {
    const { container } = render(
      <BrowserRouter>
        <MinimalDataTable />
      </BrowserRouter>
    );

    // Find the wrapper div that has rounded-md border
    const tableWrapper = container.querySelector('.rounded-md.border');
    expect(tableWrapper).not.toBeNull();

    // CORRECT behavior: wrapper has overflow-x-auto
    // FAILS on unfixed code because the div only has "rounded-md border"
    expect(tableWrapper).toHaveClass('overflow-x-auto');
  });

  /**
   * Test 3 — AppointmentDetailSheet date/time grid
   *
   * BUG: date/time grid uses bare `grid-cols-2` without a responsive prefix,
   * cramming two cards into narrow columns on mobile.
   *
   * CORRECT behavior: the grid should NOT have bare `grid-cols-2`
   * (it should use `grid-cols-1 sm:grid-cols-2` instead).
   * This test FAILS on unfixed code (grid has bare grid-cols-2).
   *
   * Validates: Requirements 1.3
   */
  it('Test 3: AppointmentDetailSheet — date/time grid should NOT have bare grid-cols-2', () => {
    const { container } = render(
      <BrowserRouter>
        <AppointmentDetailSheet
          appointment={mockAppointment as any}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );

    // Find all grid divs
    const gridDivs = container.querySelectorAll('.grid');

    // Find the date/time grid — it contains the Fecha and Hora cards
    // On unfixed code it has exactly "grid grid-cols-2 gap-3"
    const dateTimeGrid = Array.from(gridDivs).find((el) =>
      el.classList.contains('gap-3')
    );

    expect(dateTimeGrid).not.toBeNull();

    // CORRECT behavior: no bare grid-cols-2 (should be grid-cols-1 sm:grid-cols-2)
    // FAILS on unfixed code because className="grid grid-cols-2 gap-3"
    expect(dateTimeGrid).not.toHaveClass('grid-cols-2');
  });

  /**
   * Test 4 — AppointmentDetailSheet status change grid
   *
   * BUG: status change grid uses bare `grid-cols-2` without a responsive prefix,
   * making status buttons too narrow on mobile.
   *
   * CORRECT behavior: the status grid should NOT have bare `grid-cols-2`.
   * This test FAILS on unfixed code (grid has bare grid-cols-2).
   *
   * Validates: Requirements 1.5
   */
  it('Test 4: AppointmentDetailSheet — status change grid should NOT have bare grid-cols-2', () => {
    const { container } = render(
      <BrowserRouter>
        <AppointmentDetailSheet
          appointment={mockAppointment as any}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );

    // Find all grid divs
    const gridDivs = container.querySelectorAll('.grid');

    // Find the status change grid — it contains gap-2 (vs gap-3 for date/time)
    const statusGrid = Array.from(gridDivs).find((el) =>
      el.classList.contains('gap-2')
    );

    expect(statusGrid).not.toBeNull();

    // CORRECT behavior: no bare grid-cols-2 (should be grid-cols-1 sm:grid-cols-2)
    // FAILS on unfixed code because className="grid grid-cols-2 gap-2"
    expect(statusGrid).not.toHaveClass('grid-cols-2');
  });

  /**
   * Test 5 — AppointmentDetailSheet payment buttons flex-1
   *
   * BUG: payment buttons have no `flex-1` class, so they don't fill the
   * available row width on mobile, resulting in cramped/misaligned buttons.
   *
   * CORRECT behavior: each payment button SHOULD have `flex-1` in its className.
   * This test FAILS on unfixed code (buttons lack flex-1).
   *
   * Validates: Requirements 1.4
   */
  it('Test 5: AppointmentDetailSheet — payment buttons should have flex-1 class', () => {
    const { container } = render(
      <BrowserRouter>
        <AppointmentDetailSheet
          appointment={mockAppointment as any}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );

    // Payment button labels from paymentConfig
    const paymentLabels = ['Impago', 'Pagado', 'Parcial', 'Reembolsado'];

    for (const label of paymentLabels) {
      const button = screen.getByRole('button', {
        name: new RegExp(label, 'i'),
      });

      // CORRECT behavior: each payment button has flex-1
      // FAILS on unfixed code because className only has "h-9" (no flex-1)
      expect(button).toHaveClass('flex-1');
    }
  });
});
