-- Create scan_usage table for tracking camera scan usage (free tier: 5 scans/month)
CREATE TABLE IF NOT EXISTS public.scan_usage (
  device_id TEXT NOT NULL,
  month_key TEXT NOT NULL, -- YYYY-MM format
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_scan_usage_device_month ON public.scan_usage(device_id, month_key);

