import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const periodId = formData.get('periodId') as string

    if (!file || !periodId) {
      return new Response(JSON.stringify({ error: 'File and period ID are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse CSV
    const csvText = await file.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    const entries = []
    const errors = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const entry = {
          financial_period_id: periodId,
          account_code: values[0] || '',
          account_name: values[1] || '',
          debit_amount: parseFloat(values[2]) || 0,
          credit_amount: parseFloat(values[3]) || 0,
          balance_amount: parseFloat(values[4]) || 0,
          uploaded_by: user.id,
          created_at: new Date().toISOString()
        }

        if (!entry.account_code || !entry.account_name) {
          throw new Error('Account code and name are required')
        }

        entries.push(entry)
      } catch (error) {
        errors.push({ row: i + 1, error: error.message })
      }
    }

    if (entries.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid entries found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insert entries
    const { data, error } = await supabaseClient
      .from('trial_balance_entries')
      .insert(entries)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: entries.length,
      errors: errors.length > 0 ? errors : null 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})