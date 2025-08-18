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

  let uploadId: string | null = null;
  const startTime = Date.now();

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

    // Check for existing uploads for this period
    const { data: existingUploads } = await supabase
      .from('trial_balance_uploads')
      .select('id, filename, processed_at, is_active')
      .eq('quarter_end_date', quarterEndDate)
      .eq('uploaded_by', user.id)
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false })
      .limit(5);

    if (existingUploads && existingUploads.length > 0) {
      console.log(`Found ${existingUploads.length} existing uploads for this period`);
    }

    // Create upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('trial_balance_uploads')
      .insert({
        filename: `${Date.now()}_${file.name}`,
        original_filename: file.name,
        file_size_bytes: file.size,
        quarter_end_date: quarterEndDate,
        upload_status: 'processing',
        uploaded_by: user.id,
        replaces_upload_id: existingUploads?.[0]?.id || null
      })
      .select()
      .single();

    if (uploadError) {
      throw new Error(`Failed to create upload record: ${uploadError.message}`);
    }

    uploadId = uploadRecord.id;

    // Convert file to base64 for GPT Vision
    const fileBuffer = await file.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    const mimeType = file.type || 'image/jpeg';
    
    console.log(`Processing image file: ${file.name}, MIME type: ${mimeType}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    // Prepare GPT Vision prompt for trial balance image analysis
    const visionPrompt = `You are an expert financial data processor with advanced OCR capabilities. Analyze this trial balance image and extract ALL visible financial data with high accuracy.

CRITICAL INSTRUCTIONS:
1. **Read EVERY visible row** - Don't skip any entries, even if they seem minor
2. **Extract ALL account names and amounts** from the image
3. **Handle various formats**: Traditional trial balance, balance sheet format, or ledger summaries
4. **Parse amounts correctly**: 
   - "Cr" suffix = negative amount (credit balance)
   - "Dr" suffix = positive amount (debit balance)
   - Numbers without suffix = use column context (Debit=positive, Credit=negative)
5. **Account Classification**: Classify each account as ASSETS, LIABILITIES, EQUITY, REVENUE, or EXPENSES
6. **Skip only**: Company headers, dates, titles, totals, and blank rows

EXPECTED OUTPUT - Return valid JSON only:
{
  "entries": [
    {
      "ledger_name": "Cash in Hand",
      "debit": 50000,
      "credit": 0,
      "closing_balance": 50000,
      "account_type": "ASSETS",
      "account_category": "Current Assets"
    }
  ],
  "metadata": {
    "total_entries": 15,
    "confidence_score": 0.92,
    "detected_format": "Standard Trial Balance",
    "parsing_notes": "Successfully extracted all visible entries from image"
  }
}

Analyze this trial balance image thoroughly:`;

    // Call GPT-4 Vision for image analysis
    console.log('Sending image to GPT-4 Vision for analysis...');
    const gptStartTime = Date.now();
    const gptRequestBody = {
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are a financial data processing expert with advanced OCR capabilities. Always return valid JSON only, no additional text or explanations.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: visionPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Content}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_completion_tokens: 4000,
    };

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gptRequestBody),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('GPT API Error:', errorText);
      throw new Error(`GPT API error: ${gptResponse.status}`);
    }

    const gptData = await gptResponse.json();
    const gptContent = gptData.choices[0].message.content;
    const gptProcessingTime = Date.now() - gptStartTime;
    
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

    // Log GPT usage for analytics
    const gptUsageLog = {
      upload_id: uploadId,
      user_id: user.id,
      model_name: gptRequestBody.model,
      prompt_tokens: gptData.usage?.prompt_tokens || 0,
      completion_tokens: gptData.usage?.completion_tokens || 0,
      total_tokens: gptData.usage?.total_tokens || 0,
      processing_time_ms: gptProcessingTime,
      success: true,
    };

    await supabase.from('gpt_usage_log').insert(gptUsageLog);

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

    // Update upload record to link to financial period
    await supabase
      .from('trial_balance_uploads')
      .update({ period_id: financialPeriodId })
      .eq('id', uploadId);

    // Process and insert trial balance entries
    const processedEntries = analysisResult.entries.map((entry: any) => ({
      period_id: financialPeriodId,
      ledger_name: entry.ledger_name?.trim() || '',
      debit: parseFloat(entry.debit) || 0,
      credit: parseFloat(entry.credit) || 0,
      closing_balance: parseFloat(entry.closing_balance) || 0,
      account_type: entry.account_type || 'OTHER',
      account_category: entry.account_category || 'Other',
      gpt_confidence: analysisResult.metadata?.confidence_score || null,
      processing_notes: analysisResult.metadata?.parsing_notes || 'GPT processed',
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

    // Mark previous uploads as inactive if this replaces them
    if (existingUploads && existingUploads.length > 0) {
      await supabase
        .from('trial_balance_uploads')
        .update({ is_active: false })
        .in('id', existingUploads.map(u => u.id));
    }

    // Update upload record as completed
    const totalProcessingTime = Date.now() - startTime;
    await supabase
      .from('trial_balance_uploads')
      .update({
        upload_status: 'completed',
        processed_at: new Date().toISOString(),
        entries_count: processedEntries.length,
        gpt_processing_time_ms: gptProcessingTime,
        gpt_confidence_score: analysisResult.metadata?.confidence_score || null,
        processing_summary: {
          total_entries: processedEntries.length,
          confidence_score: analysisResult.metadata?.confidence_score,
          detected_format: analysisResult.metadata?.detected_format,
          parsing_notes: analysisResult.metadata?.parsing_notes,
          total_processing_time_ms: totalProcessingTime,
          model_used: gptRequestBody.model
        }
      })
      .eq('id', uploadId);

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
    
    // Update upload record as failed if we have uploadId
    if (uploadId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('trial_balance_uploads')
          .update({
            upload_status: 'failed',
            error_message: error.message,
            processed_at: new Date().toISOString(),
          })
          .eq('id', uploadId);
      } catch (updateError) {
        console.error('Failed to update upload status:', updateError);
      }
    }
    
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