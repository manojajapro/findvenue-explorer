
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Extend the Category interface to include singleCategory
interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  venueCount: number;
  gallery_images?: string[];
  singleCategory?: string; // Add this property
}

interface CategoryCardProps {
  category: Category;
}

const CategoryCard = ({ category }: CategoryCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  // Prioritize gallery_images if available, otherwise fallback to imageUrl
  const imageUrl = category.gallery_images && category.gallery_images.length > 0 
    ? category.gallery_images[0] 
    : category.imageUrl || '';

  const handleClick = () => {
    navigate(`/venues?categoryId=${category.id}`);
  };

  // Parse category name if it's in array format
  const getCategoryName = () => {
    if (!category.name) return 'Unnamed Category';
    
    // Handle string representation of array
    if (typeof category.name === 'string' && category.name.startsWith('[')) {
      try {
        // Try to parse the string as JSON after replacing single quotes with double quotes
        const parsedCategories = JSON.parse(category.name.replace(/'/g, '"'));
        return parsedCategories[0] || 'Unnamed Category';
      } catch (e) {
        // If parsing fails, use a substring approach
        const match = category.name.match(/'([^']+)'/);
        return match ? match[1] : 'Unnamed Category';
      }
    }
    
    return category.name;
  };

  const displayName = getCategoryName();

  return (
    <div className="block h-full cursor-pointer" onClick={handleClick}>
      <Card className="relative overflow-hidden h-full hover-scale glass-card border-white/10">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
        {!isLoaded && (
          <div className="absolute inset-0 bg-findvenue-surface animate-pulse" />
        )}
        <img 
          src={imageUrl} 
          alt={displayName}
          className={`w-full h-full object-cover aspect-square transition-all duration-700 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          onLoad={() => setIsLoaded(true)}
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10 text-white">
          <h3 className="font-bold text-xl drop-shadow-md">{displayName}</h3>
          <p className="text-sm text-white/80 mb-2">{category.venueCount} spaces</p>
          {category.singleCategory && (
            <Badge className="bg-findvenue/80 hover:bg-findvenue text-white border-none">
              {category.singleCategory}
            </Badge>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CategoryCard;
