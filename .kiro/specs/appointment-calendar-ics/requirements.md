# Requirements Document

## Introduction

This feature adds iCalendar (.ics) file attachments to appointment confirmation emails, enabling clients to easily save appointments to their calendar applications. The system currently sends appointment emails (booked, confirmed, cancelled, reminder) but lacks calendar integration, forcing clients to manually create calendar events.

## Glossary

- **Email_Service**: The mail service responsible for sending appointment emails via Resend API
- **ICS_Generator**: The component that generates iCalendar format data conforming to RFC 5545
- **Appointment_Email**: Email notifications sent for appointment lifecycle events (booked, confirmed, cancelled, reminder)
- **Calendar_Attachment**: An .ics file attached to an email containing event information
- **VEVENT**: The iCalendar component representing a calendar event
- **VTIMEZONE**: The iCalendar component representing timezone information

## Requirements

### Requirement 1: Generate ICS Calendar Data

**User Story:** As a client, I want to receive calendar event data with appointment emails, so that I can easily add appointments to my calendar application.

#### Acceptance Criteria

1. WHEN an appointment email is sent, THE ICS_Generator SHALL generate valid iCalendar format data conforming to RFC 5545
2. THE ICS_Generator SHALL include VEVENT component with summary, description, start time, end time, and location fields
3. THE ICS_Generator SHALL include VTIMEZONE component for America/Argentina/Buenos_Aires timezone
4. THE ICS_Generator SHALL calculate end time from start time and duration in minutes
5. THE ICS_Generator SHALL format timestamps in UTC with TZID parameter for local timezone
6. THE ICS_Generator SHALL include organizer information using the professional name
7. THE ICS_Generator SHALL include attendee information using the patient name and email

### Requirement 2: Attach ICS to Appointment Emails

**User Story:** As a client, I want calendar attachments included in appointment emails, so that I can save appointments with one click.

#### Acceptance Criteria

1. WHEN the Email_Service sends a booked appointment email, THE Email_Service SHALL attach a Calendar_Attachment
2. WHEN the Email_Service sends a confirmed appointment email, THE Email_Service SHALL attach a Calendar_Attachment
3. WHEN the Email_Service sends a reminder appointment email, THE Email_Service SHALL attach a Calendar_Attachment
4. THE Email_Service SHALL set the attachment filename to "appointment.ics"
5. THE Email_Service SHALL set the attachment MIME type to "text/calendar"

### Requirement 3: Handle Cancellation Events

**User Story:** As a client, I want cancellation emails to include calendar updates, so that cancelled appointments are removed from my calendar automatically.

#### Acceptance Criteria

1. WHEN the Email_Service sends a cancelled appointment email, THE ICS_Generator SHALL generate a cancellation event with METHOD:CANCEL
2. THE ICS_Generator SHALL include STATUS:CANCELLED in the VEVENT component for cancelled appointments
3. THE ICS_Generator SHALL maintain the same UID for cancelled events as the original event to enable calendar application updates

### Requirement 4: Ensure Unique Event Identifiers

**User Story:** As a developer, I want each appointment to have a unique calendar event identifier, so that calendar applications can properly update or cancel events.

#### Acceptance Criteria

1. THE ICS_Generator SHALL generate a unique UID for each appointment event
2. THE ICS_Generator SHALL use a deterministic UID format based on appointment ID and system domain
3. FOR ALL appointment emails related to the same appointment, THE ICS_Generator SHALL use the same UID value

### Requirement 5: Parse and Format ICS Data

**User Story:** As a developer, I want to ensure ICS data is correctly formatted, so that calendar applications can parse the attachments without errors.

#### Acceptance Criteria

1. THE ICS_Generator SHALL format line breaks using CRLF (\\r\\n) as specified in RFC 5545
2. THE ICS_Generator SHALL fold lines longer than 75 octets per RFC 5545 folding rules
3. THE ICS_Generator SHALL escape special characters (comma, semicolon, backslash, newline) in text fields
4. WHEN notes contain newline characters, THE ICS_Generator SHALL replace them with escaped newline sequences (\\n)
5. FOR ALL valid appointment data, generating ICS data then parsing it SHALL produce equivalent event information (round-trip property)

### Requirement 6: Support Email Client Compatibility

**User Story:** As a client, I want calendar attachments to work across different email clients, so that I can use my preferred email application.

#### Acceptance Criteria

1. THE Calendar_Attachment SHALL be compatible with Gmail calendar integration
2. THE Calendar_Attachment SHALL be compatible with Outlook calendar integration
3. THE Calendar_Attachment SHALL be compatible with Apple Mail calendar integration
4. THE Calendar_Attachment SHALL be compatible with mobile email clients (iOS Mail, Android Gmail)

### Requirement 7: Include Appointment Details in Calendar Event

**User Story:** As a client, I want appointment details included in the calendar event, so that I have all necessary information in my calendar.

#### Acceptance Criteria

1. THE ICS_Generator SHALL include the professional name in the event summary
2. WHEN appointment notes exist, THE ICS_Generator SHALL include notes in the event description
3. THE ICS_Generator SHALL include duration information in the VEVENT component
4. THE ICS_Generator SHALL set the event status to CONFIRMED for booked and confirmed appointments

