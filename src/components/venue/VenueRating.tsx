
import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type VenueRatingProps = {
  venueId: string;
  initialRating?: number;
  reviewsCount?: number;
  onRatingUpdated?: (newRating: number, newCount: number) => void;
};

const VenueRating = ({ 
  venueId, 
  initialRating = 0,
  reviewsCount = 0,
  onRatingUpdated
}: VenueRatingProps) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  
  const handleRatingClick = (selectedRating: number) => {
    if (hasRated) return;
    setRating(selectedRating);
  };
  
  const handleRatingHover = (hoveredValue: number) => {
    if (hasRated) return;
    setHoveredRating(hoveredValue);
  };
  
  const submitRating = async () => {
    if (rating === 0 || !venueId) return;
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('submit-rating', {
        body: {
          venueId,
          rating
        }
      });
      
      if (error) throw error;
      
      setHasRated(true);
      
      if (onRatingUpdated && data) {
        onRatingUpdated(data.rating, data.reviewsCount);
      }
      
      toast.success('Rating submitted successfully!', {
        description: 'Thank you for your feedback'
      });
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating', {
        description: error.message || 'Please try again'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="glass-card border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Rate this venue</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRatingClick(value)}
                onMouseEnter={() => handleRatingHover(value)}
                onMouseLeave={() => handleRatingHover(0)}
                disabled={hasRated || isSubmitting}
                className="focus:outline-none transition-transform disabled:cursor-not-allowed"
              >
                <Star
                  className={`h-8 w-8 transition-all duration-100 ${
                    (hoveredRating ? value <= hoveredRating : value <= rating)
                      ? 'fill-findvenue-gold text-findvenue-gold' 
                      : 'text-findvenue-text-muted'
                  } ${
                    !hasRated && !isSubmitting && 'hover:scale-110'
                  }`}
                />
              </button>
            ))}
          </div>
          
          <div className="text-center mt-2 mb-4">
            <div className="text-sm text-findvenue-text-muted">
              {hasRated 
                ? 'Thank you for your rating!' 
                : rating > 0 
                  ? `You've selected ${rating} star${rating > 1 ? 's' : ''}` 
                  : 'Click on a star to rate this venue'}
            </div>
            
            <div className="text-sm mt-1">
              Current rating: {initialRating} ({reviewsCount} review{reviewsCount !== 1 ? 's' : ''})
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-center">
        {!hasRated && (
          <Button 
            onClick={submitRating} 
            disabled={rating === 0 || isSubmitting || hasRated}
            className="bg-findvenue hover:bg-findvenue-dark"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default VenueRating;
