
/// <reference types="@types/google.maps" />
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export const useGeocode = () => {
  const [isLoading, setIsLoading] = useState(false);

  const geocodePinCode = useCallback(async (address: string, country: string = 'Saudi Arabia') => {
    if (!address) {
      toast.error('Please enter a location to search');
      return null;
    }

    setIsLoading(true);

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ address: `${address}, ${country}` });
      
      if (response.results && response.results.length > 0) {
        const location = response.results[0].geometry.location;
        const formattedAddress = response.results[0].formatted_address;
        
        setIsLoading(false);
        
        return {
          lat: location.lat(),
          lng: location.lng(),
          formattedAddress
        };
      }
      
      toast.error(`Could not find location for: ${address}`);
      setIsLoading(false);
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Error finding location. Please try again.');
      setIsLoading(false);
      return null;
    }
  }, []);

  return { 
    geocodePinCode,
    isLoading 
  };
}; 
