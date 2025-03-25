
import { useRef } from 'react';
import AdviceCard from '@/components/ui/AdviceCard';

const adviceItems = [
  {
    title: 'Plan Ahead',
    description: 'Book your venue at least 6 months in advance for large events like weddings to ensure availability.',
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png'
  },
  {
    title: 'Check Capacity',
    description: 'Always confirm that the venue can comfortably accommodate your guest count with your desired layout.',
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/4661/4661321.png'
  },
  {
    title: 'Review Contracts',
    description: 'Read all terms and conditions carefully, paying attention to payment schedules and cancellation policies.',
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135731.png'
  }
];

const AdviceSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  return (
    <section ref={sectionRef} className="section-padding bg-findvenue-surface/10 reveal">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Expert advice to book the perfect venue
          </h2>
          <p className="text-findvenue-text-muted">
            Tips from venue specialists to help you make the right choice for your event
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {adviceItems.map((item, index) => (
            <div key={index} className="h-full">
              <AdviceCard {...item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdviceSection;
