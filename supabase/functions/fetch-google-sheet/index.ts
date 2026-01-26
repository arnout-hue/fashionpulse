import { Hono } from 'https://deno.land/x/hono@v3.4.1/mod.ts'

const app = new Hono()

// Sheet ID from Supabase Secrets - NOT from client request
const SHEET_ID = Deno.env.get('GOOGLE_SHEET_ID')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

app.options('*', (c) => new Response(null, { headers: corsHeaders }))

app.post('/', async (c) => {
  try {
    // Only accept sheetName from client (which tab to fetch)
    const { sheetName = 'Daily_Input' } = await c.req.json()
    
    if (!SHEET_ID) {
      console.error('GOOGLE_SHEET_ID environment variable not set')
      return c.json({ error: 'Server misconfiguration: No Sheet ID configured' }, 500)
    }
    
    // Validate sheetName to prevent injection
    const allowedSheets = ['Daily_Input', 'Targets']
    const sanitizedSheetName = allowedSheets.includes(sheetName) ? sheetName : 'Daily_Input'
    
    console.log(`Fetching sheet: ${SHEET_ID}, tab: ${sanitizedSheetName}`)
    
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sanitizedSheetName)}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`Google returned ${response.status}: ${response.statusText}`)
      return c.json({ 
        error: `Failed to fetch sheet: ${response.status}` 
      }, response.status)
    }
    
    const csv = await response.text()
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
    return c.json({ error: message }, 500)
  }
})

Deno.serve(app.fetch)
