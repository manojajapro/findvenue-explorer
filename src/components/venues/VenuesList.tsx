
import { useSupabaseVenues } from '@/hooks/useSupabaseVenues';
import { VenueCard } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';

interface VenuesListProps {
  compact?: boolean;
  onVenueMouseEnter?: (venueId: string) => void;
  onVenueMouseLeave?: () => void;
}

const VenuesList = ({ compact = false, onVenueMouseEnter, onVenueMouseLeave }: VenuesListProps) => {
  const { venues, isLoading } = useSupabaseVenues();
  
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-6`}>
        {Array(compact ? 4 : 8).fill(0).map((_, i) => (
          <div key={i} className="bg-findvenue-surface/30 rounded-lg overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-1" />
              <Skeleton className="h-4 w-3/4 mb-3" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (venues.length === 0) {
    return (
      <div className="text-center py-10 border border-white/10 rounded-lg bg-findvenue-surface/20">
        <h3 className="text-xl font-medium mb-2">No venues found</h3>
        <p className="text-findvenue-text-muted max-w-md mx-auto">
          We couldn't find any venues matching your criteria. 
          Try adjusting your search filters or browsing all venues.
        </p>
      </div>
    );
  }
  
  return (
    <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-6`}>
      {venues.map((venue) => (
        <div 
          key={venue.id} 
          className={`h-full ${compact ? 'mb-4 last:mb-0' : ''}`}
          onMouseEnter={() => onVenueMouseEnter && onVenueMouseEnter(venue.id)}
          onMouseLeave={() => onVenueMouseLeave && onVenueMouseLeave()}
        >
          {/* Removed the compact prop since VenueCard doesn't accept it */}
          <VenueCard venue={venue} featured={venue.featured} />
        </div>
      ))}
    </div>
  );
};

export default VenuesList;
