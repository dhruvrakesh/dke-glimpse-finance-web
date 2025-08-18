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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (!user) {
      console.log('Unauthorized access attempt')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const quarterEndDate = formData.get('periodId') as string

    if (!file || !quarterEndDate) {
      console.log('Missing file or quarter end date')
      return new Response(JSON.stringify({ error: 'File and quarter end date are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Processing trial balance for quarter end date:', quarterEndDate)

    // Create or find financial period
    const quarterDate = new Date(quarterEndDate.split('T')[0]) // Handle ISO strings by taking date part only
    const year = quarterDate.getFullYear()
    const quarter = Math.floor((quarterDate.getMonth() + 3) / 3)
    
    console.log('Year:', year, 'Quarter:', quarter)

    // Check if period exists
    let { data: existingPeriod, error: periodError } = await supabaseClient
      .from('financial_periods')
      .select('id')
      .eq('year', year)
      .eq('quarter', quarter)
      .single()

    let periodId: number

    if (periodError && periodError.code === 'PGRST116') {
      // Period doesn't exist, create it
      console.log('Creating new financial period')
      const { data: newPeriod, error: createError } = await supabaseClient
        .from('financial_periods')
        .insert({
          year,
          quarter,
          quarter_end_date: quarterEndDate.split('T')[0], // Store as date only
          created_by: user.id
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating financial period:', createError)
        return new Response(JSON.stringify({ error: 'Failed to create financial period: ' + createError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      periodId = newPeriod.id
    } else if (periodError) {
      console.error('Error fetching financial period:', periodError)
      return new Response(JSON.stringify({ error: 'Database error: ' + periodError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      periodId = existingPeriod.id
      console.log('Using existing financial period:', periodId)
    }

    // Parse CSV
    const csvText = await file.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return new Response(JSON.stringify({ error: 'Empty CSV file' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    console.log('CSV headers:', headers)
    
    // Validate headers - support multiple CSV formats
    const hasParticularsClosed = headers.includes('Particulars') && headers.includes('Closing Balance')
    const hasLedgerClosed = headers.includes('ledger_name') && headers.includes('closing_balance')
    
    if (!hasParticularsClosed && !hasLedgerClosed) {
      return new Response(JSON.stringify({ 
        error: 'Invalid CSV format. Expected headers: either [Particulars, Closing Balance] or [ledger_name, closing_balance]',
        received_headers: headers
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const entries = []
    const errors = []

    // Determine CSV format and column indices
    const isParticularsFormat = headers.includes('Particulars')
    const ledgerNameIndex = isParticularsFormat ? headers.indexOf('Particulars') : headers.indexOf('ledger_name')
    const closingBalanceIndex = isParticularsFormat ? headers.indexOf('Closing Balance') : headers.indexOf('closing_balance')
    const debitIndex = headers.indexOf('Debit')
    const creditIndex = headers.indexOf('Credit')

    console.log('CSV format detected:', isParticularsFormat ? 'Particulars format' : 'Simple format')
    console.log('Column indices - Ledger:', ledgerNameIndex, 'Closing:', closingBalanceIndex, 'Debit:', debitIndex, 'Credit:', creditIndex)

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        
        if (values.length < Math.max(ledgerNameIndex + 1, closingBalanceIndex + 1)) {
          throw new Error('Insufficient columns in row')
        }

        const ledgerName = values[ledgerNameIndex]
        
        // Skip empty rows or header-like rows
        if (!ledgerName || ledgerName === '' || ledgerName.toLowerCase().includes('particular')) {
          continue
        }

        let debitAmount = 0
        let creditAmount = 0

        if (isParticularsFormat && debitIndex >= 0 && creditIndex >= 0) {
          // Use separate debit/credit columns if available
          const debit = parseFloat(values[debitIndex]) || 0
          const credit = parseFloat(values[creditIndex]) || 0
          debitAmount = debit
          creditAmount = credit
        } else {
          // Use closing balance column
          const closingBalance = parseFloat(values[closingBalanceIndex]) || 0
          debitAmount = closingBalance >= 0 ? closingBalance : 0
          creditAmount = closingBalance < 0 ? Math.abs(closingBalance) : 0
        }

        const entry = {
          period_id: periodId,
          ledger_name: ledgerName,
          parent_group: values[headers.indexOf('parent_group')] || null,
          debit: debitAmount,
          credit: creditAmount
        }

        entries.push(entry)
      } catch (error) {
        console.error('Error processing row', i + 1, ':', error.message)
        errors.push({ row: i + 1, error: error.message, data: lines[i] })
      }
    }

    if (entries.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No valid entries found',
        errors: errors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Processing', entries.length, 'entries')

    // Insert entries
    const { data, error } = await supabaseClient
      .from('trial_balance_entries')
      .insert(entries)

    if (error) {
      console.error('Database insertion error:', error)
      return new Response(JSON.stringify({ error: 'Database error: ' + error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Successfully processed', entries.length, 'entries')

    return new Response(JSON.stringify({ 
      success: true, 
      processed: entries.length,
      period_id: periodId,
      errors: errors.length > 0 ? errors : null 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Unexpected error: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})