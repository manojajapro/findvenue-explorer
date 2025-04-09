
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Process the OAuth callback
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        toast({
          title: 'Authentication Error',
          description: error.message,
          variant: 'destructive'
        });
        navigate('/login');
        return;
      }
      
      if (data?.session) {
        toast({
          title: 'Success',
          description: 'Logged in successfully',
        });
        
        // Check if there's a venue to redirect to
        const redirectVenueId = localStorage.getItem('redirectVenueId');
        if (redirectVenueId) {
          localStorage.removeItem('redirectVenueId');
          navigate(`/venue/${redirectVenueId}`);
        } else {
          navigate('/');
        }
      } else {
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Processing login...</h2>
        <p className="text-gray-500">Please wait while we complete your authentication.</p>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-findvenue"></div>
        </div>
      </div>
    </div>
  );
}
