# Requirements Document

## Introduction

This feature redesigns the subscription plan system from boolean feature flags to quantitative limits. Currently, the system blocks free users from accessing appointments entirely, which doesn't align with the core use case of the appointment booking system. The new design will allow free users to create a limited number of appointments per day, while paid plans (pro, gold) will have higher or unlimited daily appointment limits.

## Glossary

- **Plan_Manager**: The service that defines and manages subscription plan configurations
- **Subscription_System**: The backend system that enforces subscription limits and manages user subscriptions
- **Free_User**: A user without an active paid subscription
- **Pro_User**: A user with an active pro plan subscription (1500 ARS/month)
- **Gold_User**: A user with an active gold plan subscription (30000 ARS/month, currently disabled)
- **Daily_Appointment_Limit**: The maximum number of appointments a user can create within a 24-hour period
- **Appointment_Creation_Request**: An API request to create a new appointment in the system
- **Billing_Period**: A 24-hour period starting at midnight UTC used to track daily limits

## Requirements

### Requirement 1: Define Daily Appointment Limits

**User Story:** As a system administrator, I want to define daily appointment limits for each subscription plan, so that I can control resource usage and incentivize upgrades.

#### Acceptance Criteria

1. THE Plan_Manager SHALL define a daily appointment limit of 3 for the free plan
2. THE Plan_Manager SHALL define a daily appointment limit of 50 for the pro plan
3. THE Plan_Manager SHALL define an unlimited daily appointment limit for the gold plan
4. THE Plan_Manager SHALL expose a method to retrieve the daily appointment limit for a given plan name
5. THE Plan_Manager SHALL maintain backward compatibility with existing feature flag queries

### Requirement 2: Track Daily Appointment Creation

**User Story:** As the system, I want to track how many appointments each user creates per day, so that I can enforce daily limits.

#### Acceptance Criteria

1. WHEN an appointment is created, THE Subscription_System SHALL increment the user's daily appointment counter
2. THE Subscription_System SHALL reset each user's daily appointment counter at midnight UTC
3. THE Subscription_System SHALL store the counter with the user ID and current date as the composite key
4. THE Subscription_System SHALL retrieve the current counter value within 100ms for limit checking

### Requirement 3: Enforce Daily Appointment Limits

**User Story:** As a free user, I want to be prevented from creating more than my daily limit of appointments, so that the system remains fair and sustainable.

#### Acceptance Criteria

1. WHEN an Appointment_Creation_Request is received, THE Subscription_System SHALL check if the user has reached their daily limit
2. IF the user has reached their daily limit, THEN THE Subscription_System SHALL reject the request with HTTP 429 status code
3. IF the user has not reached their daily limit, THEN THE Subscription_System SHALL allow the appointment creation to proceed
4. WHEN a limit is exceeded, THE Subscription_System SHALL return a response indicating the limit, current usage, and reset time
5. WHERE the user has an unlimited daily limit, THE Subscription_System SHALL skip the limit check

### Requirement 4: Provide Limit Status Information

**User Story:** As a user, I want to see how many appointments I can still create today, so that I can plan my usage accordingly.

#### Acceptance Criteria

1. THE Subscription_System SHALL provide an API endpoint that returns the user's current daily appointment usage
2. THE Subscription_System SHALL return the user's daily appointment limit based on their subscription plan
3. THE Subscription_System SHALL return the number of remaining appointments the user can create today
4. THE Subscription_System SHALL return the timestamp when the daily limit will reset
5. WHERE the user has an unlimited daily limit, THE Subscription_System SHALL return a special indicator value of -1 for remaining appointments

### Requirement 5: Handle Plan Upgrades and Downgrades

**User Story:** As a user who changes subscription plans, I want my daily limits to update immediately, so that I can access my new plan benefits right away.

#### Acceptance Criteria

1. WHEN a user upgrades their subscription plan, THE Subscription_System SHALL apply the new daily appointment limit immediately
2. WHEN a user downgrades their subscription plan, THE Subscription_System SHALL apply the new daily appointment limit immediately
3. IF a user downgrades and their current daily usage exceeds the new limit, THEN THE Subscription_System SHALL prevent new appointments until the next reset
4. THE Subscription_System SHALL preserve the user's current daily usage counter when the plan changes

### Requirement 6: Migrate Existing Feature Flag System

**User Story:** As a developer, I want to migrate from boolean feature flags to quantitative limits without breaking existing functionality, so that the transition is seamless.

#### Acceptance Criteria

1. THE Plan_Manager SHALL remove the appointments boolean feature flag from the plan configuration
2. THE Plan_Manager SHALL add a dailyAppointmentLimit numeric field to the plan configuration
3. THE Plan_Manager SHALL maintain all other existing feature flags (calendarSync, patientDatabase, aiFeatures, whatsappIntegration)
4. THE Subscription_System SHALL update all API responses to include the dailyAppointmentLimit field
5. THE Subscription_System SHALL maintain backward compatibility for clients that still check the appointments feature flag by deriving it from dailyAppointmentLimit > 0

### Requirement 7: Handle Edge Cases and Error Conditions

**User Story:** As a system administrator, I want the system to handle edge cases gracefully, so that users have a reliable experience.

#### Acceptance Criteria

1. IF the daily usage counter cannot be retrieved, THEN THE Subscription_System SHALL log an error and allow the appointment creation to proceed
2. IF the user's subscription plan cannot be determined, THEN THE Subscription_System SHALL apply the free plan limits
3. WHEN the system clock changes (e.g., daylight saving time), THE Subscription_System SHALL correctly reset daily counters at midnight UTC
4. IF a user creates appointments simultaneously, THE Subscription_System SHALL use atomic operations to prevent race conditions in the counter
5. THE Subscription_System SHALL handle negative or invalid limit values by treating them as unlimited
