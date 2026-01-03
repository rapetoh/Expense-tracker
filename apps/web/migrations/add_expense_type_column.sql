-- Add type column to expenses table to support both expenses and income
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'expense' NOT NULL;

-- Create index for faster filtering by type
CREATE INDEX IF NOT EXISTS idx_expenses_type ON public.expenses(device_id, type);

-- Update any existing NULL values to 'expense' (shouldn't be any, but just in case)
UPDATE public.expenses SET type = 'expense' WHERE type IS NULL;

