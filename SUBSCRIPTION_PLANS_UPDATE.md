# Subscription Plans Update

## Overview
Updated subscription system from 3 plans (free, pro, enterprise) to 2 plans (pro, gold) with feature-based structure instead of usage limits.

## Changes Made

### Backend Changes

#### 1. Plan Structure (`backend/src/subscriptions/models/types.ts`)
- **Old**: `PlanName = 'free' | 'pro' | 'enterprise'`
- **New**: `PlanName = 'pro' | 'gold'`
- **Old**: Plans had `limits` with usage tracking (tokens, costs, clinical notes, recording minutes)
- **New**: Plans have `features` with boolean flags for capabilities

#### 2. Plan Definitions (`backend/src/subscriptions/services/PlanManager.ts`)
- **Pro Plan** ($15,000 ARS/month):
  - ✅ Appointments management
  - ✅ Google Calendar sync
  - ✅ Patient database
  - ❌ AI features
  - ❌ WhatsApp integration

- **Gold Plan** ($30,000 ARS/month):
  - ✅ All Pro features
  - ✅ AI features (disabled for now)
  - ✅ WhatsApp integration (disabled for now)
  - `disabled: true` - Not available yet

#### 3. API Updates (`backend/src/subscriptions/api/SubscriptionAPI.ts`)
- Updated plan validation to accept only 'pro' and 'gold'
- Added check for disabled plans
- Updated response structure to return `features` instead of `usage`
- Removed user data queries (no longer need usage tracking)
- Updated plan display names: 'pro' → 'Profesional', 'gold' → 'Gold'

#### 4. Database Schema (`backend/src/db/schema.ts`)
- Updated `subscriptionPlan` enum: `['pro', 'gold']`
- Updated `subscriptions.plan` enum: `['pro', 'gold']`
- Removed usage tracking fields from users table:
  - `clinicalNotesLimitMonthly`
  - `recordingMinutesLimitDaily`
  - `tokensLimitMonthly`
  - `costLimitMonthlyUsd`
  - `clinicalNotesUsedMonthly`
  - `recordingMinutesUsedDaily`
  - `tokensUsedMonthly`
  - `costUsedMonthlyUsd`
  - `billingMonth`
  - `dailyUsageDate`
- Removed related database indexes

### Frontend Changes

#### 1. Hook Updates (`frontend/src/hooks/useSubscription.ts`)
- Updated `SubscriptionPlan` interface to use `features` instead of `limits`
- Updated `SubscriptionStatus` interface to return `features` instead of `usage`

#### 2. New Component (`frontend/src/components/subscriptions/FeatureStatus.tsx`)
- **Replaces**: `UsageStats` component
- **Purpose**: Shows available features instead of usage metrics
- **Features displayed**:
  - ✅ Appointments management
  - ✅ Google Calendar sync
  - ✅ Patient database
  - 🔄 AI features (coming soon)
  - 🔄 WhatsApp integration (coming soon)

#### 3. Updated Component (`frontend/src/components/subscriptions/SubscriptionCard.tsx`)
- **Old**: Showed usage limits (clinical notes, recording minutes, tokens, costs)
- **New**: Shows feature list (appointments, calendar, patients, AI, WhatsApp)
- Added "Próximamente" badge for disabled plans
- Updated descriptions and pricing display
- Gold plan shows premium styling with Sparkles icon

#### 4. ProfilePage Updates (`frontend/src/pages/ProfilePage.tsx`)
- Replaced `UsageStats` with `FeatureStatus`
- Updated section title from "Uso de recursos" to "Estado de funciones"
- Updated description to focus on available features

## API Endpoints

### GET /api/subscriptions/plans
**Response Structure**:
```json
[
  {
    "name": "pro",
    "displayName": "Profesional",
    "priceARS": 15000,
    "features": {
      "appointments": true,
      "calendarSync": true,
      "patientDatabase": true,
      "aiFeatures": false,
      "whatsappIntegration": false
    },
    "disabled": false
  },
  {
    "name": "gold",
    "displayName": "Gold",
    "priceARS": 30000,
    "features": {
      "appointments": true,
      "calendarSync": true,
      "patientDatabase": true,
      "aiFeatures": true,
      "whatsappIntegration": true
    },
    "disabled": true
  }
]
```

### GET /api/subscriptions/:userId
**Response Structure**:
```json
{
  "userId": "user-123",
  "plan": "pro",
  "status": "authorized",
  "preApprovalId": "preapproval-456",
  "billingPeriodStart": "2024-01-01T00:00:00.000Z",
  "features": {
    "appointments": true,
    "calendarSync": true,
    "patientDatabase": true,
    "aiFeatures": false,
    "whatsappIntegration": false
  }
}
```

### POST /api/subscriptions
**Request Body**:
```json
{
  "userId": "user-123",
  "plan": "pro" // or "gold"
}
```

## Migration Notes

### Database Migration Required
- Update existing subscriptions to use new plan names
- Remove usage tracking columns from users table
- Update enum constraints

### Backward Compatibility
- API endpoints maintain same URLs
- Response structure changed (features vs usage)
- Frontend components completely rewritten

## Future Implementation

### AI Features (Gold Plan)
When ready to enable:
1. Set `gold.disabled = false` in PlanManager
2. Implement AI-related endpoints and services
3. Add AI usage tracking if needed

### WhatsApp Integration (Gold Plan)
When ready to enable:
1. Implement WhatsApp API integration
2. Add WhatsApp-related UI components
3. Update feature flags

## Testing

### Backend
- Update existing tests to use new plan structure
- Test plan validation (only 'pro' and 'gold' accepted)
- Test disabled plan rejection
- Verify feature-based responses

### Frontend
- Test plan display with new feature structure
- Verify disabled plan handling ("Próximamente" state)
- Test feature status display
- Verify subscription management flows

## Files Modified

### Backend
- `backend/src/subscriptions/models/types.ts`
- `backend/src/subscriptions/services/PlanManager.ts`
- `backend/src/subscriptions/api/SubscriptionAPI.ts`
- `backend/src/db/schema.ts`

### Frontend
- `frontend/src/hooks/useSubscription.ts`
- `frontend/src/components/subscriptions/SubscriptionCard.tsx`
- `frontend/src/components/subscriptions/FeatureStatus.tsx` (new)
- `frontend/src/pages/ProfilePage.tsx`

### Documentation
- `SUBSCRIPTION_PLANS_UPDATE.md` (this file)