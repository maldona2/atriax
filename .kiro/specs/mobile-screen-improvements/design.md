# Design Document: Mobile Screen Improvements

## Overview

This design document outlines the technical approach for improving mobile responsiveness across three critical screens in the medical practice management application: the Patients List screen, the Profile Treatments tab, and the Debt Dashboard screen. The implementation will transform desktop-optimized table layouts into mobile-friendly card-based interfaces, ensure touch-friendly interactions, and optimize performance for mobile devices.

The application is built with React 19, TypeScript, Tailwind CSS 4.0, and shadcn/ui components. The design follows a mobile-first approach using Tailwind's responsive breakpoints (sm: 640px, md: 768px, lg: 1024px) and leverages existing component patterns while introducing new mobile-specific components.

### Key Design Principles

1. **Mobile-First Responsive Design**: Start with mobile layouts and progressively enhance for larger screens
2. **Touch-Optimized Interactions**: Minimum 44x44px touch targets with adequate spacing
3. **Performance-Conscious**: Lazy loading, skeleton states, and optimized rendering for mobile
4. **Accessibility Compliance**: WCAG AA standards with proper semantic HTML and ARIA labels
5. **Consistent Component Patterns**: Extend existing shadcn/ui components with mobile variants

## Architecture

### Component Hierarchy

```
Mobile-Responsive Pages
├── PatientsPage (Mobile)
│   ├── PatientCardList (new)
│   │   └── PatientCard (new)
│   ├── PatientFormDialog (enhanced)
│   └── MobileSearchBar (new)
│
├── ProfilePage > TreatmentsTab (Mobile)
│   ├── TreatmentCardList (new)
│   │   └── TreatmentCard (new)
│   ├── TreatmentFormDialog (enhanced)
│   └── MobileTabNavigation (new)
│
└── DebtDashboardPage (Mobile)
    ├── StatCardGrid (enhanced)
    ├── MobileChartContainer (new)
    ├── PaymentHistoryCardList (new)
    │   └── PaymentHistoryCard (new)
    ├── MobileFilterPanel (new)
    └── PatientAppointmentsSheet (enhanced)
```

### Responsive Strategy

The application will use a **breakpoint-based responsive strategy** with three distinct layouts:

- **Mobile (< 640px)**: Single-column card layouts, icon-only navigation, full-screen modals
- **Tablet (640px - 767px)**: Two-column grids where appropriate, abbreviated labels
- **Desktop (≥ 768px)**: Existing table layouts, full navigation labels

### State Management

No changes to existing state management patterns. The responsive behavior is purely presentational, using:
- React hooks (useState, useEffect) for local UI state
- Existing custom hooks (usePatients, useTreatments, useDebtStatistics, etc.)
- Tailwind responsive classes for layout switching

## Components and Interfaces

### 1. Mobile Card Components

#### PatientCard Component

```typescript
interface PatientCardProps {
  patient: Patient;
  onTap: (patient: Patient) => void;
}

// Patient type from existing codebase
interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  appointment_count: number | null;
  unpaid_count: number | null;
  unpaid_total_cents: number | null;
}
```

**Responsibilities**:
- Display patient name, phone, and payment status
- Show visual indicator for unpaid appointments (badge with count and amount)
- Provide 44x44px minimum touch target
- Navigate to patient detail on tap

#### TreatmentCard Component

```typescript
interface TreatmentCardProps {
  treatment: Treatment;
  onEdit: (treatment: Treatment) => void;
  onDelete: (treatmentId: string) => void;
}

// Treatment type from existing codebase
interface Treatment {
  id: string;
  name: string;
  price_cents: number;
  description?: string | null;
}
```

**Responsibilities**:
- Display treatment name and price in vertical stack
- Provide edit and delete action buttons (44x44px minimum)
- Format currency display

#### PaymentHistoryCard Component

```typescript
interface PaymentHistoryCardProps {
  record: PatientPaymentRecord;
  onTap: (record: PatientPaymentRecord) => void;
}

// PatientPaymentRecord from existing codebase
interface PatientPaymentRecord {
  patientId: string;
  patientName: string;
  totalDebtCents: number;
  paidCents: number;
  unpaidCents: number;
  paymentStatus: 'paid' | 'unpaid' | 'partially_paid';
  lastPaymentDate: string | null;
}
```

**Responsibilities**:
- Display patient name, debt summary, and payment status
- Show color-coded payment status badge
- Open full-screen appointment sheet on tap

### 2. Mobile Navigation Components

#### MobileTabNavigation Component

```typescript
interface MobileTabNavigationProps {
  tabs: Array<{
    value: string;
    label: string;
    icon: React.ComponentType;
  }>;
  activeTab: string;
  onTabChange: (value: string) => void;
}
```

**Responsibilities**:
- Display tabs with icons only on mobile (< 640px)
- Show abbreviated labels on tablet (640px - 767px)
- Enable horizontal scrolling if tabs overflow
- Maintain 44x44px touch targets

### 3. Enhanced Dialog Components

#### MobileFormDialog Component

```typescript
interface MobileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}
```

**Responsibilities**:
- Render as full-screen overlay on mobile (< 768px)
- Render as centered dialog on desktop (≥ 768px)
- Stack form fields vertically with full-width inputs
- Position action buttons in fixed footer on mobile
- Ensure active input remains visible above keyboard

### 4. Mobile Filter Components

#### MobileFilterPanel Component

```typescript
interface MobileFilterPanelProps {
  filters: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}
```

**Responsibilities**:
- Collapse filters into expandable panel on mobile
- Stack filter controls vertically
- Provide clear "Apply" and "Clear" actions
- Maintain filter state across open/close

### 5. Responsive Chart Components

#### MobileChartContainer Component

```typescript
interface MobileChartContainerProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}
```

**Responsibilities**:
- Adjust chart dimensions to fit viewport width
- Maintain readability on small screens
- Optimize Recharts rendering for mobile
- Expand dimensions in landscape orientation

## Data Models

No new data models are required. The design uses existing types from the codebase:

- `Patient` - Patient information with payment status
- `Treatment` - Treatment type with pricing
- `PatientPaymentRecord` - Payment history aggregation
- `Appointment` - Appointment details with payment info
- `DebtStatistics` - Financial statistics
- `AgingReportBucket` - Aging report data
- `PaymentPlan` - Payment plan information

All data fetching continues through existing custom hooks:
- `usePatients()`
- `useTreatments()`
- `useDebtStatistics()`
- `useAgingReport()`
- `usePaymentPlans()`
- `usePaymentHistory(filters)`
- `usePatientAppointments(patientId)`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to avoid redundancy:

- Touch target properties (1.4, 2.4, 3.6, 4.4, 7.1) all validate the same universal rule: all interactive elements must be >= 44x44px
- Card information display properties (1.2, 2.3, 5.2) all validate that cards show required information
- Dialog full-screen properties (2.5, 6.1) validate the same behavior for different dialog types
- Form layout properties (2.6, 6.2) validate the same vertical stacking rule
- Table-to-card transformation properties (1.1, 3.4, 5.1) validate the same responsive layout switching

The consolidated properties below eliminate this redundancy while maintaining complete coverage.

### Property 1: Universal Touch Target Minimum Size

*For any* interactive element (button, link, input, card) rendered on mobile viewports (< 768px), the element's computed dimensions should be at least 44x44 pixels.

**Validates: Requirements 1.4, 2.4, 3.6, 4.4, 7.1**

### Property 2: Touch Target Spacing

*For any* two adjacent interactive elements on mobile, the spacing between them should be at least 8 pixels.

**Validates: Requirements 7.2**

### Property 3: Patient Card Information Display

*For any* patient with data, when rendered as a mobile card, the card should contain the patient's name, phone number, and payment status.

**Validates: Requirements 1.2**

### Property 4: Unpaid Appointment Indicator

*For any* patient with unpaid_count > 0, the rendered patient card should display a visual indicator containing both the unpaid count and the unpaid amount.

**Validates: Requirements 1.3**

### Property 5: Patient Card Navigation

*For any* patient card on mobile, tapping/clicking the card should trigger navigation to that patient's detail page.

**Validates: Requirements 1.5**

### Property 6: Search and Filter Functionality Preservation

*For any* search or filter input on mobile, the functionality should work correctly and the input field should meet touch target requirements (>= 44px height).

**Validates: Requirements 1.7**

### Property 7: Treatment Card Layout

*For any* treatment rendered as a mobile card, the treatment name, price, and action buttons should be displayed in a vertically stacked format.

**Validates: Requirements 2.3**

### Property 8: Single-Column Layout on Mobile

*For any* collection of cards (patients, treatments, stat cards) rendered on mobile (< 768px), the layout should be single-column.

**Validates: Requirements 2.2, 3.1**

### Property 9: Form Field Vertical Stacking

*For any* form rendered on mobile (< 640px), all form fields should be stacked vertically with full-width inputs.

**Validates: Requirements 2.6, 6.2**

### Property 10: Form Input Minimum Height

*For any* form input field on mobile, the minimum height should be 44 pixels.

**Validates: Requirements 6.3**

### Property 11: Form Action Button Positioning

*For any* form on mobile, action buttons (submit, cancel) should be positioned either in a fixed footer or prominently at the form bottom.

**Validates: Requirements 6.4**

### Property 12: Mobile Input Type Attributes

*For any* input field, the input type attribute should match the expected data type (tel for phone, email for email, date for dates) to trigger appropriate mobile keyboards.

**Validates: Requirements 6.6**

### Property 13: Chart Viewport Fitting

*For any* chart rendered on mobile, the chart width should fit within the viewport width while maintaining readability.

**Validates: Requirements 3.2**

### Property 14: Patient Record Sheet Interaction

*For any* patient payment record on mobile, tapping the record should open the patient appointments sheet as a full-screen overlay.

**Validates: Requirements 3.5**

### Property 15: Table to Card Transformation

*For any* data table component rendered on mobile (< 768px), the component should render as a card-based layout instead of a table.

**Validates: Requirements 1.1, 3.4, 5.1**

### Property 16: Card Content Prioritization

*For any* data displayed as cards on mobile, the most important columns/fields should be displayed as primary card content, with secondary information hidden or collapsed.

**Validates: Requirements 5.2, 5.3**

### Property 17: Sorting Functionality Preservation

*For any* sortable data table on mobile, the sorting functionality should be maintained with touch-optimized controls (>= 44x44px).

**Validates: Requirements 5.4**

### Property 18: Pagination Touch Optimization

*For any* paginated list on mobile, pagination controls should have adequate touch targets (>= 44x44px).

**Validates: Requirements 5.5**

### Property 19: Dialog Full-Screen Rendering

*For any* dialog component rendered on mobile (< 768px), the dialog should display as a full-screen overlay.

**Validates: Requirements 2.5, 6.1**

### Property 20: Header Responsive Sizing

*For any* header element on mobile (< 768px), the padding and font sizes should be proportionally reduced compared to desktop.

**Validates: Requirements 4.1**

### Property 21: Title Text Truncation

*For any* page title on mobile that exceeds the container width, the title should truncate with ellipsis to prevent wrapping.

**Validates: Requirements 4.2**

### Property 22: Interactive Element Visual Feedback

*For any* interactive element on mobile, tapping the element should provide immediate visual feedback (highlight, ripple, or state change).

**Validates: Requirements 7.3**

### Property 23: Hover Interaction Alternatives

*For any* hover-dependent interaction on desktop, there should be a touch-friendly alternative on mobile devices.

**Validates: Requirements 7.4**

### Property 24: Dropdown Touch Optimization

*For any* dropdown menu on mobile, it should either use native select elements or implement touch-optimized custom dropdowns with proper touch targets.

**Validates: Requirements 7.5**

### Property 25: Skeleton Loader Layout Matching

*For any* loading state on mobile, the skeleton loader should match the mobile layout (cards, not tables).

**Validates: Requirements 8.1**

### Property 26: Image Lazy Loading

*For any* image element on mobile, it should have lazy loading enabled to improve initial load time.

**Validates: Requirements 8.2**

### Property 27: Initial Item Count Reduction

*For any* list rendered on mobile (< 768px), the number of initially visible items should be reduced compared to desktop to improve performance.

**Validates: Requirements 8.3**

### Property 28: Heading Hierarchy Preservation

*For any* page on mobile, the heading hierarchy (h1, h2, h3) should be properly nested and maintained.

**Validates: Requirements 9.1**

### Property 29: Interactive Element Accessible Labels

*For any* interactive element, it should have an accessible label (aria-label, aria-labelledby, or visible text) for screen readers.

**Validates: Requirements 9.2**

### Property 30: Visible Focus Indicators

*For any* focusable element on mobile, it should have visible focus indicators when focused.

**Validates: Requirements 9.3**

### Property 31: Text Scaling Support

*For any* layout on mobile, it should support text scaling up to 200% without breaking the layout or causing content overflow.

**Validates: Requirements 9.4**

### Property 32: Color Contrast Compliance

*For any* text element on mobile, the color contrast ratio between text and background should meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).

**Validates: Requirements 9.5**

### Property 33: Orientation Layout Adaptation

*For any* page on mobile, when device orientation changes, the layout should adjust to optimize for the new orientation.

**Validates: Requirements 10.1**

### Property 34: Landscape Multi-Column Utilization

*For any* card grid on mobile in landscape orientation, the layout should utilize additional horizontal space by displaying multiple columns where appropriate.

**Validates: Requirements 10.2**

### Property 35: Scroll Position Preservation

*For any* page on mobile, when orientation changes, the scroll position should be maintained.

**Validates: Requirements 10.3**

### Property 36: Chart Landscape Expansion

*For any* chart on mobile in landscape orientation, the chart dimensions should expand to utilize the available horizontal space.

**Validates: Requirements 10.4**

### Property 37: Critical UI Element Accessibility

*For any* critical UI element (navigation, primary actions, content), it should remain accessible and visible in both portrait and landscape orientations.

**Validates: Requirements 10.5**

## Error Handling

### Viewport Detection Errors

**Scenario**: Window resize events fail or viewport dimensions cannot be determined

**Handling**:
- Default to mobile layout if viewport width cannot be determined
- Use CSS media queries as fallback (no JavaScript required)
- Log warning to console for debugging

### Touch Event Errors

**Scenario**: Touch events are not supported or fail to register

**Handling**:
- Provide click event fallbacks for all touch interactions
- Use pointer events API when available for unified handling
- Ensure all interactions work with mouse, touch, and keyboard

### Chart Rendering Errors

**Scenario**: Recharts fails to render on mobile or encounters data errors

**Handling**:
- Display error boundary with user-friendly message
- Provide "Retry" action to re-render chart
- Log error details for debugging
- Fall back to simple data table if chart cannot render

### Keyboard Visibility Errors

**Scenario**: Active input field is obscured by mobile keyboard

**Handling**:
- Use `scrollIntoView()` with smooth behavior when input receives focus
- Add padding to form containers to account for keyboard height
- Implement `visualViewport` API for precise keyboard detection
- Fall back to fixed positioning for action buttons

### Orientation Change Errors

**Scenario**: Layout fails to adapt when orientation changes

**Handling**:
- Listen to both `orientationchange` and `resize` events
- Debounce resize handlers to prevent excessive re-renders
- Force re-render if layout appears broken after orientation change
- Maintain scroll position using `scrollRestoration` API

### Image Loading Errors

**Scenario**: Lazy-loaded images fail to load on mobile

**Handling**:
- Display placeholder with retry button
- Provide alt text for accessibility
- Log failed image URLs for debugging
- Use Intersection Observer API with error callbacks

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

### Unit Testing

Unit tests will focus on:

1. **Specific Breakpoint Behavior**
   - Test layout at exactly 640px, 768px, 1024px
   - Verify button stacking at < 640px
   - Verify tab label changes at < 768px

2. **Component Rendering Examples**
   - Patient card with unpaid appointments
   - Treatment card with long names
   - Empty state handling

3. **Integration Points**
   - Dialog opening/closing
   - Navigation triggering
   - Form submission

4. **Edge Cases**
   - Very long patient names
   - Zero unpaid appointments
   - Missing phone/email data
   - Empty lists

5. **Error Conditions**
   - Chart rendering failures
   - Image loading failures
   - Invalid viewport dimensions

### Property-Based Testing

Property tests will use **fast-check** (JavaScript property-based testing library) to verify universal properties across randomized inputs.

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: mobile-screen-improvements, Property {number}: {property_text}`

**Test Categories**:

1. **Touch Target Properties** (Properties 1, 2)
   - Generate random component trees
   - Query all interactive elements
   - Verify dimensions and spacing

2. **Card Display Properties** (Properties 3, 4, 7, 16)
   - Generate random patient/treatment data
   - Render cards
   - Verify required information is present

3. **Layout Properties** (Properties 8, 9, 15, 21)
   - Generate random data sets
   - Render at various viewport widths
   - Verify layout structure (single-column, vertical stacking, etc.)

4. **Interaction Properties** (Properties 5, 14, 22, 23)
   - Generate random data
   - Simulate user interactions
   - Verify expected behavior (navigation, feedback, etc.)

5. **Accessibility Properties** (Properties 28, 29, 30, 32)
   - Generate random component trees
   - Run accessibility checks
   - Verify ARIA labels, focus indicators, contrast ratios

6. **Responsive Properties** (Properties 33, 34, 35, 36, 37)
   - Generate random viewport dimensions and orientations
   - Verify layout adaptation
   - Check scroll position preservation

**Example Property Test**:

```typescript
// Feature: mobile-screen-improvements, Property 1: Universal Touch Target Minimum Size
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';

describe('Property 1: Touch Target Minimum Size', () => {
  it('should ensure all interactive elements are at least 44x44px on mobile', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.string(),
          first_name: fc.string(),
          last_name: fc.string(),
          phone: fc.option(fc.string()),
          email: fc.option(fc.string()),
          unpaid_count: fc.nat(),
          unpaid_total_cents: fc.nat(),
        })),
        (patients) => {
          // Render at mobile viewport
          global.innerWidth = 375;
          const { container } = render(<PatientCardList patients={patients} />);
          
          // Query all interactive elements
          const interactiveElements = container.querySelectorAll(
            'button, a, input, [role="button"]'
          );
          
          // Verify each element meets minimum size
          interactiveElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            expect(rect.width).toBeGreaterThanOrEqual(44);
            expect(rect.height).toBeGreaterThanOrEqual(44);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Testing Tools

- **Vitest**: Test runner (already in project)
- **@testing-library/react**: Component testing
- **@testing-library/user-event**: User interaction simulation
- **fast-check**: Property-based testing library
- **jest-axe**: Accessibility testing
- **jsdom**: DOM environment for tests

### Test Coverage Goals

- Unit test coverage: > 80% for new mobile components
- Property test coverage: All 37 correctness properties
- Integration test coverage: All three main pages (Patients, Profile Treatments, Debt Dashboard)
- Accessibility test coverage: All interactive components

### Manual Testing Checklist

In addition to automated tests, manual testing should verify:

1. **Real Device Testing**
   - iPhone (Safari)
   - Android (Chrome)
   - iPad (Safari)

2. **Orientation Testing**
   - Portrait to landscape transitions
   - Landscape to portrait transitions
   - Scroll position preservation

3. **Keyboard Interaction**
   - Input field visibility when keyboard appears
   - Tab navigation
   - Form submission with Enter key

4. **Performance Testing**
   - Initial load time on 3G network
   - Scroll performance with large lists
   - Chart rendering performance

5. **Accessibility Testing**
   - Screen reader navigation (VoiceOver, TalkBack)
   - Zoom to 200%
   - High contrast mode
