
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

const Categories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('category_groups')
          .select('*')
          .order('venue_count', { ascending: false });
          
        if (error) throw error;
        
        setCategories(data.map(category => ({
          id: category.category_id,
          name: category.category_name,
          image_url: category.image_url,
          venue_count: category.venue_count,
          description: `Find perfect ${category.category_name.toLowerCase()} for your events`
        })) || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Venue Categories</h1>
          <p className="text-findvenue-text-muted max-w-2xl mx-auto">
            Explore our venues by category to find the perfect space for your event needs
          </p>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <CategorySkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {categories.map((category) => (
              <Link 
                key={category.id}
                to={`/?categoryId=${category.id}`}
                className="block h-full"
              >
                <Card className="overflow-hidden h-full transition-transform hover:scale-[1.02] bg-findvenue-card-bg border-white/10">
                  <div className="relative h-48">
                    <img 
                      src={category.image_url || 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'} 
                      alt={category.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-semibold text-white">{category.name}</h3>
                      <p className="text-sm text-white/80">
                        {category.venue_count} venues available
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-findvenue-text-muted mb-4 line-clamp-2">
                      {category.description}
                    </p>
                    <Button variant="outline" className="w-full border-findvenue text-findvenue hover:bg-findvenue/10">
                      Browse Venues
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
