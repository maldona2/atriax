# Implementation Plan: User Self-Registration Free Tier

## Overview

This implementation plan creates a complete user self-registration system with automatic free tier assignment. The system includes email verification, subscription management, and feature restrictions based on subscription tiers. All components are built with TypeScript for type safety and maintainability.

The implementation follows a modular architecture with clear separation between registration, subscription management, email services, and limit enforcement. Each component is designed to be testable and maintainable with comprehensive property-based testing coverage.

## Tasks

- [-] 1. Set up project structure and core interfaces
  - Create directory structure for registration system components
  - Define TypeScript interfaces for all data models and services
  - Set up testing framework with fast-check for property-based testing
  - Configure database schemas for users, subscriptions, and verification tokens
  - _Requirements: 1.1, 2.1, 5.1_

- [ ] 2. Implement data validation and sanitization
  - [ ] 2.1 Create DataValidator service with comprehensive validation rules
    - Implement email format validation (RFC 5322 compliant)
    - Implement password strength validation (8+ chars, uppercase, lowercase, numeric)
    - Implement required field validation with specific error messages
    - Implement input sanitization to prevent injection attacks
    - _Requirements: 1.2, 1.3, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.2 Write property test for email format validation
    - **Property 2: Email Format Validation**
    - **Validates: Requirements 1.2, 5.1**

  - [ ]* 2.3 Write property test for password strength validation
    - **Property 3: Password Strength Validation**
    - **Validates: Requirements 1.3, 5.2**

  - [ ]* 2.4 Write property test for input sanitization
    - **Property 13: Input Sanitization**
    - **Validates: Requirements 5.5**

- [ ] 3. Implement user service and account management
  - [ ] 3.1 Create UserService with account lifecycle management
    - Implement user creation with encrypted password storage
    - Implement user lookup by email with duplicate prevention
    - Implement account activation and verification state management
    - Implement user profile update functionality
    - _Requirements: 1.1, 1.4, 6.2, 6.3_

  - [ ]* 3.2 Write property test for valid registration creates account
    - **Property 1: Valid Registration Creates Account**
    - **Validates: Requirements 1.1**

  - [ ]* 3.3 Write property test for account verification state
    - **Property 14: Account Verification State**
    - **Validates: Requirements 6.2**

  - [ ]* 3.4 Write property test for account activation
    - **Property 15: Account Activation**
    - **Validates: Requirements 6.3**

- [ ] 4. Implement subscription management system
  - [ ] 4.1 Create SubscriptionManager with tier assignment logic
    - Implement automatic free tier assignment for new users
    - Implement subscription limit tracking (5 patients, no calendar)
    - Implement subscription upgrade/downgrade functionality
    - Implement subscription data persistence with start dates
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.4_

  - [ ]* 4.2 Write property test for free tier assignment
    - **Property 5: Free Tier Assignment**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 4.3 Write property test for subscription data recording
    - **Property 6: Subscription Data Recording**
    - **Validates: Requirements 2.4**

  - [ ]* 4.4 Write property test for data preservation during upgrades
    - **Property 20: Data Preservation During Upgrades**
    - **Validates: Requirements 8.4**

- [ ] 5. Checkpoint - Ensure core services pass all tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement email verification system
  - [ ] 6.1 Create EmailService with verification token management
    - Implement verification email sending with unique tokens
    - Implement token generation with 24-hour expiration
    - Implement token validation and expiration checking
    - Implement email resend functionality with rate limiting
    - _Requirements: 1.5, 6.1, 6.5_

  - [ ]* 6.2 Write property test for confirmation email sending
    - **Property 4: Confirmation Email Sending**
    - **Validates: Requirements 1.5, 6.1**

  - [ ]* 6.3 Write property test for token expiration and resend
    - **Property 17: Token Expiration and Resend**
    - **Validates: Requirements 6.5**

- [ ] 7. Implement limit enforcement system
  - [ ] 7.1 Create LimitEnforcer with subscription-based restrictions
    - Implement patient count tracking and limit checking
    - Implement calendar access restriction for free tier users
    - Implement patient creation/deletion count updates
    - Implement consistent limit checking across all features
    - _Requirements: 3.1, 3.3, 3.4, 4.1, 4.2, 4.4_

  - [ ]* 7.2 Write property test for patient creation within limits
    - **Property 7: Patient Creation Within Limits**
    - **Validates: Requirements 3.1**

  - [ ]* 7.3 Write property test for patient management operations
    - **Property 8: Patient Management Operations**
    - **Validates: Requirements 3.3**

  - [ ]* 7.4 Write property test for patient count updates
    - **Property 9: Patient Count Updates**
    - **Validates: Requirements 3.4**

  - [ ]* 7.5 Write property test for calendar access restriction
    - **Property 10: Calendar Access Restriction**
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [ ] 8. Implement registration API and orchestration
  - [ ] 8.1 Create RegistrationAPI with complete registration flow
    - Implement registration endpoint with validation orchestration
    - Implement email verification endpoint with token validation
    - Implement verification resend endpoint with rate limiting
    - Implement comprehensive error handling and responses
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.3, 6.5_

  - [ ]* 8.2 Write property test for required field validation
    - **Property 12: Required Field Validation**
    - **Validates: Requirements 5.3, 5.4**

- [ ] 9. Implement authentication integration
  - [ ] 9.1 Create authentication middleware with verification checks
    - Implement login prevention for unverified accounts
    - Implement session management for verified users
    - Implement authentication state tracking
    - Integrate with existing authentication system
    - _Requirements: 6.4_

  - [ ]* 9.2 Write property test for login prevention for unverified accounts
    - **Property 16: Login Prevention for Unverified Accounts**
    - **Validates: Requirements 6.4**

- [ ] 10. Checkpoint - Ensure backend services integration works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement registration form interface
  - [ ] 11.1 Create registration form component with real-time validation
    - Create form with email, password, confirm password, first name, last name fields
    - Implement real-time validation feedback for each field
    - Implement password strength indicators and confirmation matching
    - Implement terms of service and privacy policy acceptance
    - Implement form submission with error handling and success states
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 12. Implement navigation and UI restrictions
  - [ ] 12.1 Create subscription-aware navigation components
    - Implement calendar menu hiding for free tier users
    - Implement upgrade menu options for free tier users
    - Implement subscription status display in user interface
    - Integrate with existing navigation system
    - _Requirements: 4.3, 8.3_

  - [ ]* 12.2 Write property test for navigation menu hiding
    - **Property 11: Navigation Menu Hiding**
    - **Validates: Requirements 4.3**

  - [ ]* 12.3 Write property test for upgrade menu presence
    - **Property 19: Upgrade Menu Presence**
    - **Validates: Requirements 8.3**

- [ ] 13. Implement upgrade system and prompts
  - [ ] 13.1 Create upgrade system with limit-based prompts
    - Implement upgrade prompts when users reach patient limits
    - Implement subscription tier comparison and benefits display
    - Implement upgrade flow integration with payment system
    - Implement upgrade confirmation and subscription transition
    - _Requirements: 8.1, 8.2_

  - [ ]* 13.2 Write property test for upgrade prompts at limits
    - **Property 18: Upgrade Prompts at Limits**
    - **Validates: Requirements 8.1**

- [ ] 14. Integration and end-to-end wiring
  - [ ] 14.1 Wire all components together with proper error handling
    - Connect registration API to all backend services
    - Connect frontend components to registration API
    - Implement comprehensive error handling and user feedback
    - Implement rate limiting and security measures
    - Integrate with existing application architecture
    - _Requirements: All requirements_

  - [ ]* 14.2 Write integration tests for complete registration flow
    - Test complete user journey from registration to first login
    - Test email verification flow with token validation
    - Test subscription assignment and limit enforcement
    - Test upgrade prompts and navigation restrictions
    - _Requirements: All requirements_

- [ ] 15. Final checkpoint - Ensure complete system works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key integration points
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- TypeScript is used throughout for type safety and maintainability
- All 20 correctness properties from the design are covered by property-based tests
- The implementation supports seamless integration with existing application architecture