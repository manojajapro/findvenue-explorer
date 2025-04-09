
import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CategoryCard from '@/components/ui/CategoryCard';
import { supabase } from '@/integrations/supabase/client';

const CategoriesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [featuredCategories, setFeaturedCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchTopCategories = async () => {
      try {
        setIsLoading(true);
        
        // Get all venues to extract unique categories
        const { data: venuesData, error: venuesError } = await supabase
          .from('venues')
          .select('category_id, category_name, gallery_images')
          .order('popular', { ascending: false })
          .limit(30); // Get more than needed to ensure we have enough unique categories
          
        if (venuesError) throw venuesError;
        
        if (venuesData) {
          // Process all categories from venues (each venue may have multiple categories)
          const allCategoriesMap = new Map();
          
          venuesData.forEach(venue => {
            // Check if category_id is an array
            if (Array.isArray(venue.category_id)) {
              // Process each category in the array
              venue.category_id.forEach((catId: string, index: number) => {
                if (!catId) return; // Skip empty category IDs
                
                const categoryName = Array.isArray(venue.category_name) && venue.category_name[index] 
                  ? venue.category_name[index] 
                  : 'Unnamed Category';
                
                // Only add if we don't have this category yet, or update if we get better data
                if (!allCategoriesMap.has(catId) || !allCategoriesMap.get(catId).gallery_images) {
                  allCategoriesMap.set(catId, {
                    id: catId,
                    name: categoryName,
                    gallery_images: venue.gallery_images || [],
                    venueCount: 1,
                    description: `Find perfect ${categoryName.toLowerCase()} for your events`
                  });
                } else {
                  // Increment venue count for this category
                  const existingCat = allCategoriesMap.get(catId);
                  existingCat.venueCount += 1;
                  
                  // Use gallery_images if the current category doesn't have any
                  if ((!existingCat.gallery_images || existingCat.gallery_images.length === 0) && 
                      venue.gallery_images && venue.gallery_images.length > 0) {
                    existingCat.gallery_images = venue.gallery_images;
                  }
                  
                  allCategoriesMap.set(catId, existingCat);
                }
              });
            } else if (venue.category_id) {
              // Handle non-array category_id
              const catId = venue.category_id;
              const categoryName = venue.category_name || 'Unnamed Category';
              
              if (!allCategoriesMap.has(catId)) {
                allCategoriesMap.set(catId, {
                  id: catId,
                  name: categoryName,
                  gallery_images: venue.gallery_images || [],
                  venueCount: 1,
                  description: `Find perfect ${categoryName.toLowerCase()} for your events`,
                  imageUrl: ''
                });
              } else {
                // Increment venue count for this category
                const existingCat = allCategoriesMap.get(catId);
                existingCat.venueCount += 1;
                
                // Use gallery_images if the current category doesn't have any
                if ((!existingCat.gallery_images || existingCat.gallery_images.length === 0) && 
                    venue.gallery_images && venue.gallery_images.length > 0) {
                  existingCat.gallery_images = venue.gallery_images;
                }
                
                allCategoriesMap.set(catId, existingCat);
              }
            }
          });
          
          const uniqueCategories = Array.from(allCategoriesMap.values());
          // Take the top 6 categories with the most venues
          const topCategories = uniqueCategories
            .sort((a, b) => b.venueCount - a.venueCount)
            .slice(0, 6);
            
          setFeaturedCategories(topCategories);
        }
      } catch (error) {
        console.error('Error fetching top categories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTopCategories();
  }, []);
  
  return (
    <section ref={sectionRef} className="section-padding bg-findvenue-surface/10 reveal">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Explore Venue Categories
            </h2>
            <p className="text-findvenue-text-muted max-w-2xl">
              Browse spaces by the type of event you're planning, from weddings to corporate gatherings
            </p>
          </div>
          <Link to="/categories" className="mt-4 md:mt-0">
            <Button variant="outline" className="border-findvenue text-findvenue hover:bg-findvenue/10">
              View All Categories
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {isLoading ? (
            // Show placeholders while loading
            [...Array(6)].map((_, index) => (
              <div key={index} className="h-64 bg-findvenue-surface/30 animate-pulse rounded-lg"></div>
            ))
          ) : (
            featuredCategories.map((category) => (
              <div key={category.id} className="h-full">
                <CategoryCard category={category} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
