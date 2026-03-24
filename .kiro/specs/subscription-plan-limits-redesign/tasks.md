# Implementation Plan: Subscription Plan Limits Redesign

## Overview

This implementation transforms the subscription system from boolean feature flags to quantitative daily appointment limits. The approach introduces a new usage tracking system with atomic counter operations, maintains backward compatibility, and ensures immediate limit updates on plan changes.

## Tasks

- [ ] 1. Create database schema and types for daily usage tracking
  - Create migration file for `daily_appointment_usage` table with composite primary key (user_id, usage_date)
  - Add Drizzle ORM schema definition in `backend/src/db/schema.ts`
  - Export TypeScript types for `DailyAppointmentUsage` and `NewDailyAppointmentUsage`
  - _Requirements: 2.3_

- [ ] 2. Update subscription plan configuration
  - [ ] 2.1 Add `dailyAppointmentLimit` field to `SubscriptionPlan` interface
    - Modify `backend/src/subscriptions/models/types.ts` to add `dailyAppointmentLimit: number` field
    - Remove `appointments: boolean` from features object
    - Update `PLANS` constant in `PlanManager.ts` with daily limits (free: 3, pro: 50, gold: -1)
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2_
  
  - [ ] 2.2 Add `getDailyAppointmentLimit` method to PlanManager
    - Implement method that returns daily limit for a given plan name
    - Handle free plan case (return 3 for free users)
    - _Requirements: 1.4_
  
  - [ ]* 2.3 Write property test for plan limit retrieval
    - **Property 1: Plan Limit Retrieval**
    - **Validates: Requirements 1.4**

- [ ] 3. Implement UsageTracker service
  - [ ] 3.1 Create UsageTracker class with database operations
    - Create `backend/src/subscriptions/services/UsageTracker.ts`
    - Implement `getCurrentUsage(userId: string): Promise<number>` method
    - Implement `incrementUsage(userId: string): Promise<number>` with atomic SQL operations
    - Implement `getUsageRecord(userId: string): Promise<DailyUsage | null>` method
    - Use UTC date formatting (YYYY-MM-DD) for date-based isolation
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [ ]* 3.2 Write property test for usage increment
    - **Property 3: Usage Increment on Creation**
    - **Validates: Requirements 2.1**
  
  - [ ]* 3.3 Write property test for date-based counter isolation
    - **Property 4: Date-Based Counter Isolation**
    - **Validates: Requirements 2.2**
  
  - [ ]* 3.4 Write property test for atomic counter operations
    - **Property 12: Atomic Counter Operations**
    - **Validates: Requirements 7.4**

- [ ] 4. Implement LimitEnforcer service
  - [ ] 4.1 Create LimitEnforcer class with orchestration logic
    - Create `backend/src/subscriptions/services/LimitEnforcer.ts`
    - Implement `checkDailyAppointmentLimit(userId: string): Promise<LimitCheckResult>` method
    - Implement `incrementDailyAppointmentUsage(userId: string): Promise<void>` method
    - Implement `getDailyAppointmentStatus(userId: string): Promise<LimitCheckResult>` method
    - Handle unlimited users (limit === -1) by skipping usage checks
    - Implement fail-open error handling for counter retrieval failures
    - Calculate next midnight UTC for resetTime field
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2_
  
  - [ ]* 4.2 Write property test for limit enforcement
    - **Property 5: Limit Enforcement**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  
  - [ ]* 4.3 Write property test for unlimited users bypass
    - **Property 7: Unlimited Users Bypass Limits**
    - **Validates: Requirements 3.5**
  
  - [ ]* 4.4 Write unit tests for error handling scenarios
    - Test counter retrieval failure allows creation (fail-open)
    - Test plan lookup failure applies free plan limits
    - Test invalid limit values treated as unlimited
    - _Requirements: 7.1, 7.2, 7.5_

- [ ] 5. Create custom error type for limit exceeded
  - Create `AppointmentLimitExceededError` class in `backend/src/subscriptions/models/errors.ts`
  - Include limit, currentUsage, and resetTime fields in constructor
  - _Requirements: 3.4_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Integrate limit enforcement into appointment service
  - [ ] 7.1 Modify appointment creation flow
    - Update `backend/src/services/appointmentService.ts` create method
    - Add limit check before appointment creation using `LimitEnforcer.checkDailyAppointmentLimit()`
    - Throw `AppointmentLimitExceededError` when limit exceeded
    - Add usage increment after successful creation using fire-and-forget pattern
    - Add error logging for increment failures without blocking creation
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 7.2 Write property test for limit exceeded response structure
    - **Property 6: Limit Exceeded Response Structure**
    - **Validates: Requirements 3.4**
  
  - [ ]* 7.3 Write integration tests for appointment creation with limits
    - Test successful creation when under limit
    - Test rejection when at limit
    - Test counter increment after creation
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 8. Add API endpoint for daily limit status
  - [ ] 8.1 Add GET /subscriptions/:userId/limits endpoint
    - Update `backend/src/subscriptions/api/SubscriptionAPI.ts`
    - Implement `getDailyLimitStatus` method with authorization check
    - Return limit, used, remaining, and resetTime fields
    - Handle unlimited users by returning -1 for remaining
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 8.2 Write property test for status endpoint completeness
    - **Property 8: Status Endpoint Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [ ] 9. Update subscription status API responses
  - [ ] 9.1 Add dailyAppointmentLimit to getSubscriptionStatus response
    - Modify `getSubscriptionStatus` method in `SubscriptionAPI.ts`
    - Include `dailyAppointmentLimit` field in response
    - Derive `appointments` boolean for backward compatibility (dailyAppointmentLimit > 0)
    - _Requirements: 6.4, 6.5_
  
  - [ ] 9.2 Add dailyAppointmentLimit to getAvailablePlans response
    - Modify `getAvailablePlans` method in `SubscriptionAPI.ts`
    - Include `dailyAppointmentLimit` field for each plan
    - _Requirements: 6.4_
  
  - [ ]* 9.3 Write property test for backward compatibility derivation
    - **Property 2: Backward Compatibility Derivation**
    - **Validates: Requirements 1.5, 6.5**
  
  - [ ]* 9.4 Write property test for API response structure
    - **Property 11: API Response Structure**
    - **Validates: Requirements 6.4**

- [ ] 10. Implement plan change immediate effect
  - [ ] 10.1 Verify limit updates on plan changes
    - Ensure `LimitEnforcer` retrieves current plan from `PlanManager` on each check
    - No caching of plan limits to ensure immediate effect
    - _Requirements: 5.1, 5.2_
  
  - [ ]* 10.2 Write property test for plan change immediate effect
    - **Property 9: Plan Change Immediate Effect**
    - **Validates: Requirements 5.1, 5.2**
  
  - [ ]* 10.3 Write property test for usage preservation on plan change
    - **Property 10: Usage Preservation on Plan Change**
    - **Validates: Requirements 5.4**
  
  - [ ]* 10.4 Write unit test for downgrade while over limit
    - Test that user with 10 appointments who downgrades to free plan (limit 3) is blocked from creating more appointments
    - _Requirements: 5.3_

- [ ] 11. Add error handling middleware for appointment API
  - Update appointment API routes to catch `AppointmentLimitExceededError`
  - Return HTTP 429 with structured error response (limit, used, remaining, resetTime)
  - _Requirements: 3.4_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All code uses TypeScript as specified in the design document
- Database operations use Drizzle ORM with atomic SQL for counter increments
- Error handling follows fail-open approach to prioritize availability
