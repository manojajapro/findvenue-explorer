import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Define venue attributes for search
const venueAttributes = {
  basic: ['name', 'description', 'address', 'city_name', 'type'],
  numeric: ['min_capacity', 'max_capacity', 'starting_price', 'price_per_person'],
  arrays: ['category_name', 'amenities', 'additional_services', 'accepted_payment_methods', 'accessibility_features'],
  boolean: ['wifi', 'parking', 'featured', 'popular'],
  status: ['status', 'availability']
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { query, type = 'search' } = await req.json();
    
    // Basic input validation
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid query parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const queryLower = query.toLowerCase();
    
    // Extract search parameters
    const searchParams = {
      keywords: queryLower.split(/\s+/).filter(Boolean),
      city: extractCity(queryLower),
      capacity: extractCapacity(queryLower),
      price: extractPrice(queryLower),
      amenities: extractAmenities(queryLower),
      eventType: extractEventType(queryLower),
      features: extractFeatures(queryLower)
    };

    // Build Supabase query
    let venueQuery = supabaseClient.from('venues').select('*');

    // Apply text search across all relevant columns
    if (searchParams.keywords.length > 0) {
      const textSearchConditions = searchParams.keywords.map(keyword => {
        const pattern = `%${keyword}%`;
        return `
          name.ilike.${pattern},
          description.ilike.${pattern},
          address.ilike.${pattern},
          city_name.ilike.${pattern},
          category_name.cs.{${keyword}},
          amenities.cs.{${keyword}},
          additional_services.cs.{${keyword}},
          type.ilike.${pattern}
        `;
      }).join(',');
      venueQuery = venueQuery.or(textSearchConditions);
    }

    // Apply specific filters
    if (searchParams.city) {
      venueQuery = venueQuery.ilike('city_name', `%${searchParams.city}%`);
    }

    if (searchParams.capacity) {
      venueQuery = venueQuery.and(`min_capacity.lte.${searchParams.capacity},max_capacity.gte.${searchParams.capacity}`);
    }

    if (searchParams.price) {
      venueQuery = venueQuery.lte('starting_price', searchParams.price);
    }

    if (searchParams.amenities.length > 0) {
      venueQuery = venueQuery.contains('amenities', searchParams.amenities);
    }

    if (searchParams.eventType) {
      venueQuery = venueQuery.or(`category_name.cs.{${searchParams.eventType}},type.ilike.%${searchParams.eventType}%`);
    }

    // Add feature-based filters
    if (searchParams.features.wifi) venueQuery = venueQuery.eq('wifi', true);
    if (searchParams.features.parking) venueQuery = venueQuery.eq('parking', true);
    if (searchParams.features.premium) venueQuery = venueQuery.eq('featured', true);

    // Execute query
    const { data: venues, error } = await venueQuery.order('rating', { ascending: false }).limit(10);

    if (error) {
      console.error('Venue search error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to search venues' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!venues || venues.length === 0) {
      return new Response(
        JSON.stringify({
          answer: "I couldn't find any venues matching your criteria. Would you like to try a broader search?",
          venues: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format venue results
    const formattedVenues = venues.map(formatVenueResponse);
    const answer = generateVenueResponse(query, venues, searchParams);

    return new Response(
      JSON.stringify({
        answer,
        venues: formattedVenues
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper functions
function extractCity(query: string): string | null {
  const cities = ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina', 'khobar', 'taif', 'abha'];
  return cities.find(city => query.includes(city)) || null;
}

function extractCapacity(query: string): number | null {
  const match = query.match(/(\d+)\s*(?:people|guests|persons?|capacity|attendees)/i);
  return match ? parseInt(match[1]) : null;
}

function extractPrice(query: string): number | null {
  const match = query.match(/(\d+)\s*(?:sar|price|\$|budget|cost)/i);
  return match ? parseInt(match[1]) : null;
}

function extractAmenities(query: string): string[] {
  const amenityKeywords = {
    wifi: ['wifi', 'internet', 'connection'],
    parking: ['parking', 'car park', 'valet'],
    catering: ['catering', 'food', 'cuisine'],
    av: ['projector', 'screen', 'sound system', 'audio'],
    outdoor: ['outdoor', 'garden', 'terrace']
  };

  return Object.entries(amenityKeywords)
    .filter(([_, keywords]) => keywords.some(k => query.includes(k)))
    .map(([amenity]) => amenity);
}

function extractEventType(query: string): string | null {
  const eventTypes = {
    wedding: ['wedding', 'marriage', 'bride', 'groom'],
    conference: ['conference', 'meeting', 'seminar', 'corporate'],
    party: ['party', 'birthday', 'celebration'],
    exhibition: ['exhibition', 'showcase', 'expo']
  };

  for (const [type, keywords] of Object.entries(eventTypes)) {
    if (keywords.some(k => query.includes(k))) {
      return type;
    }
  }
  return null;
}

function extractFeatures(query: string): { wifi: boolean; parking: boolean; premium: boolean } {
  return {
    wifi: /\b(wifi|internet|connection)\b/i.test(query),
    parking: /\b(parking|car\s+park|valet)\b/i.test(query),
    premium: /\b(premium|luxury|exclusive|high(-|\s)end)\b/i.test(query)
  };
}

function formatVenueResponse(venue: any) {
  return {
    id: venue.id,
    name: venue.name,
    city: venue.city_name,
    type: Array.isArray(venue.category_name) ? venue.category_name.join(', ') : venue.category_name,
    capacity: `${venue.min_capacity || '?'}-${venue.max_capacity || '?'}`,
    price: venue.starting_price ? `SAR ${venue.starting_price}` : 'Contact for pricing',
    pricePerPerson: venue.price_per_person ? `SAR ${venue.price_per_person}` : null,
    rating: venue.rating || 'Unrated',
    reviews: venue.reviews_count || 0,
    amenities: venue.amenities || [],
    features: {
      wifi: venue.wifi || false,
      parking: venue.parking || false,
      featured: venue.featured || false,
      popular: venue.popular || false
    },
    image: venue.image_url || null,
    description: venue.description || null,
    address: venue.address || null,
    status: venue.status || 'Available'
  };
}

function generateVenueResponse(query: string, venues: any[], searchParams: any): string {
  let response = `I found ${venues.length} venue${venues.length > 1 ? 's' : ''} `;
  
  if (searchParams.city) {
    response += `in ${searchParams.city} `;
  }
  
  if (searchParams.eventType) {
    response += `suitable for ${searchParams.eventType}s `;
  }
  
  response += "that match your criteria:\n\n";
  
  venues.forEach((venue, index) => {
    response += `${index + 1}. ${venue.name}\n`;
    response += `   📍 ${venue.city_name}\n`;
    response += `   👥 Capacity: ${venue.min_capacity}-${venue.max_capacity} guests\n`;
    response += `   💰 ${venue.starting_price ? `Starting at SAR ${venue.starting_price}` : 'Contact for pricing'}\n`;
    if (venue.rating) {
      response += `   ⭐ ${venue.rating}/5 (${venue.reviews_count || 0} reviews)\n`;
    }
    response += '\n';
  });
  
  response += "\nWould you like more specific details about any of these venues?";
  
  return response;
}
