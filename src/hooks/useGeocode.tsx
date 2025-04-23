
import { useState } from 'react';
import { toast } from 'sonner';

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export const useGeocode = () => {
  const [isLoading, setIsLoading] = useState(false);

  const geocodePinCode = async (pinCode: string, country: string = 'Saudi Arabia') => {
    if (!pinCode) {
      toast.error('Please enter a city, ZIP or postal code');
      return null;
    }

    setIsLoading(true);

    try {
      // Use Google Geocoding API to convert PIN/ZIP/Postal code to coordinates
      const searchQuery = `${pinCode}, ${country}`;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          searchQuery
        )}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const formattedAddress = data.results[0].formatted_address;
        
        setIsLoading(false);
        
        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress
        };
      } else {
        toast.error(`Could not find location for: ${pinCode}`);
        console.error('Geocoding error:', data.status, data);
        setIsLoading(false);
        return null;
      }
    } catch (error) {
      console.error('Error geocoding:', error);
      toast.error('Error finding location. Please try again.');
      setIsLoading(false);
      return null;
    }
  };

  return {
    geocodePinCode,
    isLoading
  };
};
