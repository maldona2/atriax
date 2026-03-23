# Requirements Document

## Introduction

This document specifies requirements for redesigning the appointments page to create a doctor-focused workflow interface. The current weekly calendar view will be replaced with a chronological appointment list that integrates patient information, medical records, session documentation, and photo uploads into a unified workflow. The goal is to simplify the doctor's experience by providing clear appointment ordering and consolidating all relevant patient data in one place.

## Glossary

- **Appointment_List_View**: The main interface component displaying appointments in chronological order
- **Appointment_Card**: A UI component representing a single appointment with patient summary
- **Session_Panel**: The detailed view for documenting a specific appointment session
- **Medical_Record_Section**: The area displaying patient medical history and notes
- **Photo_Upload_Component**: The interface for uploading and managing session photos
- **Patient_Info_Section**: The area displaying patient demographic and contact information
- **Chronological_Indicator**: Visual elements showing appointment sequence (first, last, position)

## Requirements

### Requirement 1: Chronological Appointment Display

**User Story:** As a doctor, I want to see my appointments in chronological order with clear indicators of which is first and last, so that I can easily understand my schedule flow.

#### Acceptance Criteria

1. THE Appointment_List_View SHALL display appointments sorted by scheduled_at timestamp in ascending order
2. THE Appointment_List_View SHALL display a visual indicator on the first appointment of the day
3. THE Appointment_List_View SHALL display a visual indicator on the last appointment of the day
4. WHEN an appointment is selected, THE Appointment_List_View SHALL highlight the selected appointment
5. THE Appointment_Card SHALL display the scheduled time, patient name, and appointment status

### Requirement 2: Integrated Session Documentation

**User Story:** As a doctor, I want to record session notes and procedures in the same interface where I view appointments, so that I can efficiently document patient visits.

#### Acceptance Criteria

1. WHEN an appointment is selected, THE Session_Panel SHALL display editable fields for procedures_performed
2. WHEN an appointment is selected, THE Session_Panel SHALL display editable fields for recommendations
3. WHEN session documentation is saved, THE Session_Panel SHALL create or update a session record linked to the appointment
4. THE Session_Panel SHALL display the appointment status and allow status updates
5. IF the appointment status is not "completed", THEN THE Session_Panel SHALL show a prompt to complete documentation

### Requirement 3: Session Photo Management

**User Story:** As a doctor, I want to upload and view session photos directly from the appointment interface, so that I can maintain visual records of patient progress.

#### Acceptance Criteria

1. WHEN an appointment is selected, THE Photo_Upload_Component SHALL display existing session photos for that appointment
2. THE Photo_Upload_Component SHALL allow uploading new photos with mime types image/jpeg, image/png, or image/webp
3. WHEN a photo is uploaded, THE Photo_Upload_Component SHALL validate the file size is less than 10MB
4. THE Photo_Upload_Component SHALL display photo thumbnails with file names and upload timestamps
5. WHEN a photo thumbnail is clicked, THE Photo_Upload_Component SHALL display the full-size image
6. THE Photo_Upload_Component SHALL link uploaded photos to the session_id associated with the appointment

### Requirement 4: Patient Information Display

**User Story:** As a doctor, I want to see patient demographic information and contact details when viewing an appointment, so that I have context for the patient visit.

#### Acceptance Criteria

1. WHEN an appointment is selected, THE Patient_Info_Section SHALL display the patient's first_name and last_name
2. THE Patient_Info_Section SHALL display the patient's phone number if available
3. THE Patient_Info_Section SHALL display the patient's email if available
4. THE Patient_Info_Section SHALL display the patient's date_of_birth if available
5. THE Patient_Info_Section SHALL display the patient's general notes if available

### Requirement 5: Medical History Access

**User Story:** As a doctor, I want to view the patient's medical history and previous session notes when reviewing an appointment, so that I can provide informed care.

#### Acceptance Criteria

1. WHEN an appointment is selected, THE Medical_Record_Section SHALL display all previous sessions for that patient
2. THE Medical_Record_Section SHALL display sessions in reverse chronological order (most recent first)
3. FOR EACH previous session, THE Medical_Record_Section SHALL display the appointment date, procedures_performed, and recommendations
4. THE Medical_Record_Section SHALL display the patient's general notes from the patients table
5. WHEN no previous sessions exist, THE Medical_Record_Section SHALL display a message indicating this is the first visit

### Requirement 6: Appointment Filtering and Navigation

**User Story:** As a doctor, I want to filter appointments by date and status, so that I can focus on relevant appointments.

#### Acceptance Criteria

1. THE Appointment_List_View SHALL provide a date picker to filter appointments by date range
2. THE Appointment_List_View SHALL provide a status filter with options: all, pending, confirmed, completed, cancelled
3. WHEN a filter is applied, THE Appointment_List_View SHALL update to show only matching appointments
4. THE Appointment_List_View SHALL display a count of visible appointments
5. THE Appointment_List_View SHALL maintain filter state when navigating between appointments

### Requirement 7: Responsive Layout Design

**User Story:** As a doctor, I want the interface to work well on different screen sizes, so that I can use it on tablets or desktop computers.

#### Acceptance Criteria

1. WHEN the viewport width is less than 768px, THE Appointment_List_View SHALL display in a single-column layout
2. WHEN the viewport width is 768px or greater, THE Appointment_List_View SHALL display appointments in a sidebar with the Session_Panel in the main area
3. THE Session_Panel SHALL scroll independently from the Appointment_List_View on larger screens
4. THE Photo_Upload_Component SHALL display photos in a responsive grid that adapts to available width
5. WHEN the viewport width is less than 768px, THE Session_Panel SHALL overlay the Appointment_List_View when an appointment is selected

### Requirement 8: Treatment Information Display

**User Story:** As a doctor, I want to see what treatments are associated with an appointment, so that I know what procedures are planned or completed.

#### Acceptance Criteria

1. WHEN an appointment is selected, THE Session_Panel SHALL display associated treatments
2. FOR EACH treatment, THE Session_Panel SHALL display the treatment_name, quantity, and unit_price_cents
3. THE Session_Panel SHALL display the total_amount_cents for the appointment
4. THE Session_Panel SHALL display the payment_status for the appointment
5. WHERE treatments are associated with the appointment, THE Session_Panel SHALL display a treatments summary section

### Requirement 9: Quick Appointment Status Updates

**User Story:** As a doctor, I want to quickly update appointment status, so that I can mark appointments as completed or cancelled without extensive navigation.

#### Acceptance Criteria

1. THE Session_Panel SHALL display the current appointment status prominently
2. THE Session_Panel SHALL provide quick action buttons for common status transitions
3. WHEN the status is "pending" or "confirmed", THE Session_Panel SHALL show a "Mark as Completed" button
4. WHEN the status is "pending", THE Session_Panel SHALL show a "Confirm" button
5. WHEN a status update button is clicked, THE Session_Panel SHALL update the appointment status and refresh the display

### Requirement 10: Empty State Handling

**User Story:** As a doctor, I want clear guidance when there are no appointments or when I haven't selected an appointment, so that I understand what to do next.

#### Acceptance Criteria

1. WHEN no appointments match the current filters, THE Appointment_List_View SHALL display a message indicating no appointments found
2. WHEN no appointment is selected, THE Session_Panel SHALL display a message prompting to select an appointment
3. WHEN a new appointment is created, THE Appointment_List_View SHALL automatically select and display the new appointment
4. THE Appointment_List_View SHALL provide a "New Appointment" button that is always visible
5. WHEN the "New Appointment" button is clicked, THE Appointment_List_View SHALL open the appointment creation interface
