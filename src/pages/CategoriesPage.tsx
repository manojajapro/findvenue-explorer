
import { useState } from 'react';
import { useCategories } from '@/hooks/useSupabaseData';
import CategoryCard from '@/components/ui/CategoryCard';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';

const CategoriesPage = () => {
  const { categories, loading } = useCategories();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter categories based on search term
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Venue Categories</h1>
          <p className="text-findvenue-text-muted max-w-2xl mx-auto">
            Explore our venues by category to find the perfect space for your event needs
          </p>
        </div>
        
        <div className="relative w-full md:w-1/3 mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-findvenue-text-muted h-4 w-4" />
          <Input
            placeholder="Search categories..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {filteredCategories.map((category) => (
              <div key={category.id} className="h-full">
                <CategoryCard category={{
                  id: category.id,
                  name: category.name,
                  description: category.description,
                  imageUrl: category.image_url,
                  venueCount: category.venue_count
                }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-medium mb-2">No categories found</h3>
            <p className="text-findvenue-text-muted">
              Try adjusting your search or check back later for more categories
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesPage;
