import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppointments } from './useAppointments';

/**
 * Hook that monitors today's appointments and displays toast notifications
 * when appointment times arrive. Notifications include patient information
 * and a quick action button to navigate to the patient's detail page.
 *
 * Requirements: 1.1, 1.4, 1.5, 6.1
 */
export function useAppointmentNotifications(): void {
  // Track which appointments have already triggered notifications to prevent duplicates
  const notifiedAppointmentIds = useRef<Set<string>>(new Set());

  // Track the current date to detect day changes and reset notification state
  const currentDate = useRef<string>(new Date().toISOString().slice(0, 10));

  const navigate = useNavigate();

  // Fetch today's appointments
  const { appointments, setDate, refetch } = useAppointments();

  // Set the date filter to today on mount
  useEffect(() => {
    const today = new Date();
    setDate(today);
  }, [setDate]);

  // Refetch appointments every 30 seconds to pick up new appointments
  useEffect(() => {
    const refetchInterval = setInterval(() => {
      refetch({ silent: true });
    }, 30000); // Refetch every 30 seconds

    return () => clearInterval(refetchInterval);
  }, [refetch]);

  // Set up 60-second interval for time checking
  // Requirements: 1.2, 6.1
  useEffect(() => {
    // Function to check appointments and trigger notifications
    const checkAppointments = () => {
      // Extract current hour and minute
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Check for date change and reset notification tracking
      // Requirements: 1.5
      const today = now.toISOString().slice(0, 10);
      if (today !== currentDate.current) {
        // Date has changed - clear notified appointments and update date ref
        notifiedAppointmentIds.current.clear();
        currentDate.current = today;
      }

      // Filter appointments by status (only "pending" or "confirmed")
      // Requirements: 1.1, 4.1, 4.2, 6.2
      const relevantAppointments = appointments.filter(
        (appointment) =>
          appointment.status === 'pending' ||
          appointment.status === 'confirmed' ||
          appointment.status === 'scheduled'
      );

      // Loop through relevant appointments and check for time matches
      // Requirements: 1.3, 1.4, 5.1, 5.2
      relevantAppointments.forEach((appointment) => {
        // Skip if already notified
        if (notifiedAppointmentIds.current.has(appointment.id)) {
          return;
        }

        try {
          // Parse appointment scheduled_at to extract hour and minute
          const appointmentTime = new Date(appointment.scheduled_at);

          // Validate the parsed date
          if (isNaN(appointmentTime.getTime())) {
            console.error(
              `Invalid scheduled_at for appointment ${appointment.id}`
            );
            return;
          }

          const appointmentHour = appointmentTime.getHours();
          const appointmentMinute = appointmentTime.getMinutes();

          // Compare current time with appointment time (minute precision)
          const isTimeMatch =
            currentHour === appointmentHour &&
            currentMinute === appointmentMinute;

          if (isTimeMatch) {
            // Add appointment ID to Set to prevent duplicate notifications
            notifiedAppointmentIds.current.add(appointment.id);

            // Format patient name with fallback for missing names
            // Requirements: 2.2
            const patientName =
              [appointment.patient_first_name, appointment.patient_last_name]
                .filter(Boolean)
                .join(' ') || 'Patient';

            // Format scheduled time in "h:mm a" format (e.g., "2:30 PM")
            // Requirements: 2.3
            const formattedTime = appointmentTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            // Prepare toast options with description
            const toastOptions: any = {
              description: `${patientName} - ${formattedTime}`,
              duration: Infinity, // Toast persists until manually dismissed
              cancel: {
                label: 'Close',
                onClick: () => {}, // Close button
              },
            };

            // Add action button if patient_id is available
            // Requirements: 3.1, 3.2, 3.3, 3.4
            if (appointment.patient_id) {
              toastOptions.action = {
                label: 'View Patient',
                onClick: () =>
                  navigate(`/app/patients/${appointment.patient_id}`),
              };
            } else {
              console.warn(
                `Missing patient_id for appointment ${appointment.id}`
              );
            }

            // Trigger toast notification
            // Requirements: 2.1, 2.4
            toast('Appointment Time', toastOptions);
          }
        } catch (error) {
          // Handle time parsing errors gracefully
          console.error(
            `Error parsing scheduled_at for appointment ${appointment.id}:`,
            error
          );
        }
      });
    };

    // Run immediately on mount, then every 60 seconds
    checkAppointments();
    const intervalId = setInterval(checkAppointments, 60000);

    // Cleanup function to clear interval on unmount
    return () => clearInterval(intervalId);
  }, [appointments, navigate]);
}
