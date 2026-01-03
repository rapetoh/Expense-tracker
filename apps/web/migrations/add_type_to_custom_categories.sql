-- Add type field to custom_categories table
ALTER TABLE public.custom_categories 
ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'expense' NOT NULL;

-- Create index for faster lookups by type
CREATE INDEX IF NOT EXISTS idx_custom_categories_type ON public.custom_categories(device_id, type);

-- Update existing rows to have type='expense' (default)
UPDATE public.custom_categories SET type = 'expense' WHERE type IS NULL;

