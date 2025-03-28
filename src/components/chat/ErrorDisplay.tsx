
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, X } from 'lucide-react';

type ErrorDisplayProps = {
  message: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  showBackButton?: boolean;
};

const ErrorDisplay = ({ 
  message, 
  onClose, 
  showCloseButton = false,
  showBackButton = true 
}: ErrorDisplayProps) => {
  const navigate = useNavigate();
  
  return (
    <Card className="glass-card border-white/10 h-[600px] flex items-center justify-center">
      <CardContent className="text-center relative">
        {showCloseButton && onClose && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-0 right-0 p-0 h-8 w-8" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {message || 'There was an error loading this conversation. The contact may not exist.'}
          </AlertDescription>
        </Alert>
        {showBackButton && (
          <Button onClick={() => navigate('/messages')} className="bg-findvenue hover:bg-findvenue-dark">
            Back to Messages
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorDisplay;
