-- Migration: Add user_id columns to all data tables for user-based data storage
-- This migration enables production-ready user authentication with data tied to user accounts
-- Note: user_id columns are nullable initially, but application code will require them

-- 1. Add user_id to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Make device_id nullable in expenses table since we're moving to user_id-based system
ALTER TABLE public.expenses 
ALTER COLUMN device_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id_occurred_at ON public.expenses(user_id, occurred_at DESC);

-- 2. Add user_id to device_settings table (keeping table name for backward compatibility)
ALTER TABLE public.device_settings 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Drop primary key constraint if device_id is part of it
DO $$ 
DECLARE
  pk_constraint_name TEXT;
BEGIN
  SELECT constraint_name INTO pk_constraint_name
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'public' 
    AND table_name = 'device_settings' 
    AND constraint_type = 'PRIMARY KEY'
  LIMIT 1;
  
  IF pk_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.device_settings DROP CONSTRAINT ' || pk_constraint_name;
  END IF;
END $$;

-- Drop old unique constraint on device_id if exists
ALTER TABLE public.device_settings 
DROP CONSTRAINT IF EXISTS device_settings_device_id_key;

-- Make device_id nullable since we're moving to user_id-based system
ALTER TABLE public.device_settings 
ALTER COLUMN device_id DROP NOT NULL;

-- Create new unique constraint on user_id
ALTER TABLE public.device_settings 
ADD CONSTRAINT device_settings_user_id_key UNIQUE(user_id);

CREATE INDEX IF NOT EXISTS idx_device_settings_user_id ON public.device_settings(user_id);

-- 3. Add user_id to scan_usage table
ALTER TABLE public.scan_usage 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Handle primary key: drop old constraint and create new one
DO $$ 
BEGIN
  -- Drop old primary key if it exists
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_schema = 'public' 
             AND table_name = 'scan_usage' 
             AND constraint_type = 'PRIMARY KEY') THEN
    ALTER TABLE public.scan_usage DROP CONSTRAINT scan_usage_pkey;
  END IF;
END $$;

-- Create unique constraint for user_id + month_key (for ON CONFLICT to work)
-- Note: This creates a unique index that allows ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS scan_usage_user_id_month_key_unique 
ON public.scan_usage(user_id, month_key);

CREATE INDEX IF NOT EXISTS idx_scan_usage_user_id_month ON public.scan_usage(user_id, month_key);

-- 4. Handle voice_usage table
DO $$ 
BEGIN
  -- Check if voice_usage table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voice_usage') THEN
    -- Table exists, add user_id column
    ALTER TABLE public.voice_usage ADD COLUMN IF NOT EXISTS user_id TEXT;
    
    -- Drop old primary key if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_schema = 'public' 
               AND table_name = 'voice_usage' 
               AND constraint_type = 'PRIMARY KEY') THEN
      ALTER TABLE public.voice_usage DROP CONSTRAINT voice_usage_pkey;
    END IF;
    
    -- Create unique constraint for user_id + month_key (for ON CONFLICT to work)
    CREATE UNIQUE INDEX IF NOT EXISTS voice_usage_user_id_month_key_unique 
    ON public.voice_usage(user_id, month_key);
    
    CREATE INDEX IF NOT EXISTS idx_voice_usage_user_id_month ON public.voice_usage(user_id, month_key);
  ELSE
    -- Table doesn't exist, create it with user_id
    CREATE TABLE public.voice_usage (
      user_id TEXT NOT NULL,
      month_key TEXT NOT NULL,
      used_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, month_key)
    );
    
    CREATE INDEX IF NOT EXISTS idx_voice_usage_user_id_month ON public.voice_usage(user_id, month_key);
  END IF;
END $$;

-- 5. Add user_id to custom_categories table
ALTER TABLE public.custom_categories 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Drop old unique constraint if it exists
ALTER TABLE public.custom_categories 
DROP CONSTRAINT IF EXISTS custom_categories_device_id_category_name_key;

-- Make device_id nullable in custom_categories table since we're moving to user_id-based system
ALTER TABLE public.custom_categories 
ALTER COLUMN device_id DROP NOT NULL;

-- Create new unique constraint with user_id
ALTER TABLE public.custom_categories 
ADD CONSTRAINT custom_categories_user_id_category_name_key UNIQUE(user_id, category_name);

CREATE INDEX IF NOT EXISTS idx_custom_categories_user_id ON public.custom_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_categories_user_id_type ON public.custom_categories(user_id, type);

-- 6. Add user_id to vendor_category_map table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_category_map') THEN
    ALTER TABLE public.vendor_category_map ADD COLUMN IF NOT EXISTS user_id TEXT;
    
    -- Drop old constraints if they exist
    ALTER TABLE public.vendor_category_map DROP CONSTRAINT IF EXISTS vendor_category_map_pkey;
    ALTER TABLE public.vendor_category_map DROP CONSTRAINT IF EXISTS vendor_category_map_device_id_vendor_key_key;
    
    -- Create unique constraint for user_id + vendor_key (for ON CONFLICT to work)
    CREATE UNIQUE INDEX IF NOT EXISTS vendor_category_map_user_id_vendor_key_unique 
    ON public.vendor_category_map(user_id, vendor_key);
    
    CREATE INDEX IF NOT EXISTS idx_vendor_category_map_user_id ON public.vendor_category_map(user_id);
  END IF;
END $$;
