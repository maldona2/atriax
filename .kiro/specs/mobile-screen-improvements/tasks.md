# Implementation Plan: Mobile Screen Improvements

## Overview

This implementation plan transforms three critical screens (Patients List, Profile Treatments tab, and Debt Dashboard) into mobile-responsive interfaces using React 19, TypeScript, and Tailwind CSS 4.0. The approach follows a mobile-first strategy, converting desktop table layouts into card-based mobile layouts while maintaining all functionality. Implementation uses existing shadcn/ui components extended with mobile variants, ensuring 44x44px minimum touch targets, and optimizing performance for mobile devices.

## Tasks

- [ ] 1. Create mobile card components foundation
  - [ ] 1.1 Create PatientCard component
    - Create `frontend/src/components/patients/PatientCard.tsx`
    - Implement card layout with patient name, phone, and payment status
    - Add visual indicator for unpaid appointments (badge with count and amount)
    - Ensure 44x44px minimum touch target for entire card
    - Add tap handler for navigation to patient detail
    - Use Tailwind responsive classes (hidden on md: breakpoint and above)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ]* 1.2 Write property test for PatientCard touch targets
    - **Property 1: Universal Touch Target Minimum Size**
    - **Validates: Requirements 1.4**
  
  - [ ] 1.3 Create TreatmentCard component
    - Create `frontend/src/components/treatments/TreatmentCard.tsx`
    - Implement vertical stack layout with treatment name, price, and action buttons
    - Ensure edit and delete buttons are 44x44px minimum
    - Format currency display using existing utility functions
    - Add proper spacing between action buttons (8px minimum)
    - _Requirements: 2.3, 2.4_
  
  - [ ]* 1.4 Write property test for TreatmentCard layout
    - **Property 7: Treatment Card Layout**
    - **Validates: Requirements 2.3**
  
  - [ ] 1.5 Create PaymentHistoryCard component
    - Create `frontend/src/components/debt-dashboard/PaymentHistoryCard.tsx`
    - Display patient name, debt summary, and payment status
    - Add color-coded payment status badge
    - Implement tap handler to open appointment sheet
    - Ensure 44x44px minimum touch target
    - _Requirements: 3.4, 3.5, 3.6_
  
  - [ ]* 1.6 Write unit tests for card components
    - Test PatientCard with unpaid appointments
    - Test TreatmentCard with long names
    - Test PaymentHistoryCard with different payment statuses
    - Test empty state handling

- [ ] 2. Implement mobile navigation and dialog components
  - [ ] 2.1 Create MobileTabNavigation component
    - Create `frontend/src/components/ui/MobileTabNavigation.tsx`
    - Display tabs with icons only on mobile (< 640px)
    - Show abbreviated labels on tablet (640px - 767px)
    - Enable horizontal scrolling if tabs overflow
    - Maintain 44x44px touch targets for all tabs
    - _Requirements: 2.1, 3.3, 4.4_
  
  - [ ] 2.2 Create MobileFormDialog component
    - Create `frontend/src/components/ui/MobileFormDialog.tsx`
    - Render as full-screen overlay on mobile (< 768px)
    - Render as centered dialog on desktop (≥ 768px)
    - Stack form fields vertically with full-width inputs on mobile
    - Position action buttons in fixed footer on mobile
    - Implement scrollIntoView for active inputs to prevent keyboard obstruction
    - _Requirements: 2.5, 2.6, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 2.3 Write property test for dialog responsive behavior
    - **Property 19: Dialog Full-Screen Rendering**
    - **Validates: Requirements 2.5, 6.1**
  
  - [ ] 2.4 Create MobileFilterPanel component
    - Create `frontend/src/components/ui/MobileFilterPanel.tsx`
    - Implement collapsible panel for mobile
    - Stack filter controls vertically
    - Provide "Apply" and "Clear" action buttons
    - Maintain filter state across open/close
    - _Requirements: 3.7_
  
  - [ ]* 2.5 Write unit tests for navigation and dialog components
    - Test tab navigation with different viewport widths
    - Test dialog full-screen behavior
    - Test filter panel expand/collapse

- [ ] 3. Checkpoint - Verify component foundation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Transform PatientsPage to mobile-responsive layout
  - [ ] 4.1 Add responsive layout switching to PatientsPage
    - Modify `frontend/src/pages/PatientsPage.tsx`
    - Add viewport width detection using window.innerWidth or CSS media queries
    - Render PatientCard list on mobile (< 768px)
    - Keep existing table layout on desktop (≥ 768px)
    - Implement single-column card layout on mobile
    - _Requirements: 1.1, 2.2_
  
  - [ ] 4.2 Optimize PatientsPage header for mobile
    - Stack "Nuevo paciente" button below title on mobile (< 640px)
    - Reduce header padding and font sizes on mobile
    - Truncate long page titles with ellipsis
    - Ensure back buttons and action buttons are 44x44px
    - _Requirements: 1.6, 4.1, 4.2, 4.4, 4.5_
  
  - [ ] 4.3 Enhance patient search for mobile
    - Ensure search input has 44px minimum height
    - Use appropriate input type attributes for mobile keyboards
    - Maintain search functionality on mobile
    - _Requirements: 1.7, 6.6_
  
  - [ ] 4.4 Update PatientFormDialog for mobile
    - Integrate MobileFormDialog component
    - Stack form fields vertically on mobile
    - Use appropriate input types (tel, email, date)
    - Ensure all inputs are 44px minimum height
    - _Requirements: 6.1, 6.2, 6.3, 6.6_
  
  - [ ]* 4.5 Write property tests for PatientsPage mobile layout
    - **Property 15: Table to Card Transformation**
    - **Property 8: Single-Column Layout on Mobile**
    - **Validates: Requirements 1.1, 2.2**
  
  - [ ]* 4.6 Write integration tests for PatientsPage
    - Test patient card navigation
    - Test search functionality on mobile
    - Test form submission on mobile

- [ ] 5. Transform Profile Treatments tab to mobile-responsive layout
  - [ ] 5.1 Add responsive layout to ProfilePage TreatmentsTab
    - Modify `frontend/src/pages/ProfilePage.tsx` (Treatments tab section)
    - Integrate MobileTabNavigation for profile tabs
    - Render TreatmentCard list on mobile (< 768px)
    - Keep existing table layout on desktop
    - Implement single-column card layout on mobile
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 5.2 Position "Nuevo tratamiento" button for mobile
    - Make button fixed or easily accessible on mobile
    - Ensure 44x44px minimum touch target
    - _Requirements: 2.7, 2.4_
  
  - [ ] 5.3 Update TreatmentFormDialog for mobile
    - Integrate MobileFormDialog component
    - Stack form fields vertically on mobile
    - Ensure all inputs are 44px minimum height
    - Position action buttons in fixed footer on mobile
    - _Requirements: 2.5, 2.6, 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 5.4 Write property tests for Treatments tab mobile layout
    - **Property 15: Table to Card Transformation**
    - **Property 8: Single-Column Layout on Mobile**
    - **Validates: Requirements 2.2**
  
  - [ ]* 5.5 Write unit tests for Treatments tab
    - Test treatment card edit action
    - Test treatment card delete action
    - Test form submission on mobile

- [ ] 6. Checkpoint - Verify Patients and Treatments pages
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Transform DebtDashboardPage to mobile-responsive layout
  - [ ] 7.1 Optimize stat cards for mobile
    - Modify `frontend/src/pages/DebtDashboardPage.tsx`
    - Display stat cards in single-column layout on mobile (< 768px)
    - Maintain existing grid layout on desktop
    - Ensure all interactive elements are 44x44px
    - _Requirements: 3.1, 3.6_
  
  - [ ] 7.2 Create MobileChartContainer component
    - Create `frontend/src/components/debt-dashboard/MobileChartContainer.tsx`
    - Adjust chart dimensions to fit viewport width on mobile
    - Expand dimensions in landscape orientation
    - Optimize Recharts rendering for mobile
    - Maintain chart readability on small screens
    - _Requirements: 3.2, 10.4_
  
  - [ ] 7.3 Integrate MobileTabNavigation for dashboard tabs
    - Replace existing tab navigation with MobileTabNavigation
    - Display tabs with icons only on mobile (< 640px)
    - Enable horizontal scrolling if needed
    - _Requirements: 3.3_
  
  - [ ] 7.4 Transform payment history table to card layout
    - Render PaymentHistoryCard list on mobile (< 768px)
    - Keep existing table layout on desktop
    - Implement single-column card layout
    - Wire card tap to open patient appointments sheet
    - _Requirements: 3.4, 3.5_
  
  - [ ] 7.5 Enhance patient appointments sheet for mobile
    - Modify existing sheet component to render as full-screen overlay on mobile
    - Ensure all touch targets are 44x44px
    - _Requirements: 3.5, 3.6_
  
  - [ ] 7.6 Integrate MobileFilterPanel for dashboard filters
    - Replace existing filter layout with MobileFilterPanel on mobile
    - Stack filter controls vertically
    - Maintain filter functionality
    - _Requirements: 3.7_
  
  - [ ]* 7.7 Write property tests for DebtDashboard mobile layout
    - **Property 13: Chart Viewport Fitting**
    - **Property 15: Table to Card Transformation**
    - **Property 8: Single-Column Layout on Mobile**
    - **Validates: Requirements 3.1, 3.2, 3.4**
  
  - [ ]* 7.8 Write integration tests for DebtDashboard
    - Test payment history card tap interaction
    - Test filter panel functionality
    - Test chart rendering on mobile

- [ ] 8. Implement universal mobile interaction standards
  - [ ] 8.1 Add touch feedback to all interactive elements
    - Add visual feedback (highlight, ripple) on tap for all buttons, cards, and links
    - Use Tailwind active: and focus: states
    - Disable hover-dependent interactions on touch devices
    - _Requirements: 7.3, 7.4_
  
  - [ ] 8.2 Optimize dropdown menus for mobile
    - Replace custom dropdowns with native select elements on mobile where appropriate
    - Ensure custom dropdowns have 44x44px touch targets
    - _Requirements: 7.5_
  
  - [ ]* 8.3 Write property tests for touch interactions
    - **Property 1: Universal Touch Target Minimum Size**
    - **Property 2: Touch Target Spacing**
    - **Property 22: Interactive Element Visual Feedback**
    - **Validates: Requirements 7.1, 7.2, 7.3**
  
  - [ ]* 8.4 Write unit tests for touch interactions
    - Test visual feedback on tap
    - Test dropdown behavior on mobile
    - Test hover interaction disabling

- [ ] 9. Implement mobile performance optimizations
  - [ ] 9.1 Add skeleton loaders for mobile layouts
    - Create skeleton components matching mobile card layouts
    - Replace existing table skeletons with card skeletons on mobile
    - Display within 100ms of data fetch initiation
    - _Requirements: 8.1, 8.4_
  
  - [ ] 9.2 Implement lazy loading for images
    - Add lazy loading attribute to all image elements
    - Implement Intersection Observer for progressive loading
    - Display placeholder with retry button on load failure
    - _Requirements: 8.2_
  
  - [ ] 9.3 Optimize initial render for mobile
    - Reduce number of initially visible items in lists on mobile (< 768px)
    - Implement virtual scrolling or pagination for long lists
    - Optimize chart rendering for mobile devices
    - _Requirements: 8.3, 8.5_
  
  - [ ]* 9.4 Write performance tests
    - Test skeleton loader display timing
    - Test lazy loading behavior
    - Test initial render item count on mobile

- [ ] 10. Checkpoint - Verify performance and interactions
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement accessibility compliance
  - [ ] 11.1 Ensure proper heading hierarchy
    - Verify h1, h2, h3 hierarchy on all mobile layouts
    - Maintain semantic HTML structure
    - _Requirements: 9.1_
  
  - [ ] 11.2 Add accessible labels to all interactive elements
    - Add aria-label, aria-labelledby, or visible text to all buttons, links, and inputs
    - Ensure screen reader compatibility
    - _Requirements: 9.2_
  
  - [ ] 11.3 Implement visible focus indicators
    - Add focus styles to all focusable elements
    - Ensure focus indicators are visible on mobile
    - Use Tailwind focus-visible: classes
    - _Requirements: 9.3_
  
  - [ ] 11.4 Verify color contrast compliance
    - Check all text elements meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
    - Test with contrast checking tools
    - _Requirements: 9.5_
  
  - [ ] 11.5 Test text scaling support
    - Verify layouts support text scaling up to 200% without breaking
    - Test with browser zoom and system font size settings
    - _Requirements: 9.4_
  
  - [ ]* 11.6 Write property tests for accessibility
    - **Property 28: Heading Hierarchy Preservation**
    - **Property 29: Interactive Element Accessible Labels**
    - **Property 30: Visible Focus Indicators**
    - **Property 32: Color Contrast Compliance**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
  
  - [ ]* 11.7 Run automated accessibility tests
    - Use jest-axe to test all mobile components
    - Test with screen reader simulation
    - Verify keyboard navigation

- [ ] 12. Implement orientation support
  - [ ] 12.1 Add orientation change handling
    - Listen to orientationchange and resize events
    - Adjust layouts to optimize for new orientation
    - Maintain scroll position on orientation change
    - _Requirements: 10.1, 10.3_
  
  - [ ] 12.2 Optimize landscape layouts
    - Utilize additional horizontal space for multi-column layouts where appropriate
    - Expand chart dimensions in landscape orientation
    - Ensure critical UI elements remain accessible in both orientations
    - _Requirements: 10.2, 10.4, 10.5_
  
  - [ ]* 12.3 Write property tests for orientation support
    - **Property 33: Orientation Layout Adaptation**
    - **Property 34: Landscape Multi-Column Utilization**
    - **Property 35: Scroll Position Preservation**
    - **Property 36: Chart Landscape Expansion**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
  
  - [ ]* 12.4 Write unit tests for orientation changes
    - Test layout adaptation on orientation change
    - Test scroll position preservation
    - Test chart dimension changes

- [ ] 13. Implement error handling and edge cases
  - [ ] 13.1 Add viewport detection error handling
    - Default to mobile layout if viewport width cannot be determined
    - Use CSS media queries as fallback
    - Log warnings for debugging
    - _Design: Error Handling - Viewport Detection Errors_
  
  - [ ] 13.2 Add touch event error handling
    - Provide click event fallbacks for all touch interactions
    - Use pointer events API when available
    - Ensure all interactions work with mouse, touch, and keyboard
    - _Design: Error Handling - Touch Event Errors_
  
  - [ ] 13.3 Add chart rendering error handling
    - Display error boundary with user-friendly message
    - Provide "Retry" action to re-render chart
    - Fall back to simple data table if chart cannot render
    - _Design: Error Handling - Chart Rendering Errors_
  
  - [ ] 13.4 Add keyboard visibility error handling
    - Implement visualViewport API for precise keyboard detection
    - Add padding to form containers to account for keyboard height
    - Fall back to fixed positioning for action buttons
    - _Design: Error Handling - Keyboard Visibility Errors_
  
  - [ ]* 13.5 Write unit tests for error handling
    - Test viewport detection fallback
    - Test touch event fallback
    - Test chart rendering error boundary
    - Test keyboard visibility handling

- [ ] 14. Final checkpoint and integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All code uses TypeScript with React 19, Tailwind CSS 4.0, and shadcn/ui components
- Implementation follows mobile-first approach with progressive enhancement for larger screens
