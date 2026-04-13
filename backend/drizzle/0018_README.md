# Migration 0018: Treatment Cost Tracking

## Overview
This migration adds a `cost_cents` column to the `treatments` table to track the cost of providing each treatment. This enables profit margin calculations in the debt dashboard.

## Files Created
1. **0018_treatment_cost_cents.sql** - Main migration file
2. **0018_treatment_cost_cents_rollback.sql** - Rollback script
3. **0018_treatment_cost_cents_test.md** - Manual testing documentation
4. **backend/src/db/__tests__/migration-0018-treatment-cost.test.ts** - Automated integration tests

## Migration Details

### Schema Changes
- **Table**: `treatments`
- **Column**: `cost_cents`
- **Type**: `INTEGER`
- **Nullable**: `YES` (NULL allowed)
- **Constraint**: `CHECK (cost_cents >= 0)`

### SQL
```sql
ALTER TABLE "treatments" ADD COLUMN "cost_cents" integer;
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_cost_cents_check" CHECK ("cost_cents" >= 0);
```

## How to Apply

### 1. Ensure Database is Running
Make sure your PostgreSQL database is running and accessible.

### 2. Run Migration
```bash
cd backend
npm run db:migrate
```

### 3. Verify Migration
```bash
# Connect to database
psql -d your_database_name

# Check column exists
\d treatments

# Verify constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'treatments_cost_cents_check';
```

### 4. Run Tests
```bash
cd backend
npm test -- migration-0018-treatment-cost.test.ts
```

## Rollback Procedure

If you need to rollback this migration:

```bash
# Connect to database
psql -d your_database_name

# Run rollback script
\i backend/drizzle/0018_treatment_cost_cents_rollback.sql
```

Or manually:
```sql
ALTER TABLE "treatments" DROP CONSTRAINT IF EXISTS "treatments_cost_cents_check";
ALTER TABLE "treatments" DROP COLUMN IF EXISTS "cost_cents";
```

## Impact Assessment

### Data Impact
- **Existing Data**: All existing treatments will have `cost_cents = NULL`
- **No Data Loss**: This is an additive change only
- **Backward Compatible**: Applications not using this field will continue to work

### Application Impact
- **Backend**: Schema already updated in `backend/src/db/schema.ts`
- **API**: No breaking changes (field is optional)
- **Frontend**: Will need updates to display and edit cost data (separate tasks)

### Performance Impact
- **Minimal**: Adding a nullable column is a fast operation
- **No Indexes**: No indexes added on this column (not needed for current use case)
- **Query Impact**: Existing queries unaffected

## Testing Checklist

- [x] Migration SQL created
- [x] Rollback SQL created
- [x] Integration tests created
- [ ] Migration applied to development database
- [ ] Tests run successfully
- [ ] Manual verification completed
- [ ] Rollback tested
- [ ] Migration re-applied after rollback

## Requirements Satisfied
- ✅ Requirement 1.1: Database stores cost field for each treatment in cents
- ✅ Requirement 1.2: Treatment cost is nullable (supports existing treatments)
- ✅ Requirement 1.3: Treatment cost is non-negative (CHECK constraint)
- ✅ Requirement 5.3: Migration sets treatment costs to null for existing treatments

## Next Steps
After this migration is applied:
1. Task 2: Update backend API to accept and return cost_cents
2. Task 3: Update frontend forms to display and edit cost
3. Task 4: Integrate cost calculations into debt dashboard
