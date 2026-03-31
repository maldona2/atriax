# Requirements Document

## Introduction

This document specifies requirements for an intelligent appointment scheduling suggestion system that helps doctors schedule follow-up appointments at appropriate intervals based on treatment protocols and patient history. The system analyzes previous appointments, applied treatments, and treatment frequency recommendations to suggest optimal dates for new appointments.

## Glossary

- **Appointment_Scheduler**: The system component responsible for creating and managing appointments
- **Suggestion_Engine**: The system component that calculates recommended appointment dates based on treatment protocols
- **Treatment_Protocol**: The frequency guidelines defined for a treatment (initial phase and maintenance phase)
- **Patient_History**: The collection of previous appointments and treatments for a specific patient
- **Initial_Phase**: The first series of treatment sessions with a defined frequency (e.g., every 2 weeks for 6 sessions)
- **Maintenance_Phase**: The ongoing treatment sessions after the initial phase (e.g., every 4 weeks)
- **Suggested_Date**: A calculated date recommendation for scheduling the next appointment
- **Treatment_Frequency**: The number of weeks between treatment sessions
- **Session_Count**: The current session number in a patient's treatment progression

## Requirements

### Requirement 1: Display Suggested Appointment Date

**User Story:** As a doctor, I want to see a suggested date when creating a new appointment for a patient, so that I can schedule follow-ups at the appropriate intervals according to treatment protocols.

#### Acceptance Criteria

1. WHEN a patient is selected in the new appointment form, THE Suggestion_Engine SHALL calculate a suggested date based on the patient's treatment history
2. WHEN a suggested date is calculated, THE Appointment_Scheduler SHALL display the suggested date prominently in the appointment form
3. WHEN no previous appointments exist for the selected patient, THE Appointment_Scheduler SHALL display the current date as the default
4. WHEN the patient has previous appointments but no treatments with frequency protocols, THE Appointment_Scheduler SHALL display the current date as the default
5. THE Appointment_Scheduler SHALL allow the doctor to override the suggested date with any date they choose

### Requirement 2: Calculate Suggestions Based on Treatment Frequency

**User Story:** As a doctor, I want the system to consider treatment frequency protocols when suggesting dates, so that appointments are scheduled according to medical best practices.

#### Acceptance Criteria

1. WHEN calculating a suggested date, THE Suggestion_Engine SHALL retrieve all active patient treatments for the selected patient
2. FOR ALL active patient treatments with defined frequency protocols, THE Suggestion_Engine SHALL calculate the next appointment date based on the treatment phase
3. WHEN a patient treatment is in the initial phase, THE Suggestion_Engine SHALL use the initial_frequency_weeks value to calculate the next date
4. WHEN a patient treatment is in the maintenance phase, THE Suggestion_Engine SHALL use the maintenance_frequency_weeks value to calculate the next date
5. WHEN a patient treatment has completed all initial sessions, THE Suggestion_Engine SHALL transition to using the maintenance frequency

### Requirement 3: Determine Treatment Phase

**User Story:** As a doctor, I want the system to correctly identify whether a patient is in the initial or maintenance phase of treatment, so that the appropriate frequency is applied.

#### Acceptance Criteria

1. WHEN a patient treatment has initial_sessions_count defined, THE Suggestion_Engine SHALL compare the current_session to initial_sessions_count to determine the phase
2. WHEN current_session is less than or equal to initial_sessions_count, THE Suggestion_Engine SHALL classify the treatment as in the initial phase
3. WHEN current_session exceeds initial_sessions_count, THE Suggestion_Engine SHALL classify the treatment as in the maintenance phase
4. WHEN a treatment has no initial_sessions_count defined, THE Suggestion_Engine SHALL use the maintenance_frequency_weeks if available
5. WHEN a treatment has neither initial nor maintenance frequency defined, THE Suggestion_Engine SHALL exclude that treatment from date calculations

### Requirement 4: Handle Multiple Active Treatments

**User Story:** As a doctor, I want the system to handle patients with multiple active treatments, so that the suggested date accounts for all ongoing treatment protocols.

#### Acceptance Criteria

1. WHEN a patient has multiple active treatments with different frequencies, THE Suggestion_Engine SHALL calculate the suggested date for each treatment independently
2. WHEN multiple suggested dates are calculated, THE Suggestion_Engine SHALL select the earliest date as the primary suggestion
3. THE Suggestion_Engine SHALL prioritize treatments that are overdue or closest to their next scheduled session
4. WHEN all treatments have the same suggested date, THE Suggestion_Engine SHALL return that single date
5. THE Suggestion_Engine SHALL only consider treatments where is_active is true

### Requirement 5: Calculate Date from Last Appointment

**User Story:** As a doctor, I want the suggested date to be calculated from the patient's last appointment, so that the frequency intervals are maintained correctly.

#### Acceptance Criteria

1. WHEN calculating a suggested date, THE Suggestion_Engine SHALL retrieve the most recent completed appointment for the patient
2. WHEN a last appointment exists, THE Suggestion_Engine SHALL add the treatment frequency (in weeks) to the last appointment's scheduled_at date
3. WHEN no previous appointments exist, THE Suggestion_Engine SHALL calculate from the current date
4. THE Suggestion_Engine SHALL convert weeks to days by multiplying by 7
5. THE Suggestion_Engine SHALL return the calculated date in a format compatible with the appointment form date picker

### Requirement 6: Visual Indication of Suggested Date

**User Story:** As a doctor, I want to clearly see that a date is suggested by the system, so that I can distinguish between system suggestions and manually entered dates.

#### Acceptance Criteria

1. WHEN a suggested date is displayed, THE Appointment_Scheduler SHALL provide a visual indicator that the date is system-suggested
2. THE Appointment_Scheduler SHALL display explanatory text indicating why this date was suggested
3. WHEN the doctor modifies the suggested date, THE Appointment_Scheduler SHALL remove or update the visual indicator
4. THE Appointment_Scheduler SHALL maintain the suggested date in the form until the doctor explicitly changes it
5. THE Appointment_Scheduler SHALL preserve the doctor's ability to select any date regardless of the suggestion

### Requirement 7: Handle Edge Cases

**User Story:** As a doctor, I want the system to handle unusual situations gracefully, so that I can always create appointments even when data is incomplete.

#### Acceptance Criteria

1. WHEN a patient has no patient_treatments records, THE Suggestion_Engine SHALL return null or the current date
2. WHEN a patient treatment has a last_appointment_id that references a non-existent appointment, THE Suggestion_Engine SHALL calculate from the current date
3. WHEN treatment frequency values are null or zero, THE Suggestion_Engine SHALL exclude that treatment from calculations
4. WHEN the calculated suggested date is in the past, THE Suggestion_Engine SHALL return the current date instead
5. IF an error occurs during suggestion calculation, THEN THE Appointment_Scheduler SHALL default to the current date and log the error

### Requirement 8: Performance Requirements

**User Story:** As a doctor, I want the suggested date to appear quickly when I select a patient, so that my workflow is not interrupted.

#### Acceptance Criteria

1. WHEN a patient is selected, THE Suggestion_Engine SHALL calculate and display the suggested date within 500 milliseconds
2. THE Suggestion_Engine SHALL retrieve patient treatment data efficiently using appropriate database queries
3. THE Suggestion_Engine SHALL cache treatment protocol information to minimize database queries
4. WHEN multiple patients are selected in quick succession, THE Appointment_Scheduler SHALL cancel pending calculations for previously selected patients
5. THE Suggestion_Engine SHALL perform all date calculations on the client side to minimize server round trips
