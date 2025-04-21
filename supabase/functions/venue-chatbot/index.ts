import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get OpenAI API key from environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('Missing OpenAI API key')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Parse request body
    const { query } = await req.json()

    if (!query) {
      throw new Error('No query provided')
    }

    console.log('Received query:', query)

    // Configure OpenAI
    const configuration = new Configuration({
      apiKey: openaiApiKey,
    })
    const openai = new OpenAIApi(configuration)

    // First, create a query to search venues based on user request
    const searchQueryPrompt = `
      Create a SQL query to search venues in the database based on this user query: "${query}".
      The venues table has columns: id, name, description, address, city_id, city_name, category_id, category_name, 
      min_capacity, max_capacity, starting_price, price_per_person, amenities, type, etc.
      Category names are stored as arrays and can include values like: "Graduation party", "Training Course", "Birthday", "Business Meeting", etc.
      Amenities are stored as arrays and can include values like: "WiFi", "Parking", "Catering", "Fine Dining", etc.
      Return just the SQL query, nothing else.
    `

    // Get search query from OpenAI
    const searchQueryResponse = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a SQL expert who converts natural language to SQL queries.' },
        { role: 'user', content: searchQueryPrompt }
      ],
      temperature: 0.2,
    })

    const sqlQuery = searchQueryResponse.data.choices[0].message?.content?.trim()
    console.log('Generated SQL query:', sqlQuery)

    // Execute the SQL query (with safety checks)
    let venues = []
    let error = null

    try {
      if (sqlQuery && !sqlQuery.toLowerCase().includes('delete') && !sqlQuery.toLowerCase().includes('update') && !sqlQuery.toLowerCase().includes('insert')) {
        const { data, error: queryError } = await supabase.rpc('search_venues_with_raw_query', {
          query_text: sqlQuery
        })

        if (queryError) {
          throw queryError
        }

        venues = data || []
      } else {
        // Fallback to simple search if SQL generation fails or contains unsafe operations
        const { data, error: queryError } = await supabase
          .from('venues')
          .select('*')
          .textSearch('name', query.split(' ').join(' & '))
          .limit(5)

        if (queryError) {
          throw queryError
        }

        venues = data || []
      }
    } catch (e) {
      console.error('Error executing query:', e)
      error = e.message
      // Fallback to simple search if custom query fails
      const { data } = await supabase
        .from('venues')
        .select('*')
        .limit(5)

      venues = data || []
    }

    console.log(`Found ${venues.length} venues`)

    // Transform venues data to match frontend expected format
    const transformedVenues = venues.map(venue => {
      return {
        id: venue.id,
        name: venue.name,
        description: venue.description,
        imageUrl: venue.image_url,
        galleryImages: venue.gallery_images,
        city: venue.city_name,
        pricing: {
          startingPrice: venue.starting_price || 0,
          currency: venue.currency || 'SAR'
        },
        // Keep these original fields to maintain compatibility with existing database structure
        image_url: venue.image_url,
        gallery_images: venue.gallery_images,
        city_name: venue.city_name,
        starting_price: venue.starting_price,
        currency: venue.currency
      };
    });

    // Format venue data for OpenAI consumption
    const venueData = venues.map(venue => ({
      id: venue.id,
      name: venue.name,
      description: venue.description?.substring(0, 100) + (venue.description?.length > 100 ? '...' : '') || 'No description',
      city: venue.city_name,
      category: Array.isArray(venue.category_name) ? venue.category_name.join(', ') : venue.category_name,
      capacity: `${venue.min_capacity || 0} - ${venue.max_capacity || 0} guests`,
      price: `${venue.starting_price || 0} ${venue.currency || 'SAR'}${venue.price_per_person ? ' per person' : ''}`,
      amenities: Array.isArray(venue.amenities) ? venue.amenities.join(', ') : venue.amenities,
      type: venue.type || 'Venue'
    }))

    // Generate chatbot response based on query and venue data
    const promptContent = `
      You are a helpful venue search assistant for a venue booking platform. 
      The user is looking for venues with this query: "${query}"
      
      ${venues.length > 0 ? `Here are some venues I found:
      ${JSON.stringify(venueData, null, 2)}` : 'I could not find any venues matching your query.'}
      
      Provide a helpful response that:
      1. Acknowledges the user's query
      2. Summarizes the search results in a natural way (if any)
      3. Suggests some options or alternatives if appropriate
      4. Provides a friendly next step (e.g., "Would you like more information about any of these venues?")
      
      Keep your response conversational and helpful. If no venues were found, suggest the user try different search terms.
      The response should be in the tone of a helpful concierge.
    `

    const completion = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful venue search assistant for a venue booking platform.' },
        { role: 'user', content: promptContent }
      ],
      temperature: 0.7,
    })

    const chatResponse = completion.data.choices[0].message?.content || 'Sorry, I could not process your request at this time.'

    return new Response(
      JSON.stringify({
        message: chatResponse,
        venues: transformedVenues.slice(0, 3), // Return top 3 venues
        error
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error processing request:', error)

    return new Response(
      JSON.stringify({
        message: 'An error occurred while processing your request.',
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
