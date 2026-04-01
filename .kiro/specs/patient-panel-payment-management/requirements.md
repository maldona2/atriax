# Requirements Document

## Introduction

This feature enhances the PatientDetailPanel component to allow users to update payment status for appointments directly from the patient detail view. Currently, users can see payment status badges and unpaid appointment summaries, but must navigate to the AppointmentDetailPanel to change payment status. This feature brings payment management functionality to the patient context, improving workflow efficiency.

## Glossary

- **PatientDetailPanel**: The UI component that displays detailed information about a patient, including their appointments, medical history, and contact information
- **AppointmentDetailPanel**: The UI component that displays detailed information about a specific appointment
- **Payment_Status**: An enumerated value representing the payment state of an appointment (unpaid, paid, partial, refunded)
- **TreatmentInfoSection**: A reusable UI component that displays treatment details and payment status with interactive payment status controls
- **Appointment_Card**: A clickable card element within the PatientDetailPanel that displays appointment information including date, status, and payment status
- **Payment_Status_Control**: Interactive UI elements (buttons) that allow users to change the payment status of an appointment

## Requirements

### Requirement 1: Display Payment Status Controls

**User Story:** As a clinic administrator, I want to see payment status controls for each appointment in the patient detail panel, so that I can quickly update payment status without navigating away from the patient view.

#### Acceptance Criteria

1. WHEN an appointment has associated treatments with a total amount, THE PatientDetailPanel SHALL display payment status controls for that appointment
2. THE Payment_Status_Control SHALL display all available payment status options (unpaid, paid, partial, refunded)
3. THE Payment_Status_Control SHALL visually indicate the current payment status
4. WHEN an appointment has no treatments or zero total amount, THE PatientDetailPanel SHALL display the payment status as a read-only badge

### Requirement 2: Update Payment Status

**User Story:** As a clinic administrator, I want to change an appointment's payment status from the patient detail panel, so that I can record payments efficiently while reviewing patient information.

#### Acceptance Criteria

1. WHEN a user clicks a payment status button, THE PatientDetailPanel SHALL send an API request to update the appointment's payment status
2. WHEN the payment status update succeeds, THE PatientDetailPanel SHALL update the UI to reflect the new payment status
3. WHEN the payment status update succeeds, THE PatientDetailPanel SHALL display a success notification
4. IF the payment status update fails, THEN THE PatientDetailPanel SHALL display an error notification and maintain the previous payment status
5. WHILE a payment status update is in progress, THE Payment_Status_Control SHALL disable all payment status buttons
6. WHEN the payment status changes, THE PatientDetailPanel SHALL recalculate and update the unpaid appointments summary banner

### Requirement 3: Maintain UI Consistency

**User Story:** As a clinic administrator, I want the payment status controls in the patient panel to look and behave the same as in the appointment panel, so that I have a consistent experience across the application.

#### Acceptance Criteria

1. THE Payment_Status_Control SHALL use the same visual styling as the TreatmentInfoSection component
2. THE Payment_Status_Control SHALL use the same payment status configuration (labels, colors) as defined in the paymentConfig constant
3. THE Payment_Status_Control SHALL display payment status buttons in the same order as the AppointmentDetailPanel
4. THE Payment_Status_Control SHALL use the same button states (active, disabled, hover) as the TreatmentInfoSection component

### Requirement 4: Preserve Existing Navigation

**User Story:** As a clinic administrator, I want to still be able to navigate to the full appointment details, so that I can access all appointment information when needed.

#### Acceptance Criteria

1. WHEN a user clicks on an appointment card outside the payment status controls, THE PatientDetailPanel SHALL navigate to the appointment detail page
2. WHEN a user clicks on a payment status button, THE PatientDetailPanel SHALL NOT navigate to the appointment detail page
3. THE Appointment_Card SHALL maintain its existing visual design and hover states

### Requirement 5: Handle Concurrent Updates

**User Story:** As a clinic administrator, I want the payment status to remain accurate even if multiple users are viewing the same patient, so that payment records are reliable.

#### Acceptance Criteria

1. WHEN the payment status update succeeds, THE PatientDetailPanel SHALL refetch the patient's appointment data
2. WHEN the appointment data is refetched, THE PatientDetailPanel SHALL update all displayed payment information including the unpaid summary banner
3. THE PatientDetailPanel SHALL display the most recent payment status from the server after each update

### Requirement 6: Maintain Accessibility

**User Story:** As a clinic administrator using assistive technology, I want the payment status controls to be accessible, so that I can manage payments effectively.

#### Acceptance Criteria

1. THE Payment_Status_Control SHALL provide keyboard navigation support for all payment status buttons
2. THE Payment_Status_Control SHALL announce the current payment status to screen readers
3. WHEN a payment status button is disabled, THE Payment_Status_Control SHALL communicate the disabled state to assistive technologies
4. THE Payment_Status_Control SHALL maintain sufficient color contrast ratios for all payment status indicators
