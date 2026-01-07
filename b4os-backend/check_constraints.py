#!/usr/bin/env python3
"""
Check database constraints on zzz_assignment_attempts table
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

# Query to check constraints - we'll use a simple query to see if we can get table info
try:
    # Try to get some data to verify table exists
    result = supabase.table('zzz_assignment_attempts').select('*').limit(1).execute()
    print(f"✅ Table exists with {len(result.data)} records (showing first 1)")

    if result.data:
        print("\nTable structure (from first record):")
        for key in result.data[0].keys():
            print(f"  - {key}")

    print("\n⚠️  Cannot check constraints directly from Python client.")
    print("Please run this SQL in Supabase SQL Editor to check constraints:\n")

    sql = """
SELECT
    con.conname as constraint_name,
    con.contype as constraint_type,
    pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE rel.relname = 'zzz_assignment_attempts'
  AND con.contype = 'u';  -- u = unique constraint
"""

    print(sql)

except Exception as e:
    print(f"❌ Error: {e}")
