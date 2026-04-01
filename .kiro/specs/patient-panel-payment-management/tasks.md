# Implementation Plan: Patient Panel Payment Management

## Overview

This implementation enhances the PatientDetailPanel component to enable direct payment status management for appointments. The approach reuses the existing TreatmentInfoSection component within appointment cards, adds payment status update handlers, and ensures proper event handling to prevent navigation conflicts.

## Tasks

- [ ] 1. Add payment status update state and handler to PatientDetailPanel
  - Add `updatingPaymentId` state to track which appointment is being updated
  - Implement `handlePaymentChange` async function that calls PUT `/appointments/:id` API
  - Handle success case: show toast, refetch patient data, clear updating state
  - Handle error case: show error toast, maintain previous status, clear updating state
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3_

- [ ]* 1.1 Write property test for payment status update API call
  - **Property 2: Payment Status Update API Call**
  - **Validates: Requirements 2.1**

- [ ] 2. Integrate TreatmentInfoSection into appointment cards
  - [ ] 2.1 Add conditional rendering of TreatmentInfoSection within appointment card Link
    - Check if `a.treatments?.length > 0 && a.total_amount_cents > 0`
    - Pass treatments, totalAmountCents, paymentStatus props
    - Pass `onPaymentChange` callback bound to appointment ID
    - Pass `isUpdating` prop based on `updatingPaymentId === a.id`
    - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 2.2 Wrap TreatmentInfoSection in click-prevention div
    - Add `onClick={(e) => e.preventDefault()}` to prevent navigation when clicking payment controls
    - Ensure clicks outside TreatmentInfoSection still navigate to appointment detail
    - _Requirements: 4.1, 4.2_

- [ ]* 2.3 Write property test for conditional payment control rendering
  - **Property 1: Conditional Payment Control Rendering**
  - **Validates: Requirements 1.1, 1.4**

- [ ]* 2.4 Write property test for navigation behavior
  - **Property 8: Navigation Preservation Outside Controls**
  - **Property 9: Navigation Prevention Within Controls**
  - **Validates: Requirements 4.1, 4.2**

- [ ] 3. Implement unpaid summary banner recalculation
  - Verify that refetch after payment status change updates unpaid appointments count
  - Verify that unpaid total amount recalculates correctly
  - _Requirements: 2.6, 5.2_

- [ ]* 3.1 Write property test for unpaid summary recalculation
  - **Property 6: Unpaid Summary Recalculation**
  - **Validates: Requirements 2.6**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 5. Add unit tests for payment status update flow
  - Test successful payment status update shows success toast
  - Test failed payment status update shows error toast and maintains status
  - Test loading state disables all payment buttons during update
  - Test refetch is called after successful update
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 5.1_

- [ ]* 5.1 Write property test for successful update UI synchronization
  - **Property 3: Successful Update UI Synchronization**
  - **Validates: Requirements 2.2, 2.3, 5.1, 5.2, 5.3**

- [ ]* 5.2 Write property test for failed update error handling
  - **Property 4: Failed Update Error Handling**
  - **Validates: Requirements 2.4**

- [ ]* 5.3 Write property test for loading state button disabling
  - **Property 5: Loading State Button Disabling**
  - **Validates: Requirements 2.5**

- [ ]* 6. Add unit tests for UI consistency
  - Test payment status controls use same styling as TreatmentInfoSection
  - Test payment status configuration matches paymentConfig constant
  - Test button states (active, disabled, hover) match AppointmentDetailPanel
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 6.1 Write property test for payment configuration consistency
  - **Property 7: Payment Configuration Consistency**
  - **Validates: Requirements 3.2**

- [ ]* 7. Add accessibility tests
  - Test keyboard navigation through payment status buttons
  - Test screen reader announcements for current payment status
  - Test disabled state communication to assistive technologies
  - Test color contrast ratios for payment status indicators
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 7.1 Write property test for keyboard navigation support
  - **Property 10: Keyboard Navigation Support**
  - **Validates: Requirements 6.1**

- [ ]* 7.2 Write property test for accessibility attribute presence
  - **Property 11: Accessibility Attribute Presence**
  - **Validates: Requirements 6.2, 6.3**

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- The TreatmentInfoSection component requires no modifications as it already supports the needed functionality
- Event handling strategy uses `e.preventDefault()` to prevent navigation when clicking payment controls
