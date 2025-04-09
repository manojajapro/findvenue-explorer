
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Venue } from '@/hooks/useSupabaseVenues';

export const useVenueData = () => {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVenueData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log("Fetching venue data for ID:", id);
        
        const { data, error: venueError } = await supabase
          .from('venues')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (venueError) {
          console.error("Error fetching venue:", venueError);
          throw venueError;
        }

        if (data) {
          console.log("Raw venue data:", data);
          
          let ownerInfoData = undefined;
          try {
            if (data.owner_info) {
              const ownerInfo = typeof data.owner_info === 'string'
                ? JSON.parse(data.owner_info)
                : (data.owner_info as Record<string, any>);
                
              ownerInfoData = {
                name: ownerInfo.name || '',
                contact: ownerInfo.contact || '',
                responseTime: ownerInfo.response_time || '',
                user_id: ownerInfo.user_id || '',
                socialLinks: {
                  facebook: ownerInfo.facebook_url || ownerInfo.facebook || '',
                  twitter: ownerInfo.twitter_url || ownerInfo.twitter || '',
                  instagram: ownerInfo.instagram_url || ownerInfo.instagram || '',
                  linkedin: ownerInfo.linkedin_url || ownerInfo.linkedin || ''
                }
              };
            }
          } catch (e) {
            console.error("Error parsing owner_info for venue", data.id, e);
          }
          
          let openingHoursData = undefined;
          try {
            if (data.opening_hours) {
              openingHoursData = typeof data.opening_hours === 'string'
                ? JSON.parse(data.opening_hours)
                : (data.opening_hours as Record<string, any>);
            }
          } catch (e) {
            console.error("Error parsing opening_hours for venue", data.id, e);
          }
          
          let rulesAndRegulationsData = undefined;
          try {
            if (data.rules_and_regulations) {
              rulesAndRegulationsData = typeof data.rules_and_regulations === 'string'
                ? JSON.parse(data.rules_and_regulations)
                : (data.rules_and_regulations as Array<{
                    category: string;
                    title: string;
                    description: string;
                  }>);
            }
          } catch (e) {
            console.error("Error parsing rules_and_regulations for venue", data.id, e);
          }
          
          // Use the first gallery image instead of image_url
          const defaultImage = data.gallery_images && data.gallery_images.length > 0 
            ? data.gallery_images[0] 
            : '';
          
          const transformedVenue: Venue = {
            id: data.id,
            name: data.name,
            description: data.description || '',
            imageUrl: defaultImage, // Use first gallery image instead
            galleryImages: data.gallery_images || [],
            address: data.address || '',
            city: data.city_name || '',
            cityId: data.city_id || '',
            category: data.category_name || '',
            categoryId: data.category_id || '',
            capacity: {
              min: data.min_capacity || 0,
              max: data.max_capacity || 0
            },
            pricing: {
              currency: data.currency || 'SAR',
              startingPrice: data.starting_price || 0,
              pricePerPerson: data.price_per_person,
              hourlyRate: data.hourly_rate
            },
            amenities: data.amenities || [],
            rating: data.rating || 0,
            reviews: data.reviews_count || 0,
            featured: data.featured || false,
            popular: data.popular || false,
            availability: data.availability || [],
            latitude: data.latitude,
            longitude: data.longitude,
            parking: data.parking,
            wifi: data.wifi,
            accessibilityFeatures: data.accessibility_features || [],
            acceptedPaymentMethods: data.accepted_payment_methods || [],
            openingHours: openingHoursData,
            ownerInfo: ownerInfoData,
            additionalServices: data.additional_services || [],
            rulesAndRegulations: rulesAndRegulationsData,
            type: data.type || '',
            zipcode: data.zipcode || ''
          };
          
          console.log("Transformed venue data:", transformedVenue);
          setVenue(transformedVenue);
        }
      } catch (error: any) {
        console.error('Error fetching venue data:', error);
        setError(error.message || 'Failed to fetch venue data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVenueData();
  }, [id]);

  return { venue, isLoading, error };
};
