# Design Document: Patient Panel Payment Management

## Overview

This feature enhances the PatientDetailPanel component to enable direct payment status management for appointments without requiring navigation to the AppointmentDetailPanel. The design reuses the existing TreatmentInfoSection component to maintain UI consistency while adapting it for inline display within appointment cards.

### Goals

- Enable payment status updates directly from the patient detail view
- Maintain UI/UX consistency with existing payment management interfaces
- Preserve existing navigation patterns while adding new functionality
- Ensure real-time data synchronization across concurrent users

### Non-Goals

- Modifying the AppointmentDetailPanel payment interface
- Adding new payment status types beyond the existing enum
- Implementing payment processing or transaction recording
- Creating a new payment management component from scratch

## Architecture

### Component Structure

The implementation follows a component composition pattern, embedding payment controls within the existing appointment card structure:

```
PatientDetailPanel
├── Appointment Cards (existing)
│   ├── Appointment Info (existing)
│   ├── TreatmentInfoSection (new, conditional)
│   │   ├── Treatment List
│   │   ├── Total Amount
│   │   └── Payment Status Controls
│   └── Navigation Link (existing)
```

### Data Flow

1. **Initial Load**: PatientDetailPanel fetches patient detail including appointments with treatment data
2. **User Interaction**: User clicks payment status button within appointment card
3. **API Update**: PUT request to `/appointments/:id` with `payment_status` field
4. **Optimistic Update**: UI immediately reflects new status
5. **Data Refresh**: Full patient detail refetch to ensure consistency
6. **UI Reconciliation**: Unpaid summary banner recalculates based on fresh data

### Integration Points

- **Existing API**: Uses the established `PUT /appointments/:id` endpoint
- **Shared Component**: Reuses TreatmentInfoSection with conditional rendering logic
- **State Management**: Leverages existing usePatient hook with refetch capability
- **Type System**: Utilizes existing PaymentStatus type and paymentConfig constants

## Components and Interfaces

### Modified Components

#### PatientDetailPanel

**New State**:
```typescript
const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
```

**New Handler**:
```typescript
const handlePaymentChange = async (
  appointmentId: string,
  newStatus: PaymentStatus
) => {
  setUpdatingPaymentId(appointmentId);
  try {
    await api.put(`/appointments/${appointmentId}`, {
      payment_status: newStatus,
    });
    toast.success('Estado de pago actualizado');
    refetch(); // Refresh patient data
  } catch {
    toast.error('No se pudo actualizar el pago');
  } finally {
    setUpdatingPaymentId(null);
  }
};
```

**Modified Appointment Card Rendering**:
- Conditionally render TreatmentInfoSection when `a.treatments?.length > 0 && a.total_amount_cents > 0`
- Pass `onPaymentChange` callback bound to specific appointment ID
- Pass `isUpdating` prop based on `updatingPaymentId === a.id`
- Wrap card content to prevent navigation when clicking payment controls

#### TreatmentInfoSection (No Changes Required)

The component already supports the required functionality:
- Accepts `onPaymentChange` callback (optional)
- Displays read-only badge when callback is undefined
- Handles `isUpdating` state for button disabling
- Uses shared `paymentConfig` for consistent styling

### Component Props

#### TreatmentInfoSection (Existing Interface)

```typescript
interface TreatmentInfoSectionProps {
  treatments: AppointmentTreatmentRow[];
  totalAmountCents: number | null;
  paymentStatus: string;
  onPaymentChange?: (newStatus: PaymentStatus) => Promise<void>;
  isUpdating?: boolean;
}
```

### Event Handling Strategy

To prevent navigation when clicking payment controls while preserving the appointment card link:

```typescript
// Appointment card structure
<Link to={`/app/appointments/${a.id}`} className="...">
  <div className="appointment-info">
    {/* Date, status, etc. */}
  </div>
  
  {a.treatments?.length > 0 && a.total_amount_cents > 0 && (
    <div onClick={(e) => e.preventDefault()}>
      <TreatmentInfoSection
        treatments={a.treatments}
        totalAmountCents={a.total_amount_cents}
        paymentStatus={a.payment_status}
        onPaymentChange={(status) => handlePaymentChange(a.id, status)}
        isUpdating={updatingPaymentId === a.id}
      />
    </div>
  )}
</Link>
```

## Data Models

### Existing Types (No Changes)

```typescript
// From frontend/src/types/index.ts
export type PaymentStatus = 'unpaid' | 'paid' | 'partial' | 'refunded';

export interface AppointmentTreatmentRow {
  id: string;
  treatment_id: string;
  treatment_name: string;
  quantity: number;
  unit_price_cents: number;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  patient_id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  payment_status: PaymentStatus;
  total_amount_cents: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  patient_first_name?: string;
  patient_last_name?: string;
  treatments?: AppointmentTreatmentRow[];
}
```

### API Request/Response

**Update Payment Status Request**:
```typescript
PUT /appointments/:id
Content-Type: application/json

{
  "payment_status": "paid" | "unpaid" | "partial" | "refunded"
}
```

**Response**:
```typescript
{
  id: string;
  payment_status: PaymentStatus;
  // ... other appointment fields
}
```

### Patient Detail Response Structure

The existing patient detail endpoint returns:
```typescript
{
  patient: Patient;
  appointments: Appointment[]; // Includes treatments array
  medical_history: {
    conditions: Condition[];
    medications: Medication[];
    allergies: Allergy[];
  };
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Conditional Payment Control Rendering

*For any* appointment in the patient detail view, payment status controls should be displayed if and only if the appointment has associated treatments with a non-zero total amount; otherwise, a read-only badge should be displayed.

**Validates: Requirements 1.1, 1.4**

### Property 2: Payment Status Update API Call

*For any* payment status button click, the system should send a PUT request to `/appointments/:id` with the selected payment status in the request body.

**Validates: Requirements 2.1**

### Property 3: Successful Update UI Synchronization

*For any* successful payment status update, the UI should display the new payment status and show a success notification, and the patient data should be refetched to ensure all payment information reflects the server state.

**Validates: Requirements 2.2, 2.3, 5.1, 5.2, 5.3**

### Property 4: Failed Update Error Handling

*For any* failed payment status update API call, the system should display an error notification and the displayed payment status should remain unchanged from its previous value.

**Validates: Requirements 2.4**

### Property 5: Loading State Button Disabling

*For any* appointment while its payment status update is in progress, all payment status buttons for that appointment should be disabled.

**Validates: Requirements 2.5**

### Property 6: Unpaid Summary Recalculation

*For any* payment status change that affects the unpaid status (changing to or from 'unpaid'), the unpaid appointments summary banner should update to reflect the new count and total amount.

**Validates: Requirements 2.6**

### Property 7: Payment Configuration Consistency

*For any* payment status displayed in the patient panel, the label and styling should match the corresponding entry in the shared paymentConfig constant.

**Validates: Requirements 3.2**

### Property 8: Navigation Preservation Outside Controls

*For any* click on an appointment card outside the payment status control area, the system should navigate to the appointment detail page.

**Validates: Requirements 4.1**

### Property 9: Navigation Prevention Within Controls

*For any* click on a payment status button, the system should not trigger navigation to the appointment detail page.

**Validates: Requirements 4.2**

### Property 10: Keyboard Navigation Support

*For any* payment status control, users should be able to navigate between payment status buttons using keyboard (Tab key) and activate them using keyboard (Enter/Space keys).

**Validates: Requirements 6.1**

### Property 11: Accessibility Attribute Presence

*For any* payment status control, the current payment status should be communicated to screen readers via appropriate ARIA attributes, and disabled buttons should have the disabled state communicated to assistive technologies.

**Validates: Requirements 6.2, 6.3**

## Error Handling

### API Errors

**Network Failures**:
- Display user-friendly error toast: "No se pudo actualizar el pago"
- Maintain previous payment status in UI (no optimistic update)
- Log error details for debugging
- Allow user to retry by clicking payment button again

**Validation Errors (400)**:
- Should not occur with proper TypeScript typing
- If occurs, display error toast and log for investigation
- Maintain previous payment status

**Authorization Errors (403)**:
- Display error toast indicating permission issue
- Redirect to login if session expired
- Maintain previous payment status

**Not Found Errors (404)**:
- Display error toast: "Turno no encontrado"
- Suggest refreshing the patient detail view
- Maintain previous payment status

### State Management Errors

**Concurrent Updates**:
- Refetch after each update ensures eventual consistency
- Last-write-wins strategy (no conflict resolution needed)
- Server state is source of truth

**Stale Data**:
- Refetch after update prevents stale data display
- No client-side caching beyond component state
- Each navigation to patient detail fetches fresh data

### UI Errors

**Missing Treatment Data**:
- Gracefully handle undefined/null treatments array
- Display read-only badge when data is incomplete
- Log warning for investigation

**Invalid Payment Status**:
- TypeScript types prevent invalid values at compile time
- Runtime validation via paymentConfig lookup
- Fallback to 'unpaid' if invalid value encountered

## Testing Strategy

### Unit Testing

Unit tests will focus on specific examples, edge cases, and component integration:

**Component Rendering Tests**:
- Appointment with treatments renders payment controls
- Appointment without treatments renders read-only badge
- Appointment with zero total renders read-only badge
- Payment controls display all four status options
- Current payment status is visually indicated

**Event Handling Tests**:
- Clicking payment button calls API with correct parameters
- Clicking payment button prevents navigation
- Clicking card outside controls triggers navigation
- Multiple rapid clicks are handled correctly (debouncing)

**Error Handling Tests**:
- API error displays error toast
- API error maintains previous payment status
- Network timeout is handled gracefully

**Accessibility Tests**:
- Payment buttons are keyboard navigable
- ARIA labels are present and correct
- Disabled state is communicated to assistive tech
- Focus management works correctly

### Property-Based Testing

Property tests will verify universal behaviors across all inputs using **fast-check** (JavaScript property-based testing library). Each test will run a minimum of 100 iterations.

**Test Configuration**:
```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

// Minimum 100 iterations per property test
const testConfig = { numRuns: 100 };
```

**Property Test Implementations**:

**Property 1: Conditional Payment Control Rendering**
```typescript
// Feature: patient-panel-payment-management, Property 1: Conditional Payment Control Rendering
fc.assert(
  fc.property(
    fc.record({
      id: fc.uuid(),
      treatments: fc.array(fc.record({ /* treatment fields */ })),
      total_amount_cents: fc.integer({ min: 0, max: 1000000 }),
      payment_status: fc.constantFrom('unpaid', 'paid', 'partial', 'refunded'),
    }),
    (appointment) => {
      const { container } = render(<PatientDetailPanel patientId="test" />);
      const hasControls = appointment.treatments.length > 0 && appointment.total_amount_cents > 0;
      const controlsPresent = container.querySelector('[data-testid="payment-controls"]') !== null;
      const badgePresent = container.querySelector('[data-testid="payment-badge"]') !== null;
      
      return hasControls ? controlsPresent && !badgePresent : !controlsPresent && badgePresent;
    }
  ),
  testConfig
);
```

**Property 2: Payment Status Update API Call**
```typescript
// Feature: patient-panel-payment-management, Property 2: Payment Status Update API Call
fc.assert(
  fc.property(
    fc.uuid(), // appointmentId
    fc.constantFrom('unpaid', 'paid', 'partial', 'refunded'), // newStatus
    async (appointmentId, newStatus) => {
      const apiMock = vi.fn().mockResolvedValue({ data: {} });
      // Render component with mocked API
      // Click payment button
      // Assert apiMock was called with PUT /appointments/:id and { payment_status: newStatus }
      return apiMock.mock.calls[0][0].includes(appointmentId) &&
             apiMock.mock.calls[0][1].payment_status === newStatus;
    }
  ),
  testConfig
);
```

**Property 3: Successful Update UI Synchronization**
```typescript
// Feature: patient-panel-payment-management, Property 3: Successful Update UI Synchronization
fc.assert(
  fc.property(
    fc.constantFrom('unpaid', 'paid', 'partial', 'refunded'),
    fc.constantFrom('unpaid', 'paid', 'partial', 'refunded'),
    async (oldStatus, newStatus) => {
      // Setup component with appointment having oldStatus
      // Mock successful API response
      // Click button to change to newStatus
      // Wait for update
      // Assert UI shows newStatus
      // Assert success toast appeared
      // Assert refetch was called
      return true; // All assertions passed
    }
  ),
  testConfig
);
```

**Property 4: Failed Update Error Handling**
```typescript
// Feature: patient-panel-payment-management, Property 4: Failed Update Error Handling
fc.assert(
  fc.property(
    fc.constantFrom('unpaid', 'paid', 'partial', 'refunded'),
    async (currentStatus) => {
      // Setup component with appointment having currentStatus
      // Mock API to reject
      // Click payment button
      // Wait for error
      // Assert error toast appeared
      // Assert payment status still shows currentStatus
      return true; // All assertions passed
    }
  ),
  testConfig
);
```

**Property 5: Loading State Button Disabling**
```typescript
// Feature: patient-panel-payment-management, Property 5: Loading State Button Disabling
fc.assert(
  fc.property(
    fc.uuid(), // appointmentId
    async (appointmentId) => {
      // Setup component with appointment
      // Mock API with delay
      // Click payment button
      // During API call, assert all payment buttons are disabled
      // After API call, assert buttons are enabled again
      return true; // All assertions passed
    }
  ),
  testConfig
);
```

**Property 6: Unpaid Summary Recalculation**
```typescript
// Feature: patient-panel-payment-management, Property 6: Unpaid Summary Recalculation
fc.assert(
  fc.property(
    fc.array(fc.record({
      id: fc.uuid(),
      payment_status: fc.constantFrom('unpaid', 'paid', 'partial', 'refunded'),
      total_amount_cents: fc.integer({ min: 0, max: 100000 }),
    })),
    fc.nat(), // index of appointment to change
    fc.constantFrom('unpaid', 'paid', 'partial', 'refunded'), // new status
    async (appointments, index, newStatus) => {
      if (appointments.length === 0) return true;
      const idx = index % appointments.length;
      
      // Calculate expected unpaid count and total before change
      const beforeUnpaid = appointments.filter(a => a.payment_status === 'unpaid');
      
      // Simulate status change
      const afterAppointments = [...appointments];
      afterAppointments[idx] = { ...afterAppointments[idx], payment_status: newStatus };
      const afterUnpaid = afterAppointments.filter(a => a.payment_status === 'unpaid');
      
      // If unpaid count changed, banner should update
      if (beforeUnpaid.length !== afterUnpaid.length) {
        // Assert banner shows new count and total
        return true;
      }
      return true;
    }
  ),
  testConfig
);
```

**Property 7: Payment Configuration Consistency**
```typescript
// Feature: patient-panel-payment-management, Property 7: Payment Configuration Consistency
fc.assert(
  fc.property(
    fc.constantFrom('unpaid', 'paid', 'partial', 'refunded'),
    (paymentStatus) => {
      const { container } = render(<PatientDetailPanel patientId="test" />);
      const expectedConfig = paymentConfig[paymentStatus];
      
      // Find payment status element
      const statusElement = container.querySelector(`[data-payment-status="${paymentStatus}"]`);
      
      // Assert label matches
      const labelMatches = statusElement?.textContent === expectedConfig.label;
      
      // Assert className includes expected classes
      const classMatches = expectedConfig.className.split(' ').every(
        cls => statusElement?.classList.contains(cls)
      );
      
      return labelMatches && classMatches;
    }
  ),
  testConfig
);
```

**Property 8: Navigation Preservation Outside Controls**
```typescript
// Feature: patient-panel-payment-management, Property 8: Navigation Preservation Outside Controls
fc.assert(
  fc.property(
    fc.uuid(), // appointmentId
    async (appointmentId) => {
      const navigate = vi.fn();
      // Render component with mocked navigation
      // Click on appointment card (not on payment controls)
      // Assert navigate was called with correct appointment detail URL
      return navigate.mock.calls[0][0].includes(appointmentId);
    }
  ),
  testConfig
);
```

**Property 9: Navigation Prevention Within Controls**
```typescript
// Feature: patient-panel-payment-management, Property 9: Navigation Prevention Within Controls
fc.assert(
  fc.property(
    fc.constantFrom('unpaid', 'paid', 'partial', 'refunded'),
    async (paymentStatus) => {
      const navigate = vi.fn();
      // Render component with mocked navigation
      // Click on payment status button
      // Assert navigate was NOT called
      return navigate.mock.calls.length === 0;
    }
  ),
  testConfig
);
```

**Property 10: Keyboard Navigation Support**
```typescript
// Feature: patient-panel-payment-management, Property 10: Keyboard Navigation Support
fc.assert(
  fc.property(
    fc.constantFrom('unpaid', 'paid', 'partial', 'refunded'),
    async (targetStatus) => {
      const { container } = render(<PatientDetailPanel patientId="test" />);
      const buttons = container.querySelectorAll('[data-testid="payment-button"]');
      
      // Assert all buttons are focusable (tabIndex >= 0 or no tabIndex)
      const allFocusable = Array.from(buttons).every(btn => 
        !btn.hasAttribute('tabindex') || parseInt(btn.getAttribute('tabindex') || '0') >= 0
      );
      
      // Simulate Tab navigation
      buttons[0]?.focus();
      // Simulate Enter key
      fireEvent.keyDown(buttons[0], { key: 'Enter' });
      
      // Assert action was triggered
      return allFocusable;
    }
  ),
  testConfig
);
```

**Property 11: Accessibility Attribute Presence**
```typescript
// Feature: patient-panel-payment-management, Property 11: Accessibility Attribute Presence
fc.assert(
  fc.property(
    fc.constantFrom('unpaid', 'paid', 'partial', 'refunded'),
    fc.boolean(), // isUpdating
    (currentStatus, isUpdating) => {
      const { container } = render(
        <TreatmentInfoSection
          treatments={[]}
          totalAmountCents={1000}
          paymentStatus={currentStatus}
          onPaymentChange={async () => {}}
          isUpdating={isUpdating}
        />
      );
      
      const buttons = container.querySelectorAll('[data-testid="payment-button"]');
      
      // Assert current status button has aria-pressed or similar
      const currentButton = Array.from(buttons).find(btn => 
        btn.getAttribute('data-status') === currentStatus
      );
      const hasAriaLabel = currentButton?.hasAttribute('aria-label') || 
                          currentButton?.hasAttribute('aria-pressed');
      
      // Assert disabled buttons have disabled attribute
      const disabledButtons = Array.from(buttons).filter(btn => 
        btn.hasAttribute('disabled')
      );
      const disabledStateCorrect = isUpdating ? disabledButtons.length === buttons.length : true;
      
      return hasAriaLabel && disabledStateCorrect;
    }
  ),
  testConfig
);
```

### Integration Testing

Integration tests will verify the complete flow from user interaction to API call to UI update:

- Full payment status update flow with real API mocking
- Concurrent user scenario simulation
- Navigation flow with React Router
- Toast notification integration
- Data refetch and UI reconciliation

### Manual Testing Checklist

- [ ] Visual regression testing for appointment cards
- [ ] Color contrast verification for WCAG compliance
- [ ] Screen reader testing with NVDA/JAWS
- [ ] Mobile responsive behavior
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari)
- [ ] Keyboard-only navigation flow
- [ ] Touch interaction on mobile devices

