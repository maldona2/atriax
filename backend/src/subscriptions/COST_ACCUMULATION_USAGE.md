# Cost Accumulation and Enforcement Usage Guide

This guide demonstrates how to use the integrated cost accumulation and enforcement system for OpenAI API calls.

## Overview

The system implements Requirements 9.5, 9.6, and 9.7:
- **9.5**: Calculate actual cost after each OpenAI API call completes
- **9.6**: Add cost to user's monthly cost total in users table
- **9.7**: Reject subsequent calls when limit exceeded

## Components

### CostCalculator
Calculates OpenAI API costs based on model and token usage.

### TokenTracker
Records token usage and costs in the database.

### UsageEnforcer
Enforces usage limits before allowing API calls.

## Basic Usage

### 1. Initialize Components

```typescript
import { CostCalculator } from './services/CostCalculator.js';
import { TokenTracker } from './services/TokenTracker.js';
import { UsageEnforcer } from './services/UsageEnforcer.js';

// Initialize cost calculator
const costCalculator = new CostCalculator();
await costCalculator.loadPricingFromDatabase();

// Initialize token tracker with cost calculator
const tokenTracker = new TokenTracker();
tokenTracker.setCostCalculator(costCalculator);

// Initialize usage enforcer
const usageEnforcer = new UsageEnforcer();
```

### 2. Before Making an OpenAI API Call

Check if the user has sufficient cost limit remaining:

```typescript
// Estimate the cost for the planned API call
const estimatedCost = costCalculator.calculateCost(
  'gpt-4',
  estimatedInputTokens,
  estimatedOutputTokens
).totalCost;

// Check if user can afford this call
const costCheck = await usageEnforcer.checkCostLimit(userId, estimatedCost);

if (!costCheck.allowed) {
  throw new Error(costCheck.reason);
  // Example: "Monthly cost limit exceeded. Limit: 10.0000, Used: 9.9500, Requested: 0.0600"
}
```

### 3. After OpenAI API Call Completes

Record the actual tokens and cost used:

```typescript
// Option A: Use TokenTracker.recordTokenUsageWithCost (Recommended)
// This automatically calculates cost and records both tokens and cost
await tokenTracker.recordTokenUsageWithCost(
  userId,
  model,           // e.g., 'gpt-4'
  inputTokens,     // actual input tokens from API response
  outputTokens     // actual output tokens from API response
);

// Option B: Calculate cost separately and use UsageEnforcer.incrementTokenUsage
const costCalculation = costCalculator.calculateCost(model, inputTokens, outputTokens);
await usageEnforcer.incrementTokenUsage(
  userId,
  inputTokens + outputTokens,
  costCalculation.totalCost
);
```

## Complete Example

```typescript
async function makeOpenAICall(userId: string, prompt: string) {
  // Estimate tokens (rough estimate)
  const estimatedInputTokens = Math.ceil(prompt.length / 4);
  const estimatedOutputTokens = 500; // expected response size
  
  // Calculate estimated cost
  const estimatedCost = costCalculator.calculateCost(
    'gpt-4',
    estimatedInputTokens,
    estimatedOutputTokens
  ).totalCost;
  
  // Check cost limit (Requirement 9.7)
  const costCheck = await usageEnforcer.checkCostLimit(userId, estimatedCost);
  if (!costCheck.allowed) {
    throw new Error(`Cost limit exceeded: ${costCheck.reason}`);
  }
  
  // Make the actual OpenAI API call
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });
  
  // Extract actual token usage from response
  const actualInputTokens = response.usage?.prompt_tokens || 0;
  const actualOutputTokens = response.usage?.completion_tokens || 0;
  
  // Record actual usage (Requirements 9.5 and 9.6)
  await tokenTracker.recordTokenUsageWithCost(
    userId,
    'gpt-4',
    actualInputTokens,
    actualOutputTokens
  );
  
  return response;
}
```

## Handling Unlimited Users

Users with unlimited cost limits (sentinel value -1) bypass all checks:

```typescript
const costCheck = await usageEnforcer.checkCostLimit(userId, estimatedCost);
// For unlimited users: costCheck.allowed === true, costCheck.reason === 'Unlimited cost usage'
```

## Billing Month Reset

The system automatically handles billing month transitions:
- When recording usage in a new billing month, previous month's usage is reset
- The `billingMonth` field is updated to the current month (YYYY-MM format)

## Error Handling

```typescript
try {
  await tokenTracker.recordTokenUsageWithCost(userId, model, inputTokens, outputTokens);
} catch (error) {
  if (error.message.includes('Cost calculator not set')) {
    // Initialize cost calculator first
  } else if (error.message.includes('Pricing not found')) {
    // Invalid model name
  } else if (error.message.includes('User not found')) {
    // Invalid user ID
  }
}
```

## Database Schema

The system uses the following fields in the `users` table:

```sql
-- Limits (from subscription plan)
cost_limit_monthly_usd DECIMAL(10, 4)  -- -1 for unlimited

-- Current usage (reset at billing period)
cost_used_monthly_usd DECIMAL(10, 4)
tokens_used_monthly BIGINT
billing_month VARCHAR(7)  -- Format: YYYY-MM
```

## Testing

See `backend/src/subscriptions/services/__tests__/CostAccumulation.test.ts` for comprehensive integration tests demonstrating:
- Cost calculation after API calls
- Cost accumulation across multiple calls
- Limit enforcement and rejection
- Complete workflow examples
- Error handling scenarios
