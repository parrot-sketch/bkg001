# Migration Strategy for Patient File Number

## Issue Detected

**Problem:** We're adding a required `file_number` field, but there are **5 existing Patient records** in the database without file numbers.

**Error:** "Added the required column `file_number` to the `Patient` table without a default value."

## Solution: Multi-Step Migration

We need to handle existing records by generating file numbers for them.

### Option 1: Manual Migration Script (Recommended)

**Step 1:** Create migration that allows NULL temporarily

**Step 2:** Generate file numbers for existing records

**Step 3:** Make field required and add unique constraint

### Option 2: Provide Default, Then Update

**Step 1:** Add field as optional with default value

**Step 2:** Update existing records with proper file numbers

**Step 3:** Remove default and make required

## Recommended Approach

Create a migration that:

1. **Add field as nullable** (no unique constraint yet)
2. **Generate file numbers** for existing patients (NS001, NS002, etc.)
3. **Add NOT NULL constraint**
4. **Add unique constraint**

## Migration SQL (Manual)

```sql
-- Step 1: Add file_number as nullable
ALTER TABLE "Patient" ADD COLUMN "file_number" TEXT;

-- Step 2: Add whatsapp_phone and occupation as nullable
ALTER TABLE "Patient" ADD COLUMN "whatsapp_phone" TEXT;
ALTER TABLE "Patient" ADD COLUMN "occupation" TEXT;

-- Step 3: Generate file numbers for existing records (ordered by created_at)
-- This assumes we have 5 records, we'll assign NS001 to NS005
UPDATE "Patient" SET "file_number" = 'NS001' WHERE id = (SELECT id FROM "Patient" ORDER BY created_at LIMIT 1 OFFSET 0);
UPDATE "Patient" SET "file_number" = 'NS002' WHERE id = (SELECT id FROM "Patient" ORDER BY created_at LIMIT 1 OFFSET 1);
UPDATE "Patient" SET "file_number" = 'NS003' WHERE id = (SELECT id FROM "Patient" ORDER BY created_at LIMIT 1 OFFSET 2);
UPDATE "Patient" SET "file_number" = 'NS004' WHERE id = (SELECT id FROM "Patient" ORDER BY created_at LIMIT 1 OFFSET 3);
UPDATE "Patient" SET "file_number" = 'NS005' WHERE id = (SELECT id FROM "Patient" ORDER BY created_at LIMIT 1 OFFSET 4);

-- Step 4: Make file_number required
ALTER TABLE "Patient" ALTER COLUMN "file_number" SET NOT NULL;

-- Step 5: Add unique constraint
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_file_number_key" UNIQUE ("file_number");

-- Step 6: Create index
CREATE INDEX IF NOT EXISTS "Patient_file_number_idx" ON "Patient"("file_number");
```

## Better Approach: Use a Single UPDATE Query

```sql
-- Generate sequential file numbers based on created_at
WITH numbered AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM "Patient"
)
UPDATE "Patient"
SET "file_number" = 'NS' || LPAD(numbered.row_num::TEXT, 3, '0')
FROM numbered
WHERE "Patient".id = numbered.id;
```
