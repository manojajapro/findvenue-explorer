
import { AlertCircle } from 'lucide-react';

type ErrorDisplayProps = {
  message: string;
};

const ErrorDisplay = ({ message }: ErrorDisplayProps) => {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="flex items-center text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{message}</span>
      </div>
    </div>
  );
};

export default ErrorDisplay;
