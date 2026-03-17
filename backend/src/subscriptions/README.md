# Mercado Pago Subscription System

This directory contains the subscription management system integrated with Mercado Pago payment processing.

## Directory Structure

```
subscriptions/
├── api/                    # API routes and controllers
│   └── routes.ts          # Express routes for subscription endpoints
├── config/                # Configuration management
│   └── env.ts            # Environment variable validation
├── models/               # Data models and types
│   └── types.ts         # TypeScript interfaces and types
├── services/            # Business logic services
│   ├── PlanManager.ts           # Subscription plan definitions
│   ├── PaymentGatewayClient.ts  # Mercado Pago API integration
│   ├── WebhookHandler.ts        # Webhook processing
│   ├── TokenTracker.ts          # OpenAI token usage tracking
│   ├── CostCalculator.ts        # API cost calculations
│   └── UsageEnforcer.ts         # Usage limit enforcement
├── utils/               # Utility functions
│   └── db.ts           # Database utilities
├── index.ts            # Main entry point
└── README.md          # This file
```

## Features

- **Tiered Subscription Plans**: Free, Pro, and Enterprise tiers with configurable limits
- **Mercado Pago Integration**: PreApproval subscriptions with monthly billing
- **Webhook Processing**: Real-time payment and subscription status updates
- **Usage Tracking**: Monitor clinical notes, recording minutes, OpenAI tokens, and API costs
- **Limit Enforcement**: Prevent users from exceeding subscription limits
- **Sentinel Values**: Use -1 to represent unlimited usage for enterprise features

## Environment Variables

Required environment variables (add to `.env`):

```bash
# Mercado Pago credentials
MERCADO_PAGO_ACCESS_TOKEN=your-access-token
MERCADO_PAGO_PUBLIC_KEY=your-public-key
MERCADO_PAGO_WEBHOOK_SECRET=your-webhook-secret

# Webhook configuration
WEBHOOK_CALLBACK_URL=http://localhost:5001/api/subscriptions/webhooks
```

## Database Schema

The system adds the following tables:

- **subscriptions**: Mercado Pago subscription metadata
- **webhook_events**: Webhook event log for idempotency
- **model_pricing**: OpenAI model pricing configuration

And extends the **users** table with subscription fields:
- Subscription plan and status
- Usage limits (from plan)
- Current usage counters
- Billing period tracking

## Usage

### Initialize the subscription system

```typescript
import { loadSubscriptionConfig, PlanManager } from './subscriptions';

// Validate configuration on startup
const config = loadSubscriptionConfig();

// Get available plans
const planManager = new PlanManager();
const plans = planManager.getPlans();
```

### API Endpoints

- `POST /api/subscriptions` - Create subscription
- `DELETE /api/subscriptions/:userId` - Cancel subscription
- `POST /api/subscriptions/:userId/pause` - Pause subscription
- `POST /api/subscriptions/:userId/resume` - Resume subscription
- `GET /api/subscriptions/:userId` - Get subscription status
- `GET /api/subscriptions/plans` - Get available plans
- `POST /api/subscriptions/webhooks/payment` - Payment webhook
- `POST /api/subscriptions/webhooks/preapproval` - PreApproval webhook

## Development

### Generate database migration

```bash
npm run db:generate
```

### Apply migration

```bash
npm run db:migrate
```

### Run tests

```bash
npm test
```

## Implementation Status

✅ Task 1: Project structure and configuration (COMPLETED)
- Directory structure created
- TypeScript interfaces defined
- Environment configuration with validation
- Database schema and migrations

⏳ Task 2+: Additional features (PENDING)
- Mercado Pago API integration
- Webhook processing
- Usage tracking and enforcement
- API endpoints implementation
