
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
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

    const body = await req.json();
    const { query, venueId, type } = body;
    
    // Basic input validation
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid query parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const queryLower = query.toLowerCase();
    
    // Welcome messages and simple greetings
    const welcomeResponses = [
      "👋 Hello! I'm your FindVenue AI assistant. Ready to help you discover the perfect venue and plan an amazing event in Saudi Arabia!",
      "🌟 Welcome to FindVenue! I can help you find venues, suggest event themes, and provide planning tips across Saudi Arabia's top cities.",
      "💡 Need venue ideas or event planning advice? I'm here to make your event planning smooth and exciting!"
    ];

    if (type === 'welcome' || /^(hi|hello|hey|howdy|greetings|hola|what's up|yo)$/i.test(query.trim())) {
      return new Response(
        JSON.stringify({ 
          answer: welcomeResponses[Math.floor(Math.random() * welcomeResponses.length)] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Advanced intent detection system
    const searchIntents = {
      venue: /\b(find|show|venues?|list|suggest|recommend|looking\s+for)\b/i,
      wedding: /\b(wedding|bride|groom|ceremony|marriage|matrimony)\b/i,
      conference: /\b(conference|meeting|business|corporate|seminar|workshop)\b/i,
      party: /\b(party|birthday|celebration|festive|anniversary)\b/i,
      capacity: /\b(\d+)\s+(people|guests|capacity|persons|attendees)\b/i,
      price: /\b(\d+)\s*(sar|price|budget|cost)\b/i,
      city: /\b(riyadh|jeddah|dammam|mecca|medina|khobar|taif|abha)\b/i,
      amenities: /\b(wifi|parking|catering|stage|outdoor|indoor|av|equipment|sound)\b/i,
      premium: /\b(luxury|premium|best|top|high-end|exclusive)\b/i,
      rating: /\b(highest|best|top)\s+rated\b/i
    };
    
    // Parse search criteria
    const searchCriteria: any = {};

    // City detection (case insensitive)
    const cities = ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina', 'khobar', 'taif', 'abha'];
    for (const city of cities) {
      if (queryLower.includes(city)) {
        searchCriteria.city = city;
        break;
      }
    }
    
    // Venue type detection
    const venueTypes = {
      'wedding': ['wedding', 'marriage', 'bride', 'groom', 'ceremony', 'reception'],
      'conference': ['conference', 'meeting', 'seminar', 'workshop', 'corporate', 'business'],
      'party': ['party', 'birthday', 'celebration', 'anniversary', 'festivity'],
      'exhibition': ['exhibition', 'showcase', 'expo', 'fair'],
      'concert': ['concert', 'performance', 'show', 'music', 'live'],
      'hall': ['hall', 'ballroom', 'venue', 'space', 'auditorium']
    };

    for (const [type, keywords] of Object.entries(venueTypes)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        searchCriteria.venueType = type;
        break;
      }
    }

    // Capacity detection with better number extraction
    const capacityMatch = queryLower.match(/(\d+)\s*(?:people|guests|persons?|capacity|attendees)/);
    if (capacityMatch) searchCriteria.capacity = parseInt(capacityMatch[1]);

    // Price range detection
    const priceMatch = queryLower.match(/(\d+)\s*(?:sar|price|\$|budget|cost)/);
    if (priceMatch) searchCriteria.maxPrice = parseInt(priceMatch[1]);

    // Parse amenities
    const amenities = {
      'wifi': ['wifi', 'internet', 'connection'],
      'parking': ['parking', 'car park', 'valet'],
      'catering': ['catering', 'food', 'cuisine', 'meal'],
      'outdoor': ['outdoor', 'garden', 'terrace', 'open air'],
      'audio visual': ['av', 'projector', 'screen', 'sound system', 'microphone']
    };
    
    const foundAmenities: string[] = [];
    for (const [amenity, keywords] of Object.entries(amenities)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        foundAmenities.push(amenity);
      }
    }
    if (foundAmenities.length) searchCriteria.amenities = foundAmenities;
    
    // Rating importance detection
    if (queryLower.match(/\b(high(est)?|best|top|good)\s+rat(ed|ing)\b/)) {
      searchCriteria.sortByRating = true;
    }

    // Premium venue detection
    if (queryLower.match(/\b(premium|luxury|exclusive|high(-|\s)end)\b/)) {
      searchCriteria.premium = true;
    }
    
    // Season/month detection
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const seasons = ['winter', 'spring', 'summer', 'fall', 'autumn'];
    
    for (const month of months) {
      if (queryLower.includes(month)) {
        searchCriteria.month = month;
        break;
      }
    }
    
    for (const season of seasons) {
      if (queryLower.includes(season)) {
        searchCriteria.season = season;
        break;
      }
    }

    // Intelligent venue search based on criteria
    const isVenueSearch = searchIntents.venue.test(queryLower) || 
                          Object.keys(searchCriteria).length > 0 ||
                          ['venue', 'where', 'place', 'location', 'recommend', 'suggest'].some(term => queryLower.includes(term));
    
    if (isVenueSearch) {
      console.log("Processing venue search with criteria:", JSON.stringify(searchCriteria));
      
      // Build a dynamic query based on extracted criteria
      let venueQuery = supabaseClient.from('venues').select('*');
      
      if (searchCriteria.city) {
        venueQuery = venueQuery.ilike('city_name', `%${searchCriteria.city}%`);
      }
      
      if (searchCriteria.venueType) {
        if (typeof venueQuery.contains === 'function') {
          venueQuery = venueQuery.contains('category_name', [searchCriteria.venueType]);
        } else {
          // Fallback if contains is not available
          venueQuery = venueQuery.filter('category_name', 'cs', `{${searchCriteria.venueType}}`);
        }
      }
      
      if (searchCriteria.capacity) {
        venueQuery = venueQuery.gte('max_capacity', searchCriteria.capacity);
      }
      
      if (searchCriteria.maxPrice) {
        venueQuery = venueQuery.lte('starting_price', searchCriteria.maxPrice);
      }
      
      if (searchCriteria.premium) {
        venueQuery = venueQuery.eq('featured', true);
      }
      
      // Order by rating by default for better results, unless specifically asked for different sorting
      venueQuery = venueQuery.order('rating', { ascending: false }).limit(5);
      
      // Execute the query
      const { data: venues, error } = await venueQuery;
      
      if (error) {
        console.error('Venue search error:', error);
        return new Response(
          JSON.stringify({ answer: "I'm sorry, I encountered an error searching for venues. Please try again with different criteria." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!venues || venues.length === 0) {
        // No venues found - suggest broader search
        return new Response(
          JSON.stringify({ 
            answer: `I couldn't find any venues matching your criteria. Would you like to broaden your search or try different criteria?` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Format venue information for OpenAI
      const formattedVenues = venues.map(venue => {
        // Handle possible array or string categories
        let categoryDisplay = "Not specified";
        if (venue.category_name) {
          if (Array.isArray(venue.category_name)) {
            categoryDisplay = venue.category_name.join(', ');
          } else if (typeof venue.category_name === 'string') {
            categoryDisplay = venue.category_name;
          }
        }
        
        return `
          Name: ${venue.name}
          Location: ${venue.city_name || 'Not specified'}
          Type: ${categoryDisplay}
          Capacity: ${venue.min_capacity || 'N/A'}-${venue.max_capacity || 'N/A'} guests
          Starting Price: SAR ${venue.starting_price?.toLocaleString() || 'Contact for pricing'}
          Rating: ${venue.rating || 'Unrated'}/5 (${venue.reviews_count || 0} reviews)
          Features: ${venue.wifi ? 'WiFi' : ''} ${venue.parking ? ', Parking' : ''}
          ${venue.amenities && venue.amenities.length > 0 ? `Amenities: ${venue.amenities.join(', ')}` : ''}
        `;
      }).join('\n');

      // Generate OpenAI response
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system", 
              content: `You are a helpful FindVenue AI assistant. Provide concise, friendly venue recommendations based on the user's query.
                Format venues in a clear, readable way. Be enthusiastic and helpful, highlighting why each venue matches their needs.
                Always provide a suggestion about what the user might ask next to refine their search.`
            },
            {
              role: "user",
              content: `User query: "${query}"
                Search criteria detected: ${JSON.stringify(searchCriteria)}
                Found ${venues.length} venues matching the criteria:
                ${formattedVenues}
                
                Please provide a helpful response listing these venues with key details, suggesting which might be best based on the user's query, and offering a follow-up question.`
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      const aiData = await openaiResponse.json();
      const answer = aiData?.choices?.[0]?.message?.content?.trim() || 
        "I found some venues that might interest you, but I'm having trouble summarizing the details. Would you like to know about a specific aspect of these venues?";
      
      return new Response(
        JSON.stringify({ 
          answer,
          venues: venues.map(v => ({
            id: v.id,
            name: v.name,
            city: v.city_name,
            capacity: `${v.min_capacity || '?'}-${v.max_capacity || '?'}`,
            price: `SAR ${v.starting_price || '?'}`,
            rating: v.rating || 'Unrated',
            image: v.image_url || null
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle specific venue queries
    if (venueId) {
      const { data: venue, error } = await supabaseClient.from('venues').select('*').eq('id', venueId).maybeSingle();
      
      if (error || !venue) {
        return new Response(
          JSON.stringify({ answer: "Sorry, I couldn't find details for that venue." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Format category name for display
      let categoryDisplay = "Not specified";
      if (venue.category_name) {
        if (Array.isArray(venue.category_name)) {
          categoryDisplay = venue.category_name.join(', ');
        } else if (typeof venue.category_name === 'string') {
          categoryDisplay = venue.category_name;
        }
      }
      
      const venueInfo = `
        Venue Name: ${venue.name}
        City: ${venue.city_name || 'Not specified'}
        Address: ${venue.address || 'Not specified'}
        Categories: ${categoryDisplay}
        Capacity: ${venue.min_capacity || 'N/A'}-${venue.max_capacity || 'N/A'} guests
        Starting Price: SAR ${venue.starting_price?.toLocaleString() || 'Contact for pricing'}
        Price per Person: ${venue.price_per_person ? `SAR ${venue.price_per_person}` : 'Not specified'}
        Amenities: ${Array.isArray(venue.amenities) ? venue.amenities.join(', ') : 'Not specified'}
        Additional Services: ${Array.isArray(venue.additional_services) ? venue.additional_services.join(', ') : 'Not specified'}
        Rating: ${venue.rating || 'Unrated'}/5 (${venue.reviews_count || 0} reviews)
        Features: ${venue.wifi ? 'WiFi available' : ''} ${venue.parking ? ', Parking available' : ''}
        Description: ${venue.description || 'No detailed description available'}
      `;
      
      // Generate OpenAI response for specific venue
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system", 
              content: `You are a helpful FindVenue AI assistant specializing in venue information in Saudi Arabia. 
                Provide concise, helpful information about the venue based on the user's query.
                Be enthusiastic and friendly, highlighting key features that match what the user seems to be looking for.
                If the user asks something not covered in the venue info, acknowledge that and suggest they contact the venue directly.`
            },
            {
              role: "user",
              content: `User query about this venue: "${query}"
                Venue information:
                ${venueInfo}
                
                Please provide a helpful response addressing the user's question about this venue based on the available information.`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      const aiData = await openaiResponse.json();
      const answer = aiData?.choices?.[0]?.message?.content?.trim() || 
        `${venue.name} is located in ${venue.city_name || 'Saudi Arabia'}. It can accommodate ${venue.min_capacity || '?'}-${venue.max_capacity || '?'} guests with prices starting at SAR ${venue.starting_price || '?'}. Would you like more specific details about this venue?`;
      
      return new Response(
        JSON.stringify({ answer }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Event planning queries
    const isEventPlanningQuery = /plan|organize|theme|layout|decor|vendor|catering|budget|schedule|timeline|theme|idea/i.test(queryLower);
    
    if (isEventPlanningQuery) {
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system", 
              content: `You are a helpful FindVenue AI assistant specializing in event planning in Saudi Arabia.
                Provide helpful, culturally appropriate advice for planning events in Saudi Arabia.
                Be concise but thorough, offering practical tips and suggestions relevant to the Saudi Arabian context.
                Include specific recommendations about venues, vendors, or planning approaches when possible.`
            },
            {
              role: "user",
              content: `Event planning query: "${query}"
                Detected criteria: ${JSON.stringify(searchCriteria)}
                
                Please provide helpful event planning advice related to this query, focusing on Saudi Arabian context and customs.`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      const aiData = await openaiResponse.json();
      const answer = aiData?.choices?.[0]?.message?.content?.trim() || 
        "I'd be happy to help with your event planning. Could you provide a few more details about what type of event you're planning?";
      
      return new Response(
        JSON.stringify({ answer }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fallback for general queries
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system", 
            content: `You are a helpful FindVenue AI assistant specializing in venues and event planning in Saudi Arabia.
              Keep responses concise and helpful, focusing on Saudi Arabian venue context.
              If the query is unclear, suggest how the user might rephrase it or what details would be helpful to add.
              Always be friendly and helpful, maintaining a positive tone.`
          },
          {
            role: "user",
            content: `User query: "${query}"
              This query doesn't clearly match our venue search or event planning categories.
              Please provide a helpful response that guides the user toward finding venue information or event planning assistance.`
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });
    
    const aiData = await openaiResponse.json();
    const answer = aiData?.choices?.[0]?.message?.content?.trim() || 
      "I'd be happy to help you find venues or plan an event in Saudi Arabia. Could you tell me more about what you're looking for?";
    
    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Venue Assistant Error:", error);
    return new Response(
      JSON.stringify({ 
        answer: "I'm having trouble processing your request. Please try again with a different phrasing.",
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
