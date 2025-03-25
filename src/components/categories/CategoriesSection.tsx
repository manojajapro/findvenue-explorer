
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categories } from '@/data/categories';
import CategoryCard from '@/components/ui/CategoryCard';

const CategoriesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
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
          <Link to="/?view=categories" className="mt-4 md:mt-0">
            <Button variant="outline" className="border-findvenue text-findvenue hover:bg-findvenue/10">
              View All Categories
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categories.slice(0, 6).map((category) => (
            <div key={category.id} className="h-full">
              <CategoryCard category={category} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
