
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

// Common attributes for venue matching
const venueAttributes = {
  cities: ["riyadh", "jeddah", "khobar", "dammam", "mecca", "medina", "abha", "taif", "khamis mushait"],
  eventTypes: ["wedding", "conference", "exhibition", "party", "corporate", "graduation", "training", "birthday", "business meeting", "marriage"],
  venueTypes: ["hotel", "hall", "ballroom", "beach", "restaurant", "garden", "rooftop"],
  amenities: ["wifi", "parking", "catering", "sound system", "lighting", "bridal suite", "av equipment", "stage", "outdoor space"]
};

function isGreeting(query: string): boolean {
  const greetings = [
    'hi', 'hello', 'hey', 'السلام عليكم', 'مرحبا', 'hola', 'bonjour', 'ciao', 'مرحبا'
  ];
  const normalized = query.trim().toLowerCase();
  return greetings.some(greet => normalized === greet || normalized.startsWith(greet + " ") || normalized.endsWith(" " + greet));
}

function matchAttributesInQuery(query: string) {
  query = query.toLowerCase();
  
  // Create result object to collect all matches
  const matches = {
    cities: [] as string[],
    eventTypes: [] as string[],
    venueTypes: [] as string[],
    amenities: [] as string[],
    capacity: null as number | null,
    priceRange: null as [number, number] | null
  };
  
  // Check for city mentions
  venueAttributes.cities.forEach(city => {
    if (query.includes(city.toLowerCase())) {
      matches.cities.push(city);
    }
  });
  
  // Check for event types
  venueAttributes.eventTypes.forEach(eventType => {
    if (query.includes(eventType.toLowerCase())) {
      matches.eventTypes.push(eventType);
    }
  });
  
  // Check for venue types
  venueAttributes.venueTypes.forEach(venueType => {
    if (query.includes(venueType.toLowerCase())) {
      matches.venueTypes.push(venueType);
    }
  });
  
  // Check for amenities
  venueAttributes.amenities.forEach(amenity => {
    if (query.includes(amenity.toLowerCase())) {
      matches.amenities.push(amenity);
    }
  });
  
  // Look for capacity mentions
  const capacityRegex = /(\d+)\s*(people|guests|persons)/i;
  const capacityMatch = query.match(capacityRegex);
  if (capacityMatch) {
    matches.capacity = parseInt(capacityMatch[1]);
  }
  
  // Look for price mentions
  const priceUnderRegex = /(under|less than|at most|maximum)\s*(\d+)/i;
  const priceUnderMatch = query.match(priceUnderRegex);
  if (priceUnderMatch) {
    matches.priceRange = [0, parseInt(priceUnderMatch[2])];
  }
  
  const priceBetweenRegex = /between\s*(\d+)\s*and\s*(\d+)/i;
  const priceBetweenMatch = query.match(priceBetweenRegex);
  if (priceBetweenMatch) {
    matches.priceRange = [parseInt(priceBetweenMatch[1]), parseInt(priceBetweenMatch[2])];
  }
  
  return matches;
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
    
    // Extract attributes from query
    const matches = matchAttributesInQuery(query);
    
    // Enhanced query building for better results
    let queryBuilder = supabase.from('venues').select('*');
    
    // Apply city filter
    if (matches.cities.length > 0) {
      const cityName = matches.cities[0];
      // Special case for Khamis Mushait
      if (cityName === "khamis" || cityName === "khamis mushait") {
        queryBuilder = queryBuilder.ilike('city_name', '%khamis%');
      } else {
        queryBuilder = queryBuilder.ilike('city_name', `%${cityName}%`);
      }
    }
    
    // Apply event type or venue type filter
    if (matches.eventTypes.length > 0 || matches.venueTypes.length > 0) {
      const typeToUse = matches.eventTypes[0] || matches.venueTypes[0];
      // This handles both single string and array based category fields
      queryBuilder = queryBuilder.or(`category_name.ilike.%${typeToUse}%,type.ilike.%${typeToUse}%`);
    }
    
    // Apply capacity filter
    if (matches.capacity) {
      const capacity = matches.capacity;
      queryBuilder = queryBuilder.lte('min_capacity', capacity).gte('max_capacity', capacity);
    }
    
    // Apply price filter if present
    if (matches.priceRange) {
      const [minPrice, maxPrice] = matches.priceRange;
      if (maxPrice) {
        queryBuilder = queryBuilder.lte('starting_price', maxPrice);
      }
    }
    
    // Limit results
    queryBuilder = queryBuilder.limit(10);
    
    // Execute the query
    const { data: venues, error: queryError } = await queryBuilder;
    
    if (queryError) {
      console.error('Error executing venue query:', queryError);
      throw queryError;
    }
    
    // If no specific filters were applied or no venues found, fall back to basic query
    if ((!matches.cities.length && !matches.eventTypes.length && !matches.venueTypes.length && 
         !matches.capacity && !matches.priceRange) || !venues || venues.length === 0) {
      
      // Check if the query includes common keywords for venue search
      if (query.toLowerCase().includes('venue') || 
          query.toLowerCase().includes('hall') || 
          query.toLowerCase().includes('wedding') || 
          query.toLowerCase().includes('marriage') ||
          query.toLowerCase().includes('event')) {
        
        // Get some general venues as fallback
        const { data: fallbackVenues } = await supabase
          .from('venues')
          .select('*')
          .limit(5);
          
        if (fallbackVenues && fallbackVenues.length > 0) {
          venues = fallbackVenues;
        }
      }
    }
    
    // Try to use OpenAI if available for better message response
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    let message = '';
    
    if (openaiApiKey) {
      try {
        const promptContent = `
          You are a helpful venue search assistant. The user asked: "${query}"
          ${venues && venues.length > 0 
            ? `I found ${venues.length} venues that might match their needs.` 
            : "I couldn't find any venues matching their query."}
          Please provide a concise, friendly response (maximum 2 sentences) that acknowledges their search
          and encourages them to check out the venues below or try a different search if no venues were found.
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
              { role: 'system', content: 'You are a helpful venue search assistant. Keep your answers very brief.' },
              { role: 'user', content: promptContent }
            ],
            temperature: 0.7,
            max_tokens: 100,
          }),
        });

        if (chatCompletion.ok) {
          const completionData = await chatCompletion.json();
          message = completionData.choices[0]?.message?.content || '';
        } else {
          throw new Error(`OpenAI API error: ${chatCompletion.status} ${await chatCompletion.text()}`);
        }
      } catch (error) {
        console.error('OpenAI API error:', error);
        
        // Fallback message if OpenAI fails
        if (venues && venues.length > 0) {
          if (matches.cities.length > 0) {
            message = `Here are some venues in ${matches.cities[0].charAt(0).toUpperCase() + matches.cities[0].slice(1)}. Click any venue for details.`;
          } else if (matches.eventTypes.length > 0) {
            message = `Here are some venues for ${matches.eventTypes[0]} events. Click any venue for details.`;
          } else {
            message = "Here are some venues that might interest you. Click any venue for details.";
          }
        } else {
          message = "I couldn't find venues matching your criteria. Try searching with different terms.";
        }
      }
    } else {
      // Fallback message if OpenAI key is not available
      if (venues && venues.length > 0) {
        if (matches.cities.length > 0) {
          message = `Here are some venues in ${matches.cities[0].charAt(0).toUpperCase() + matches.cities[0].slice(1)}. Click any venue for details.`;
        } else if (matches.eventTypes.length > 0) {
          message = `Here are some venues for ${matches.eventTypes[0]} events. Click any venue for details.`;
        } else {
          message = "Here are some venues that might interest you. Click any venue for details.";
        }
      } else {
        message = "I couldn't find venues matching your criteria. Try searching with different terms.";
      }
    }
    
    // Format the venues for display
    const venueDetailLinks = (venues || []).map((venue: VenueSearchResult) => {
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
          ? venue.gallery_images[0] : null),
        starting_price: venue.starting_price,
        currency: venue.currency,
        price_per_person: venue.price_per_person,
        min_capacity: venue.min_capacity,
        max_capacity: venue.max_capacity,
        gallery_images: venue.gallery_images
      };
    });

    return new Response(JSON.stringify({
      message,
      venues: venueDetailLinks,
      speak: viaMic,
      error: null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in venue-chatbot function:', error);
    return new Response(JSON.stringify({
      message: 'An error occurred while processing your request.',
      error: error.message,
      speak: false,
      venues: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
