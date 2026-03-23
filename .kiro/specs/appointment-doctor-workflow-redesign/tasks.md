# Implementation Plan: Appointment Doctor Workflow Redesign

## Overview

This implementation replaces the weekly calendar grid with a chronological appointment list optimized for doctor workflows. The new interface integrates appointment viewing, patient information, medical history, session documentation, and photo management into a unified experience with responsive layouts for desktop and mobile.

## Tasks

- [ ] 1. Set up core data types and API hooks
  - Create extended appointment types (AppointmentWithPatient, AppointmentDetailExtended, PreviousSession)
  - Implement useAppointmentDetail hook for fetching full appointment details
  - Implement useSessionPhotos hook for photo management
  - Implement usePatientSessions hook for medical history
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ] 2. Implement AppointmentListView component
  - [ ] 2.1 Create AppointmentListView with filtering controls
    - Implement date range picker for filtering
    - Implement status filter dropdown
    - Display appointment count badge
    - Add "New Appointment" button
    - _Requirements: 6.1, 6.2, 6.4, 10.4_
  
  - [ ] 2.2 Implement chronological sorting and boundary indicators
    - Sort appointments by scheduled_at ascending
    - Add data-first attribute to first appointment
    - Add data-last attribute to last appointment
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 2.3 Write property test for chronological ordering
    - **Property 1: Appointment List Chronological Ordering**
    - **Validates: Requirements 1.1**
  
  - [ ]* 2.4 Write property test for boundary indicators
    - **Property 2: Appointment List Boundary Indicators**
    - **Validates: Requirements 1.2, 1.3**

- [ ] 3. Implement AppointmentCard component
  - [ ] 3.1 Create AppointmentCard with required information
    - Display scheduled time in HH:MM format
    - Display patient name (first_name + last_name)
    - Display status badge with color coding
    - Show first/last indicators based on props
    - Implement selection highlighting
    - _Requirements: 1.4, 1.5_
  
  - [ ]* 3.2 Write property test for appointment card information
    - **Property 4: Appointment Card Required Information**
    - **Validates: Requirements 1.5**
  
  - [ ]* 3.3 Write property test for selection highlighting
    - **Property 3: Selected Appointment Highlighting**
    - **Validates: Requirements 1.4**

- [ ] 4. Implement AppointmentDetailPanel component structure
  - [ ] 4.1 Create AppointmentDetailPanel layout
    - Implement responsive layout (sidebar on desktop, overlay on mobile)
    - Add header with patient name and appointment time
    - Create section containers for all sub-components
    - Implement independent scroll behavior for desktop
    - Add close button for mobile overlay
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [ ] 4.2 Implement empty state handling
    - Show "Select an appointment" message when none selected
    - _Requirements: 10.2_

- [ ] 5. Checkpoint - Ensure basic layout and navigation works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement PatientInfoSection component
  - [ ] 6.1 Create PatientInfoSection with demographic display
    - Display patient name as heading
    - Display phone and email with icons
    - Calculate and display age from date_of_birth
    - Display general notes in expandable section
    - Handle missing optional fields gracefully
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 6.2 Write property test for patient information completeness
    - **Property 13: Patient Information Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 7. Implement SessionDocumentationForm component
  - [ ] 7.1 Create SessionDocumentationForm with editable fields
    - Implement procedures_performed textarea (required)
    - Implement recommendations textarea (optional)
    - Add auto-save on blur functionality
    - Implement manual save button
    - Show saving indicator during save
    - Handle session creation when sessionId is null
    - Handle session update when sessionId exists
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 7.2 Implement status controls and incomplete prompt
    - Display current appointment status prominently
    - Show "Mark as Completed" button for pending/confirmed appointments
    - Show "Confirm" button for pending appointments
    - Display prompt for incomplete documentation when status is not completed
    - Implement status update API calls
    - _Requirements: 2.4, 2.5, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 7.3 Write property test for session documentation persistence
    - **Property 5: Session Documentation Persistence**
    - **Validates: Requirements 2.3**
  
  - [ ]* 7.4 Write property test for incomplete appointment prompt
    - **Property 6: Incomplete Appointment Documentation Prompt**
    - **Validates: Requirements 2.5**
  
  - [ ]* 7.5 Write property test for status update persistence
    - **Property 27: Status Update Persistence**
    - **Validates: Requirements 9.5**

- [ ] 8. Implement PhotoUploadComponent
  - [ ] 8.1 Create PhotoUploadComponent with upload functionality
    - Implement file input with MIME type validation (image/jpeg, image/png, image/webp)
    - Implement file size validation (< 10MB)
    - Implement presigned URL request flow
    - Implement S3 upload with progress indicator
    - Implement upload confirmation API call
    - Disable upload when sessionId is null with message
    - _Requirements: 3.2, 3.3, 3.6_
  
  - [ ] 8.2 Create photo display grid
    - Display photos in responsive grid (2-3 columns)
    - Show photo thumbnails with file names and timestamps
    - Implement photo click to open full-size viewer modal
    - Handle empty state when no photos exist
    - _Requirements: 3.1, 3.4, 3.5, 7.4_
  
  - [ ]* 8.3 Write property test for MIME type validation
    - **Property 8: Photo Upload MIME Type Validation**
    - **Validates: Requirements 3.2**
  
  - [ ]* 8.4 Write property test for file size validation
    - **Property 9: Photo Upload Size Validation**
    - **Validates: Requirements 3.3**
  
  - [ ]* 8.5 Write property test for photo display
    - **Property 7: Session Photos Display**
    - **Validates: Requirements 3.1**

- [ ] 9. Checkpoint - Ensure session documentation and photos work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement TreatmentInfoSection component
  - [ ] 10.1 Create TreatmentInfoSection with treatment display
    - Display list of treatments with name, quantity, unit price
    - Format prices as currency
    - Display total_amount_cents formatted
    - Display payment_status badge
    - Conditionally render section only when treatments exist
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 10.2 Write property test for treatment information display
    - **Property 23: Treatment Information Display**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
  
  - [ ]* 10.3 Write property test for conditional treatment section display
    - **Property 24: Treatment Section Conditional Display**
    - **Validates: Requirements 8.5**

- [ ] 11. Implement MedicalHistorySection component
  - [ ] 11.1 Create MedicalHistorySection with previous sessions
    - Fetch previous sessions for patient (excluding current session)
    - Sort sessions in reverse chronological order
    - Display appointment date, procedures_performed, recommendations for each session
    - Display patient general notes
    - Show "First visit" message when no previous sessions exist
    - Implement expandable session cards for full details
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 11.2 Write property test for previous sessions display
    - **Property 14: Previous Sessions Display**
    - **Validates: Requirements 5.1**
  
  - [ ]* 11.3 Write property test for previous sessions ordering
    - **Property 15: Previous Sessions Chronological Ordering**
    - **Validates: Requirements 5.2**
  
  - [ ]* 11.4 Write property test for session information completeness
    - **Property 16: Previous Session Information Completeness**
    - **Validates: Requirements 5.3**

- [ ] 12. Implement filtering and state management
  - [ ] 12.1 Wire up appointment filtering logic
    - Implement date range filter application
    - Implement status filter application
    - Combine filters to show only matching appointments
    - Update appointment count when filters change
    - Persist filter state during appointment navigation
    - Handle empty state when no appointments match filters
    - _Requirements: 6.3, 6.4, 6.5, 10.1_
  
  - [ ]* 12.2 Write property test for filtering behavior
    - **Property 18: Appointment Filtering Behavior**
    - **Validates: Requirements 6.3**
  
  - [ ]* 12.3 Write property test for appointment count accuracy
    - **Property 19: Appointment Count Accuracy**
    - **Validates: Requirements 6.4**
  
  - [ ]* 12.4 Write property test for filter state persistence
    - **Property 20: Filter State Persistence**
    - **Validates: Requirements 6.5**

- [ ] 13. Implement backend API endpoints
  - [ ] 13.1 Create GET /appointments/:id/detail endpoint
    - Join patient info, session, treatments, photos, previous sessions
    - Return AppointmentDetailExtended structure
    - Enforce tenant isolation
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 8.1_
  
  - [ ] 13.2 Create POST /sessions endpoint
    - Accept appointment_id, patient_id, procedures_performed, recommendations
    - Create new session record
    - Validate appointment belongs to tenant
    - Prevent duplicate session creation
    - _Requirements: 2.3_
  
  - [ ] 13.3 Create PUT /sessions/:id endpoint
    - Accept procedures_performed, recommendations
    - Update existing session
    - Validate session belongs to tenant
    - _Requirements: 2.3_
  
  - [ ] 13.4 Create GET /session-photos endpoint
    - Accept session_id query parameter
    - Return photos with presigned download URLs (1 hour expiration)
    - Validate session belongs to tenant
    - _Requirements: 3.1_
  
  - [ ] 13.5 Create POST /session-photos/upload endpoint
    - Accept session_id, file_name, file_size_bytes, mime_type
    - Validate MIME type and file size
    - Generate presigned PUT URL for S3
    - Return photo_id, presigned_url, s3_key
    - _Requirements: 3.2, 3.3, 3.6_
  
  - [ ] 13.6 Create POST /session-photos/confirm endpoint
    - Accept photo_id
    - Update photo status to confirmed
    - Set uploaded_at timestamp
    - _Requirements: 3.6_
  
  - [ ] 13.7 Create GET /patients/:id/sessions endpoint
    - Accept exclude_session_id query parameter
    - Return previous sessions ordered by date DESC
    - Validate patient belongs to tenant
    - _Requirements: 5.1, 5.2_

- [ ] 14. Checkpoint - Ensure backend integration works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement error handling and loading states
  - [ ] 15.1 Add client-side validation and error handling
    - Validate photo MIME type before upload
    - Validate photo file size before upload
    - Display error messages for validation failures
    - Prevent duplicate save operations
    - Show toast notifications for API failures
    - Implement retry logic for photo uploads
    - _Requirements: 3.2, 3.3_
  
  - [ ] 15.2 Add loading and empty states
    - Show skeleton cards while appointments load
    - Show skeleton layout while detail panel loads
    - Show progress indicator during photo upload
    - Show saving indicator during session save
    - Display empty state messages appropriately
    - _Requirements: 10.1, 10.2_

- [ ] 16. Implement responsive behavior and accessibility
  - [ ] 16.1 Add responsive layout breakpoints
    - Implement single-column layout for < 768px
    - Implement sidebar layout for >= 768px
    - Make session panel overlay on mobile
    - Ensure independent scroll on desktop
    - Make photo grid responsive
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 16.2 Add accessibility features
    - Add ARIA labels for interactive elements
    - Ensure keyboard navigation works
    - Add focus management for modals
    - Ensure color contrast meets WCAG standards
    - Add screen reader announcements for status changes

- [ ] 17. Wire everything together in AppointmentsPage
  - [ ] 17.1 Replace calendar grid with chronological list view
    - Remove weekly calendar grid components
    - Add AppointmentListView component
    - Add AppointmentDetailPanel component
    - Wire up appointment selection state
    - Wire up filter state management
    - Implement new appointment creation flow with auto-selection
    - _Requirements: 1.1, 6.1, 6.2, 10.3, 10.5_
  
  - [ ]* 17.2 Write property test for new appointment auto-selection
    - **Property 28: New Appointment Auto-Selection**
    - **Validates: Requirements 10.3**
  
  - [ ]* 17.3 Write integration tests for complete workflows
    - Test appointment selection flow
    - Test session documentation flow
    - Test photo upload flow
    - Test filter application flow
    - Test status update flow

- [ ] 18. Final checkpoint - Ensure all functionality works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- The implementation uses TypeScript/React with existing shadcn/ui components
- Backend uses existing Node.js/Express patterns with Drizzle ORM
- Photo uploads use S3 presigned URLs for security
- All API endpoints enforce tenant isolation for multi-tenancy
