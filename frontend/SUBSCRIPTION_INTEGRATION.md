# Subscription Management Frontend Integration

## Overview

Added a subscription management section to the frontend that allows users to view their current plan, monitor resource usage, and manage their subscription.

## Files Created

### 1. `src/hooks/useSubscription.ts`
Custom React hook for managing subscription operations:
- `fetchPlans()` - Get available subscription plans
- `fetchStatus()` - Get current subscription status and usage
- `createSubscription(planName)` - Create new subscription (redirects to Mercado Pago)
- `cancelSubscription()` - Cancel active subscription
- `pauseSubscription()` - Pause active subscription
- `resumeSubscription()` - Resume paused subscription

### 2. `src/components/subscriptions/SubscriptionCard.tsx`
Card component displaying subscription plan details:
- Plan name and price
- Resource limits (clinical notes, recording minutes, tokens, cost)
- Subscribe button
- Current plan badge
- Handles unlimited limits (sentinel value -1)

### 3. `src/components/subscriptions/UsageStats.tsx`
Component displaying current resource usage:
- Visual progress bars for each resource type
- Color-coded indicators (green < 75%, amber 75-90%, red > 90%)
- Formatted numbers (K for thousands, M for millions)
- Handles unlimited limits

### 4. `src/components/ui/progress.tsx`
Radix UI Progress component for usage visualization

### 5. `src/components/subscriptions/index.ts`
Barrel export for subscription components

## Integration with ProfilePage

Added a new "Suscripción" tab to the ProfilePage with three sections:

1. **Current Subscription Status**
   - Displays current plan name
   - Shows subscription status badge (Active, Paused, Cancelled, Failed)
   - Action buttons (Pause, Cancel, Resume) based on status

2. **Resource Usage**
   - Four usage cards showing consumption vs limits:
     - Clinical notes (monthly)
     - Recording minutes (daily)
     - AI tokens (monthly)
     - AI cost in USD (monthly)
   - Visual progress bars with color indicators

3. **Available Plans**
   - Grid of subscription plan cards
   - Free, Pro, and Enterprise plans
   - Subscribe buttons for plan upgrades
   - Current plan highlighted

## API Integration

The subscription management integrates with the backend API endpoints:

- `GET /api/subscriptions/plans` - Fetch available plans
- `GET /api/subscriptions/:userId` - Get subscription status
- `POST /api/subscriptions` - Create subscription
- `DELETE /api/subscriptions/:userId` - Cancel subscription
- `POST /api/subscriptions/:userId/pause` - Pause subscription
- `POST /api/subscriptions/:userId/resume` - Resume subscription

## User Flow

### Subscribing to a Plan
1. User navigates to Profile → Suscripción tab
2. Views available plans and current usage
3. Clicks "Suscribirse" on desired plan
4. Redirected to Mercado Pago checkout page
5. Completes payment on Mercado Pago
6. Webhook updates subscription status in backend
7. User returns to app with active subscription

### Managing Subscription
1. User views current plan and status
2. Can pause subscription (temporarily)
3. Can resume paused subscription
4. Can cancel subscription (downgrades to free)

## Testing

Run the subscription component tests:

```bash
cd frontend
npm test -- SubscriptionCard.test.tsx
```

## Dependencies Added

- `@radix-ui/react-progress` - Progress bar component

## Notes

- The subscription creation redirects to Mercado Pago's hosted checkout page
- Webhook processing happens on the backend after payment
- The frontend polls or refreshes to get updated subscription status
- Unlimited limits (value -1) are displayed as "Ilimitado"
- All text is in Spanish to match the existing UI
