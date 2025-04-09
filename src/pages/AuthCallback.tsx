
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { hash, searchParams } = new URL(window.location.href);
      
      // Process the OAuth callback
      if (hash || searchParams.has('code')) {
        try {
          await supabase.auth.getSession();
          // No need for refreshSession as the session will be updated via the auth state change listener
          navigate('/');
        } catch (error) {
          console.error('Error during authentication callback:', error);
          navigate('/login');
        }
      } else {
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authenticating...</h1>
        <p>Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
