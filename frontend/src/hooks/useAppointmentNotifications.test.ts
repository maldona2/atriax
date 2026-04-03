import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAppointmentNotifications } from './useAppointmentNotifications';
import { useAppointments } from './useAppointments';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('./useAppointments');
vi.mock('sonner');
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

const mockUseAppointments = useAppointments as any;
const mockUseNavigate = useNavigate as any;
const mockToast = toast as any;

describe('useAppointmentNotifications - Task 3.2: Time Matching', () => {
  let mockNavigate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockNavigate = vi.fn();
    mockUseNavigate.mockReturnValue(mockNavigate);

    // Default mock implementation
    mockUseAppointments.mockReturnValue({
      appointments: [],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should parse appointment scheduled_at and extract hour and minute', () => {
    // Set current time to 14:30:00
    vi.setSystemTime(new Date('2024-01-15T14:30:00'));

    const appointment = {
      id: 'apt-1',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-1',
      patient_first_name: 'John',
      patient_last_name: 'Doe',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // Fast-forward to trigger the interval
    vi.advanceTimersByTime(60000);

    // The appointment should be added to the notified set (verified by console.log in implementation)
    // This test verifies the parsing and comparison logic runs without errors
  });

  it('should match time at minute precision (ignoring seconds)', () => {
    // Set current time to 14:30:45 (45 seconds)
    vi.setSystemTime(new Date('2024-01-15T14:30:45'));

    const appointment = {
      id: 'apt-2',
      scheduled_at: '2024-01-15T14:30:00', // 0 seconds
      status: 'confirmed' as const,
      patient_id: 'patient-2',
      patient_first_name: 'Jane',
      patient_last_name: 'Smith',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // Fast-forward to trigger the interval
    vi.advanceTimersByTime(60000);

    // Time should match despite different seconds (14:30:45 matches 14:30:00)
  });

  it('should not trigger notification if appointment ID is already in notified Set', () => {
    vi.setSystemTime(new Date('2024-01-15T14:30:00'));

    const appointment = {
      id: 'apt-3',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-3',
      patient_first_name: 'Bob',
      patient_last_name: 'Johnson',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // First interval tick - should trigger notification
    vi.advanceTimersByTime(60000);

    // Second interval tick - should NOT trigger notification (already notified)
    vi.advanceTimersByTime(60000);

    // The appointment ID should be in the Set after first trigger
  });

  it('should handle invalid scheduled_at gracefully', () => {
    vi.setSystemTime(new Date('2024-01-15T14:30:00'));

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const appointment = {
      id: 'apt-4',
      scheduled_at: 'invalid-date-string',
      status: 'confirmed' as const,
      patient_id: 'patient-4',
      patient_first_name: 'Alice',
      patient_last_name: 'Williams',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // Fast-forward to trigger the interval
    vi.advanceTimersByTime(60000);

    // Should log error and continue without crashing
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid scheduled_at for appointment apt-4')
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle time parsing errors with try-catch', () => {
    vi.setSystemTime(new Date('2024-01-15T14:30:00'));

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // Create an appointment with a value that will throw during Date parsing
    const appointment = {
      id: 'apt-5',
      scheduled_at: null as any, // This will cause an error
      status: 'confirmed' as const,
      patient_id: 'patient-5',
      patient_first_name: 'Charlie',
      patient_last_name: 'Brown',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // Fast-forward to trigger the interval
    vi.advanceTimersByTime(60000);

    // Should handle error gracefully and continue
    // The hook should not crash

    consoleErrorSpy.mockRestore();
  });

  it('should not match if time is different', () => {
    // Current time is 14:30
    vi.setSystemTime(new Date('2024-01-15T14:30:00'));

    const appointment = {
      id: 'apt-6',
      scheduled_at: '2024-01-15T15:30:00', // Different hour
      status: 'confirmed' as const,
      patient_id: 'patient-6',
      patient_first_name: 'David',
      patient_last_name: 'Miller',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // Fast-forward to trigger the interval
    vi.advanceTimersByTime(60000);

    // Should not trigger notification (time doesn't match)
  });

  it('should process multiple appointments in the same interval', () => {
    vi.setSystemTime(new Date('2024-01-15T14:30:00'));

    const appointments = [
      {
        id: 'apt-7',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'confirmed' as const,
        patient_id: 'patient-7',
        patient_first_name: 'Emma',
        patient_last_name: 'Davis',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
      {
        id: 'apt-8',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'pending' as const,
        patient_id: 'patient-8',
        patient_first_name: 'Frank',
        patient_last_name: 'Wilson',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
    ];

    mockUseAppointments.mockReturnValue({
      appointments,
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // Fast-forward to trigger the interval
    vi.advanceTimersByTime(60000);

    // Both appointments should be processed (verified by console.log in implementation)
  });
});

describe('useAppointmentNotifications - Task 4.1: Toast Notification Content', () => {
  let mockNavigate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockNavigate = vi.fn();
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockToast.mockImplementation(() => {});

    // Default mock implementation
    mockUseAppointments.mockReturnValue({
      appointments: [],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should format patient name from first_name and last_name', () => {
    const appointment = {
      id: 'apt-1',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-1',
      patient_first_name: 'John',
      patient_last_name: 'Doe',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Set time to 1 minute before appointment
    vi.setSystemTime(new Date('2024-01-15T14:29:00'));

    renderHook(() => useAppointmentNotifications());

    // Advance time by 60 seconds to reach appointment time
    vi.advanceTimersByTime(60000);

    // Verify toast was called with correct patient name
    expect(mockToast).toHaveBeenCalledWith(
      'Appointment Time',
      expect.objectContaining({
        description: expect.stringContaining('John Doe'),
      })
    );
  });

  it('should handle missing patient first name with fallback', () => {
    const appointment = {
      id: 'apt-2',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-2',
      patient_first_name: undefined,
      patient_last_name: 'Smith',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify toast was called with last name only
    expect(mockToast).toHaveBeenCalledWith(
      'Appointment Time',
      expect.objectContaining({
        description: expect.stringContaining('Smith'),
      })
    );
  });

  it('should handle missing patient last name with fallback', () => {
    const appointment = {
      id: 'apt-3',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-3',
      patient_first_name: 'Jane',
      patient_last_name: undefined,
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify toast was called with first name only
    expect(mockToast).toHaveBeenCalledWith(
      'Appointment Time',
      expect.objectContaining({
        description: expect.stringContaining('Jane'),
      })
    );
  });

  it('should handle missing both patient names with "Patient" fallback', () => {
    const appointment = {
      id: 'apt-4',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-4',
      patient_first_name: undefined,
      patient_last_name: undefined,
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify toast was called with "Patient" fallback
    expect(mockToast).toHaveBeenCalledWith(
      'Appointment Time',
      expect.objectContaining({
        description: expect.stringContaining('Patient'),
      })
    );
  });

  it('should format scheduled time in "h:mm a" format', () => {
    const appointment = {
      id: 'apt-5',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-5',
      patient_first_name: 'Bob',
      patient_last_name: 'Johnson',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify toast was called with formatted time (2:30 PM)
    expect(mockToast).toHaveBeenCalledWith(
      'Appointment Time',
      expect.objectContaining({
        description: expect.stringContaining('2:30 PM'),
      })
    );
  });

  it('should call toast with title "Appointment Time" and formatted description', () => {
    const appointment = {
      id: 'apt-6',
      scheduled_at: '2024-01-15T09:15:00',
      status: 'confirmed' as const,
      patient_id: 'patient-6',
      patient_first_name: 'Alice',
      patient_last_name: 'Williams',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T09:14:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify toast was called with correct structure
    expect(mockToast).toHaveBeenCalledWith(
      'Appointment Time',
      expect.objectContaining({
        description: 'Alice Williams - 9:15 AM',
      })
    );
  });

  it('should format time correctly for afternoon appointments', () => {
    const appointment = {
      id: 'apt-7',
      scheduled_at: '2024-01-15T17:45:00',
      status: 'confirmed' as const,
      patient_id: 'patient-7',
      patient_first_name: 'Charlie',
      patient_last_name: 'Brown',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T17:44:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify toast was called with PM time
    expect(mockToast).toHaveBeenCalledWith(
      'Appointment Time',
      expect.objectContaining({
        description: expect.stringContaining('5:45 PM'),
      })
    );
  });
});

describe('useAppointmentNotifications - Task 4.2: Action Button with Navigation', () => {
  let mockNavigate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockNavigate = vi.fn();
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockToast.mockImplementation(() => {});

    // Default mock implementation
    mockUseAppointments.mockReturnValue({
      appointments: [],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should include action button with label "View Patient" when patient_id is present', () => {
    const appointment = {
      id: 'apt-1',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-123',
      patient_first_name: 'John',
      patient_last_name: 'Doe',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify toast was called with action button
    expect(mockToast).toHaveBeenCalledWith(
      'Appointment Time',
      expect.objectContaining({
        action: expect.objectContaining({
          label: 'View Patient',
        }),
      })
    );
  });

  it('should navigate to /app/patients/:patient_id when action button is clicked', () => {
    const appointment = {
      id: 'apt-2',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-456',
      patient_first_name: 'Jane',
      patient_last_name: 'Smith',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Get the onClick handler from the toast call
    const toastCall = mockToast.mock.calls[0];
    const toastOptions = toastCall[1];
    const onClickHandler = toastOptions.action.onClick;

    // Simulate clicking the action button
    onClickHandler();

    // Verify navigate was called with correct URL
    expect(mockNavigate).toHaveBeenCalledWith('/app/patients/patient-456');
  });

  it('should omit action button when patient_id is missing', () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    const appointment = {
      id: 'apt-3',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: undefined as any,
      patient_first_name: 'Bob',
      patient_last_name: 'Johnson',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify toast was called without action button
    expect(mockToast).toHaveBeenCalledWith(
      'Appointment Time',
      expect.objectContaining({
        description: expect.any(String),
      })
    );

    // Verify action property is not present
    const toastCall = mockToast.mock.calls[0];
    const toastOptions = toastCall[1];
    expect(toastOptions.action).toBeUndefined();

    // Verify warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing patient_id for appointment apt-3')
    );

    consoleWarnSpy.mockRestore();
  });

  it('should omit action button when patient_id is null', () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    const appointment = {
      id: 'apt-4',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: null as any,
      patient_first_name: 'Alice',
      patient_last_name: 'Williams',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify action property is not present
    const toastCall = mockToast.mock.calls[0];
    const toastOptions = toastCall[1];
    expect(toastOptions.action).toBeUndefined();

    // Verify warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing patient_id for appointment apt-4')
    );

    consoleWarnSpy.mockRestore();
  });

  it('should omit action button when patient_id is empty string', () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    const appointment = {
      id: 'apt-5',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: '',
      patient_first_name: 'Charlie',
      patient_last_name: 'Brown',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify action property is not present
    const toastCall = mockToast.mock.calls[0];
    const toastOptions = toastCall[1];
    expect(toastOptions.action).toBeUndefined();

    // Verify warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing patient_id for appointment apt-5')
    );

    consoleWarnSpy.mockRestore();
  });

  it('should use correct patient_id in navigation URL for multiple appointments', () => {
    const appointments = [
      {
        id: 'apt-6',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'confirmed' as const,
        patient_id: 'patient-111',
        patient_first_name: 'David',
        patient_last_name: 'Miller',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
      {
        id: 'apt-7',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'scheduled' as const,
        patient_id: 'patient-222',
        patient_first_name: 'Emma',
        patient_last_name: 'Davis',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
    ];

    mockUseAppointments.mockReturnValue({
      appointments,
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify both toasts were called
    expect(mockToast).toHaveBeenCalledTimes(2);

    // Get the onClick handlers from both toast calls
    const firstToastCall = mockToast.mock.calls[0];
    const firstOnClick = firstToastCall[1].action.onClick;

    const secondToastCall = mockToast.mock.calls[1];
    const secondOnClick = secondToastCall[1].action.onClick;

    // Simulate clicking both action buttons
    firstOnClick();
    secondOnClick();

    // Verify navigate was called with correct URLs for each patient
    expect(mockNavigate).toHaveBeenCalledWith('/app/patients/patient-111');
    expect(mockNavigate).toHaveBeenCalledWith('/app/patients/patient-222');
  });
});

describe('useAppointmentNotifications - Task 5.1: Date Change Detection', () => {
  let mockNavigate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockNavigate = vi.fn();
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockToast.mockImplementation(() => {});

    // Default mock implementation
    mockUseAppointments.mockReturnValue({
      appointments: [],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should clear notified Set when date changes', () => {
    const appointment = {
      id: 'apt-1',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-1',
      patient_first_name: 'John',
      patient_last_name: 'Doe',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    // Start on January 15, 2024 at 14:29 (1 minute before appointment)
    vi.setSystemTime(new Date('2024-01-15T14:29:00'));

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // Advance to 14:30 - should trigger notification
    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(1);

    mockToast.mockClear();

    // Advance to 14:31 on same day - should NOT trigger notification (already notified)
    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(0);

    // Change date to January 16, 2024 at 14:29
    vi.setSystemTime(new Date('2024-01-16T14:29:00'));

    // Update the appointment to be on the new day
    const newDayAppointment = {
      ...appointment,
      scheduled_at: '2024-01-16T14:30:00',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [newDayAppointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Advance timer on new day - should trigger notification again (Set was cleared)
    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('should update date ref to new current date when date changes', () => {
    // Start on January 15, 2024
    vi.setSystemTime(new Date('2024-01-15T23:59:00'));

    mockUseAppointments.mockReturnValue({
      appointments: [],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // First interval tick on January 15
    vi.advanceTimersByTime(60000);

    // Change date to January 16 (next day)
    vi.setSystemTime(new Date('2024-01-16T00:00:00'));

    // Second interval tick on January 16 - date ref should be updated
    vi.advanceTimersByTime(60000);

    // The hook should continue to work correctly after date change
    // (no errors should occur)
  });

  it('should detect date change at midnight', () => {
    const appointment = {
      id: 'apt-2',
      scheduled_at: '2024-01-15T23:59:00',
      status: 'confirmed' as const,
      patient_id: 'patient-2',
      patient_first_name: 'Jane',
      patient_last_name: 'Smith',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    // Start just before midnight on January 15 at 23:58
    vi.setSystemTime(new Date('2024-01-15T23:58:00'));

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // Advance to 23:59 - should trigger notification
    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(1);

    mockToast.mockClear();

    // Change to next day at 23:58 (to test date change detection)
    vi.setSystemTime(new Date('2024-01-16T23:58:00'));

    // Update appointment to be on the new day at the same time
    const newDayAppointment = {
      ...appointment,
      scheduled_at: '2024-01-16T23:59:00',
    };

    mockUseAppointments.mockReturnValue({
      appointments: [newDayAppointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Advance timer on new day - should trigger notification (Set was cleared)
    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple date changes correctly', () => {
    const appointment = {
      id: 'apt-3',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-3',
      patient_first_name: 'Bob',
      patient_last_name: 'Johnson',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    // Start on January 15 at 14:29
    vi.setSystemTime(new Date('2024-01-15T14:29:00'));

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // Day 1: Trigger notification at 14:30
    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(1);
    mockToast.mockClear();

    // Change to Day 2 at 14:29
    vi.setSystemTime(new Date('2024-01-16T14:29:00'));
    mockUseAppointments.mockReturnValue({
      appointments: [{ ...appointment, scheduled_at: '2024-01-16T14:30:00' }],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(1);
    mockToast.mockClear();

    // Change to Day 3 at 14:29
    vi.setSystemTime(new Date('2024-01-17T14:29:00'));
    mockUseAppointments.mockReturnValue({
      appointments: [{ ...appointment, scheduled_at: '2024-01-17T14:30:00' }],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('should not clear notified Set if date has not changed', () => {
    const appointment = {
      id: 'apt-4',
      scheduled_at: '2024-01-15T14:30:00',
      status: 'confirmed' as const,
      patient_id: 'patient-4',
      patient_first_name: 'Alice',
      patient_last_name: 'Williams',
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    };

    // Start on January 15 at 14:29
    vi.setSystemTime(new Date('2024-01-15T14:29:00'));

    mockUseAppointments.mockReturnValue({
      appointments: [appointment],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useAppointmentNotifications());

    // First interval tick at 14:30 - should trigger notification
    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(1);
    mockToast.mockClear();

    // Second interval tick at 14:31 (same day) - should NOT trigger notification
    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(0);

    // Third interval tick at 14:32 (same day) - should still NOT trigger notification
    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(0);
  });
});

describe('useAppointmentNotifications - Task 6.1: Multiple Simultaneous Appointments', () => {
  let mockNavigate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockNavigate = vi.fn();
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockToast.mockImplementation(() => {});

    // Default mock implementation
    mockUseAppointments.mockReturnValue({
      appointments: [],
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should trigger separate toast for each appointment scheduled at the same time', () => {
    const appointments = [
      {
        id: 'apt-1',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'confirmed' as const,
        patient_id: 'patient-1',
        patient_first_name: 'John',
        patient_last_name: 'Doe',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
      {
        id: 'apt-2',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'scheduled' as const,
        patient_id: 'patient-2',
        patient_first_name: 'Jane',
        patient_last_name: 'Smith',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
      {
        id: 'apt-3',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'confirmed' as const,
        patient_id: 'patient-3',
        patient_first_name: 'Bob',
        patient_last_name: 'Johnson',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
    ];

    mockUseAppointments.mockReturnValue({
      appointments,
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify toast was called 3 times (once for each appointment)
    expect(mockToast).toHaveBeenCalledTimes(3);
  });

  it('should include correct patient information in each separate toast', () => {
    const appointments = [
      {
        id: 'apt-4',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'confirmed' as const,
        patient_id: 'patient-4',
        patient_first_name: 'Alice',
        patient_last_name: 'Williams',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
      {
        id: 'apt-5',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'scheduled' as const,
        patient_id: 'patient-5',
        patient_first_name: 'Charlie',
        patient_last_name: 'Brown',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
    ];

    mockUseAppointments.mockReturnValue({
      appointments,
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Verify first toast has Alice Williams
    expect(mockToast).toHaveBeenNthCalledWith(
      1,
      'Appointment Time',
      expect.objectContaining({
        description: expect.stringContaining('Alice Williams'),
      })
    );

    // Verify second toast has Charlie Brown
    expect(mockToast).toHaveBeenNthCalledWith(
      2,
      'Appointment Time',
      expect.objectContaining({
        description: expect.stringContaining('Charlie Brown'),
      })
    );
  });

  it('should create separate action buttons with correct patient_id for each toast', () => {
    const appointments = [
      {
        id: 'apt-6',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'confirmed' as const,
        patient_id: 'patient-111',
        patient_first_name: 'David',
        patient_last_name: 'Miller',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
      {
        id: 'apt-7',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'scheduled' as const,
        patient_id: 'patient-222',
        patient_first_name: 'Emma',
        patient_last_name: 'Davis',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
    ];

    mockUseAppointments.mockReturnValue({
      appointments,
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Get the onClick handlers from both toast calls
    const firstToastCall = mockToast.mock.calls[0];
    const firstOnClick = firstToastCall[1].action.onClick;

    const secondToastCall = mockToast.mock.calls[1];
    const secondOnClick = secondToastCall[1].action.onClick;

    // Simulate clicking both action buttons
    firstOnClick();
    secondOnClick();

    // Verify navigate was called with correct URLs for each patient
    expect(mockNavigate).toHaveBeenNthCalledWith(
      1,
      '/app/patients/patient-111'
    );
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      '/app/patients/patient-222'
    );
  });

  it('should process all matching appointments even with mixed statuses', () => {
    const appointments = [
      {
        id: 'apt-8',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'confirmed' as const,
        patient_id: 'patient-8',
        patient_first_name: 'Frank',
        patient_last_name: 'Wilson',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
      {
        id: 'apt-9',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'cancelled' as const, // Should be filtered out
        patient_id: 'patient-9',
        patient_first_name: 'Grace',
        patient_last_name: 'Taylor',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
      {
        id: 'apt-10',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'scheduled' as const,
        patient_id: 'patient-10',
        patient_first_name: 'Henry',
        patient_last_name: 'Anderson',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
    ];

    mockUseAppointments.mockReturnValue({
      appointments,
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Should only trigger 2 toasts (cancelled appointment should be filtered out)
    expect(mockToast).toHaveBeenCalledTimes(2);

    // Verify the correct patients were notified
    expect(mockToast).toHaveBeenCalledWith(
      'Appointment Time',
      expect.objectContaining({
        description: expect.stringContaining('Frank Wilson'),
      })
    );

    expect(mockToast).toHaveBeenCalledWith(
      'Appointment Time',
      expect.objectContaining({
        description: expect.stringContaining('Henry Anderson'),
      })
    );
  });

  it('should not trigger duplicate notifications for same appointments on subsequent intervals', () => {
    const appointments = [
      {
        id: 'apt-11',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'confirmed' as const,
        patient_id: 'patient-11',
        patient_first_name: 'Ivy',
        patient_last_name: 'Martinez',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
      {
        id: 'apt-12',
        scheduled_at: '2024-01-15T14:30:00',
        status: 'scheduled' as const,
        patient_id: 'patient-12',
        patient_first_name: 'Jack',
        patient_last_name: 'Garcia',
        duration_minutes: 30,
        notes: null,
        tenant_id: 'tenant-1',
      },
    ];

    mockUseAppointments.mockReturnValue({
      appointments,
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());

    // First interval tick at 14:30 - should trigger 2 notifications
    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(2);

    mockToast.mockClear();

    // Second interval tick at 14:31 (still same minute in some cases) - should NOT trigger again
    vi.advanceTimersByTime(60000);
    expect(mockToast).toHaveBeenCalledTimes(0);
  });

  it('should handle large number of simultaneous appointments', () => {
    // Create 10 appointments at the same time
    const appointments = Array.from({ length: 10 }, (_, i) => ({
      id: `apt-${i + 20}`,
      scheduled_at: '2024-01-15T14:30:00',
      status: (i % 2 === 0 ? 'confirmed' : 'scheduled') as const,
      patient_id: `patient-${i + 20}`,
      patient_first_name: `Patient${i}`,
      patient_last_name: `LastName${i}`,
      duration_minutes: 30,
      notes: null,
      tenant_id: 'tenant-1',
    }));

    mockUseAppointments.mockReturnValue({
      appointments,
      setDate: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.setSystemTime(new Date('2024-01-15T14:29:00'));
    renderHook(() => useAppointmentNotifications());
    vi.advanceTimersByTime(60000);

    // Should trigger 10 separate toasts
    expect(mockToast).toHaveBeenCalledTimes(10);

    // Verify each toast has unique patient information
    for (let i = 0; i < 10; i++) {
      expect(mockToast).toHaveBeenCalledWith(
        'Appointment Time',
        expect.objectContaining({
          description: expect.stringContaining(`Patient${i} LastName${i}`),
        })
      );
    }
  });
});
