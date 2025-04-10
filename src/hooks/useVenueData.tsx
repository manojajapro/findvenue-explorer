
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
        
        // Get venue data
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
          
          // Process owner_info
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
          
          // Process opening_hours
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
          
          // Process rules_and_regulations
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
          
          // Process arrays that might be stored as strings 
          const processArrayField = (field: any): string[] => {
            if (!field) return [];
            
            if (Array.isArray(field)) {
              return field;
            }
            
            if (typeof field === 'string') {
              // Check if it's already in array format
              if (field.startsWith('[') && field.endsWith(']')) {
                try {
                  return JSON.parse(field);
                } catch (e) {
                  // Not valid JSON array
                }
              }
                
              // Try to parse as JSON array first
              try {
                const parsed = JSON.parse(field);
                if (Array.isArray(parsed)) {
                  return parsed;
                }
              } catch (e) {
                // Not valid JSON, try as comma-separated string
                return field.split(',').map(item => item.trim());
              }
            }
            
            return [];
          };
          
          // Special handling for category_name which could be a single string or an array
          const processCategoryName = (category: any): string => {
            if (!category) return '';
            
            if (Array.isArray(category)) {
              return category.length > 0 ? String(category[0]) : '';
            }
            
            if (typeof category === 'string') {
              // Check if this is a comma-separated string
              if (category.includes(',')) {
                const categories = category.split(',').map(c => c.trim());
                return categories[0] || '';
              }
              return category;
            }
            
            return String(category);
          };
          
          // Process gallery images - ensure we have an array of strings
          const galleryImages = processArrayField(data.gallery_images);
          // Use the first gallery image as default image
          const defaultImage = galleryImages.length > 0 ? galleryImages[0] : '';
          
          // Ensure capacity values are numbers
          const minCapacity = Number(data.min_capacity) || 0;
          const maxCapacity = Number(data.max_capacity) || 0;
          
          // Ensure pricing values are numbers
          const startingPrice = Number(data.starting_price) || 0;
          const pricePerPerson = data.price_per_person ? Number(data.price_per_person) : undefined;
          const hourlyRate = data.hourly_rate ? Number(data.hourly_rate) : undefined;
          
          const transformedVenue: Venue = {
            id: data.id,
            name: data.name,
            description: data.description || '',
            imageUrl: defaultImage,
            galleryImages: galleryImages,
            address: data.address || '',
            city: data.city_name || '',
            cityId: data.city_id || '',
            category: processCategoryName(data.category_name),
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
