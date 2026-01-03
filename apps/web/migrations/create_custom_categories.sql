-- Create custom_categories table
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  icon TEXT DEFAULT '✨',
  color TEXT DEFAULT '#F6F6F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(device_id, category_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_categories_device_id ON public.custom_categories(device_id);

