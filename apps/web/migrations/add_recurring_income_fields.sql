-- Add recurring income fields to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR(20) DEFAULT NULL;

-- Add constraint to ensure recurrence_frequency is valid if is_recurring is true
-- Valid values: weekly, biweekly, monthly, quarterly, annually
ALTER TABLE public.expenses 
ADD CONSTRAINT check_recurrence_frequency 
CHECK (
  (is_recurring = false AND recurrence_frequency IS NULL) OR
  (is_recurring = true AND recurrence_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually'))
);

-- Create index for filtering recurring income
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON public.expenses(device_id, is_recurring) WHERE is_recurring = true;

