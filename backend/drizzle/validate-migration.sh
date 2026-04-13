#!/bin/bash
# Script to validate migration SQL syntax without applying it

echo "=== Migration 0018: Treatment Cost Cents ==="
echo ""
echo "Validating SQL syntax..."
echo ""

# Check if migration file exists
if [ ! -f "0018_treatment_cost_cents.sql" ]; then
    echo "❌ Migration file not found: 0018_treatment_cost_cents.sql"
    exit 1
fi

echo "✅ Migration file exists"
echo ""

# Display migration SQL
echo "Migration SQL:"
echo "----------------------------------------"
cat 0018_treatment_cost_cents.sql
echo "----------------------------------------"
echo ""

# Check if rollback file exists
if [ ! -f "0018_treatment_cost_cents_rollback.sql" ]; then
    echo "❌ Rollback file not found: 0018_treatment_cost_cents_rollback.sql"
    exit 1
fi

echo "✅ Rollback file exists"
echo ""

# Display rollback SQL
echo "Rollback SQL:"
echo "----------------------------------------"
cat 0018_treatment_cost_cents_rollback.sql
echo "----------------------------------------"
echo ""

# Basic syntax validation
echo "Performing basic syntax checks..."

# Check for required keywords in migration
if grep -q "ALTER TABLE" 0018_treatment_cost_cents.sql && \
   grep -q "ADD COLUMN" 0018_treatment_cost_cents.sql && \
   grep -q "cost_cents" 0018_treatment_cost_cents.sql && \
   grep -q "CHECK" 0018_treatment_cost_cents.sql; then
    echo "✅ Migration SQL contains required keywords"
else
    echo "❌ Migration SQL missing required keywords"
    exit 1
fi

# Check for required keywords in rollback
if grep -q "DROP CONSTRAINT" 0018_treatment_cost_cents_rollback.sql && \
   grep -q "DROP COLUMN" 0018_treatment_cost_cents_rollback.sql; then
    echo "✅ Rollback SQL contains required keywords"
else
    echo "❌ Rollback SQL missing required keywords"
    exit 1
fi

echo ""
echo "=== Validation Complete ==="
echo ""
echo "To apply this migration:"
echo "  1. Ensure PostgreSQL database is running"
echo "  2. Run: npm run db:migrate"
echo ""
echo "To test the migration:"
echo "  npm test -- migration-0018-treatment-cost.test.ts"
echo ""
echo "To rollback (if needed):"
echo "  psql -d your_database < 0018_treatment_cost_cents_rollback.sql"
