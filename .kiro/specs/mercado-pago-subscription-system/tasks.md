# Implementation Plan: Mercado Pago Subscription System

## Overview

This implementation plan breaks down the Mercado Pago Subscription System into discrete coding tasks. The system will be built incrementally, starting with core data models and configuration, then adding payment gateway integration, webhook processing, usage tracking, and finally API endpoints. Each task builds on previous work to ensure a cohesive implementation.

## Tasks

- [x] 1. Set up project structure and configuration
  - Create directory structure for components (models, services, api, utils)
  - Define TypeScript interfaces and types for all data models
  - Set up environment variable configuration loader
  - Validate required environment variables (Mercado Pago access token, public key, webhook secret, callback URL)
  - Set up database connection and migration framework
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 17.1_

- [x] 2. Implement database schemas and models
  - [x] 2.1 Create database migration for users table
    - Implement users table with subscription fields and usage tracking fields
    - Add indexes for subscription_plan and billing_month
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 2.2 Create database migration for subscriptions table
    - Implement subscriptions table with Mercado Pago metadata
    - Add indexes for user_id, preapproval_id, and status
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 2.3 Create database migration for webhook_events table
    - Implement webhook_events table for idempotency tracking
    - Add unique constraint on webhook_id
    - Add indexes for webhook_id, user_id, and created_at
    - _Requirements: 13.7_

  - [x] 2.4 Create database migration for model_pricing table
    - Implement model_pricing table with per-token pricing
    - Add index for model_name
    - Seed initial pricing data for GPT models
    - _Requirements: 7.2_

- [x] 3. Implement Plan Manager component
  - [x] 3.1 Create SubscriptionPlan interface and PlanManager class
    - Define plan configurations for free, pro, and enterprise tiers
    - Implement getPlans(), getPlan(), and getLimits() methods
    - Use sentinel value (-1) for unlimited limits
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]*  3.2 Write property test for Plan Manager
    - **Property 1: Plan completeness**
    - **Property 2: Sentinel value consistency**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**

  - [ ]* 3.3 Write unit tests for Plan Manager
    - Test all three plans are defined with correct structure
    - Test plan lookup by name (valid and invalid names)
    - Test getLimits returns correct limits for each plan
    - _Requirements: 1.1_

- [x] 4. Implement Payment Gateway Client
  - [x] 4.1 Create PaymentGatewayClient class with Mercado Pago integration
    - Implement constructor with access token and public key
    - Implement formatExternalReference() method with format "user:{userId}|plan:{plan}"
    - Implement createPreApproval() method with all required fields
    - Implement cancelSubscription(), pauseSubscription(), resumeSubscription() methods
    - Add error handling for Mercado Pago API failures
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 16.5, 17.2_

  - [ ]* 4.2 Write property test for external reference formatting
    - **Property 3: External reference round trip**
    - **Validates: Requirements 2.2, 4.3**

  - [ ]* 4.3 Write unit tests for Payment Gateway Client
    - Test external reference formatting with various user IDs and plans
    - Test PreApproval request construction with mocked Mercado Pago API
    - Test error handling for API failures
    - Test subscription lifecycle actions (cancel, pause, resume)
    - _Requirements: 2.1, 3.1, 3.2, 3.3_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Cost Calculator component
  - [x] 6.1 Create CostCalculator class with model pricing
    - Implement ModelPricing interface and CostCalculation interface
    - Load pricing data from model_pricing table
    - Implement calculateCost() method with input/output token pricing
    - Implement getPricing() method for model lookup
    - Ensure cost precision to at least 4 decimal places
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 6.2 Write property test for cost calculation
    - **Property 13: Cost calculation accuracy**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

  - [ ]* 6.3 Write unit tests for Cost Calculator
    - Test cost calculation with known pricing and token counts
    - Test precision (verify 4+ decimal places)
    - Test separate input/output token pricing
    - Test getPricing with valid and invalid model names
    - _Requirements: 7.1, 7.4_

- [x] 7. Implement Token Tracker component
  - [x] 7.1 Create TokenTracker class with usage tracking
    - Implement recordTokenUsage() method to update users table
    - Implement getCurrentUsage() method to retrieve current billing month usage
    - Implement resetMonthlyUsage() method for billing period transitions
    - Implement canConsumeTokens() method for pre-flight checks
    - Associate token usage with billing month (YYYY-MM format)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 7.2 Write property test for token usage accumulation
    - **Property 11: Token usage accumulation**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 7.3 Write unit tests for Token Tracker
    - Test token accumulation across multiple API calls
    - Test monthly reset logic
    - Test usage retrieval for current billing month
    - Test canConsumeTokens with various usage scenarios
    - _Requirements: 6.1, 6.3, 6.4_

- [x] 8. Implement Usage Enforcer component
  - [x] 8.1 Create UsageEnforcer class with limit enforcement
    - Implement checkTokenLimit() method with sentinel value handling
    - Implement checkCostLimit() method with sentinel value handling
    - Implement checkClinicalNotesLimit() method with sentinel value handling
    - Implement checkRecordingMinutesLimit() method with sentinel value handling
    - Implement increment methods for all resource types
    - Return descriptive UsageCheck objects with allowed flag and reason
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ]* 8.2 Write property tests for usage enforcement
    - **Property 14: Sentinel value bypass**
    - **Property 15: Token limit enforcement**
    - **Property 23: Clinical notes limit enforcement**
    - **Property 24: Recording minutes limit enforcement**
    - **Validates: Requirements 8.3, 8.4, 8.5, 8.6, 9.3, 14.3, 14.4, 14.5, 14.6, 15.3, 15.4, 15.5, 15.6**

  - [ ]* 8.3 Write unit tests for Usage Enforcer
    - Test enforcement at exact limit boundary
    - Test enforcement one below limit (should allow)
    - Test enforcement one above limit (should reject)
    - Test sentinel value bypass for each resource type
    - Test increment methods update database correctly
    - _Requirements: 8.5, 8.6, 14.5, 14.6, 15.5, 15.6_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Webhook Handler component
  - [x] 10.1 Create WebhookHandler class with signature validation
    - Implement validateWebhook() method using webhook secret
    - Implement parseExternalReference() method to extract userId and plan
    - Implement idempotency check using webhook_events table
    - Add logging for all webhook events
    - _Requirements: 4.1, 4.3, 4.7, 5.1, 13.3, 13.7_

  - [x] 10.2 Implement payment webhook processing
    - Implement handlePaymentWebhook() method
    - Extract external reference from payment metadata
    - Parse user ID and plan from external reference
    - Update user subscription plan in users table
    - Update all usage limits based on new plan
    - Record billing period start date in subscriptions table
    - Store processed webhook in webhook_events table
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 10.9_

  - [x] 10.3 Implement PreApproval webhook processing
    - Implement handlePreApprovalWebhook() method
    - Handle "authorized" action: update subscription status to active
    - Handle "cancelled" action: downgrade user to free plan
    - Handle "paused" action: update subscription status to paused
    - Handle "failed" action: update subscription status to failed
    - Log all PreApproval status changes with timestamp and PreApproval ID
    - Store processed webhook in webhook_events table
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 10.4 Write property tests for webhook processing
    - **Property 7: Webhook signature validation**
    - **Property 8: Payment webhook processing**
    - **Property 9: PreApproval status transitions**
    - **Property 10: Webhook event logging**
    - **Property 22: Webhook idempotency**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 13.3, 13.7**

  - [ ]* 10.5 Write unit tests for Webhook Handler
    - Test signature validation with valid and invalid signatures
    - Test external reference parsing with valid and malformed formats
    - Test idempotency with duplicate webhook IDs
    - Test each PreApproval action (authorized, cancelled, paused, failed)
    - Test payment webhook updates user subscription correctly
    - _Requirements: 4.1, 4.3, 5.2, 5.3, 5.4, 5.5, 13.7_

- [x] 11. Implement Subscription API endpoints
  - [x] 11.1 Create SubscriptionAPI class with authentication middleware
    - Set up JWT-based authentication for API endpoints
    - Implement authentication middleware that returns 401 for invalid tokens
    - Extract user ID from JWT claims
    - _Requirements: 12.7, 12.8_

  - [x] 11.2 Implement subscription management endpoints
    - Implement POST /subscriptions endpoint to create new subscription
    - Implement DELETE /subscriptions/:userId endpoint to cancel subscription
    - Implement POST /subscriptions/:userId/pause endpoint to pause subscription
    - Implement POST /subscriptions/:userId/resume endpoint to resume subscription
    - Implement GET /subscriptions/:userId endpoint to retrieve subscription status
    - Implement GET /plans endpoint to retrieve available plans
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 11.3 Implement webhook endpoints
    - Implement POST /webhooks/payment endpoint with signature validation
    - Implement POST /webhooks/preapproval endpoint with signature validation
    - Return 400 Bad Request for invalid payload structure
    - Return 200 OK for successfully processed webhooks
    - Return 401 Unauthorized or 400 Bad Request for invalid signatures
    - _Requirements: 13.1, 13.2, 13.4, 13.5, 13.6_

  - [ ]* 11.4 Write property test for API authentication
    - **Property 19: API authentication enforcement**
    - **Validates: Requirements 12.7, 12.8**

  - [ ]* 11.5 Write unit tests for Subscription API
    - Test each endpoint with valid and invalid authentication
    - Test subscription creation returns PreApproval initialization URL
    - Test subscription lifecycle actions call Payment Gateway correctly
    - Test getSubscriptionStatus returns complete status with usage data
    - Test webhook endpoints validate signatures and payloads
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 13.4, 13.5, 13.6_

- [x] 12. Implement billing period and usage reset logic
  - [x] 12.1 Create scheduled job for monthly token and cost reset
    - Implement job that runs at billing period boundaries
    - Reset tokens_used_monthly and cost_used_monthly_usd for all users
    - Update billing_month field to current month (YYYY-MM format)
    - _Requirements: 6.4, 11.7_

  - [x] 12.2 Create scheduled job for daily recording minutes reset
    - Implement job that runs at day boundaries (midnight)
    - Reset recording_minutes_used_daily for all users
    - Update daily_usage_date field to current date
    - _Requirements: 15.7_

  - [ ]* 12.3 Write property tests for reset logic
    - **Property 12: Monthly token reset**
    - **Property 25: Daily recording reset**
    - **Validates: Requirements 6.4, 15.7**

  - [ ]* 12.4 Write unit tests for reset jobs
    - Test monthly reset updates all users correctly
    - Test daily reset updates all users correctly
    - Test reset jobs handle database errors gracefully
    - _Requirements: 6.4, 15.7_

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement error handling and logging
  - [x] 14.1 Add comprehensive error handling for all components
    - Implement error handling for webhook processing errors (invalid signature, malformed payload, database errors, duplicates)
    - Implement error handling for Payment Gateway errors (API unavailable, invalid PreApproval ID, already cancelled, network timeout)
    - Implement error handling for usage limit errors (token, cost, clinical notes, recording minutes)
    - Implement error handling for configuration errors (missing environment variables, invalid pricing)
    - Implement error handling for database errors (connection failure, constraint violation, transaction deadlock)
    - Return appropriate HTTP status codes and error messages
    - _Requirements: 3.5, 4.7_

  - [x] 14.2 Add structured logging throughout the system
    - Log all webhook events with timestamp and details
    - Log all Payment Gateway API calls and responses
    - Log all usage limit violations
    - Log all configuration and database errors
    - Log security events (invalid webhook signatures)
    - _Requirements: 4.7, 5.6_

  - [ ]* 14.3 Write unit tests for error handling
    - Test each error scenario returns correct status code and message
    - Test retry logic for transient failures
    - Test logging captures all required information
    - _Requirements: 3.5, 4.7_

- [x] 15. Implement database persistence for subscription operations
  - [x] 15.1 Implement subscription creation persistence
    - Store PreApproval ID in subscriptions table after successful creation
    - Associate PreApproval ID with user ID
    - Store initial subscription status and billing period
    - _Requirements: 2.6, 2.7_

  - [x] 15.2 Implement plan change synchronization
    - Update all limit fields in users table when subscription plan changes
    - Ensure limits match new plan definition exactly
    - Update subscription_plan and subscription_status fields
    - _Requirements: 10.9_

  - [ ]* 15.3 Write property test for plan change synchronization
    - **Property 17: Plan change synchronization**
    - **Validates: Requirements 10.9**

  - [ ]* 15.4 Write unit tests for subscription persistence
    - Test PreApproval ID is stored correctly after creation
    - Test plan change updates all limit fields
    - Test subscription status updates persist correctly
    - _Requirements: 2.6, 2.7, 10.9_

- [x] 16. Implement cost accumulation and enforcement
  - [x] 16.1 Integrate Cost Calculator with Token Tracker
    - Calculate actual cost after each OpenAI API call completes
    - Add cost to user's monthly cost total in users table
    - Implement cost limit enforcement that rejects subsequent calls when limit exceeded
    - _Requirements: 9.5, 9.6, 9.7_

  - [ ]* 16.2 Write property test for cost accumulation
    - **Property 16: Cost accumulation and enforcement**
    - **Validates: Requirements 9.5, 9.6, 9.7**

  - [ ]* 16.3 Write unit tests for cost accumulation
    - Test cost is added to monthly total after API call
    - Test subsequent calls are rejected when cost limit exceeded
    - Test cost accumulation across multiple API calls
    - _Requirements: 9.5, 9.6, 9.7_

- [x] 17. Implement webhook payload validation
  - [x] 17.1 Add payload structure validation for all webhook types
    - Validate payment webhook payload has required fields (id, type, data)
    - Validate PreApproval webhook payload has required fields (id, type, action, data)
    - Return 400 Bad Request for malformed payloads
    - _Requirements: 13.4, 13.5_

  - [ ]* 17.2 Write property test for webhook payload validation
    - **Property 20: Webhook payload validation**
    - **Property 21: Webhook success response**
    - **Validates: Requirements 13.4, 13.5, 13.6**

  - [ ]* 17.3 Write unit tests for payload validation
    - Test valid payloads are accepted
    - Test malformed payloads are rejected with 400
    - Test missing required fields are detected
    - _Requirements: 13.4, 13.5_

- [x] 18. Final integration and wiring
  - [x] 18.1 Wire all components together in main application
    - Initialize configuration loader and validate environment variables
    - Initialize database connection and run migrations
    - Initialize Plan Manager with plan definitions
    - Initialize Payment Gateway Client with Mercado Pago credentials
    - Initialize Cost Calculator with model pricing
    - Initialize Token Tracker with database connection
    - Initialize Usage Enforcer with Token Tracker and Cost Calculator
    - Initialize Webhook Handler with webhook secret
    - Initialize Subscription API with all dependencies
    - Set up HTTP server with all API routes
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 17.1_

  - [ ]* 18.2 Write integration tests for end-to-end flows
    - Test complete subscription creation flow: API call → PreApproval → webhook → database update
    - Test subscription cancellation flow: API call → Mercado Pago → webhook → downgrade to free
    - Test usage enforcement flow: Multiple API calls → limit reached → rejection
    - Test billing period transition: Webhook → reset counters → new period
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.4, 8.5, 8.6, 11.7_

- [x] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across randomized inputs
- Unit tests validate specific examples and edge cases
- Integration tests verify component interactions and end-to-end flows
- The implementation uses TypeScript as specified in the design document
- All database operations should use transactions for consistency
- Webhook processing must be idempotent to handle duplicate notifications
- Sentinel value (-1) represents unlimited usage and must be checked before enforcing limits
