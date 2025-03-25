
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { City } from '@/data/cities';
import { Card } from '@/components/ui/card';

interface CityCardProps {
  city: City;
}

const CityCard = ({ city }: CityCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/venues?cityId=${city.id}`);
  };

  return (
    <div className="block h-full cursor-pointer" onClick={handleClick}>
      <Card className="relative overflow-hidden h-full hover-scale glass-card border-white/10">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
        {!isLoaded && (
          <div className="absolute inset-0 bg-findvenue-surface animate-pulse" />
        )}
        <img 
          src={city.imageUrl} 
          alt={city.name}
          className={`w-full h-full object-cover aspect-[3/4] transition-all duration-700 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          onLoad={() => setIsLoaded(true)}
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10 text-white">
          <h3 className="font-bold text-xl drop-shadow-md">{city.name}</h3>
          <p className="text-sm text-white/80">{city.venueCount} venues</p>
        </div>
      </Card>
    </div>
  );
};

export default CityCard;
