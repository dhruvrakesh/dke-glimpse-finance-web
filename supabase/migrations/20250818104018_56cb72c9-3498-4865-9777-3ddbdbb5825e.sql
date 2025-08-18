-- Add missing columns to trial_balance_entries table
ALTER TABLE public.trial_balance_entries 
ADD COLUMN IF NOT EXISTS closing_balance NUMERIC,
ADD COLUMN IF NOT EXISTS account_type TEXT,
ADD COLUMN IF NOT EXISTS account_category TEXT,
ADD COLUMN IF NOT EXISTS gpt_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS processing_notes TEXT;

-- Create trial_balance_uploads table for upload management
CREATE TABLE IF NOT EXISTS public.trial_balance_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT,
  period_id INTEGER REFERENCES public.financial_periods(id),
  quarter_end_date DATE NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'processing',
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  entries_count INTEGER DEFAULT 0,
  gpt_processing_time_ms INTEGER,
  gpt_confidence_score NUMERIC,
  error_message TEXT,
  processing_summary JSONB,
  replaces_upload_id UUID REFERENCES public.trial_balance_uploads(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gpt_usage_log table for analytics
CREATE TABLE IF NOT EXISTS public.gpt_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES public.trial_balance_uploads(id),
  user_id UUID REFERENCES auth.users(id),
  model_name TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  cost_estimate NUMERIC(10,6),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.trial_balance_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpt_usage_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trial_balance_uploads
CREATE POLICY "Authenticated users can manage uploads" ON public.trial_balance_uploads
FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for gpt_usage_log
CREATE POLICY "Authenticated users can view GPT usage" ON public.gpt_usage_log
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert GPT usage logs" ON public.gpt_usage_log
FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trial_balance_uploads_period_id ON public.trial_balance_uploads(period_id);
CREATE INDEX IF NOT EXISTS idx_trial_balance_uploads_quarter_end_date ON public.trial_balance_uploads(quarter_end_date);
CREATE INDEX IF NOT EXISTS idx_trial_balance_uploads_uploaded_by ON public.trial_balance_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_trial_balance_uploads_is_active ON public.trial_balance_uploads(is_active);
CREATE INDEX IF NOT EXISTS idx_gpt_usage_log_upload_id ON public.gpt_usage_log(upload_id);
CREATE INDEX IF NOT EXISTS idx_gpt_usage_log_user_id ON public.gpt_usage_log(user_id);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trial_balance_uploads_updated_at
  BEFORE UPDATE ON public.trial_balance_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();