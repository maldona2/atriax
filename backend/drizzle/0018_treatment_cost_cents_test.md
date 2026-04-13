# Migration 0018: Treatment Cost Cents - Test Documentation

## Migration Details
- **File**: `0018_treatment_cost_cents.sql`
- **Purpose**: Add `cost_cents` column to `treatments` table for tracking treatment costs
- **Requirements**: 1.1, 1.2, 1.3, 5.3

## Migration SQL
```sql
ALTER TABLE "treatments" ADD COLUMN "cost_cents" integer;
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_cost_cents_check" CHECK ("cost_cents" >= 0);
```

## Rollback SQL
```sql
ALTER TABLE "treatments" DROP CONSTRAINT IF EXISTS "treatments_cost_cents_check";
ALTER TABLE "treatments" DROP COLUMN IF EXISTS "cost_cents";
```

## Testing Checklist

### Pre-Migration Verification
- [ ] Verify database connection is available
- [ ] Backup database (if production)
- [ ] Verify `treatments` table exists
- [ ] Verify no existing `cost_cents` column

### Migration Application
- [ ] Run migration: `npm run db:migrate`
- [ ] Verify migration completes without errors
- [ ] Verify column was added: `\d treatments` in psql

### Post-Migration Verification
- [ ] Verify `cost_cents` column exists in `treatments` table
- [ ] Verify column type is `integer`
- [ ] Verify column is nullable (NULL allowed)
- [ ] Verify check constraint exists: `cost_cents >= 0`
- [ ] Test inserting treatment with cost: `INSERT INTO treatments (tenant_id, name, price_cents, cost_cents) VALUES (..., 1000)`
- [ ] Test inserting treatment without cost: `INSERT INTO treatments (tenant_id, name, price_cents) VALUES (...)`
- [ ] Test constraint violation: `INSERT INTO treatments (tenant_id, name, price_cents, cost_cents) VALUES (..., -100)` (should fail)

### Rollback Testing
- [ ] Apply rollback: `psql -f backend/drizzle/0018_treatment_cost_cents_rollback.sql`
- [ ] Verify constraint is removed
- [ ] Verify column is removed
- [ ] Verify existing data is intact (other columns)
- [ ] Re-apply migration to restore column

## SQL Validation

### Check Column Exists
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'treatments' AND column_name = 'cost_cents';
```

Expected result:
```
 column_name | data_type | is_nullable 
-------------+-----------+-------------
 cost_cents  | integer   | YES
```

### Check Constraint Exists
```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'treatments_cost_cents_check';
```

Expected result:
```
      constraint_name       |     check_clause      
----------------------------+-----------------------
 treatments_cost_cents_check | (cost_cents >= 0)
```

### Test Data Insertion
```sql
-- Should succeed: with cost
INSERT INTO treatments (tenant_id, name, price_cents, cost_cents) 
VALUES ('some-uuid', 'Test Treatment', 10000, 5000);

-- Should succeed: without cost (NULL)
INSERT INTO treatments (tenant_id, name, price_cents) 
VALUES ('some-uuid', 'Test Treatment 2', 10000);

-- Should fail: negative cost
INSERT INTO treatments (tenant_id, name, price_cents, cost_cents) 
VALUES ('some-uuid', 'Test Treatment 3', 10000, -100);
-- Expected error: new row for relation "treatments" violates check constraint "treatments_cost_cents_check"
```

## Notes
- Migration is idempotent (can be run multiple times safely)
- Existing treatments will have `cost_cents = NULL`
- No data migration required
- Schema change is backward compatible (nullable column)
