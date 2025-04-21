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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) throw new Error('Missing OpenAI API key')

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
      })
    }

    const searchQueryPrompt = `
      Create a SQL query to search venues in the database based on this user query: "${query}".
      The venues table has columns: id, name, description, address, city_id, city_name, category_id, category_name, 
      min_capacity, max_capacity, starting_price, price_per_person, amenities, type, etc.
      Category names are stored as arrays and can include values like: "Graduation party", "Training Course", "Birthday", "Business Meeting", etc.
      Amenities are stored as arrays and can include values like: "WiFi", "Parking", "Catering", "Fine Dining", etc.
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
        throw new Error(`OpenAI API error: ${searchQueryResponse.status} ${await searchQueryResponse.text()}`);
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
          const { data, error: queryError } = await supabase
            .from('venues')
            .select('*')
            .textSearch('name', query.split(' ').join(' & '))
            .limit(5);

          if (queryError) {
            throw queryError;
          }

          venues = (data || []) as VenueSearchResult[];
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

      const transformedVenues = venues.map((venue) => {
        return {
          id: venue.id,
          name: venue.name,
          description: venue.description ?? '',
          imageUrl: venue.image_url ?? '',
          galleryImages: venue.gallery_images ?? [],
          city: venue.city_name ?? '',
          pricing: {
            startingPrice: venue.starting_price || 0,
            currency: venue.currency || 'SAR',
          },
          image_url: venue.image_url ?? '',
          gallery_images: venue.gallery_images ?? [],
          city_name: venue.city_name ?? '',
          starting_price: venue.starting_price ?? 0,
          currency: venue.currency ?? 'SAR',
        };
      });

      const venueData = venues.map((venue) => ({
        id: venue.id,
        name: venue.name,
        description: venue.description
          ? venue.description.substring(0, 100) + (venue.description.length > 100 ? '...' : '')
          : 'No description',
        city: venue.city_name || '',
        category: Array.isArray(venue.category_name)
          ? venue.category_name.join(', ')
          : venue.category_name || '',
        capacity: `${venue.min_capacity || 0} - ${venue.max_capacity || 0} guests`,
        price: `${venue.starting_price || 0} ${venue.currency || 'SAR'}${
          venue.price_per_person ? ' per person' : ''
        }`,
        amenities: Array.isArray(venue.amenities)
          ? venue.amenities.join(', ')
          : venue.amenities || '',
        type: venue.type || 'Venue',
      }));

      const venueDetailLinks = venues.map((venue) => {
        return {
          name: venue.name,
          city: venue.city_name || '',
          price: (venue.starting_price ?? 0) + ' ' + (venue.currency || 'SAR') + (venue.price_per_person ? ' per person' : ''),
          capacity: `${venue.min_capacity || 0} - ${venue.max_capacity || 0}`,
          amenities: Array.isArray(venue.amenities) ? venue.amenities.join(', ') : venue.amenities ?? '',
          url: `/venue/${venue.id}`,
          id: venue.id,
          description: (venue.description && venue.description.length > 150)
            ? venue.description.slice(0, 150) + '...'
            : (venue.description || ''),
        }
      }).slice(0, 3);

      const baseUrl = 'https://esdmelfzeszjtbnoajig.supabase.co';
      const venuesText = venueDetailLinks.length > 0
        ? venueDetailLinks.map((v, i) =>
          `${i + 1}. **${v.name} (${v.city})** - ${v.capacity} guests, ${v.price}${
            v.amenities ? ` | Amenities: ${v.amenities}` : ''
          }\n[View details](${baseUrl}/venue/${v.id})${v.description ? `\n${v.description}` : ''}`
        ).join('\n\n')
        : '';

      const promptContent = `
        You are a helpful venue search assistant for a venue booking platform.
        The user is looking for venues with this query: "${query}"

        ${venueDetailLinks.length > 0
          ? `Here are some venues I found (provide a short summary and include a "View details" link for each):

${venuesText}`
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
        throw new Error(`OpenAI API error: ${chatCompletion.status} ${await chatCompletion.text()}`);
      }

      const completionData = await chatCompletion.json();
      const chatResponse =
        completionData.choices[0]?.message?.content ??
        "Sorry, I could not process your request at this time.";

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
      return new Response(JSON.stringify({
        message: "I'm having trouble connecting to my assistant service right now. Please try again later.",
        venues: [],
        error: openAiError.message,
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
});
