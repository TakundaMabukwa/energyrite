-- Test if energyrite_vehicle_lookup table exists and is accessible
-- Run this in Supabase SQL Editor

-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'energyrite_vehicle_lookup'
);

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'energyrite_vehicle_lookup';

-- Test insert
INSERT INTO public.energyrite_vehicle_lookup (plate, cost_code)
VALUES ('TEST-INSERT', 'TEST-CODE-001')
RETURNING *;

-- Clean up test
DELETE FROM public.energyrite_vehicle_lookup WHERE plate = 'TEST-INSERT';
