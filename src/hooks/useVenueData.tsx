
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useToast } from '@/components/ui/use-toast';
import { processCategoryNames } from '@/utils/venueHelpers';

export const useVenueData = () => {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
              console.log("Processing owner_info:", data.owner_info);
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
              console.log("Processed owner info:", ownerInfoData);
            } else {
              console.log("No owner_info found in venue data");
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
          
          const processArrayField = (field: any): string[] => {
            if (!field) return [];
            
            if (Array.isArray(field)) {
              return field;
            }
            
            if (typeof field === 'string') {
              if (field.includes(',') && !field.includes('[') && !field.includes('{')) {
                return field.split(',').map(item => item.trim());
              }
              
              try {
                const parsed = JSON.parse(field);
                if (Array.isArray(parsed)) {
                  return parsed;
                }
                return [field];
              } catch (e) {
                console.error("Error parsing array field", field, e);
                return [field];
              }
            }
            
            return [String(field)];
          };
          
          const galleryImages = processArrayField(data.gallery_images);
          const defaultImage = galleryImages.length > 0 ? galleryImages[0] : '';
          
          const minCapacity = typeof data.min_capacity === 'string' 
            ? parseInt(data.min_capacity, 10) || 0 
            : Number(data.min_capacity) || 0;
            
          const maxCapacity = typeof data.max_capacity === 'string' 
            ? parseInt(data.max_capacity, 10) || 0 
            : Number(data.max_capacity) || 0;
          
          const startingPrice = Number(data.starting_price) || 0;
          const pricePerPerson = data.price_per_person ? Number(data.price_per_person) : undefined;
          const hourlyRate = data.hourly_rate ? Number(data.hourly_rate) : undefined;
          
          // Use the processCategoryNames utility to properly parse the category names
          const categoryNames = processCategoryNames(data.category_name);
          
          const transformedVenue: Venue = {
            id: data.id,
            name: data.name,
            description: data.description || '',
            imageUrl: defaultImage,
            galleryImages: galleryImages,
            address: data.address || '',
            city: data.city_name || '',
            cityId: data.city_id || '',
            category: categoryNames.join(', '), // Join with comma and space for UI display
            categoryId: data.category_id || '',
            capacity: {
              min: minCapacity,
              max: maxCapacity
            },
            pricing: {
              currency: data.currency || 'SAR',
              startingPrice: startingPrice,
              pricePerPerson: pricePerPerson,
              hourlyRate: hourlyRate
            },
            amenities: processArrayField(data.amenities),
            rating: data.rating || 0,
            reviews: data.reviews_count || 0,
            featured: data.featured || false,
            popular: data.popular || false,
            availability: processArrayField(data.availability),
            latitude: data.latitude,
            longitude: data.longitude,
            parking: data.parking,
            wifi: data.wifi,
            accessibilityFeatures: processArrayField(data.accessibility_features),
            acceptedPaymentMethods: processArrayField(data.accepted_payment_methods),
            openingHours: openingHoursData,
            ownerInfo: ownerInfoData,
            additionalServices: processArrayField(data.additional_services),
            rulesAndRegulations: rulesAndRegulationsData,
            type: data.type || '',
            zipcode: data.zipcode || '',
            categoryNames: categoryNames
          };
          
          console.log("Transformed venue data:", transformedVenue);
          setVenue(transformedVenue);
        } else {
          setError("Venue not found");
          toast({
            title: "Error",
            description: "Venue not found",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        console.error('Error fetching venue data:', error);
        setError(error.message || 'Failed to fetch venue data');
        toast({
          title: "Error",
          description: error.message || 'Failed to fetch venue data',
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVenueData();
  }, [id, toast]);

  return { venue, isLoading, error };
};
