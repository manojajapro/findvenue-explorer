
import { useRef, useState } from 'react';
import { ArrowRight, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

// Define global cities type
interface GlobalCity {
  id: string;
  name: string;
  imageUrl: string;
  country: string;
}

const GlobalVenues = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // Global cities data
  const globalCities: GlobalCity[] = [
    { 
      id: 'london', 
      name: 'London',
      country: 'United Kingdom',
      imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=1470'
    },
    {
      id: 'newyork',
      name: 'New York',
      country: 'United States',
      imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=1470'
    },
    {
      id: 'paris',
      name: 'Paris',
      country: 'France',
      imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=1473'
    },
    {
      id: 'tokyo',
      name: 'Tokyo',
      country: 'Japan',
      imageUrl: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&q=80&w=1470'
    },
    {
      id: 'dubai',
      name: 'Dubai',
      country: 'UAE',
      imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1470'
    },
    {
      id: 'sydney',
      name: 'Sydney',
      country: 'Australia',
      imageUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&q=80&w=1470'
    }
  ];
  
  const handleCityClick = (cityName: string) => {
    toast.info(`${cityName} venues coming soon!`, {
      description: "We're expanding globally. Check back soon for international venues."
    });
  };
  
  return (
    <section ref={sectionRef} className="section-padding reveal">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Explore international venues
            </h2>
            <p className="text-findvenue-text-muted max-w-2xl">
              Discover extraordinary venues in major cities around the globe (coming soon)
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col justify-center items-center text-center p-8 bg-gradient-to-br from-findvenue/10 to-findvenue-dark/30 border-white/10 hover-scale">
            <Globe2 className="w-12 h-12 text-findvenue mb-4" />
            <h3 className="text-xl font-semibold mb-2">Global expansion coming soon</h3>
            <p className="text-findvenue-text-muted text-sm">
              We're expanding to bring you unique venue locations from around the world
            </p>
          </Card>
          
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalCities.map((city) => (
              <div 
                key={city.id} 
                onClick={() => handleCityClick(city.name)}
                className="relative overflow-hidden rounded-lg aspect-[4/3] group hover-scale cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                <img 
                  src={city.imageUrl} 
                  alt={city.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 z-10 text-white">
                  <h3 className="font-bold text-lg">{city.name}</h3>
                  <p className="text-xs text-white/80">{city.country}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobalVenues;
