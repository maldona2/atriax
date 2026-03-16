# Implementation Plan: Google Calendar Sync

## Overview

This implementation plan breaks down the Google Calendar sync feature into discrete coding tasks. The feature includes OAuth 2.0 authentication, async sync service with retry logic, database migrations, API endpoints, and comprehensive testing. Tasks are organized to build incrementally, with early validation through code and tests.

## Tasks

- [ ] 1. Database schema and migrations
  - [ ] 1.1 Create database schema for Google Calendar integration
    - Add `google_calendar_tokens` table with encrypted token storage
    - Add `calendar_sync_status` table for tracking sync state
    - Add `calendar_sync_queue` table for async job processing
    - Create appropriate indexes for performance
    - _Requirements: 1.2, 7.1, 8.1_
  
  - [ ] 1.2 Create database migration files
    - Generate Drizzle migration for new tables
    - Test migration up and down
    - _Requirements: 1.2_

- [ ] 2. Google OAuth service implementation
  - [ ] 2.1 Create Google Auth service with OAuth flow
    - Implement `GoogleAuthService` class in `backend/src/services/googleAuthService.ts`
    - Implement `getAuthorizationUrl()` method with state parameter
    - Implement `handleCallback()` method to exchange code for tokens
    - Implement token encryption/decryption utilities
    - Store tokens securely in `google_calendar_tokens` table
    - _Requirements: 1.1, 1.2, 7.1_
  
  <!-- - [ ]* 2.2 Write property test for OAuth token secure storage
    - **Property 1: OAuth Token Secure Storage**
    - **Validates: Requirements 1.2, 7.1** -->
  
  - [ ] 2.3 Implement automatic token refresh
    - Implement `getAccessToken()` method with automatic refresh
    - Check token expiration before returning
    - Refresh token if expired using Google OAuth API
    - Update stored token with new values
    - _Requirements: 1.3_
  
  <!-- - [ ]* 2.4 Write property test for automatic token refresh
    - **Property 2: Automatic Token Refresh**
    - **Validates: Requirements 1.3**
   -->
  - [ ] 2.5 Implement token revocation and connection status
    - Implement `disconnect()` method to revoke tokens
    - Implement `isConnected()` method to check connection status
    - _Requirements: 1.4, 7.4_
  
  <!-- - [ ]* 2.6 Write property test for token refresh failure notification
    - **Property 3: Token Refresh Failure Notification**
    - **Validates: Requirements 1.4**
  
  - [ ]* 2.7 Write unit tests for Google Auth service
    - Test OAuth URL generation with correct parameters
    - Test callback handling with mock Google API
    - Test error handling for invalid tokens
    - _Requirements: 1.1, 1.2, 1.3, 1.4_ -->

- [ ] 3. Event formatter implementation
  - [ ] 3.1 Create event formatter service
    - Implement `EventFormatter` class in `backend/src/services/eventFormatter.ts`
    - Implement `formatEvent()` method to convert appointment to calendar event
    - Include patient name, appointment type, contact info, notes, and link
    - Implement timezone conversion logic
    - Ensure privacy compliance (no sensitive medical data)
    - _Requirements: 2.2, 6.1, 6.2, 6.3, 6.4, 6.5, 7.3_
  
  <!-- - [ ]* 3.2 Write property test for calendar event required fields
    - **Property 5: Calendar Event Required Fields**
    - **Validates: Requirements 2.2, 6.1, 6.2, 6.5**
  
  - [ ]* 3.3 Write property test for calendar event time accuracy
    - **Property 6: Calendar Event Time Accuracy**
    - **Validates: Requirements 6.3, 6.4**
  
  - [ ]* 3.4 Write property test for privacy-compliant event content
    - **Property 14: Privacy-Compliant Event Content**
    - **Validates: Requirements 7.3** -->
  
  - [ ] 3.5 Implement event update formatter
    - Implement `formatEventUpdate()` method for partial updates
    - _Requirements: 2.3_
  
  <!-- - [ ]* 3.6 Write unit tests for event formatter
    - Test event formatting with complete appointment data
    - Test event formatting with minimal data
    - Test timezone conversion edge cases
    - Test link generation
    - _Requirements: 2.2, 6.1, 6.2, 6.3, 6.4, 6.5, 7.3_ -->

- [ ] 4. Rate limiter implementation
  - [ ] 4.1 Create rate limiter service
    - Implement `RateLimiter` class in `backend/src/services/rateLimiter.ts`
    - Implement token bucket algorithm
    - Implement `canProceed()` method to check capacity
    - Implement `recordCall()` method to track usage
    - Implement `waitForCapacity()` method for queueing
    - Store rate limit state in memory or Redis
    - _Requirements: 11.1, 11.2_
  
  <!-- - [ ]* 4.2 Write property test for rate limit queueing
    - **Property 21: Rate Limit Queueing**
    - **Validates: Requirements 11.2**
  
  - [ ]* 4.3 Write unit tests for rate limiter
    - Test token bucket algorithm implementation
    - Test capacity checking
    - Test usage tracking
    - Test reset timing
    - _Requirements: 11.1, 11.2_ -->

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Sync queue implementation
  - [ ] 6.1 Create sync queue service
    - Implement `SyncQueue` class in `backend/src/services/syncQueue.ts`
    - Implement `enqueue()` method to add jobs to database queue
    - Implement `processNext()` method to fetch and process jobs
    - Implement `retry()` method with exponential backoff calculation
    - Implement priority ordering logic
    - _Requirements: 5.1, 5.2, 11.4_
  
  <!-- - [ ]* 6.2 Write property test for sync failure retry with exponential backoff
    - **Property 12: Sync Failure Retry with Exponential Backoff**
    - **Validates: Requirements 2.5, 3.4, 5.1, 5.2**
  
  - [ ]* 6.3 Write property test for maximum retry limit
    - **Property 13: Maximum Retry Limit**
    - **Validates: Requirements 5.3, 5.4**
  
  - [ ]* 6.4 Write property test for operation priority
    - **Property 23: Operation Priority**
    - **Validates: Requirements 11.4**
  
  - [ ]* 6.5 Write unit tests for sync queue
    - Test job enqueueing
    - Test priority ordering
    - Test retry scheduling
    - Test exponential backoff calculation
    - _Requirements: 5.1, 5.2, 5.3, 11.4_ -->

- [ ] 7. Calendar sync service implementation
  - [ ] 7.1 Create calendar sync service core
    - Implement `CalendarSyncService` class in `backend/src/services/calendarSyncService.ts`
    - Set up Google Calendar API client
    - Implement helper methods for API calls (create, update, delete events)
    - Integrate with `GoogleAuthService` for token management
    - Integrate with `EventFormatter` for event formatting
    - Integrate with `RateLimiter` for API quota management
    - _Requirements: 2.1, 2.3, 3.1, 7.2_
  
  - [ ] 7.2 Implement single appointment sync
    - Implement `syncAppointment()` method
    - Check if appointment is confirmed
    - Check if event already exists (update vs create)
    - Create or update calendar event via Google API
    - Store event ID in `calendar_sync_status` table
    - Update sync status and timestamp
    - Handle API errors with retry logic
    - _Requirements: 2.1, 2.3, 2.4, 8.2_
<!--   
  - [ ]* 7.3 Write property test for confirmed appointment sync
    - **Property 4: Confirmed Appointment Sync**
    - **Validates: Requirements 2.1, 4.3**
  
  - [ ]* 7.4 Write property test for confirmed appointment update sync
    - **Property 7: Confirmed Appointment Update Sync**
    - **Validates: Requirements 2.3**
  
  - [ ]* 7.5 Write property test for event ID storage
    - **Property 8: Event ID Storage**
    - **Validates: Requirements 2.4**
  
  - [ ]* 7.6 Write property test for non-confirmed appointment exclusion
    - **Property 11: Non-Confirmed Appointment Exclusion**
    - **Validates: Requirements 4.1** -->
  
  - [ ] 7.7 Implement calendar event deletion
    - Implement `deleteCalendarEvent()` method
    - Fetch event ID from `calendar_sync_status` table
    - Delete event via Google Calendar API
    - Handle 404 errors gracefully (event already deleted)
    - Update sync status to "unsynced"
    - _Requirements: 3.1, 3.2, 3.3_
  
  <!-- - [ ]* 7.8 Write property test for canceled appointment deletion
    - **Property 9: Canceled Appointment Deletion**
    - **Validates: Requirements 3.1, 3.3, 4.2**
  
  - [ ]* 7.9 Write property test for graceful missing event handling
    - **Property 10: Graceful Missing Event Handling**
    - **Validates: Requirements 3.2** -->
  
  - [ ] 7.10 Implement batch sync for initial sync
    - Implement `syncAllAppointments()` method
    - Fetch all confirmed appointments for doctor
    - Process in batches to avoid rate limits
    - Track progress and handle interruptions
    - Return batch sync result with success/failure counts
    - _Requirements: 9.1, 9.2, 9.3_
  
  <!-- - [ ]* 7.11 Write property test for initial sync all confirmed appointments
    - **Property 17: Initial Sync All Confirmed Appointments**
    - **Validates: Requirements 9.1**
  
  - [ ]* 7.12 Write property test for batch processing for initial sync
    - **Property 18: Batch Processing for Initial Sync**
    - **Validates: Requirements 9.2**
  
  - [ ]* 7.13 Write property test for initial sync resumption
    - **Property 19: Initial Sync Resumption**
    - **Validates: Requirements 9.4**
   -->
  - [ ] 7.14 Implement sync status tracking
    - Implement `getSyncStatus()` method
    - Implement `retryFailedSync()` method
    - _Requirements: 8.1, 8.4_
  
  <!-- - [ ]* 7.15 Write property test for sync status update on success
    - **Property 16: Sync Status Update on Success**
    - **Validates: Requirements 8.2**
  
  - [ ]* 7.16 Write unit tests for calendar sync service
    - Test event creation with specific appointment data
    - Test event update with partial data
    - Test event deletion
    - Test error handling for API failures
    - Test sync status updates
    - _Requirements: 2.1, 2.3, 3.1, 8.2_ -->

- [ ] 8. Error handling and logging
  - [ ] 8.1 Implement comprehensive error handling
    - Add error handling for authentication errors (401)
    - Add error handling for rate limiting (429) with backoff
    - Add error handling for network errors with retry
    - Add error handling for validation errors
    - Add error handling for 404 (event not found)
    - _Requirements: 5.1, 5.2, 11.3_
  
  <!-- - [ ]* 8.2 Write property test for HTTP 429 handling
    - **Property 22: HTTP 429 Handling**
    - **Validates: Requirements 11.3** -->
  
  - [ ] 8.3 Implement logging for all operations
    - Log all sync operations with timestamp and outcome
    - Log errors with API response details
    - Log OAuth token refresh events
    - Log rate limit events
    - _Requirements: 12.1, 12.2, 12.3, 11.5_
<!--   
  - [ ]* 8.4 Write property test for comprehensive operation logging
    - **Property 24: Comprehensive Operation Logging**
    - **Validates: Requirements 12.1, 12.2**
  
  - [ ]* 8.5 Write property test for token refresh logging
    - **Property 25: Token Refresh Logging**
    - **Validates: Requirements 12.3** -->
  
  - [ ] 8.6 Implement monitoring and alerting
    - Track sync success rate and latency metrics
    - Implement alert for high failure rate (>5%)
    - _Requirements: 12.4, 12.5_
  
  <!-- - [ ]* 8.7 Write property test for high failure rate alerting
    - **Property 26: High Failure Rate Alerting**
    - **Validates: Requirements 12.5** -->

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. API routes for OAuth flow
  - [ ] 10.1 Create OAuth routes
    - Create `backend/src/routes/googleCalendar.ts`
    - Implement `GET /api/auth/google/calendar` to initiate OAuth flow
    - Implement `GET /api/auth/google/calendar/callback` to handle OAuth callback
    - Implement `GET /api/calendar/status` to check connection status
    - Implement `DELETE /api/calendar/disconnect` to disconnect calendar
    - Add authentication middleware to protect routes
    - _Requirements: 1.1, 7.4, 10.1_
  
  <!-- - [ ]* 10.2 Write integration tests for OAuth routes
    - Test OAuth flow from initiation to token storage
    - Test connection status endpoint
    - Test disconnect endpoint
    - _Requirements: 1.1, 7.4, 10.1_ -->

- [ ] 11. API routes for sync operations
  - [ ] 11.1 Create sync routes
    - Add to `backend/src/routes/googleCalendar.ts`
    - Implement `POST /api/calendar/sync/:appointmentId` for manual sync
    - Implement `POST /api/calendar/sync/all` for initial sync
    - Implement `GET /api/calendar/sync/:appointmentId/status` for sync status
    - Implement `POST /api/calendar/sync/:appointmentId/retry` for retry
    - Add authentication and authorization middleware
    - _Requirements: 8.1, 8.4, 9.1_
  
  <!-- - [ ]* 11.2 Write integration tests for sync routes
    - Test manual sync endpoint
    - Test initial sync endpoint
    - Test sync status endpoint
    - Test retry endpoint
    - _Requirements: 8.1, 8.4, 9.1_ -->

- [ ] 12. Event-driven sync integration
  - [ ] 12.1 Integrate sync with appointment lifecycle
    - Modify `backend/src/services/appointmentService.ts` to emit sync events
    - Emit event when appointment status changes to "confirmed"
    - Emit event when confirmed appointment is updated
    - Emit event when appointment is canceled or deleted
    - Enqueue sync jobs in response to events
    - _Requirements: 2.1, 2.3, 3.1, 4.2_
  
  <!-- - [ ]* 12.2 Write integration tests for event-driven sync
    - Test appointment lifecycle with calendar sync (create → confirm → update → cancel)
    - Verify calendar events created, updated, and deleted appropriately
    - _Requirements: 2.1, 2.3, 3.1, 4.2_ -->

- [ ] 13. Background worker for queue processing
  - [ ] 13.1 Create queue processor worker
    - Create `backend/src/workers/calendarSyncWorker.ts`
    - Implement continuous queue processing loop
    - Process jobs from `calendar_sync_queue` table
    - Handle job failures and retries
    - Implement graceful shutdown
    - _Requirements: 5.1, 5.5_
  
  <!-- - [ ]* 13.2 Write integration tests for queue worker
    - Test queue processing with multiple jobs
    - Test retry logic with failures
    - Test graceful shutdown
    - _Requirements: 5.1, 5.5_ -->

- [ ] 14. Disconnect and cleanup implementation
  - [ ] 14.1 Implement full disconnect flow
    - Enhance `disconnect()` method in `GoogleAuthService`
    - Delete all calendar events created by the system
    - Revoke OAuth token with Google
    - Remove token from database
    - Reset all sync statuses to "unsynced"
    - _Requirements: 10.2, 10.3, 10.4, 10.5_
  
  <!-- - [ ]* 14.2 Write property test for token revocation on disconnect
    - **Property 15: Token Revocation on Disconnect**
    - **Validates: Requirements 7.4, 10.3**
  
  - [ ]* 14.3 Write property test for disconnect cleanup
    - **Property 20: Disconnect Cleanup**
    - **Validates: Requirements 10.2, 10.4**
  
  - [ ]* 14.4 Write integration tests for disconnect flow
    - Test complete disconnect and cleanup flow
    - Verify all events deleted from Google Calendar
    - Verify token removed from database
    - Verify sync statuses reset
    - _Requirements: 10.2, 10.3, 10.4, 10.5_ -->

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Frontend OAuth integration
  - [ ] 16.1 Create Google Calendar settings component
    - Create `frontend/src/components/settings/GoogleCalendarSettings.tsx`
    - Display connection status
    - Add "Connect Google Calendar" button to initiate OAuth
    - Add "Disconnect" button for connected users
    - Display last sync timestamp
    - Handle OAuth callback redirect
    - _Requirements: 1.1, 7.4, 8.5, 10.1_
<!--   
  - [ ]* 16.2 Write unit tests for Google Calendar settings component
    - Test connection status display
    - Test OAuth initiation
    - Test disconnect flow
    - _Requirements: 1.1, 7.4, 10.1_ -->

- [ ] 17. Frontend sync status display
  - [ ] 17.1 Add sync status to appointment views
    - Modify appointment list/detail components to show sync status
    - Display sync status icon (synced, pending, failed)
    - Display last synced timestamp
    - Add manual retry button for failed syncs
    - Show sync progress during initial sync
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 9.3_
  
  <!-- - [ ]* 17.2 Write unit tests for sync status display
    - Test sync status icon rendering
    - Test retry button functionality
    - Test progress display
    - _Requirements: 8.1, 8.3, 8.4_ -->

- [ ] 18. Configuration and environment setup
  - [ ] 18.1 Add Google Calendar configuration
    - Add Google OAuth credentials to environment variables
    - Add sync configuration (retry limits, backoff, batch size)
    - Add rate limit configuration
    - Create configuration module in `backend/src/config/googleCalendar.ts`
    - _Requirements: 1.1, 5.3, 9.2, 11.1_
  
  - [ ] 18.2 Update documentation
    - Document environment variables needed
    - Document OAuth setup process
    - Document API endpoints
    - _Requirements: 1.1_

- [ ] 19. Final integration and wiring
  - [ ] 19.1 Wire all components together
    - Register routes in `backend/src/app.ts`
    - Start queue worker in `backend/src/index.ts`
    - Add Google Calendar settings to frontend settings page
    - Ensure all services properly initialized
    - _Requirements: All_
<!--   
  - [ ]* 19.2 Write end-to-end integration tests
    - Test complete OAuth flow
    - Test appointment lifecycle with sync
    - Test initial sync
    - Test disconnect and cleanup
    - Test error scenarios and recovery
    - _Requirements: All_ -->

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout
- Google Calendar API v3 is used for all calendar operations
- OAuth 2.0 is used for secure authentication
- Async queue processing ensures reliable sync operations
- Rate limiting prevents API quota exhaustion
- Comprehensive logging enables troubleshooting and monitoring
