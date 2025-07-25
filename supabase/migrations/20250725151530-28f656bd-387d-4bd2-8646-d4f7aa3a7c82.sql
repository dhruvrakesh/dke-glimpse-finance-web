-- Create user_ratio_benchmarks table for custom industry averages and targets
CREATE TABLE public.user_ratio_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ratio_definition_id UUID REFERENCES public.ratio_definitions(id) ON DELETE CASCADE,
  custom_industry_average NUMERIC,
  custom_target_value NUMERIC,
  benchmark_source TEXT DEFAULT 'Custom' CHECK (benchmark_source IN ('Custom', 'Industry Association', 'Internal Historical', 'External Research', 'Regulatory')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, ratio_definition_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.user_ratio_benchmarks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own benchmarks" 
ON public.user_ratio_benchmarks 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_user_ratio_benchmarks_updated_at
  BEFORE UPDATE ON public.user_ratio_benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_user_ratio_benchmarks_user_id ON public.user_ratio_benchmarks(user_id);
CREATE INDEX idx_user_ratio_benchmarks_org_id ON public.user_ratio_benchmarks(organization_id);
CREATE INDEX idx_user_ratio_benchmarks_ratio_id ON public.user_ratio_benchmarks(ratio_definition_id);