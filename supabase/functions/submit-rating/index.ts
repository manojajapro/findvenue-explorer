
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { venueId, rating, userId } = await req.json();
    
    if (!venueId) {
      throw new Error('Venue ID is required');
    }
    
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://esdmelfzeszjtbnoajig.supabase.co';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZG1lbGZ6ZXN6anRibm9hamlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4ODUwMTUsImV4cCI6MjA1ODQ2MTAxNX0.1z27OZ04RuR8AYlVGaE9L8vWWYilSrMlyq422BJcX94';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log(`Processing rating ${rating} for venue ${venueId}`);
    
    // First, get current venue data
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .select('rating, reviews_count')
      .eq('id', venueId)
      .single();
      
    if (venueError) {
      console.error('Error fetching venue data:', venueError);
      throw venueError;
    }
    
    // Calculate new rating and review count
    const currentRating = venueData.rating || 0;
    const currentReviews = venueData.reviews_count || 0;
    const newReviews = currentReviews + 1;
    
    // Calculate weighted average for new rating
    const newRating = ((currentRating * currentReviews) + rating) / newReviews;
    const roundedRating = Math.round(newRating * 10) / 10; // Round to 1 decimal place
    
    console.log(`Current rating: ${currentRating}, reviews: ${currentReviews}`);
    console.log(`New rating: ${roundedRating}, reviews: ${newReviews}`);
    
    // Update venue with new rating
    const { data, error } = await supabase
      .from('venues')
      .update({
        rating: roundedRating,
        reviews_count: newReviews
      })
      .eq('id', venueId)
      .select();
      
    if (error) {
      console.error('Error updating venue rating:', error);
      throw error;
    }
    
    console.log('Successfully updated rating:', data);
    
    return new Response(JSON.stringify({ 
      success: true, 
      rating: roundedRating, 
      reviewsCount: newReviews 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in submit-rating function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
