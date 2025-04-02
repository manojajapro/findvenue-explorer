
import { useState } from 'react';
import { toast } from 'sonner';

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  isLoading: boolean;
}

export const useGeocode = () => {
  const [result, setResult] = useState<GeocodeResult>({
    lat: 0,
    lng: 0,
    formattedAddress: '',
    isLoading: false
  });

  const geocodePinCode = async (pinCode: string, country: string = 'Saudi Arabia') => {
    if (!pinCode) {
      toast.error('Please enter a PIN code');
      return null;
    }

    setResult(prev => ({ ...prev, isLoading: true }));

    try {
      // Use Google Geocoding API to convert PIN code to coordinates
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
        
        setResult({
          lat: location.lat,
          lng: location.lng,
          formattedAddress,
          isLoading: false
        });
        
        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress
        };
      } else {
        toast.error(`Could not find location for PIN code: ${pinCode}`);
        console.error('Geocoding error:', data.status, data);
        setResult(prev => ({ ...prev, isLoading: false }));
        return null;
      }
    } catch (error) {
      console.error('Error geocoding PIN code:', error);
      toast.error('Error finding location. Please try again.');
      setResult(prev => ({ ...prev, isLoading: false }));
      return null;
    }
  };

  return {
    ...result,
    geocodePinCode
  };
};
