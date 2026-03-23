# Design Document: Appointment Doctor Workflow Redesign

## Overview

This design replaces the current weekly calendar grid view with a chronological appointment list optimized for doctor workflows. The new interface consolidates appointment viewing, patient information, medical history, session documentation, and photo management into a unified experience.

The design addresses the limitations of the calendar grid by providing:
- Clear chronological ordering with first/last indicators
- Integrated session documentation without navigation
- Direct access to patient medical history
- In-context photo upload and viewing
- Responsive layout adapting to desktop and mobile devices

### Key Design Decisions

1. **List over Calendar**: A chronological list provides better focus for sequential patient visits compared to a spatial calendar grid
2. **Sidebar Pattern**: Desktop layout uses a persistent appointment list sidebar with detail panel, following common email/messaging patterns
3. **Overlay on Mobile**: Mobile devices show the detail panel as a full-screen overlay to maximize space
4. **Session Auto-creation**: Sessions are created on-demand when documentation is first saved, simplifying the data model
5. **Presigned URLs**: Photo access uses presigned S3 URLs generated server-side for security

## Architecture

### Component Hierarchy

```
AppointmentsPage
├── AppointmentListView (sidebar/main on mobile)
│   ├── FilterControls (date picker, status filter)
│   ├── AppointmentCard[] (chronological list)
│   └── EmptyState
└── AppointmentDetailPanel (main/overlay)
    ├── PatientInfoSection
    ├── SessionDocumentationForm
    │   ├── ProceduresField
    │   ├── RecommendationsField
    │   └── StatusControls
    ├── PhotoUploadComponent
    │   ├── PhotoGrid
    │   ├── UploadButton
    │   └── PhotoViewer (modal)
    ├── TreatmentInfoSection
    └── MedicalHistorySection
        └── PreviousSessionCard[]
```

### Data Flow

1. **Appointment Loading**: Fetch appointments with patient names joined, filter by date range and status
2. **Detail Loading**: When appointment selected, fetch full appointment detail including session, treatments, and patient info
3. **Session Creation**: POST to `/sessions` when user first saves documentation for an appointment
4. **Session Update**: PUT to `/sessions/:id` for subsequent documentation changes
5. **Photo Upload**: POST to `/session-photos/upload` returns presigned URL, then PUT file to S3, then POST to `/session-photos/confirm`
6. **Photo Retrieval**: GET `/session-photos?session_id=X` returns photos with presigned download URLs

### State Management

```typescript
// Page-level state
const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
const [dateFilter, setDateFilter] = useState<{ start: Date; end: Date }>(defaultRange);
const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');

// Data hooks
const { appointments, loading } = useAppointments({ dateFilter, statusFilter });
const { detail, refetch } = useAppointmentDetail(selectedAppointmentId);
const { photos, upload, loading: photosLoading } = useSessionPhotos(detail?.session_id);
const { sessions: previousSessions } = usePatientSessions(detail?.patient_id);
```

## Components and Interfaces

### AppointmentListView

Displays filtered appointments in chronological order with visual indicators.

**Props:**
```typescript
interface AppointmentListViewProps {
  appointments: Appointment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  dateFilter: DateRange;
  onDateFilterChange: (range: DateRange) => void;
  statusFilter: 'all' | AppointmentStatus;
  onStatusFilterChange: (status: 'all' | AppointmentStatus) => void;
  onNewAppointment: () => void;
}
```

**Behavior:**
- Sorts appointments by `scheduled_at` ascending
- Adds `data-first` attribute to first appointment of filtered list
- Adds `data-last` attribute to last appointment of filtered list
- Highlights selected appointment with distinct background color
- Shows appointment count badge
- Provides "New Appointment" button always visible at top

### AppointmentCard

Compact representation of a single appointment in the list.

**Props:**
```typescript
interface AppointmentCardProps {
  appointment: Appointment;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
}
```

**Display:**
- Time (HH:MM format from `scheduled_at`)
- Patient name (`patient_first_name patient_last_name`)
- Status badge with color coding
- First/last indicators (icon or border accent)

### AppointmentDetailPanel

Main detail view for selected appointment with all integrated sections.

**Props:**
```typescript
interface AppointmentDetailPanelProps {
  appointmentId: string;
  onClose?: () => void; // For mobile overlay
}
```

**Sections:**
1. Header with patient name and appointment time
2. Patient info section
3. Session documentation form
4. Photo upload component
5. Treatment info section
6. Medical history section

### SessionDocumentationForm

Editable form for recording session notes.

**Props:**
```typescript
interface SessionDocumentationFormProps {
  appointmentId: string;
  sessionId: string | null;
  initialData: {
    procedures_performed?: string;
    recommendations?: string;
  };
  onSave: (data: SessionData) => Promise<void>;
}
```

**Fields:**
- `procedures_performed`: Textarea, required for session creation
- `recommendations`: Textarea, optional
- Auto-save on blur or manual save button
- Creates session on first save if `sessionId` is null

### PhotoUploadComponent

Manages photo uploads and display for a session.

**Props:**
```typescript
interface PhotoUploadComponentProps {
  sessionId: string | null;
  photos: SessionPhoto[];
  onUpload: (file: File) => Promise<void>;
  onPhotoClick: (photo: SessionPhoto) => void;
}
```

**Behavior:**
- Disabled if `sessionId` is null (shows message: "Save session documentation first")
- Validates file type (image/jpeg, image/png, image/webp)
- Validates file size (< 10MB)
- Shows upload progress indicator
- Displays photos in responsive grid (2-3 columns based on width)
- Click photo to open full-size viewer modal

### PatientInfoSection

Read-only display of patient demographics.

**Props:**
```typescript
interface PatientInfoSectionProps {
  patient: {
    first_name: string;
    last_name: string;
    phone?: string;
    email?: string;
    date_of_birth?: string;
    notes?: string;
  };
}
```

**Display:**
- Name as heading
- Contact info (phone, email) with icons
- Age calculated from date_of_birth
- General notes in expandable section

### MedicalHistorySection

Displays previous sessions for the patient.

**Props:**
```typescript
interface MedicalHistorySectionProps {
  patientId: string;
  currentSessionId?: string; // Exclude from history
}
```

**Behavior:**
- Fetches sessions for patient ordered by appointment date DESC
- Excludes current session from list
- Shows empty state for first visit
- Each session card shows:
  - Appointment date
  - Procedures performed
  - Recommendations
  - Expandable for full details

### TreatmentInfoSection

Displays treatments associated with the appointment.

**Props:**
```typescript
interface TreatmentInfoSectionProps {
  treatments: AppointmentTreatmentRow[];
  totalAmountCents: number | null;
  paymentStatus: PaymentStatus;
}
```

**Display:**
- List of treatments with name, quantity, unit price
- Total amount formatted as currency
- Payment status badge

## Data Models

### Extended Appointment Type

```typescript
interface AppointmentWithPatient extends Appointment {
  patient_first_name: string;
  patient_last_name: string;
}

interface AppointmentDetailExtended extends AppointmentDetail {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string;
    email?: string;
    date_of_birth?: string;
    notes?: string;
  };
  session?: {
    id: string;
    procedures_performed: string;
    recommendations?: string;
    created_at: string;
    updated_at: string;
  };
  photos: SessionPhoto[];
  previous_sessions: PreviousSession[];
}

interface PreviousSession {
  id: string;
  appointment_date: string;
  procedures_performed: string;
  recommendations?: string;
}
```

### API Endpoints

**GET /appointments**
- Query params: `date_start`, `date_end`, `status`
- Returns: `AppointmentWithPatient[]`
- Joins patient names for list display

**GET /appointments/:id/detail**
- Returns: `AppointmentDetailExtended`
- Includes patient info, session, treatments, photos, previous sessions
- Single endpoint to reduce round trips

**POST /sessions**
- Body: `{ appointment_id, patient_id, procedures_performed, recommendations? }`
- Returns: `Session`
- Creates new session record

**PUT /sessions/:id**
- Body: `{ procedures_performed, recommendations? }`
- Returns: `Session`
- Updates existing session

**GET /session-photos**
- Query params: `session_id`
- Returns: `SessionPhoto[]` with presigned URLs
- URLs valid for 1 hour

**POST /session-photos/upload**
- Body: `{ session_id, file_name, file_size_bytes, mime_type }`
- Returns: `{ photo_id, presigned_url, s3_key }`
- Generates presigned PUT URL for S3 upload

**POST /session-photos/confirm**
- Body: `{ photo_id }`
- Updates photo status to 'confirmed' and sets uploaded_at timestamp

**GET /patients/:id/sessions**
- Query params: `exclude_session_id?`
- Returns: `PreviousSession[]`
- Ordered by appointment date DESC

## Database Schema

No schema changes required. Existing tables support all requirements:

- `appointments`: Core appointment data
- `patients`: Patient demographics
- `sessions`: Session documentation (procedures_performed, recommendations)
- `session_photos`: Photo metadata and S3 keys
- `appointment_treatments`: Treatment line items
- `treatments`: Treatment definitions

### Key Relationships

```
appointments
  ├─ belongs_to: patients (patient_id)
  ├─ has_one: sessions (appointment_id)
  └─ has_many: appointment_treatments

sessions
  ├─ belongs_to: appointments (appointment_id)
  ├─ belongs_to: patients (patient_id)
  └─ has_many: session_photos (session_id)

session_photos
  ├─ belongs_to: sessions (session_id)
  └─ belongs_to: patients (patient_id)
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Appointment List Chronological Ordering

*For any* list of appointments, the rendered appointment list should display them sorted by scheduled_at timestamp in ascending chronological order.

**Validates: Requirements 1.1**

### Property 2: Appointment List Boundary Indicators

*For any* non-empty filtered appointment list, the first and last appointments should have visual indicators (data attributes or classes) marking their positions.

**Validates: Requirements 1.2, 1.3**

### Property 3: Selected Appointment Highlighting

*For any* appointment in the list, when it is selected, it should have a distinct visual highlight (class or style) that differentiates it from unselected appointments.

**Validates: Requirements 1.4**

### Property 4: Appointment Card Required Information

*For any* appointment, the rendered appointment card should contain the scheduled time, patient name, and appointment status.

**Validates: Requirements 1.5**

### Property 5: Session Documentation Persistence

*For any* session documentation data (procedures_performed, recommendations), when saved, it should either create a new session record (if none exists) or update the existing session record, and the saved data should be retrievable.

**Validates: Requirements 2.3**

### Property 6: Incomplete Appointment Documentation Prompt

*For any* appointment with status other than "completed", the session panel should display a prompt or indicator encouraging completion of documentation.

**Validates: Requirements 2.5**

### Property 7: Session Photos Display

*For any* appointment with an associated session that has photos, the photo upload component should display all photos belonging to that session.

**Validates: Requirements 3.1**

### Property 8: Photo Upload MIME Type Validation

*For any* file upload attempt, the photo upload component should only accept files with mime types image/jpeg, image/png, or image/webp, and reject all other types.

**Validates: Requirements 3.2**

### Property 9: Photo Upload Size Validation

*For any* file upload attempt, the photo upload component should reject files with size greater than or equal to 10MB and accept files smaller than 10MB (with valid mime types).

**Validates: Requirements 3.3**

### Property 10: Photo Thumbnail Information Display

*For any* session photo, the displayed thumbnail should include the file name and upload timestamp.

**Validates: Requirements 3.4**

### Property 11: Photo Thumbnail Click Interaction

*For any* photo thumbnail, when clicked, it should trigger the display of the full-size image in a viewer modal.

**Validates: Requirements 3.5**

### Property 12: Photo Session Association

*For any* uploaded photo, it should be linked to the session_id associated with the current appointment, and this association should persist in the database.

**Validates: Requirements 3.6**

### Property 13: Patient Information Completeness

*For any* selected appointment, the patient info section should display all available patient fields (first_name, last_name, phone, email, date_of_birth, notes), showing each field only if it has a value.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 14: Previous Sessions Display

*For any* patient with previous sessions, when an appointment for that patient is selected, the medical record section should display all previous sessions (excluding the current session).

**Validates: Requirements 5.1**

### Property 15: Previous Sessions Chronological Ordering

*For any* list of previous sessions, they should be displayed in reverse chronological order (most recent first) based on appointment date.

**Validates: Requirements 5.2**

### Property 16: Previous Session Information Completeness

*For any* previous session displayed in the medical record section, it should show the appointment date, procedures_performed, and recommendations.

**Validates: Requirements 5.3**

### Property 17: Patient Notes Display in Medical History

*For any* patient with general notes, when an appointment for that patient is selected, the medical record section should display those notes.

**Validates: Requirements 5.4**

### Property 18: Appointment Filtering Behavior

*For any* combination of date range and status filters applied, the appointment list should display only appointments that match all active filter criteria.

**Validates: Requirements 6.3**

### Property 19: Appointment Count Accuracy

*For any* filter state, the displayed appointment count should equal the number of appointments shown in the list.

**Validates: Requirements 6.4**

### Property 20: Filter State Persistence

*For any* filter configuration, when navigating between appointments (selecting different appointments), the filter settings should remain unchanged.

**Validates: Requirements 6.5**

### Property 21: Independent Scroll Behavior

*For any* content length in the appointment list and session panel on desktop viewports, each section should scroll independently without affecting the scroll position of the other.

**Validates: Requirements 7.3**

### Property 22: Photo Grid Responsive Adaptation

*For any* number of photos and any viewport width, the photo grid should adapt its column count to fit the available width appropriately.

**Validates: Requirements 7.4**

### Property 23: Treatment Information Display

*For any* appointment with associated treatments, the session panel should display all treatments with their name, quantity, unit_price_cents, along with the total_amount_cents and payment_status.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 24: Treatment Section Conditional Display

*For any* appointment, the treatments summary section should be displayed if and only if the appointment has associated treatments.

**Validates: Requirements 8.5**

### Property 25: Appointment Status Display

*For any* selected appointment, the session panel should prominently display the current appointment status.

**Validates: Requirements 9.1**

### Property 26: Status-Conditional Action Buttons

*For any* appointment with status "pending" or "confirmed", the session panel should display a "Mark as Completed" button, and for any appointment with status "pending", it should also display a "Confirm" button.

**Validates: Requirements 9.3, 9.4**

### Property 27: Status Update Persistence

*For any* status update action triggered via quick action buttons, the appointment status should be updated in the database and the UI should refresh to reflect the new status.

**Validates: Requirements 9.5**

### Property 28: New Appointment Auto-Selection

*For any* newly created appointment, the appointment list should automatically select it and display its details in the session panel.

**Validates: Requirements 10.3**

### Property 29: New Appointment Button Interaction

*For any* state of the appointment list, when the "New Appointment" button is clicked, it should open the appointment creation interface.

**Validates: Requirements 10.5**

## Error Handling

### Client-Side Validation

1. **Photo Upload Validation**
   - Validate MIME type before upload attempt
   - Validate file size before upload attempt
   - Display clear error messages for validation failures
   - Prevent upload button interaction during upload in progress

2. **Form Validation**
   - Require procedures_performed before allowing session save
   - Validate date range filters (start <= end)
   - Prevent duplicate simultaneous save operations

3. **Network Error Handling**
   - Display toast notifications for failed API calls
   - Retry logic for transient failures (photo uploads)
   - Graceful degradation when detail data fails to load
   - Show loading states during async operations

### Server-Side Validation

1. **Session Creation/Update**
   - Verify appointment belongs to authenticated tenant
   - Verify appointment exists before creating session
   - Prevent duplicate session creation (unique constraint on appointment_id)
   - Validate required fields (procedures_performed)

2. **Photo Upload**
   - Verify session belongs to authenticated tenant
   - Verify session exists before generating presigned URL
   - Validate MIME type against allowed list
   - Validate file size in metadata
   - Set presigned URL expiration (1 hour)
   - Verify photo confirmation within reasonable time window

3. **Data Access**
   - Enforce tenant isolation on all queries
   - Verify appointment/patient/session ownership
   - Return 404 for non-existent resources
   - Return 403 for unauthorized access attempts

### Error States

1. **Empty States**
   - No appointments matching filters: Show message with filter reset option
   - No appointment selected: Show prompt to select appointment
   - No previous sessions: Show "First visit" message
   - No photos: Show upload prompt (if session exists)

2. **Loading States**
   - Appointment list loading: Show skeleton cards
   - Detail panel loading: Show skeleton layout
   - Photo upload in progress: Show progress indicator
   - Session save in progress: Disable form, show saving indicator

3. **Failure States**
   - Failed to load appointments: Show error with retry button
   - Failed to load detail: Show error in panel with retry button
   - Failed to save session: Show error toast, preserve form data
   - Failed photo upload: Show error, allow retry
   - Failed photo load: Show placeholder with error icon

## Testing Strategy

### Unit Testing

Unit tests will focus on specific examples, edge cases, and component behavior:

1. **Component Rendering**
   - AppointmentCard renders with all required fields
   - Empty state messages display correctly
   - Status badges show correct colors and text
   - First visit message appears when no previous sessions

2. **User Interactions**
   - Clicking appointment card selects it
   - Clicking photo thumbnail opens viewer
   - Status update buttons trigger correct actions
   - Filter controls update state correctly

3. **Data Transformations**
   - Date formatting functions
   - Currency formatting for treatment prices
   - Age calculation from date_of_birth
   - Sort functions for appointments and sessions

4. **Edge Cases**
   - Empty appointment list
   - Appointment with no treatments
   - Patient with no contact information
   - Session with no recommendations
   - Photo upload with exactly 10MB file
   - Appointment at midnight (boundary time)

5. **Error Handling**
   - Invalid MIME type rejection
   - Oversized file rejection
   - Network error display
   - Missing required field validation

### Property-Based Testing

Property tests will verify universal properties across randomized inputs using **fast-check** for TypeScript/JavaScript. Each test will run a minimum of 100 iterations.

1. **Property 1: Appointment List Chronological Ordering**
   - Generate: Random array of appointments with random timestamps
   - Test: Rendered list is sorted by scheduled_at ascending
   - Tag: **Feature: appointment-doctor-workflow-redesign, Property 1: For any list of appointments, the rendered appointment list should display them sorted by scheduled_at timestamp in ascending chronological order**

2. **Property 2: Appointment List Boundary Indicators**
   - Generate: Random non-empty array of appointments
   - Test: First element has first indicator, last element has last indicator
   - Tag: **Feature: appointment-doctor-workflow-redesign, Property 2: For any non-empty filtered appointment list, the first and last appointments should have visual indicators marking their positions**

3. **Property 3: Selected Appointment Highlighting**
   - Generate: Random appointment array and random selection index
   - Test: Selected appointment has highlight class/attribute
   - Tag: **Feature: appointment-doctor-workflow-redesign, Property 3: For any appointment in the list, when it is selected, it should have a distinct visual highlight**

4. **Property 4: Appointment Card Required Information**
   - Generate: Random appointment with patient data
   - Test: Rendered card contains time, patient name, and status
   - Tag: **Feature: appointment-doctor-workflow-redesign, Property 4: For any appointment, the rendered appointment card should contain the scheduled time, patient name, and appointment status**

5. **Property 5: Session Documentation Persistence**
   - Generate: Random session data (procedures, recommendations)
   - Test: Save then retrieve yields equivalent data
   - Tag: **Feature: appointment-doctor-workflow-redesign, Property 5: For any session documentation data, when saved, it should be retrievable**

6. **Property 8: Photo Upload MIME Type Validation**
   - Generate: Random MIME types (valid and invalid)
   - Test: Only image/jpeg, image/png, image/webp accepted
   - Tag: **Feature: appointment-doctor-workflow-redesign, Property 8: For any file upload attempt, the photo upload component should only accept valid image MIME types**

7. **Property 9: Photo Upload Size Validation**
   - Generate: Random file sizes (below and above 10MB)
   - Test: Files >= 10MB rejected, files < 10MB accepted
   - Tag: **Feature: appointment-doctor-workflow-redesign, Property 9: For any file upload attempt, files >= 10MB should be rejected**

8. **Property 13: Patient Information Completeness**
   - Generate: Random patient with random subset of optional fields
   - Test: All present fields displayed, absent fields not displayed
   - Tag: **Feature: appointment-doctor-workflow-redesign, Property 13: For any selected appointment, the patient info section should display all available patient fields**

9. **Property 15: Previous Sessions Chronological Ordering**
   - Generate: Random array of sessions with random dates
   - Test: Displayed sessions sorted by date descending
   - Tag: **Feature: appointment-doctor-workflow-redesign, Property 15: For any list of previous sessions, they should be displayed in reverse chronological order**

10. **Property 18: Appointment Filtering Behavior**
    - Generate: Random appointments and random filter criteria
    - Test: Filtered list contains only matching appointments
    - Tag: **Feature: appointment-doctor-workflow-redesign, Property 18: For any combination of filters, the appointment list should display only matching appointments**

11. **Property 19: Appointment Count Accuracy**
    - Generate: Random appointments and random filters
    - Test: Displayed count equals number of filtered appointments
    - Tag: **Feature: appointment-doctor-workflow-redesign, Property 19: For any filter state, the displayed count should equal the number of appointments shown**

12. **Property 23: Treatment Information Display**
    - Generate: Random appointment with random treatments
    - Test: All treatment fields displayed (name, quantity, price, total, payment status)
    - Tag: **Feature: appointment-doctor-workflow-redesign, Property 23: For any appointment with treatments, all treatment information should be displayed**

13. **Property 24: Treatment Section Conditional Display**
    - Generate: Random appointments (some with treatments, some without)
    - Test: Treatment section shown iff treatments exist
    - Tag: **Feature: appointment-doctor-workflow-redesign, Property 24: For any appointment, the treatments section should be displayed if and only if treatments exist**

### Integration Testing

Integration tests will verify component interactions and data flow:

1. **Appointment Selection Flow**
   - Select appointment → Detail panel loads → Patient info displays
   - Verify API calls made with correct parameters
   - Verify state updates propagate correctly

2. **Session Documentation Flow**
   - Enter procedures → Save → Session created
   - Update procedures → Save → Session updated
   - Verify database state matches UI state

3. **Photo Upload Flow**
   - Request presigned URL → Upload to S3 → Confirm upload
   - Verify photo appears in list
   - Verify photo linked to correct session

4. **Filter Application Flow**
   - Apply date filter → List updates → Count updates
   - Apply status filter → List updates → Count updates
   - Combine filters → List shows intersection

5. **Status Update Flow**
   - Click status button → API call → UI refreshes
   - Verify appointment status updated in list and detail
   - Verify button visibility changes based on new status

### End-to-End Testing

E2E tests will verify complete user workflows:

1. **Doctor Daily Workflow**
   - View today's appointments
   - Select first appointment
   - Review patient history
   - Document session
   - Upload photos
   - Mark as completed
   - Move to next appointment

2. **Appointment Management**
   - Create new appointment
   - Verify auto-selection
   - Update appointment details
   - Cancel appointment
   - Verify list updates

3. **Responsive Behavior**
   - Test on mobile viewport (< 768px)
   - Test on tablet viewport (768px - 1024px)
   - Test on desktop viewport (> 1024px)
   - Verify layout changes at breakpoints
   - Verify overlay behavior on mobile

### Test Coverage Goals

- Unit test coverage: > 80% of component code
- Property test coverage: All identified properties (29 properties)
- Integration test coverage: All major user flows (5 flows)
- E2E test coverage: Critical workflows (3 workflows)
- Accessibility testing: WCAG 2.1 AA compliance verification
