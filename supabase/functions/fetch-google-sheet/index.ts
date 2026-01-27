// Sheet ID from Supabase Secrets - NOT from client request
const SHEET_ID = Deno.env.get('GOOGLE_SHEET_ID')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Only accept sheetName from client (which tab to fetch)
    const { sheetName = 'Daily_Input' } = await req.json()
    
    if (!SHEET_ID) {
      console.error('GOOGLE_SHEET_ID environment variable not set')
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: No Sheet ID configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate sheetName to prevent injection
    const allowedSheets = ['Daily_Input', 'Targets']
    const sanitizedSheetName = allowedSheets.includes(sheetName) ? sheetName : 'Daily_Input'
    
    console.log(`Fetching sheet: ${SHEET_ID}, tab: ${sanitizedSheetName}`)
    
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sanitizedSheetName)}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`Google returned ${response.status}: ${response.statusText}`)
      return new Response(
        JSON.stringify({ error: `Failed to fetch sheet: ${response.status}` }), 
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const csv = await response.text()
    
    // Check if we got HTML (Login page) instead of CSV
    if (csv.includes('<!DOCTYPE html>') || csv.includes('<html')) {
      console.error('Google Sheet is private - received login page HTML')
      return new Response(
        JSON.stringify({ 
          error: 'Google Sheet is private. Please set sharing to "Anyone with the link can view".' 
        }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`Successfully fetched ${csv.length} bytes for tab: ${sanitizedSheetName}`)
    
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
