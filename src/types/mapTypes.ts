
import { useDarkMode } from '@/hooks/useDarkMode';

export interface MapViewProps {
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  editable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
  name?: string;
  venues?: Venue[];
  isLoading?: boolean;
  highlightedVenueId?: string;
}

export interface Venue {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
}
