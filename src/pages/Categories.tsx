
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import CategoryCard from '@/components/ui/CategoryCard';

const Categories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        
        // Get all venues to extract unique categories
        const { data: venuesData, error: venuesError } = await supabase
          .from('venues')
          .select('category_id, category_name, gallery_images')
          .order('category_name', { ascending: true });
          
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
                    venue_count: 1,
                    description: `Find perfect ${categoryName.toLowerCase()} for your events`
                  });
                } else {
                  // Increment venue count for this category
                  const existingCat = allCategoriesMap.get(catId);
                  existingCat.venue_count += 1;
                  
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
              
              if (!allCategoriesMap.has(catId) || !allCategoriesMap.get(catId).gallery_images) {
                allCategoriesMap.set(catId, {
                  id: catId,
                  name: categoryName,
                  gallery_images: venue.gallery_images || [],
                  venue_count: 1,
                  description: `Find perfect ${categoryName.toLowerCase()} for your events`
                });
              } else {
                // Increment venue count for this category
                const existingCat = allCategoriesMap.get(catId);
                existingCat.venue_count += 1;
                
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
          console.log("Unique categories:", uniqueCategories);
          
          setCategories(uniqueCategories);
          setFilteredCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Filter categories based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCategories(categories);
      return;
    }
    
    const filtered = categories.filter(category => 
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredCategories(filtered);
  }, [searchTerm, categories]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };
  
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Venue Categories</h1>
          <p className="text-findvenue-text-muted max-w-2xl mx-auto mb-8">
            Explore our venues by category to find the perfect space for your event needs
          </p>
          
          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
              <Input
                type="text"
                placeholder="Search categories..."
                className="pl-10 bg-findvenue-surface/50 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <CategorySkeleton key={index} />
            ))}
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {filteredCategories.map((category) => (
              <div key={category.id} className="h-full">
                <CategoryCard
                  category={{
                    id: category.id,
                    name: category.name,
                    description: category.description,
                    imageUrl: '',
                    venueCount: category.venue_count,
                    gallery_images: category.gallery_images
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-medium mb-2">No categories found</h3>
            <p className="text-findvenue-text-muted mb-6">
              Try adjusting your search term
            </p>
            <Button 
              variant="outline" 
              className="border-white/10"
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const CategorySkeleton = () => (
  <Card className="overflow-hidden h-full bg-findvenue-card-bg border-white/10">
    <Skeleton className="h-48 w-full" />
    <CardContent className="p-4">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className="h-10 w-full" />
    </CardContent>
  </Card>
);

export default Categories;
