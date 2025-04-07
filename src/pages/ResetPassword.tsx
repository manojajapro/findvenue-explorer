
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet';

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    
    if (!accessToken) {
      setIsError(true);
      setIsVerifying(false);
      toast({
        title: 'Error',
        description: 'Invalid or expired reset link. Please request a new password reset.',
        variant: 'destructive'
      });
      return;
    }
    
    // Verify the access token is valid
    const verifyToken = async () => {
      try {
        const { error } = await supabase.auth.getUser(accessToken);
        
        if (error) {
          throw error;
        }
        
        setIsVerifying(false);
      } catch (error: any) {
        console.error('Token verification error:', error);
        setIsError(true);
        setIsVerifying(false);
        toast({
          title: 'Error',
          description: 'Invalid or expired reset link. Please request a new password reset.',
          variant: 'destructive'
        });
      }
    };
    
    verifyToken();
  }, [toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please enter and confirm your new password',
        variant: 'destructive'
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Success',
        description: 'Your password has been reset successfully',
      });
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-findvenue mx-auto mb-4"></div>
          <p className="text-findvenue-text-muted">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card className="p-8 glass-card border-white/10">
              <div className="text-center mb-6">
                <div className="bg-red-500/10 text-red-500 h-16 w-16 flex items-center justify-center rounded-full mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-8 w-8">
                    <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
                  </svg>
                </div>
                <h1 className="text-2xl font-bold mb-2">Invalid Reset Link</h1>
                <p className="text-findvenue-text-muted">Your password reset link is invalid or has expired.</p>
              </div>
              
              <Button 
                onClick={() => navigate('/forgot-password')}
                className="w-full bg-findvenue hover:bg-findvenue-dark"
              >
                Request New Reset Link
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center">
      <Helmet>
        <title>Reset Password | FindVenue</title>
      </Helmet>
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card className="p-8 glass-card border-white/10">
            <div className="text-center mb-8">
              <div className="bg-green-500/10 text-green-500 h-16 w-16 flex items-center justify-center rounded-full mx-auto mb-4">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Create New Password</h1>
              <p className="text-findvenue-text-muted">
                Enter a new secure password for your account
              </p>
            </div>
            
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="new-password" className="block text-sm font-medium">New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="block text-sm font-medium">Confirm Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-findvenue hover:bg-findvenue-dark"
                disabled={isLoading}
              >
                {isLoading ? 'Updating Password...' : 'Update Password'}
              </Button>
              
              <p className="text-sm text-center text-findvenue-text-muted">
                After updating your password, you will be redirected to the login page
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
