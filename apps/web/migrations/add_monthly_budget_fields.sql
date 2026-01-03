-- Add monthly budget and budget period fields to device_settings table
ALTER TABLE public.device_settings 
ADD COLUMN IF NOT EXISTS monthly_budget_cents INTEGER DEFAULT NULL;

ALTER TABLE public.device_settings 
ADD COLUMN IF NOT EXISTS budget_period VARCHAR(10) DEFAULT 'weekly' NOT NULL;

-- Add constraint to ensure budget_period is valid
-- Valid values: weekly, monthly
ALTER TABLE public.device_settings 
ADD CONSTRAINT check_budget_period 
CHECK (budget_period IN ('weekly', 'monthly'));

-- Add constraint to ensure budget amounts are non-negative when set
ALTER TABLE public.device_settings 
ADD CONSTRAINT check_monthly_budget_cents 
CHECK (monthly_budget_cents IS NULL OR monthly_budget_cents >= 0);

