// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://xltzaggnwhqskxkrzdqo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHphZ2dud2hxc2t4a3J6ZHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTU4MjAsImV4cCI6MjA2NTQ5MTgyMH0.hiOZy_EnX7yKkie1OvEAkRmypW-5ulePtLSzW_vC2Nc";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});