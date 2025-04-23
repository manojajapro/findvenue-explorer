
/// <reference types="@types/google.maps" />
import { useState, useCallback } from 'react';

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export const useGeocode = () => {
  const [isLoading, setIsLoading] = useState(false);

  const geocodePinCode = useCallback(async (address: string): Promise<GeocodeResult | null> => {
    if (!address) {
      return null;
    }

    setIsLoading(true);

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ address });
      
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
      setIsLoading(false);
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      setIsLoading(false);
      throw error;
    }
  }, []);

  return { geocodePinCode, isLoading };
};
