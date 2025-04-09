import { useNavigate } from 'react-router-dom';
import { VenueCard } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from "@/components/ui/use-toast";

interface VenuesListProps {
  venues?: Venue[];
  isLoading?: boolean;
  compact?: boolean;
  onVenueMouseEnter?: (venueId: string) => void;
  onVenueMouseLeave?: () => void;
}

const VenuesList = ({ 
  venues = [], 
  isLoading = false, 
  compact = false, 
  onVenueMouseEnter, 
  onVenueMouseLeave 
}: VenuesListProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const handleVenueClick = (venueId: string) => {
    if (user) {
      // User is logged in, navigate to venue details
      navigate(`/venue/${venueId}`);
    } else {
      // User is not logged in, save venue ID to localStorage and redirect to login
      localStorage.setItem('redirectVenueId', venueId);
      toast({
        title: language === 'en' ? "Login Required" : "تسجيل الدخول مطلوب",
        description: language === 'en' ? "Please login to view venue details" : "يرجى تسجيل الدخول لعرض تفاصيل المكان",
        variant: "default",
      });
      navigate('/login');
    }
  };
  
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 ${compact ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-4`}>
        {Array(compact ? 4 : 8).fill(0).map((_, i) => (
          <div key={i} className="bg-findvenue-surface/30 rounded-lg overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <div className="p-3">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-1" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-6 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (venues.length === 0) {
    return (
      <div className="text-center py-8 border border-white/10 rounded-lg bg-findvenue-surface/20">
        <h3 className="text-xl font-medium mb-2">
          {language === 'en' ? 'No venues found' : 'لم يتم العثور على أماكن'}
        </h3>
        <p className="text-findvenue-text-muted max-w-md mx-auto">
          {language === 'en' 
            ? 'We couldn\'t find any venues matching your criteria. Try adjusting your search filters or browsing all venues.' 
            : 'لم نتمكن من العثور على أي أماكن تطابق معاييرك. حاول ضبط مرشحات البحث أو تصفح جميع الأماكن.'}
        </p>
      </div>
    );
  }
  
  return (
    <div className={`grid grid-cols-2 ${compact ? '' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-4`}>
      {venues.map((venue, index) => (
        <div 
          key={venue.id} 
          className={`h-full ${compact ? 'mb-3 last:mb-0' : ''} cursor-pointer`}
          onMouseEnter={() => onVenueMouseEnter && onVenueMouseEnter(venue.id)}
          onMouseLeave={() => onVenueMouseLeave && onVenueMouseLeave()}
          onClick={() => handleVenueClick(venue.id)}
        >
          <VenueCard venue={venue} featured={venue.featured} index={index} />
        </div>
      ))}
    </div>
  );
};

export default VenuesList;
