/// <reference types="@types/google.maps" />
import { useCallback } from 'react';

export const useGeocode = () => {
  const geocodePinCode = useCallback(async (address: string) => {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ address });
      
      if (response.results && response.results.length > 0) {
        const location = response.results[0].geometry.location;
        return {
          lat: location.lat(),
          lng: location.lng()
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }, []);

  return { geocodePinCode };
}; 