
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, Key, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet';

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isInvalidLink, setIsInvalidLink] = useState(false);

  useEffect(() => {
    // Check if this is a valid password recovery request
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#access_token=')) {
      setIsInvalidLink(true);
      toast({
        title: 'Invalid Link',
        description: 'This password reset link is invalid or has expired.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please enter and confirm your new password',
        variant: 'destructive'
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      });
      return;
    }
    
    if (password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        throw error;
      }
      
      setIsSuccess(true);
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully reset'
      });
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center">
      <Helmet>
        <title>Set New Password | FindVenue</title>
      </Helmet>
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card className="p-8 glass-card border-white/10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
              <p className="text-findvenue-text-muted">
                Create a new secure password for your account
              </p>
            </div>
            
            {isInvalidLink ? (
              <div className="text-center space-y-4">
                <div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
                  <p className="font-medium">Invalid Reset Link</p>
                  <p className="text-sm mt-1">
                    This password reset link is invalid or has expired.
                  </p>
                </div>
                
                <Button 
                  className="w-full bg-findvenue hover:bg-findvenue-dark"
                  onClick={() => navigate('/forgot-password')}
                >
                  Request New Reset Link
                </Button>
              </div>
            ) : isSuccess ? (
              <div className="text-center space-y-4">
                <div className="bg-green-500/10 text-green-500 p-6 rounded-lg mb-6 flex flex-col items-center">
                  <Check className="h-12 w-12 mb-4" />
                  <p className="font-medium text-lg">Password Updated!</p>
                  <p className="text-sm mt-1">
                    Your password has been successfully reset.
                  </p>
                </div>
                
                <p className="text-sm text-findvenue-text-muted">
                  You will be redirected to the login page shortly...
                </p>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium">New Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="pl-10 pr-10"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <button 
                        type="button"
                        className="absolute right-3 top-3 text-findvenue-text-muted hover:text-findvenue"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium">Confirm Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        className="pl-10"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-findvenue hover:bg-findvenue-dark"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating Password...' : 'Reset Password'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
