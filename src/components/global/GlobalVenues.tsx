
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { globalCities } from '@/data/cities';
import { Card } from '@/components/ui/card';

const GlobalVenues = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  return (
    <section ref={sectionRef} className="section-padding reveal">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Explore spaces all over the world
            </h2>
            <p className="text-findvenue-text-muted max-w-2xl">
              Discover extraordinary venues in major cities around the globe
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col justify-center items-center text-center p-8 bg-gradient-to-br from-findvenue/10 to-findvenue-dark/30 border-white/10 hover-scale">
            <Globe2 className="w-12 h-12 text-findvenue mb-4" />
            <h3 className="text-xl font-semibold mb-2">Five continents, with 30+ countries</h3>
            <p className="text-findvenue-text-muted text-sm">
              Some of the most unique venue locations around the world
            </p>
          </Card>
          
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalCities.slice(0, 6).map((city) => (
              <Link 
                key={city.id} 
                to={`/?global-city=${city.id}`}
                className="relative overflow-hidden rounded-lg aspect-[4/3] group hover-scale"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                <img 
                  src={city.imageUrl} 
                  alt={city.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 z-10 text-white">
                  <h3 className="font-bold text-lg">{city.name}</h3>
                  <p className="text-xs text-white/80">{city.venueCount} venues</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobalVenues;
