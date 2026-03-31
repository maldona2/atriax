# Implementation Plan: Appointment Scheduling Suggestions

## Overview

This implementation plan breaks down the appointment scheduling suggestions feature into discrete coding tasks. The feature adds intelligent date suggestions to the appointment creation form by calculating recommended dates based on patient treatment protocols and history. All logic is implemented client-side using TypeScript and React hooks.

## Tasks

- [ ] 1. Create the useSuggestedAppointmentDate hook
  - Create `frontend/src/hooks/useSuggestedAppointmentDate.ts`
  - Implement hook interface with patientId parameter and enabled option
  - Implement return type with suggestedDate, loading, error, and calculationDetails
  - Add AbortController for request cancellation on patient change
  - _Requirements: 1.1, 8.4, 8.5_

- [ ] 2. Implement core suggestion calculation logic
  - [ ] 2.1 Implement patient treatments fetching
    - Fetch patient treatments from `/patient-treatments/patient/:patientId` endpoint
    - Handle loading and error states
    - Filter to active treatments only (is_active = true)
    - _Requirements: 2.1, 4.5_

  - [ ] 2.2 Implement treatment phase determination
    - Create helper function to determine if treatment is in initial or maintenance phase
    - Compare current_session with initial_sessions_count
    - Return appropriate frequency (initial_frequency_weeks or maintenance_frequency_weeks)
    - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

  - [ ] 2.3 Implement date calculation for single treatment
    - Create helper function to calculate suggested date from a single patient treatment
    - Retrieve last appointment date if last_appointment_id exists
    - Add frequency weeks to base date (last appointment or current date)
    - Handle past dates by returning current date instead
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.4_

  - [ ] 2.4 Implement multi-treatment date selection
    - Calculate suggested date for each active treatment with defined frequency
    - Collect all calculated dates into an array
    - Select the earliest date from the array
    - Store calculation details (treatment name, phase, frequency)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 2.5 Write property test for active treatments filter
    - **Property 4: Active treatments filter**
    - **Validates: Requirements 2.1, 4.5**
    - Generate random arrays of patient treatments with varying is_active flags
    - Verify only treatments with is_active = true are included in calculations

  - [ ]* 2.6 Write property test for phase-appropriate frequency selection
    - **Property 6: Phase-appropriate frequency selection**
    - **Validates: Requirements 2.3, 2.4, 2.5**
    - Generate random patient treatments with varying session counts and frequencies
    - Verify initial phase uses initial_frequency_weeks, maintenance uses maintenance_frequency_weeks

  - [ ]* 2.7 Write property test for phase classification
    - **Property 7: Phase classification by session count**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Generate random current_session and initial_sessions_count values
    - Verify phase classification matches the comparison logic

- [ ] 3. Implement error handling and edge cases
  - [ ] 3.1 Add error handling for API failures
    - Wrap API calls in try-catch blocks
    - Set error state on failure
    - Return null for suggestedDate on error
    - Log errors to console for debugging
    - _Requirements: 7.5_

  - [ ] 3.2 Handle missing or invalid data
    - Return null when patient has no active treatments
    - Skip treatments with null or zero frequency values
    - Handle missing last_appointment_id by using current date
    - Return null when all treatments lack protocols
    - _Requirements: 7.1, 7.2, 7.3, 3.5_

  - [ ]* 3.3 Write property test for treatments without protocols
    - **Property 8: Treatments without protocols are excluded**
    - **Validates: Requirements 3.5, 7.3**
    - Generate patient treatments where both frequencies are null or zero
    - Verify these treatments don't contribute to suggested date calculation

  - [ ]* 3.4 Write property test for past date handling
    - **Property 17: Past date handling**
    - **Validates: Requirements 7.4**
    - Generate random last appointment dates in the past with various frequencies
    - Verify when calculated date < current date, system returns current date

  - [ ]* 3.5 Write unit tests for edge cases
    - Test empty patient treatments array returns null
    - Test all inactive treatments returns null
    - Test invalid last_appointment_id falls back to current date
    - Test API failure returns null and sets error state

- [ ] 4. Create the SuggestedDateIndicator component
  - Create `frontend/src/components/appointments/SuggestedDateIndicator.tsx`
  - Implement component interface with calculationDetails and isModified props
  - Display treatment name and frequency information
  - Show different styling when user has modified the suggested date
  - Use Spanish text for all UI labels
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 5. Integrate suggestion logic into NewAppointmentSheet
  - [ ] 5.1 Add useSuggestedAppointmentDate hook to NewAppointmentSheet
    - Import and call the hook with form.patient_id
    - Store suggestedDate and calculationDetails in component state
    - _Requirements: 1.1_

  - [ ] 5.2 Update form date when suggestion is calculated
    - Use useEffect to update form.date when suggestedDate changes
    - Only update if user hasn't manually modified the date
    - Track modification state with a boolean flag
    - _Requirements: 1.2, 6.4_

  - [ ] 5.3 Add SuggestedDateIndicator to the form
    - Import and render SuggestedDateIndicator component
    - Position it near the date picker
    - Pass calculationDetails and isModified props
    - _Requirements: 6.1, 6.2_

  - [ ] 5.4 Track user modifications to suggested date
    - Add onChange handler to date picker
    - Set modification flag when user changes date
    - Reset modification flag when patient changes
    - _Requirements: 6.3, 6.4_

  - [ ]* 5.5 Write property test for suggestion triggers on patient selection
    - **Property 1: Suggestion triggers on patient selection**
    - **Validates: Requirements 1.1**
    - Generate random patient selections
    - Verify system initiates calculation that produces suggested date or null

  - [ ]* 5.6 Write property test for calculated suggestions populate form
    - **Property 2: Calculated suggestions populate the form**
    - **Validates: Requirements 1.2**
    - Generate successful suggested date calculations
    - Verify appointment form's date field is populated with calculated value

  - [ ]* 5.7 Write property test for date picker editability
    - **Property 3: Date picker remains editable**
    - **Validates: Requirements 1.5, 6.5**
    - Generate suggested dates displayed in form
    - Verify date picker remains fully editable and accepts any user-selected date

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Add property-based tests for calculation properties
  - [ ]* 7.1 Write property test for independent calculation per treatment
    - **Property 9: Independent calculation per treatment**
    - **Validates: Requirements 4.1**
    - Generate patients with multiple active treatments
    - Verify each treatment's calculation is independent

  - [ ]* 7.2 Write property test for earliest date selection
    - **Property 10: Earliest date selection**
    - **Validates: Requirements 4.2, 4.3**
    - Generate random sets of treatments with different frequencies
    - Verify returned suggestion is always the earliest calculated date

  - [ ]* 7.3 Write property test for last appointment date retrieval
    - **Property 11: Last appointment date retrieval**
    - **Validates: Requirements 5.1**
    - Generate patient treatments with last_appointment_id
    - Verify system retrieves appointment's scheduled_at date for calculation base

  - [ ]* 7.4 Write property test for date calculation from last appointment
    - **Property 12: Date calculation from last appointment**
    - **Validates: Requirements 5.2, 5.4**
    - Generate random last appointment dates and frequency values
    - Verify suggested date = last appointment date + (frequency * 7 days)

  - [ ]* 7.5 Write property test for date format compatibility
    - **Property 13: Date format compatibility**
    - **Validates: Requirements 5.5**
    - Generate calculated suggested dates
    - Verify returned value is valid JavaScript Date object compatible with date picker

- [ ] 8. Add property-based tests for UI properties
  - [ ]* 8.1 Write property test for explanatory text generation
    - **Property 14: Explanatory text generation**
    - **Validates: Requirements 6.2**
    - Generate calculated suggested dates with treatment info
    - Verify system generates explanatory text with treatment name and frequency

  - [ ]* 8.2 Write property test for modification tracking
    - **Property 15: Modification tracking**
    - **Validates: Requirements 6.3**
    - Generate suggested dates in form and user date changes
    - Verify system updates modification flag when user overrides suggestion

  - [ ]* 8.3 Write property test for suggestion persistence
    - **Property 16: Suggestion persistence until modification**
    - **Validates: Requirements 6.4**
    - Generate suggested dates set in form
    - Verify date remains until user explicitly changes it or selects different patient

  - [ ]* 8.4 Write property test for error handling with graceful fallback
    - **Property 18: Error handling with graceful fallback**
    - **Validates: Requirements 7.5**
    - Generate errors during suggestion calculation
    - Verify system catches error, logs it, and returns current date as fallback

  - [ ]* 8.5 Write property test for request cancellation
    - **Property 19: Request cancellation on patient change**
    - **Validates: Requirements 8.4**
    - Generate pending suggestion calculations with patient changes
    - Verify system cancels previous calculation request

- [ ] 9. Performance optimization
  - [ ] 9.1 Add memoization to calculation functions
    - Use React.useMemo for expensive calculations
    - Memoize helper functions that don't depend on changing state
    - _Requirements: 8.2, 8.3_

  - [ ] 9.2 Implement request debouncing if needed
    - Test rapid patient selection changes
    - Add debouncing if performance issues are observed
    - _Requirements: 8.1, 8.4_

- [ ] 10. Accessibility and localization
  - [ ] 10.1 Add accessibility features
    - Add ARIA labels to SuggestedDateIndicator
    - Ensure screen reader announces suggestion text
    - Verify keyboard navigation works correctly
    - Test with screen reader to confirm announcements

  - [ ] 10.2 Verify Spanish localization
    - Confirm all UI text is in Spanish
    - Use date-fns with Spanish locale for date formatting
    - Test date display formats match application standards

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The feature is entirely client-side, requiring no backend changes
- All date calculations use date-fns library for consistency with existing codebase
