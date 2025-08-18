import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrialBalanceEntry {
  ledger_name: string;
  debit: number;
  credit: number;
  closing_balance: number;
  account_type: string;
  account_category: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get user authentication
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const periodId = formData.get('periodId') as string;
    const quarterEndDate = formData.get('quarterEndDate') as string;

    if (!file || !quarterEndDate) {
      throw new Error('File and quarter end date are required');
    }

    console.log(`Processing file: ${file.name} Type: ${file.type} Size: ${file.size}`);
    console.log(`Processing trial balance for quarter end date: ${quarterEndDate}`);

    // Read file content
    const fileContent = await file.text();
    console.log(`File content preview: ${fileContent.substring(0, 500)}...`);

    // Prepare GPT prompt for trial balance analysis
    const gptPrompt = `You are an expert financial data processor. Analyze this trial balance data and extract structured information.

The data may have:
- Company headers and titles (skip these)
- Multi-row headers where "Particulars" is in one row and "Debit"/"Credit" are in others
- Amounts with "Cr" (Credit) or "Dr" (Debit) suffixes
- Various number formats

Your task:
1. Identify and skip header rows (company names, dates, titles)
2. Find the actual data rows with account names and amounts
3. Parse amounts correctly (handle "Cr" as negative, "Dr" as positive)
4. Classify each account into categories: ASSETS, LIABILITIES, EQUITY, REVENUE, EXPENSES
5. Extract debit, credit, and closing balance amounts

Return a JSON object with this structure:
{
  "entries": [
    {
      "ledger_name": "Account Name",
      "debit": 0,
      "credit": 0,
      "closing_balance": 75080000,
      "account_type": "EQUITY",
      "account_category": "Capital"
    }
  ],
  "metadata": {
    "total_entries": 10,
    "confidence_score": 0.95,
    "detected_format": "5-column trial balance",
    "parsing_notes": "Successfully parsed all entries"
  }
}

Here's the trial balance data to analyze:

${fileContent}`;

    // Call GPT-4 for analysis
    console.log('Sending data to GPT-4 for analysis...');
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are a financial data processing expert. Always return valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: gptPrompt
          }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('GPT API Error:', errorText);
      throw new Error(`GPT API error: ${gptResponse.status}`);
    }

    const gptData = await gptResponse.json();
    const gptContent = gptData.choices[0].message.content;
    
    console.log('GPT Response:', gptContent);

    // Parse GPT response
    let analysisResult;
    try {
      analysisResult = JSON.parse(gptContent);
    } catch (parseError) {
      console.error('Failed to parse GPT response:', parseError);
      throw new Error('Invalid response format from GPT');
    }

    if (!analysisResult.entries || !Array.isArray(analysisResult.entries)) {
      throw new Error('GPT did not return valid entries array');
    }

    console.log(`GPT analyzed ${analysisResult.entries.length} entries with confidence: ${analysisResult.metadata?.confidence_score || 'unknown'}`);

    // Determine financial period
    const quarterDate = new Date(quarterEndDate);
    const year = quarterDate.getFullYear();
    const quarter = Math.ceil((quarterDate.getMonth() + 1) / 3);

    console.log(`Year: ${year} Quarter: ${quarter}`);

    // Check if financial period exists
    let financialPeriodId = periodId ? parseInt(periodId) : null;
    
    if (!financialPeriodId) {
      const { data: existingPeriod } = await supabase
        .from('financial_periods')
        .select('id')
        .eq('year', year)
        .eq('quarter', quarter)
        .single();

      if (existingPeriod) {
        financialPeriodId = existingPeriod.id;
        console.log(`Using existing financial period: ${financialPeriodId}`);
      } else {
        console.log('Creating new financial period');
        const { data: newPeriod, error: periodError } = await supabase
          .from('financial_periods')
          .insert({
            year,
            quarter,
            quarter_end_date: quarterEndDate,
          })
          .select()
          .single();

        if (periodError) {
          throw new Error(`Failed to create financial period: ${periodError.message}`);
        }

        financialPeriodId = newPeriod.id;
        console.log(`Created new financial period: ${financialPeriodId}`);
      }
    }

    // Process and insert trial balance entries
    const processedEntries = analysisResult.entries.map((entry: any) => ({
      period_id: financialPeriodId,
      ledger_name: entry.ledger_name?.trim() || '',
      debit: parseFloat(entry.debit) || 0,
      credit: parseFloat(entry.credit) || 0,
      closing_balance: parseFloat(entry.closing_balance) || 0,
      account_type: entry.account_type || 'OTHER',
      account_category: entry.account_category || 'Other',
      created_at: new Date().toISOString(),
    })).filter(entry => entry.ledger_name.length > 0);

    if (processedEntries.length === 0) {
      throw new Error('No valid entries found after GPT processing');
    }

    console.log(`Inserting ${processedEntries.length} processed entries`);

    // Delete existing entries for this period (if any)
    await supabase
      .from('trial_balance_entries')
      .delete()
      .eq('period_id', financialPeriodId);

    // Insert new entries
    const { error: insertError } = await supabase
      .from('trial_balance_entries')
      .insert(processedEntries);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to insert entries: ${insertError.message}`);
    }

    console.log(`Successfully processed ${processedEntries.length} entries`);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully processed ${processedEntries.length} trial balance entries using GPT analysis`,
      details: {
        processed_count: processedEntries.length,
        financial_period_id: financialPeriodId,
        gpt_confidence: analysisResult.metadata?.confidence_score || null,
        detected_format: analysisResult.metadata?.detected_format || 'Unknown',
        parsing_notes: analysisResult.metadata?.parsing_notes || 'No notes'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-trial-balance-with-gpt function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'GPT-enhanced trial balance processing failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});