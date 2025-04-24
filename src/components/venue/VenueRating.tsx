
import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import TranslatedText from '@/components/ui/TranslatedText';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';

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
  const { translate } = useTranslation();
  const { user } = useAuth();
  
  const handleRatingClick = (selectedRating: number) => {
    if (hasRated) return;
    setRating(selectedRating);
  };
  
  const handleRatingHover = (hoveredValue: number) => {
    if (hasRated) return;
    setHoveredRating(hoveredValue);
  };
  
  const submitRating = async () => {
    if (rating === 0 || !venueId || !user) return;
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('submit-rating', {
        body: {
          venueId,
          rating,
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('No data returned from rating submission');
      }
      
      setHasRated(true);
      
      if (onRatingUpdated && data.rating !== undefined && data.reviewsCount !== undefined) {
        onRatingUpdated(data.rating, data.reviewsCount);
      }
      
      const successMessage = await translate("Rating submitted successfully!");
      const description = await translate("Thank you for your feedback");
      
      toast.success(successMessage, {
        description: description
      });
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      
      const errorMessage = await translate("Failed to submit rating");
      const description = await translate(error.message || "Please try again");
      
      toast.error(errorMessage, {
        description: description
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="glass-card border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          <TranslatedText text="Rate this venue" />
        </CardTitle>
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
                ? <TranslatedText text="Thank you for your rating!" />
                : rating > 0 
                  ? <TranslatedText text={`You've selected ${rating} star${rating > 1 ? 's' : ''}`} />
                  : <TranslatedText text="Click on a star to rate this venue" />}
            </div>
            
            <div className="text-sm mt-1">
              <TranslatedText 
                text={`Current rating: ${initialRating} (${reviewsCount} review${reviewsCount !== 1 ? 's' : ''})`} 
              />
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
            {isSubmitting 
              ? <TranslatedText text="Submitting..." /> 
              : <TranslatedText text="Submit Rating" />}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default VenueRating;
