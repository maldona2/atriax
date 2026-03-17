# Requirements Document

## Introduction

This document specifies the requirements for a subscription management system integrated with Mercado Pago payment processing. The system manages tiered subscription plans (free, pro, enterprise) with usage limits for clinical notes, recording minutes, and OpenAI API consumption. It processes payment webhooks and enforces monthly token and cost limits per user.

## Glossary

- **Subscription_System**: The complete subscription management system
- **Payment_Gateway**: Mercado Pago payment processing service
- **Plan_Manager**: Component that defines and manages subscription plan configurations
- **Webhook_Handler**: Component that processes incoming notifications from Mercado Pago
- **Token_Tracker**: Component that monitors and enforces OpenAI token usage limits
- **Cost_Calculator**: Component that calculates OpenAI API costs based on model and token usage
- **User_Database**: Database table storing user subscription status and limits
- **Subscription_Database**: Database table storing Mercado Pago subscription metadata
- **PreApproval**: Mercado Pago's recurring payment subscription mechanism
- **External_Reference**: Unique identifier format: user:{userId}|plan:{plan}
- **Sentinel_Value**: The value -1 used to represent unlimited usage

## Requirements

### Requirement 1: Define Subscription Plans

**User Story:** As a system administrator, I want to define subscription plans with pricing and limits, so that users can choose appropriate service tiers.

#### Acceptance Criteria

1. THE Plan_Manager SHALL define three subscription tiers: free, pro, and enterprise
2. FOR EACH subscription plan, THE Plan_Manager SHALL specify a price in ARS
3. FOR EACH subscription plan, THE Plan_Manager SHALL define a monthly limit for clinical notes
4. FOR EACH subscription plan, THE Plan_Manager SHALL define a daily limit for recording minutes
5. FOR EACH subscription plan, THE Plan_Manager SHALL define a monthly limit for OpenAI token usage
6. FOR EACH subscription plan, THE Plan_Manager SHALL define a monthly limit for OpenAI cost in USD
7. WHERE a plan has unlimited usage for a limit type, THE Plan_Manager SHALL use Sentinel_Value (-1) to represent unlimited

### Requirement 2: Create Mercado Pago Subscriptions

**User Story:** As a user, I want to subscribe to a paid plan through Mercado Pago, so that I can access premium features.

#### Acceptance Criteria

1. WHEN a user requests a subscription, THE Payment_Gateway SHALL create a PreApproval subscription with Mercado Pago
2. WHEN creating a PreApproval, THE Payment_Gateway SHALL include the External_Reference format in the subscription metadata
3. WHEN creating a PreApproval, THE Payment_Gateway SHALL specify the subscription price in ARS
4. WHEN creating a PreApproval, THE Payment_Gateway SHALL specify the billing frequency as monthly
5. WHEN the PreApproval is created, THE Payment_Gateway SHALL return the subscription initialization URL to the user
6. WHEN the PreApproval is created, THE Subscription_System SHALL store the PreApproval ID in the Subscription_Database
7. THE Subscription_System SHALL associate the PreApproval ID with the user ID in the Subscription_Database

### Requirement 3: Manage Subscription Lifecycle

**User Story:** As a user, I want to cancel, pause, or resume my subscription, so that I can control my billing.

#### Acceptance Criteria

1. WHEN a user requests to cancel a subscription, THE Payment_Gateway SHALL send a cancellation request to Mercado Pago using the PreApproval ID
2. WHEN a user requests to pause a subscription, THE Payment_Gateway SHALL send a pause request to Mercado Pago using the PreApproval ID
3. WHEN a user requests to resume a subscription, THE Payment_Gateway SHALL send a resume request to Mercado Pago using the PreApproval ID
4. WHEN a subscription lifecycle action completes, THE Payment_Gateway SHALL return a success confirmation
5. IF a subscription lifecycle action fails, THEN THE Payment_Gateway SHALL return a descriptive error message

### Requirement 4: Process Payment Webhooks

**User Story:** As the system, I want to receive payment notifications from Mercado Pago, so that I can update user subscription status.

#### Acceptance Criteria

1. WHEN a payment webhook is received, THE Webhook_Handler SHALL validate the webhook signature or authenticity
2. WHEN a payment is successful, THE Webhook_Handler SHALL extract the External_Reference from the payment metadata
3. WHEN the External_Reference is extracted, THE Webhook_Handler SHALL parse the user ID and plan from the reference format
4. WHEN the user ID and plan are parsed, THE Webhook_Handler SHALL update the User_Database with the new subscription plan
5. WHEN the subscription plan is updated, THE Webhook_Handler SHALL update the user's usage limits based on the new plan
6. WHEN the subscription plan is updated, THE Webhook_Handler SHALL record the billing period start date in the Subscription_Database
7. IF the webhook signature is invalid, THEN THE Webhook_Handler SHALL reject the webhook and log the security event

### Requirement 5: Process PreApproval Webhooks

**User Story:** As the system, I want to receive subscription status notifications from Mercado Pago, so that I can handle subscription changes.

#### Acceptance Criteria

1. WHEN a PreApproval webhook is received, THE Webhook_Handler SHALL validate the webhook authenticity
2. WHEN a PreApproval is authorized, THE Webhook_Handler SHALL update the User_Database to reflect active subscription status
3. WHEN a PreApproval is cancelled, THE Webhook_Handler SHALL downgrade the user to the free plan in the User_Database
4. WHEN a PreApproval is paused, THE Webhook_Handler SHALL update the subscription status to paused in the Subscription_Database
5. WHEN a PreApproval fails, THE Webhook_Handler SHALL update the subscription status to failed in the Subscription_Database
6. WHEN a PreApproval status changes, THE Webhook_Handler SHALL log the event with timestamp and PreApproval ID

### Requirement 6: Track OpenAI Token Usage

**User Story:** As the system, I want to track monthly OpenAI token usage per user, so that I can enforce subscription limits.

#### Acceptance Criteria

1. WHEN an OpenAI API call is made, THE Token_Tracker SHALL record the number of tokens consumed
2. WHEN tokens are recorded, THE Token_Tracker SHALL associate the token count with the user ID and current billing month
3. WHEN a user's token usage is queried, THE Token_Tracker SHALL return the cumulative token count for the current billing month
4. WHEN a new billing month starts, THE Token_Tracker SHALL reset the monthly token count to zero for all users
5. THE Token_Tracker SHALL store token usage data in the User_Database

### Requirement 7: Calculate OpenAI API Costs

**User Story:** As the system, I want to calculate the cost of OpenAI API usage, so that I can enforce cost limits.

#### Acceptance Criteria

1. WHEN an OpenAI API call completes, THE Cost_Calculator SHALL identify the model used
2. WHEN the model is identified, THE Cost_Calculator SHALL retrieve the per-token pricing for that model
3. WHEN the pricing is retrieved, THE Cost_Calculator SHALL multiply the token count by the per-token price to calculate the cost in USD
4. WHEN the cost is calculated, THE Cost_Calculator SHALL return the cost value with precision to at least 4 decimal places
5. THE Cost_Calculator SHALL support pricing for input tokens and output tokens separately

### Requirement 8: Enforce Monthly Token Limits

**User Story:** As the system, I want to prevent users from exceeding their monthly token limits, so that usage stays within subscription boundaries.

#### Acceptance Criteria

1. WHEN a user attempts an OpenAI API call, THE Token_Tracker SHALL retrieve the user's current monthly token usage
2. WHEN the current usage is retrieved, THE Token_Tracker SHALL retrieve the user's token limit from the User_Database
3. WHERE the user's token limit is Sentinel_Value, THE Token_Tracker SHALL allow the API call to proceed
4. WHERE the user's token limit is not Sentinel_Value, THE Token_Tracker SHALL calculate remaining tokens as limit minus current usage
5. IF the remaining tokens are less than the estimated tokens for the API call, THEN THE Token_Tracker SHALL reject the API call with a limit exceeded error
6. IF the remaining tokens are sufficient, THEN THE Token_Tracker SHALL allow the API call to proceed

### Requirement 9: Enforce Monthly Cost Limits

**User Story:** As the system, I want to prevent users from exceeding their monthly cost limits, so that expenses stay within subscription boundaries.

#### Acceptance Criteria

1. WHEN a user attempts an OpenAI API call, THE Token_Tracker SHALL retrieve the user's current monthly cost usage
2. WHEN the current cost usage is retrieved, THE Token_Tracker SHALL retrieve the user's cost limit from the User_Database
3. WHERE the user's cost limit is Sentinel_Value, THE Token_Tracker SHALL allow the API call to proceed
4. WHERE the user's cost limit is not Sentinel_Value, THE Token_Tracker SHALL calculate remaining cost as limit minus current usage
5. WHEN the API call completes, THE Cost_Calculator SHALL calculate the actual cost incurred
6. WHEN the cost is calculated, THE Token_Tracker SHALL add the cost to the user's monthly cost total in the User_Database
7. IF the monthly cost total exceeds the limit, THEN THE Token_Tracker SHALL reject subsequent API calls with a cost limit exceeded error

### Requirement 10: Manage User Subscription Data

**User Story:** As the system, I want to maintain user subscription information in the database, so that subscription status is the source of truth.

#### Acceptance Criteria

1. THE User_Database SHALL store the current subscription plan for each user
2. THE User_Database SHALL store the subscription status (active, paused, cancelled) for each user
3. THE User_Database SHALL store the monthly clinical notes limit for each user
4. THE User_Database SHALL store the daily recording minutes limit for each user
5. THE User_Database SHALL store the monthly token usage limit for each user
6. THE User_Database SHALL store the monthly cost limit in USD for each user
7. THE User_Database SHALL store the current monthly token usage for each user
8. THE User_Database SHALL store the current monthly cost usage for each user
9. WHEN a user's subscription plan changes, THE Subscription_System SHALL update all limit fields in the User_Database to match the new plan

### Requirement 11: Manage Mercado Pago Subscription Metadata

**User Story:** As the system, I want to store Mercado Pago subscription details separately, so that I can track billing periods and PreApproval IDs.

#### Acceptance Criteria

1. THE Subscription_Database SHALL store the Mercado Pago PreApproval ID for each subscription
2. THE Subscription_Database SHALL store the user ID associated with each subscription
3. THE Subscription_Database SHALL store the subscription plan name for each subscription
4. THE Subscription_Database SHALL store the billing period start date for each subscription
5. THE Subscription_Database SHALL store the billing period end date for each subscription
6. THE Subscription_Database SHALL store the subscription status from Mercado Pago
7. WHEN a new billing period starts, THE Subscription_System SHALL update the billing period dates in the Subscription_Database

### Requirement 12: Provide Subscription API Endpoints

**User Story:** As a client application, I want to interact with the subscription system through HTTP endpoints, so that I can manage subscriptions programmatically.

#### Acceptance Criteria

1. THE Subscription_System SHALL provide an endpoint to create a new subscription for a user
2. THE Subscription_System SHALL provide an endpoint to cancel an existing subscription
3. THE Subscription_System SHALL provide an endpoint to pause an existing subscription
4. THE Subscription_System SHALL provide an endpoint to resume a paused subscription
5. THE Subscription_System SHALL provide an endpoint to retrieve the current subscription status for a user
6. THE Subscription_System SHALL provide an endpoint to retrieve available subscription plans with current pricing
7. WHEN an API endpoint is called, THE Subscription_System SHALL authenticate the request
8. IF authentication fails, THEN THE Subscription_System SHALL return a 401 Unauthorized response

### Requirement 13: Handle Webhook Endpoint Security

**User Story:** As the system, I want to secure webhook endpoints, so that only legitimate Mercado Pago notifications are processed.

#### Acceptance Criteria

1. THE Webhook_Handler SHALL provide a dedicated endpoint for payment webhooks
2. THE Webhook_Handler SHALL provide a dedicated endpoint for PreApproval webhooks
3. WHEN a webhook is received, THE Webhook_Handler SHALL verify the request originates from Mercado Pago
4. WHEN a webhook is received, THE Webhook_Handler SHALL validate the webhook payload structure
5. IF the webhook validation fails, THEN THE Webhook_Handler SHALL return a 400 Bad Request response
6. IF the webhook validation succeeds, THEN THE Webhook_Handler SHALL return a 200 OK response
7. THE Webhook_Handler SHALL process webhooks idempotently to handle duplicate notifications

### Requirement 14: Enforce Clinical Notes Limits

**User Story:** As the system, I want to enforce monthly clinical notes limits, so that users stay within their subscription tier.

#### Acceptance Criteria

1. WHEN a user attempts to create a clinical note, THE Subscription_System SHALL retrieve the user's current monthly notes count
2. WHEN the current count is retrieved, THE Subscription_System SHALL retrieve the user's notes limit from the User_Database
3. WHERE the user's notes limit is Sentinel_Value, THE Subscription_System SHALL allow the note creation to proceed
4. WHERE the user's notes limit is not Sentinel_Value, THE Subscription_System SHALL compare the current count to the limit
5. IF the current count is greater than or equal to the limit, THEN THE Subscription_System SHALL reject the note creation with a limit exceeded error
6. IF the current count is less than the limit, THEN THE Subscription_System SHALL allow the note creation and increment the count

### Requirement 15: Enforce Daily Recording Minutes Limits

**User Story:** As the system, I want to enforce daily recording minutes limits, so that users stay within their subscription tier.

#### Acceptance Criteria

1. WHEN a user attempts to record audio, THE Subscription_System SHALL retrieve the user's current daily recording minutes
2. WHEN the current minutes are retrieved, THE Subscription_System SHALL retrieve the user's daily minutes limit from the User_Database
3. WHERE the user's minutes limit is Sentinel_Value, THE Subscription_System SHALL allow the recording to proceed
4. WHERE the user's minutes limit is not Sentinel_Value, THE Subscription_System SHALL compare the current minutes to the limit
5. IF the current minutes are greater than or equal to the limit, THEN THE Subscription_System SHALL reject the recording with a limit exceeded error
6. IF the current minutes are less than the limit, THEN THE Subscription_System SHALL allow the recording to proceed
7. WHEN a new day starts, THE Subscription_System SHALL reset the daily recording minutes count to zero for all users

### Requirement 16: Configure Mercado Pago Credentials

**User Story:** As a system administrator, I want to configure Mercado Pago API credentials, so that the system can authenticate with the payment gateway.

#### Acceptance Criteria

1. THE Subscription_System SHALL read the Mercado Pago access token from environment variables
2. THE Subscription_System SHALL read the Mercado Pago public key from environment variables
3. THE Subscription_System SHALL read the webhook secret from environment variables
4. IF required credentials are missing, THEN THE Subscription_System SHALL fail to start and log a configuration error
5. THE Subscription_System SHALL use the access token for all API requests to Mercado Pago

### Requirement 17: Configure Webhook Callback URL

**User Story:** As a system administrator, I want to configure the webhook callback URL, so that Mercado Pago can send notifications to the system.

#### Acceptance Criteria

1. THE Subscription_System SHALL read the webhook callback URL from environment variables
2. THE Subscription_System SHALL use the webhook callback URL when creating PreApproval subscriptions with Mercado Pago
