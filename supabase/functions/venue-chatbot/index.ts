
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

type VenueSearchResult = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  gallery_images?: string[] | null;
  city_name?: string | null;
  starting_price?: number | null;
  currency?: string | null;
  category_name?: string[] | string | null;
  min_capacity?: number | null;
  max_capacity?: number | null;
  price_per_person?: number | null;
  amenities?: string[] | string | null;
  type?: string | null;
};

function isGreeting(query: string): boolean {
  const greetings = [
    'hi', 'hello', 'hey', 'السلام عليكم', 'مرحبا', 'hola', 'bonjour', 'ciao', 'مرحبا'
  ];
  const normalized = query.trim().toLowerCase();
  return greetings.some(greet => normalized === greet || normalized.startsWith(greet + " ") || normalized.endsWith(" " + greet));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const requestData = await req.json();
    const query: string = requestData.query;
    const viaMic: boolean = !!requestData.viaMic;

    if (!query) throw new Error('No query provided')

    if (isGreeting(query)) {
      return new Response(JSON.stringify({
        message: 'Hello! How can I help you find a venue today?',
        venues: [],
        speak: viaMic,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // For simple list requests, we can respond without needing OpenAI
    if (query.toLowerCase().includes('list') || 
        query.toLowerCase().includes('show me') || 
        query.toLowerCase().includes('venues')) {
      try {
        console.log('Processing list request without OpenAI');
        // Try to extract city name from the query
        let cityFilter = '';
        
        const commonCities = [
          'riyadh', 'jeddah', 'dammam', 'mecca', 'medina', 'abha', 'taif', 
          'khamis', 'khamis mushait', 'khamismushait', 'khamis mushyat', 'khamis-mushait'
        ];
        
        for (const city of commonCities) {
          if (query.toLowerCase().includes(city)) {
            cityFilter = city;
            // Special case for Khamis variants
            if (city === 'khamis' || city.includes('khamis')) {
              cityFilter = 'khamis mushait';
            }
            break;
          }
        }
        
        // Use a simple search to get some venues
        let data;
        let queryError;
        
        if (cityFilter) {
          console.log(`Searching for venues in city: ${cityFilter}`);
          const result = await supabase
            .from('venues')
            .select('*')
            .ilike('city_name', `%${cityFilter}%`)
            .limit(5);
          
          data = result.data;
          queryError = result.error;
        } else {
          const result = await supabase
            .from('venues')
            .select('*')
            .limit(5);
          
          data = result.data;
          queryError = result.error;
        }

        if (queryError) {
          throw queryError;
        }

        const venues = (data || []) as VenueSearchResult[];
        
        const venueDetailLinks = venues.map((venue) => {
          return {
            id: venue.id,
            name: venue.name,
            city: venue.city_name || '',
            price: (venue.starting_price ?? 0) + ' ' + (venue.currency || 'SAR') + (venue.price_per_person ? ' per person' : ''),
            capacity: `${venue.min_capacity || 0} - ${venue.max_capacity || 0}`,
            amenities: Array.isArray(venue.amenities) ? venue.amenities.join(', ') : venue.amenities ?? '',
            url: `/venue/${venue.id}`,
            description: (venue.description && venue.description.length > 150)
              ? venue.description.slice(0, 150) + '...'
              : (venue.description || ''),
            imageUrl: venue.image_url || (Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0 
              ? venue.gallery_images[0] : null)
          }
        }).slice(0, 5);

        const cityName = cityFilter ? 
          (cityFilter === 'khamis mushait' ? 'Khamis Mushait' : 
          cityFilter.charAt(0).toUpperCase() + cityFilter.slice(1)) : '';
          
        const message = venues.length > 0
          ? `Here are ${cityFilter ? `${cityName} venues` : 'some venues'} I found for you. Click any venue for details.`
          : `I couldn't find any venues ${cityFilter ? `in ${cityName}` : ''}. Try another search.`;

        return new Response(JSON.stringify({
          message,
          venues: venueDetailLinks,
          speak: viaMic,
          error: null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error fetching venues:', error);
      }
    }

    // Try to use OpenAI if available
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.warn('OpenAI API key is missing');
      
      // Perform a comprehensive search across all fields without OpenAI
      const searchTerm = query.toLowerCase();
      
      // Handle special case for Khamis Mushait
      const isKhamisSearch = searchTerm.includes('khamis');
      
      let result;
      if (isKhamisSearch) {
        result = await supabase
          .from('venues')
          .select('*')
          .ilike('city_name', '%khamis%')
          .limit(5);
      } else {
        // Perform a basic search across multiple fields
        result = await supabase
          .from('venues')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,city_name.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%`)
          .limit(5);
        
        // If no results, try a more advanced search with more fields
        if (!result.data || result.data.length === 0) {
          // This is a more general search across more fields
          result = await supabase
            .from('venues')
            .select('*')
            .limit(5);
        }
      }
      
      const venues = (result.data || []) as VenueSearchResult[];
      
      const venueDetailLinks = venues.map((venue) => {
        return {
          id: venue.id,
          name: venue.name,
          city: venue.city_name || '',
          price: (venue.starting_price ?? 0) + ' ' + (venue.currency || 'SAR') + (venue.price_per_person ? ' per person' : ''),
          capacity: `${venue.min_capacity || 0} - ${venue.max_capacity || 0}`,
          amenities: Array.isArray(venue.amenities) ? venue.amenities.join(', ') : venue.amenities ?? '',
          url: `/venue/${venue.id}`,
          description: (venue.description && venue.description.length > 150)
            ? venue.description.slice(0, 150) + '...'
            : (venue.description || ''),
          imageUrl: venue.image_url || (Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0 
            ? venue.gallery_images[0] : null)
        }
      }).slice(0, 5);

      const responseMessage = isKhamisSearch
        ? "Here are venues in Khamis Mushait. Click any venue to see more details."
        : "Here are some recommended venues. Click any venue to see more details.";

      return new Response(JSON.stringify({
        message: responseMessage,
        venues: venueDetailLinks,
        speak: viaMic,
        error: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Continue with OpenAI processing if API key is available
    try {
      console.log('Using OpenAI for advanced query processing');
      const searchQueryPrompt = `
      Create a SQL query to search venues in the database based on this user query: "${query}".
      The venues table has columns: id, name, description, address, city_id, city_name, category_id, category_name, 
      min_capacity, max_capacity, starting_price, price_per_person, amenities, type, etc.
      Category names are stored as arrays and can include values like: "Graduation party", "Training Course", "Birthday", "Business Meeting", etc.
      Amenities are stored as arrays and can include values like: "WiFi", "Parking", "Catering", "Fine Dining", etc.
      
      If the query includes a city name, make sure to use ILIKE with wildcards to catch partial matches.
      The query might contain city names like: Riyadh, Jeddah, Dammam, Mecca, Medina, Abha, Taif, Khamis, Khamis Mushait.
      For Khamis or Khamis Mushait, use 'city_name ILIKE %khamis%'.
      
      Return just the SQL query, nothing else.
      `

      try {
        const searchQueryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a SQL expert who converts natural language to SQL queries.' },
              { role: 'user', content: searchQueryPrompt }
            ],
            temperature: 0.2,
          }),
        });
        
        if (!searchQueryResponse.ok) {
          const errorText = await searchQueryResponse.text();
          console.error(`OpenAI API error: ${searchQueryResponse.status} ${errorText}`);
          throw new Error(`OpenAI API error: ${searchQueryResponse.status} ${errorText}`);
        }

        const searchQueryData = await searchQueryResponse.json();
        const sqlQuery = searchQueryData.choices[0].message?.content?.trim();
        console.log('Generated SQL query:', sqlQuery);

        let venues: VenueSearchResult[] = [];
        let error: string | null = null;

        try {
          if (
            sqlQuery &&
            !sqlQuery.toLowerCase().includes('delete') &&
            !sqlQuery.toLowerCase().includes('update') &&
            !sqlQuery.toLowerCase().includes('insert')
          ) {
            const { data, error: queryError } = await supabase.rpc('search_venues_with_raw_query', {
              query_text: sqlQuery
            });

            if (queryError) {
              throw queryError;
            }

            venues = (data || []) as VenueSearchResult[];
          } else {
            // Special handling for Khamis/Khamis Mushait
            if (query.toLowerCase().includes('khamis')) {
              const { data, error: queryError } = await supabase
                .from('venues')
                .select('*')
                .ilike('city_name', '%khamis%')
                .limit(5);
              
              if (queryError) {
                throw queryError;
              }
              
              venues = (data || []) as VenueSearchResult[];
            } else {
              // Enhanced search across multiple columns
              const { data, error: queryError } = await supabase
                .from('venues')
                .select('*')
                .or(`name.ilike.%${query}%,description.ilike.%${query}%,city_name.ilike.%${query}%,type.ilike.%${query}%`)
                .limit(5);

              if (queryError) {
                throw queryError;
              }

              venues = (data || []) as VenueSearchResult[];
              
              // If no results found, try a more general search
              if (venues.length === 0) {
                const { data: generalData } = await supabase
                  .from('venues')
                  .select('*')
                  .limit(5);
                  
                venues = (generalData || []) as VenueSearchResult[];
              }
            }
          }
        } catch (e) {
          console.error('Error executing query:', e);
          error = e.message || String(e);
          const { data } = await supabase
            .from('venues')
            .select('*')
            .limit(5);

          venues = (data || []) as VenueSearchResult[];
        }

        console.log(`Found ${venues.length} venues`);

        const venueDetailLinks = venues.map((venue) => {
          return {
            id: venue.id,
            name: venue.name,
            city: venue.city_name || '',
            price: (venue.starting_price ?? 0) + ' ' + (venue.currency || 'SAR') + (venue.price_per_person ? ' per person' : ''),
            capacity: `${venue.min_capacity || 0} - ${venue.max_capacity || 0}`,
            amenities: Array.isArray(venue.amenities) ? venue.amenities.join(', ') : venue.amenities ?? '',
            url: `/venue/${venue.id}`,
            description: (venue.description && venue.description.length > 150)
              ? venue.description.slice(0, 150) + '...'
              : (venue.description || ''),
            imageUrl: venue.image_url || (Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0 
              ? venue.gallery_images[0] : null)
          }
        }).slice(0, 5);

        const promptContent = `
        You are a helpful venue search assistant for a venue booking platform.
        The user is looking for venues with this query: "${query}"

        ${venueDetailLinks.length > 0
            ? `Here are some venues I found (provide a short summary and include a "View details" link for each):`
            : 'I could not find any venues matching your query.'}

        Keep your response short, friendly, and to the point. If the query seems like a greeting, reply with a very brief acknowledgment.
        For venue results, ALWAYS be concise. Limit your response to 3-4 sentences maximum.
      `;

        const chatCompletion = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful venue search assistant for a venue booking platform. Keep your answers brief.',
              },
              { role: 'user', content: promptContent },
            ],
            temperature: 0.5,
            max_tokens: 250,
          }),
        });

        if (!chatCompletion.ok) {
          const errorText = await chatCompletion.text();
          console.error(`OpenAI API error: ${chatCompletion.status} ${errorText}`);
          throw new Error(`OpenAI API error: ${chatCompletion.status} ${errorText}`);
        }

        const completionData = await chatCompletion.json();
        const chatResponse =
          completionData.choices[0]?.message?.content ??
          "Found some venues for you. Check out the options below!";

        return new Response(JSON.stringify({
          message: chatResponse,
          venues: venueDetailLinks,
          speak: viaMic,
          error: null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (openAiError) {
        console.error('OpenAI API error:', openAiError);
        
        // Enhanced search across multiple fields as fallback
        let venues: VenueSearchResult[] = [];
        
        // Special handling for Khamis/Khamis Mushait search
        if (query.toLowerCase().includes('khamis')) {
          const { data, error: queryError } = await supabase
            .from('venues')
            .select('*')
            .ilike('city_name', '%khamis%')
            .limit(5);
          
          if (!queryError) {
            venues = (data || []) as VenueSearchResult[];
          }
        } else {
          // Try more comprehensive search across multiple columns
          const { data, error: queryError } = await supabase
            .from('venues')
            .select('*')
            .or(`name.ilike.%${query}%,description.ilike.%${query}%,city_name.ilike.%${query}%,type.ilike.%${query}%`)
            .limit(5);
          
          if (!queryError && data && data.length > 0) {
            venues = data as VenueSearchResult[];
          } else {
            // If no results, fall back to basic venues
            const { data } = await supabase
              .from('venues')
              .select('*')
              .limit(5);

            venues = (data || []) as VenueSearchResult[];
          }
        }
        
        const venueDetailLinks = venues.map((venue) => {
          return {
            id: venue.id,
            name: venue.name,
            city: venue.city_name || '',
            price: (venue.starting_price ?? 0) + ' ' + (venue.currency || 'SAR') + (venue.price_per_person ? ' per person' : ''),
            capacity: `${venue.min_capacity || 0} - ${venue.max_capacity || 0}`,
            amenities: Array.isArray(venue.amenities) ? venue.amenities.join(', ') : venue.amenities ?? '',
            url: `/venue/${venue.id}`,
            description: (venue.description && venue.description.length > 150)
              ? venue.description.slice(0, 150) + '...'
              : (venue.description || ''),
            imageUrl: venue.image_url || (Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0 
              ? venue.gallery_images[0] : null)
          }
        }).slice(0, 5);
        
        const message = query.toLowerCase().includes('khamis') && venues.length > 0 
          ? "Here are venues in Khamis Mushait. Click on any venue to view full details."
          : "Here are some venues that might interest you. Click on any venue to view full details.";
        
        return new Response(JSON.stringify({
          message,
          venues: venueDetailLinks,
          error: openAiError.message || "Error processing with AI",
          speak: viaMic,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Error processing request:', error);
      return new Response(JSON.stringify({
        message: 'An error occurred while processing your request.',
        error: error.message,
        speak: false,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error in venue-chatbot function:', error);
    return new Response(JSON.stringify({
      message: 'An error occurred while processing your request.',
      error: error.message,
      speak: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
