
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '@/data/categories';
import { Card } from '@/components/ui/card';

interface CategoryCardProps {
  category: Category;
}

const CategoryCard = ({ category }: CategoryCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  // Use the first gallery image if available, otherwise use a default value
  const imageUrl = category.galleryImages && category.galleryImages.length > 0 
    ? category.galleryImages[0] 
    : category.imageUrl;

  const handleClick = () => {
    navigate(`/venues?categoryId=${category.id}`);
  };

  return (
    <div className="block h-full cursor-pointer" onClick={handleClick}>
      <Card className="relative overflow-hidden h-full hover-scale glass-card border-white/10">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
        {!isLoaded && (
          <div className="absolute inset-0 bg-findvenue-surface animate-pulse" />
        )}
        <img 
          src={imageUrl} 
          alt={category.name}
          className={`w-full h-full object-cover aspect-square transition-all duration-700 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          onLoad={() => setIsLoaded(true)}
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10 text-white">
          <h3 className="font-bold text-xl drop-shadow-md">{category.name}</h3>
          <p className="text-sm text-white/80">{category.venueCount} spaces</p>
        </div>
      </Card>
    </div>
  );
};

export default CategoryCard;
