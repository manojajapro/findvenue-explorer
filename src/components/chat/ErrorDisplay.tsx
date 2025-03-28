
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

type ErrorDisplayProps = {
  message: string;
};

const ErrorDisplay = ({ message }: ErrorDisplayProps) => {
  const navigate = useNavigate();
  
  return (
    <Card className="glass-card border-white/10 h-[600px] flex items-center justify-center">
      <CardContent className="text-center">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {message || 'There was an error loading this conversation. The contact may not exist.'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/messages')} className="bg-findvenue hover:bg-findvenue-dark">
          Back to Messages
        </Button>
      </CardContent>
    </Card>
  );
};

export default ErrorDisplay;
