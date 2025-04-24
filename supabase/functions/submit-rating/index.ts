
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

    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://esdmelfzeszjtbnoajig.supabase.co';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZG1lbGZ6ZXN6anRibm9hamlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4ODUwMTUsImV4cCI6MjA1ODQ2MTAxNX0.1z27OZ04RuR8AYlVGaE9L8vWWYilSrMlyq422BJcX94';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Check if user has already rated this venue
    const { data: existingRating } = await supabase
      .from('user_ratings')
      .select('id')
      .eq('user_id', userId)
      .eq('venue_id', venueId)
      .single();
      
    if (existingRating) {
      throw new Error('You have already rated this venue');
    }
    
    // Insert the new user rating
    const { error: ratingError } = await supabase
      .from('user_ratings')
      .insert({
        user_id: userId,
        venue_id: venueId,
        rating
      });
      
    if (ratingError) {
      console.error('Error inserting user rating:', ratingError);
      throw ratingError;
    }
    
    // Get all ratings for this venue
    const { data: allRatings, error: ratingsError } = await supabase
      .from('user_ratings')
      .select('rating')
      .eq('venue_id', venueId);
      
    if (ratingsError) {
      console.error('Error fetching venue ratings:', ratingsError);
      throw ratingsError;
    }
    
    // Calculate new average rating
    const totalRatings = allRatings.length;
    const sumRatings = allRatings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = Math.round((sumRatings / totalRatings) * 10) / 10; // Round to 1 decimal
    
    // Update venue with new rating and review count
    const { data: updatedVenue, error: updateError } = await supabase
      .from('venues')
      .update({
        rating: averageRating,
        reviews_count: totalRatings
      })
      .eq('id', venueId)
      .select('rating, reviews_count')
      .single();
      
    if (updateError) {
      console.error('Error updating venue:', updateError);
      throw updateError;
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      rating: updatedVenue.rating, 
      reviewsCount: updatedVenue.reviews_count 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in submit-rating function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
