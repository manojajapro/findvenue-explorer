
import { Card } from '@/components/ui/card';

interface AdviceCardProps {
  title: string;
  description: string;
  imageUrl: string;
}

const AdviceCard = ({ title, description, imageUrl }: AdviceCardProps) => {
  return (
    <Card className="overflow-hidden glass-card border-white/10 h-full hover-scale">
      <div className="p-6 flex flex-col h-full">
        <div className="w-16 h-16 mb-4 mx-auto">
          <img src={imageUrl} alt={title} className="w-full h-full object-contain" />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-center">{title}</h3>
        <p className="text-sm text-findvenue-text-muted text-center">{description}</p>
      </div>
    </Card>
  );
};

export default AdviceCard;
