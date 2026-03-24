# Design Document: Subscription Plan Limits Redesign

## Overview

This design transforms the subscription system from boolean feature flags to quantitative daily appointment limits. The current system uses a binary `appointments: boolean` flag that completely blocks free users from creating appointments. The new design introduces a `dailyAppointmentLimit` field that allows:

- Free users: 3 appointments per day
- Pro users: 50 appointments per day  
- Gold users: Unlimited appointments per day

This approach aligns better with the core use case (appointment booking) while still incentivizing upgrades. The design maintains backward compatibility and ensures immediate limit updates when users change plans.

### Key Design Decisions

1. **UTC-based daily reset**: All daily counters reset at midnight UTC to avoid timezone complexity and ensure consistent behavior across all users.

2. **Atomic counter operations**: Use database-level atomic increments to prevent race conditions when multiple appointments are created simultaneously.

3. **Graceful degradation**: If the counter system fails, allow appointment creation to proceed rather than blocking users (fail-open approach).

4. **Sentinel value for unlimited**: Use `-1` to represent unlimited limits, following the existing `SENTINEL_VALUE` constant pattern.

5. **Separate tracking table**: Create a dedicated `daily_appointment_usage` table rather than adding fields to the users table, enabling efficient queries and automatic cleanup.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Appointment API Layer                    │
│                  (routes/appointments.ts)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  Appointment Service Layer                   │
│              (services/appointmentService.ts)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Subscription Limit Enforcement                  │
│           (subscriptions/services/LimitEnforcer.ts)          │
│                                                              │
│  • checkDailyAppointmentLimit(userId)                       │
│  • incrementDailyAppointmentUsage(userId)                   │
│  • getDailyAppointmentStatus(userId)                        │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
             ↓                           ↓
┌────────────────────────┐  ┌───────────────────────────────┐
│    PlanManager         │  │  UsageTracker                 │
│  (existing service)    │  │  (new service)                │
│                        │  │                               │
│  • getPlan()           │  │  • getCurrentUsage()          │
│  • getDailyLimit()     │  │  • incrementUsage()           │
│    [NEW METHOD]        │  │  • resetIfNeeded()            │
└────────────────────────┘  └───────────────────────────────┘
             │                           │
             ↓                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
│                                                              │
│  • subscriptions table (existing)                           │
│  • users table (existing)                                   │
│  • daily_appointment_usage table (NEW)                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Appointment Creation Request**:
   - User submits appointment creation request
   - API layer authenticates and extracts userId
   - Appointment service calls LimitEnforcer.checkDailyAppointmentLimit()
   - If limit exceeded, return HTTP 429 with details
   - If allowed, proceed with appointment creation
   - After successful creation, call LimitEnforcer.incrementDailyAppointmentUsage()

2. **Limit Check Flow**:
   - LimitEnforcer gets user's subscription plan from PlanManager
   - PlanManager returns dailyAppointmentLimit for the plan
   - If limit is -1 (unlimited), skip usage check
   - Otherwise, UsageTracker.getCurrentUsage() retrieves today's count
   - Compare current usage against limit
   - Return allow/deny decision with metadata

3. **Usage Tracking Flow**:
   - UsageTracker checks if counter exists for today (userId + current date)
   - If not, create new counter row with count = 0
   - Atomically increment counter using SQL UPDATE ... SET count = count + 1
   - Return updated count

4. **Daily Reset Flow**:
   - No explicit reset job needed
   - UsageTracker automatically creates new counter for new date
   - Old counters can be cleaned up by periodic maintenance job (optional)

## Components and Interfaces

### 1. PlanManager (Modified)

**File**: `backend/src/subscriptions/services/PlanManager.ts`

**Changes**:
- Add `dailyAppointmentLimit: number` field to plan configuration
- Remove `appointments: boolean` from features (breaking change, handled with migration)
- Add `getDailyAppointmentLimit(planName: string): number` method

**Interface**:
```typescript
interface SubscriptionPlan {
  name: PlanName;
  priceARS: number;
  dailyAppointmentLimit: number; // NEW: -1 for unlimited
  features: {
    // appointments: boolean; // REMOVED
    calendarSync: boolean;
    patientDatabase: boolean;
    aiFeatures: boolean;
    whatsappIntegration: boolean;
  };
  disabled?: boolean;
}

class PlanManager {
  // Existing methods...
  
  // NEW METHOD
  getDailyAppointmentLimit(planName: string): number;
}
```

### 2. UsageTracker (New Service)

**File**: `backend/src/subscriptions/services/UsageTracker.ts`

**Purpose**: Manages daily appointment usage counters with atomic operations.

**Interface**:
```typescript
interface DailyUsage {
  userId: string;
  date: string; // YYYY-MM-DD format
  count: number;
  lastUpdated: Date;
}

class UsageTracker {
  /**
   * Get current usage count for user today
   * Returns 0 if no record exists
   */
  async getCurrentUsage(userId: string): Promise<number>;
  
  /**
   * Atomically increment usage counter for user today
   * Creates record if it doesn't exist
   * Returns new count
   */
  async incrementUsage(userId: string): Promise<number>;
  
  /**
   * Get usage record with metadata
   */
  async getUsageRecord(userId: string): Promise<DailyUsage | null>;
}
```

### 3. LimitEnforcer (New Service)

**File**: `backend/src/subscriptions/services/LimitEnforcer.ts`

**Purpose**: Orchestrates limit checking and enforcement logic.

**Interface**:
```typescript
interface LimitCheckResult {
  allowed: boolean;
  limit: number; // -1 for unlimited
  currentUsage: number;
  remaining: number; // -1 for unlimited
  resetTime: Date; // Next midnight UTC
  reason?: string; // Present when allowed = false
}

class LimitEnforcer {
  constructor(
    private planManager: PlanManager,
    private usageTracker: UsageTracker
  );
  
  /**
   * Check if user can create an appointment today
   * Returns detailed status including remaining count
   */
  async checkDailyAppointmentLimit(userId: string): Promise<LimitCheckResult>;
  
  /**
   * Increment usage counter after successful appointment creation
   * Should be called after appointment is persisted
   */
  async incrementDailyAppointmentUsage(userId: string): Promise<void>;
  
  /**
   * Get current limit status for user (for UI display)
   */
  async getDailyAppointmentStatus(userId: string): Promise<LimitCheckResult>;
}
```

### 4. Appointment Service (Modified)

**File**: `backend/src/services/appointmentService.ts`

**Changes**:
- Add limit check before creating appointment
- Add usage increment after successful creation
- Handle limit exceeded errors

**Modified Method**:
```typescript
export async function create(
  tenantId: string,
  input: CreateAppointmentInput
): Promise<AppointmentRow> {
  // NEW: Get userId from tenantId
  const userId = await getUserIdFromTenantId(tenantId);
  
  // NEW: Check daily limit
  const limitCheck = await limitEnforcer.checkDailyAppointmentLimit(userId);
  if (!limitCheck.allowed) {
    throw new AppointmentLimitExceededError(
      limitCheck.limit,
      limitCheck.currentUsage,
      limitCheck.resetTime
    );
  }
  
  // Existing appointment creation logic...
  const [row] = await db.insert(appointments).values({...}).returning();
  
  // NEW: Increment usage counter (fire-and-forget, don't block on failure)
  void limitEnforcer.incrementDailyAppointmentUsage(userId).catch(err => {
    logger.error({ userId, error: err }, 'Failed to increment usage counter');
  });
  
  // Existing email and return logic...
  return toRow(row);
}
```

### 5. Subscription API (Modified)

**File**: `backend/src/subscriptions/api/SubscriptionAPI.ts`

**Changes**:
- Add new endpoint: `GET /subscriptions/:userId/limits`
- Update `getSubscriptionStatus` response to include `dailyAppointmentLimit`
- Update `getAvailablePlans` response to include `dailyAppointmentLimit`

**New Endpoint**:
```typescript
/**
 * GET /subscriptions/:userId/limits
 * Get daily appointment limit status for user
 */
private async getDailyLimitStatus(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const authenticatedUser = req.user as AuthUser;
  
  // Authorization check
  if (authenticatedUser.id !== userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  
  const status = await limitEnforcer.getDailyAppointmentStatus(userId);
  
  res.json({
    limit: status.limit,
    used: status.currentUsage,
    remaining: status.remaining,
    resetTime: status.resetTime.toISOString(),
  });
}
```

## Data Models

### New Table: daily_appointment_usage

**Purpose**: Track daily appointment creation counts per user.

**Schema**:
```sql
CREATE TABLE daily_appointment_usage (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (user_id, usage_date),
  CONSTRAINT count_non_negative CHECK (count >= 0)
);

CREATE INDEX idx_daily_appointment_usage_date ON daily_appointment_usage(usage_date);
```

**TypeScript Schema** (Drizzle ORM):
```typescript
export const dailyAppointmentUsage = pgTable(
  'daily_appointment_usage',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    usageDate: date('usage_date').notNull(),
    count: integer('count').notNull().default(0),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey(table.userId, table.usageDate),
    dateIdx: index('idx_daily_appointment_usage_date').on(table.usageDate),
  })
);

export type DailyAppointmentUsage = typeof dailyAppointmentUsage.$inferSelect;
export type NewDailyAppointmentUsage = typeof dailyAppointmentUsage.$inferInsert;
```

### Modified Type: SubscriptionPlan

```typescript
export interface SubscriptionPlan {
  name: PlanName;
  priceARS: number;
  dailyAppointmentLimit: number; // NEW: -1 for unlimited
  features: {
    // appointments: boolean; // REMOVED
    calendarSync: boolean;
    patientDatabase: boolean;
    aiFeatures: boolean;
    whatsappIntegration: boolean;
  };
  disabled?: boolean;
}
```

### Modified Type: SubscriptionStatusResponse

```typescript
export interface SubscriptionStatusResponse {
  userId: string;
  plan: PlanName | 'free';
  status: 'active' | 'paused' | 'cancelled';
  dailyAppointmentLimit: number; // NEW
  features: {
    // appointments: boolean; // REMOVED (or derived for backward compat)
    calendarSync: boolean;
    patientDatabase: boolean;
    aiFeatures: boolean;
    whatsappIntegration: boolean;
  };
  billingPeriod?: {
    start: string;
    end: string;
  };
}
```

### New Error Type: AppointmentLimitExceededError

```typescript
export class AppointmentLimitExceededError extends Error {
  constructor(
    public limit: number,
    public currentUsage: number,
    public resetTime: Date
  ) {
    super(`Daily appointment limit of ${limit} exceeded`);
    this.name = 'AppointmentLimitExceededError';
  }
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:

- Properties 5.1 and 5.2 (upgrade/downgrade applying limits immediately) can be combined into a single property about plan changes applying limits immediately
- Properties 3.2 and 3.3 (reject when at limit, allow when under limit) are complementary aspects of the same limit enforcement property
- Properties 4.1, 4.2, 4.3, and 4.4 (API endpoint returning various fields) can be combined into a single property about the status endpoint returning complete information

### Property 1: Plan Limit Retrieval

*For any* valid plan name, calling `getDailyAppointmentLimit(planName)` should return the configured daily appointment limit for that plan.

**Validates: Requirements 1.4**

### Property 2: Backward Compatibility Derivation

*For any* subscription plan, if `dailyAppointmentLimit > 0`, then the derived `appointments` feature flag should be `true`, and if `dailyAppointmentLimit === 0`, then the derived flag should be `false`.

**Validates: Requirements 1.5, 6.5**

### Property 3: Usage Increment on Creation

*For any* user and any successful appointment creation, the user's daily appointment counter should increase by exactly 1.

**Validates: Requirements 2.1**

### Property 4: Date-Based Counter Isolation

*For any* user, the appointment counter for date D should be independent of the counter for date D+1, ensuring daily resets work correctly.

**Validates: Requirements 2.2**

### Property 5: Limit Enforcement

*For any* user with a daily limit L (where L ≥ 0), if the user has created L appointments today, then attempting to create another appointment should be rejected with HTTP 429 status code; if the user has created fewer than L appointments, the creation should succeed.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 6: Limit Exceeded Response Structure

*For any* appointment creation request that exceeds the daily limit, the error response should include the limit value, current usage count, and reset timestamp.

**Validates: Requirements 3.4**

### Property 7: Unlimited Users Bypass Limits

*For any* user with `dailyAppointmentLimit === -1`, they should be able to create any number of appointments without being rejected for exceeding limits.

**Validates: Requirements 3.5**

### Property 8: Status Endpoint Completeness

*For any* user, calling the daily limit status endpoint should return a response containing: current usage count, daily limit, remaining appointments, and reset time.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 9: Plan Change Immediate Effect

*For any* user changing from plan A to plan B, the daily appointment limit should immediately reflect plan B's limit on the next limit check.

**Validates: Requirements 5.1, 5.2**

### Property 10: Usage Preservation on Plan Change

*For any* user with current daily usage count N, changing subscription plans should not reset N to 0 within the same day.

**Validates: Requirements 5.4**

### Property 11: API Response Structure

*For any* subscription status query, the response should include the `dailyAppointmentLimit` field.

**Validates: Requirements 6.4**

### Property 12: Atomic Counter Operations

*For any* user creating multiple appointments concurrently, the final usage count should equal the number of successful creations (no lost increments due to race conditions).

**Validates: Requirements 7.4**

## Error Handling

### Error Scenarios and Responses

1. **Daily Limit Exceeded**
   - **Trigger**: User attempts to create appointment when at or over daily limit
   - **Response**: HTTP 429 Too Many Requests
   - **Body**:
     ```json
     {
       "error": "Daily appointment limit exceeded",
       "limit": 3,
       "used": 3,
       "remaining": 0,
       "resetTime": "2024-01-02T00:00:00.000Z"
     }
     ```

2. **Usage Counter Retrieval Failure**
   - **Trigger**: Database error when fetching usage count
   - **Behavior**: Log error and allow appointment creation (fail-open)
   - **Rationale**: Prefer availability over strict enforcement during infrastructure issues
   - **Logging**: Error level with userId, error details

3. **Plan Lookup Failure**
   - **Trigger**: Cannot determine user's subscription plan
   - **Behavior**: Apply free plan limits (3 appointments/day)
   - **Rationale**: Safe default that prevents abuse while allowing basic functionality
   - **Logging**: Warning level with userId

4. **Counter Increment Failure**
   - **Trigger**: Database error when incrementing usage counter
   - **Behavior**: Log error but don't block appointment creation
   - **Rationale**: Appointment already created; counter is for future enforcement
   - **Logging**: Error level with userId, appointmentId

5. **Invalid Limit Values**
   - **Trigger**: Plan configuration has negative limit (other than -1) or non-numeric value
   - **Behavior**: Treat as unlimited (-1)
   - **Rationale**: Fail-open to avoid blocking users due to configuration errors
   - **Logging**: Error level with planName, invalid value

6. **Concurrent Creation Race Conditions**
   - **Trigger**: Multiple simultaneous appointment creations
   - **Mitigation**: Use database-level atomic operations (UPDATE ... SET count = count + 1)
   - **Fallback**: If atomic operation fails, log error and continue
   - **Logging**: Warning level if race condition detected

### Error Recovery Strategies

1. **Counter Drift Correction**
   - If counter becomes inaccurate due to increment failures, it will self-correct at next daily reset
   - Optional: Periodic reconciliation job to compare counter with actual appointment count

2. **Stale Counter Cleanup**
   - Optional background job to delete usage records older than 30 days
   - Prevents unbounded table growth
   - Low priority, can run weekly

3. **Plan Change Edge Cases**
   - When user downgrades while over new limit, block new appointments until midnight UTC
   - Display clear message: "You've exceeded your new plan's daily limit. Limit resets at [time]."

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

### Unit Testing Focus

Unit tests should cover:

1. **Configuration Examples** (Requirements 1.1, 1.2, 1.3):
   - Free plan has limit of 3
   - Pro plan has limit of 50
   - Gold plan has limit of -1

2. **Database Schema** (Requirement 2.3):
   - Composite primary key (userId, date) prevents duplicates
   - Foreign key constraint on userId

3. **Error Handling Examples** (Requirements 7.1, 7.2):
   - Counter retrieval failure allows creation
   - Plan lookup failure applies free plan limits

4. **Edge Cases**:
   - Unlimited users with -1 remaining (Requirement 4.5)
   - Downgrade while over new limit (Requirement 5.3)
   - Invalid limit values treated as unlimited (Requirement 7.5)

5. **Integration Points**:
   - Appointment service calls limit enforcer
   - Limit enforcer coordinates plan manager and usage tracker
   - API endpoints return correct status codes

### Property-Based Testing Configuration

**Library**: Use `fast-check` for TypeScript property-based testing

**Configuration**: Each property test must run minimum 100 iterations

**Test Tagging**: Each test must reference its design property using the format:
```typescript
// Feature: subscription-plan-limits-redesign, Property 1: Plan Limit Retrieval
```

### Property Test Specifications

1. **Property 1: Plan Limit Retrieval**
   - **Generator**: Random valid plan names ('free', 'pro', 'gold')
   - **Test**: For each plan, verify getDailyAppointmentLimit returns expected value
   - **Assertion**: Returned value matches plan configuration

2. **Property 2: Backward Compatibility Derivation**
   - **Generator**: Random subscription plans with various dailyAppointmentLimit values
   - **Test**: Derive appointments boolean from dailyAppointmentLimit
   - **Assertion**: appointments === (dailyAppointmentLimit > 0)

3. **Property 3: Usage Increment on Creation**
   - **Generator**: Random userId, random initial usage count
   - **Test**: Create appointment, check counter increased by 1
   - **Assertion**: newCount === oldCount + 1

4. **Property 4: Date-Based Counter Isolation**
   - **Generator**: Random userId, two different dates
   - **Test**: Set counter for date1, verify date2 counter is independent
   - **Assertion**: Counter for date2 starts at 0

5. **Property 5: Limit Enforcement**
   - **Generator**: Random userId, random limit L (0-100), random usage count
   - **Test**: If usage >= L, creation fails with 429; if usage < L, creation succeeds
   - **Assertion**: Response matches expected based on usage vs limit

6. **Property 6: Limit Exceeded Response Structure**
   - **Generator**: Random userId at their limit
   - **Test**: Attempt creation, verify error response structure
   - **Assertion**: Response contains limit, used, remaining, resetTime fields

7. **Property 7: Unlimited Users Bypass Limits**
   - **Generator**: Random userId with limit -1, random high usage count (0-1000)
   - **Test**: Create appointment regardless of usage
   - **Assertion**: Creation always succeeds

8. **Property 8: Status Endpoint Completeness**
   - **Generator**: Random userId with random plan and usage
   - **Test**: Call status endpoint
   - **Assertion**: Response contains all required fields (limit, used, remaining, resetTime)

9. **Property 9: Plan Change Immediate Effect**
   - **Generator**: Random userId, two different plans
   - **Test**: Change from plan A to plan B, check limit immediately
   - **Assertion**: Limit reflects plan B's configuration

10. **Property 10: Usage Preservation on Plan Change**
    - **Generator**: Random userId, random usage count N, two different plans
    - **Test**: Change plans, verify usage count unchanged
    - **Assertion**: Usage count still equals N

11. **Property 11: API Response Structure**
    - **Generator**: Random userId with random subscription
    - **Test**: Query subscription status
    - **Assertion**: Response includes dailyAppointmentLimit field

12. **Property 12: Atomic Counter Operations**
    - **Generator**: Random userId, random number of concurrent creations (2-10)
    - **Test**: Create appointments concurrently, check final count
    - **Assertion**: Final count equals number of successful creations

### Test Data Generators

For property-based tests, implement these generators:

```typescript
// Generate random plan names
const planNameArbitrary = fc.constantFrom('free', 'pro', 'gold');

// Generate random user IDs
const userIdArbitrary = fc.uuid();

// Generate random dates in YYYY-MM-DD format
const dateArbitrary = fc.date().map(d => d.toISOString().split('T')[0]);

// Generate random usage counts (0-200)
const usageCountArbitrary = fc.integer({ min: 0, max: 200 });

// Generate random limits (including -1 for unlimited)
const limitArbitrary = fc.oneof(
  fc.constant(-1),
  fc.integer({ min: 0, max: 100 })
);
```

### Testing Priorities

1. **Critical Path** (Must have 100% coverage):
   - Limit enforcement logic (Property 5)
   - Usage increment atomicity (Property 12)
   - Unlimited user bypass (Property 7)

2. **High Priority**:
   - Plan change immediate effect (Property 9)
   - Usage preservation (Property 10)
   - Error handling (fail-open scenarios)

3. **Medium Priority**:
   - API response structures (Properties 6, 8, 11)
   - Backward compatibility (Property 2)

4. **Low Priority** (Nice to have):
   - Configuration validation (Properties 1, 2)
   - Date isolation (Property 4)
