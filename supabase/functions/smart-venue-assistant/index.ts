
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type } = await req.json();

    if (!query) {
      throw new Error('Query is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all venues to form the context
    const { data: venues, error } = await supabase
      .from('venues')
      .select('*');

    if (error) {
      throw error;
    }

    // Process venues data for better context
    const processedVenues = venues.map(venue => {
      return {
        id: venue.id,
        name: venue.name,
        description: venue.description || '',
        address: venue.address || '',
        city: venue.city_name || '',
        categories: Array.isArray(venue.category_name) ? venue.category_name.join(', ') : venue.category_name || '',
        pricing: {
          startingPrice: venue.starting_price || 0,
          pricePerPerson: venue.price_per_person,
          currency: venue.currency || 'SAR'
        },
        capacity: {
          min: venue.min_capacity || 0,
          max: venue.max_capacity || 0
        },
        amenities: Array.isArray(venue.amenities) ? venue.amenities.join(', ') : '',
        features: {
          parking: venue.parking ? 'Yes' : 'No',
          wifi: venue.wifi ? 'Yes' : 'No'
        },
        accessibility: Array.isArray(venue.accessibility_features) ? venue.accessibility_features.join(', ') : '',
        rating: venue.rating || 0,
        reviews: venue.reviews_count || 0,
        availability: Array.isArray(venue.availability) ? venue.availability.join(', ') : '',
      };
    });

    // Format the query content for the OpenAI request
    const contextString = JSON.stringify(processedVenues);
    
    const systemPrompt = `You are a helpful assistant specialized in answering questions about venues. Use ONLY the venue information provided in the context to answer queries. If a query cannot be answered with the information provided, acknowledge that you don't have that information rather than making up details. When mentioning price, always include the currency.

    Here's the venue data:
    ${contextString}`;

    // Call OpenAI API for chat completion
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found');
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using a more capable model
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.json();
      throw new Error(error.error?.message || 'Failed to get a response');
    }

    const jsonResponse = await openAIResponse.json();
    const answer = jsonResponse.choices[0].message.content;

    // Also search for relevant venues based on the query
    let relevantVenues = [];
    
    // Create a simple keyword-based search
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 3);
    
    if (searchTerms.length > 0) {
      relevantVenues = venues.filter(venue => {
        const venueText = [
          venue.name,
          venue.description,
          venue.city_name,
          Array.isArray(venue.category_name) ? venue.category_name.join(' ') : venue.category_name,
          Array.isArray(venue.amenities) ? venue.amenities.join(' ') : '',
          venue.address,
          Array.isArray(venue.accessibility_features) ? venue.accessibility_features.join(' ') : '',
        ].join(' ').toLowerCase();
        
        return searchTerms.some(term => venueText.includes(term));
      }).slice(0, 5).map(venue => ({
        id: venue.id,
        name: venue.name,
        city_name: venue.city_name,
        image_url: venue.image_url,
        gallery_images: venue.gallery_images,
        starting_price: venue.starting_price,
        currency: venue.currency,
        category_name: venue.category_name,
      }));
    }

    return new Response(
      JSON.stringify({
        answer,
        relevantVenues: relevantVenues.length > 0 ? relevantVenues : undefined
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
