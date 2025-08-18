import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

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

    console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size)

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

    // Parse file (CSV or Excel)
    let rows: string[][]
    const fileName = file.name.toLowerCase()
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      console.log('Processing Excel file')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false })
      rows = jsonData.filter(row => row && row.length > 0 && row.some(cell => cell && cell.toString().trim()))
    } else {
      console.log('Processing CSV file')
      const csvText = await file.text()
      const lines = csvText.split('\n').filter(line => line.trim())
      rows = lines.map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')))
    }
    
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Empty file or no valid data found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Smart header detection - skip company headers/titles and find actual data headers
    let headerRowIndex = -1
    let headers: string[] = []
    
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i]
      if (row.length < 2) continue
      
      // Look for rows that contain trial balance column indicators
      const hasParticularCol = row.some(cell => cell && cell.toString().toLowerCase().includes('particular'))
      const hasLedgerCol = row.some(cell => cell && cell.toString().toLowerCase().includes('ledger'))
      const hasClosingCol = row.some(cell => cell && cell.toString().toLowerCase().includes('closing'))
      const hasDebitCol = row.some(cell => cell && cell.toString().toLowerCase().includes('debit'))
      const hasCreditCol = row.some(cell => cell && cell.toString().toLowerCase().includes('credit'))
      
      if ((hasParticularCol || hasLedgerCol) && (hasClosingCol || (hasDebitCol && hasCreditCol))) {
        headerRowIndex = i
        headers = row.map(cell => cell ? cell.toString().trim() : '')
        break
      }
    }
    
    if (headerRowIndex === -1) {
      console.log('Header detection failed. Trying fallback with first non-empty row')
      console.log('Available rows:', rows.slice(0, 5))
      headerRowIndex = 0
      headers = rows[0].map(cell => cell ? cell.toString().trim() : '')
    }
    
    console.log('Detected header row at index:', headerRowIndex)
    console.log('Headers found:', headers)
    
    // Validate headers - support multiple formats with flexible matching
    const findColumnIndex = (searchTerms: string[]) => {
      for (const term of searchTerms) {
        const index = headers.findIndex(h => h.toLowerCase().includes(term.toLowerCase()))
        if (index !== -1) return index
      }
      return -1
    }
    
    const ledgerNameIndex = findColumnIndex(['Particulars', 'ledger_name', 'account', 'ledger'])
    const closingBalanceIndex = findColumnIndex(['Closing Balance', 'closing_balance', 'balance', 'amount'])
    const debitIndex = findColumnIndex(['Debit', 'debit_amount', 'dr'])
    const creditIndex = findColumnIndex(['Credit', 'credit_amount', 'cr'])
    
    console.log('Column mapping:')
    console.log('- Ledger Name Index:', ledgerNameIndex, headers[ledgerNameIndex] || 'Not found')
    console.log('- Closing Balance Index:', closingBalanceIndex, headers[closingBalanceIndex] || 'Not found') 
    console.log('- Debit Index:', debitIndex, headers[debitIndex] || 'Not found')
    console.log('- Credit Index:', creditIndex, headers[creditIndex] || 'Not found')
    
    if (ledgerNameIndex === -1) {
      return new Response(JSON.stringify({ 
        error: 'Could not find ledger/account name column. Expected column headers containing: Particulars, ledger_name, account, or ledger',
        received_headers: headers,
        detected_header_row: headerRowIndex
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    if (closingBalanceIndex === -1 && (debitIndex === -1 || creditIndex === -1)) {
      return new Response(JSON.stringify({ 
        error: 'Could not find balance columns. Expected either: Closing Balance column OR both Debit and Credit columns',
        received_headers: headers,
        detected_header_row: headerRowIndex
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const entries = []
    const errors = []

    // Process data rows (skip header row)
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      try {
        const values = rows[i]
        
        if (!values || values.length === 0) {
          continue
        }

        const ledgerName = values[ledgerNameIndex]?.toString().trim()
        
        // Skip empty rows, header-like rows, or total rows
        if (!ledgerName || 
            ledgerName === '' || 
            ledgerName.toLowerCase().includes('particular') ||
            ledgerName.toLowerCase().includes('total') ||
            ledgerName.toLowerCase().includes('grand') ||
            /^[\s\-_=]+$/.test(ledgerName)) {
          continue
        }

        let debitAmount = 0
        let creditAmount = 0

        if (debitIndex >= 0 && creditIndex >= 0 && values[debitIndex] && values[creditIndex]) {
          // Use separate debit/credit columns if available and have values
          const debit = parseFloat(values[debitIndex]?.toString().replace(/[,\s]/g, '') || '0') || 0
          const credit = parseFloat(values[creditIndex]?.toString().replace(/[,\s]/g, '') || '0') || 0
          debitAmount = Math.abs(debit)
          creditAmount = Math.abs(credit)
        } else if (closingBalanceIndex >= 0 && values[closingBalanceIndex]) {
          // Use closing balance column
          const closingBalance = parseFloat(values[closingBalanceIndex]?.toString().replace(/[,\s]/g, '') || '0') || 0
          if (closingBalance >= 0) {
            debitAmount = closingBalance
          } else {
            creditAmount = Math.abs(closingBalance)
          }
        } else {
          // Skip rows without valid amounts
          continue
        }

        // Skip entries with zero amounts
        if (debitAmount === 0 && creditAmount === 0) {
          continue
        }

        const entry = {
          period_id: periodId,
          ledger_name: ledgerName,
          parent_group: null, // Will be mapped later if needed
          debit: debitAmount,
          credit: creditAmount
        }

        entries.push(entry)
        console.log(`Row ${i + 1}: ${ledgerName} - Debit: ${debitAmount}, Credit: ${creditAmount}`)
        
      } catch (error) {
        console.error('Error processing row', i + 1, ':', error.message)
        errors.push({ 
          row: i + 1, 
          error: error.message, 
          data: rows[i],
          ledger_name: rows[i]?.[ledgerNameIndex] || 'Unknown'
        })
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