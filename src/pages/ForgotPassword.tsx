
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet';

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        throw error;
      }
      
      setIsSubmitted(true);
      toast({
        title: 'Email Sent',
        description: 'Check your email for the password reset link',
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center">
      <Helmet>
        <title>Reset Password | FindVenue</title>
      </Helmet>
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Link to="/login" className="inline-flex items-center mb-4 text-findvenue hover:text-findvenue-dark">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
          
          <Card className="p-8 glass-card border-white/10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
              <p className="text-findvenue-text-muted">
                Enter your email to receive a password reset link with OTP verification
              </p>
            </div>
            
            {isSubmitted ? (
              <div className="text-center space-y-4">
                <div className="bg-green-500/10 text-green-500 p-4 rounded-lg mb-6">
                  <p className="font-medium">Reset link sent!</p>
                  <p className="text-sm mt-1">
                    We've sent an email to <span className="font-medium">{email}</span> with a verification code.
                  </p>
                </div>
                
                <p className="text-sm text-findvenue-text-muted">
                  Please check your inbox and follow the instructions in the email.
                  The link will expire in 24 hours.
                </p>
                
                <div className="text-center mt-6">
                  <Link to="/login" className="text-findvenue hover:text-findvenue-light transition-colors">
                    Return to login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-findvenue hover:bg-findvenue-dark"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link with OTP'}
                  </Button>
                </div>
                
                <p className="text-sm mt-4 text-center text-findvenue-text-muted">
                  You will receive an email with a one-time password (OTP) to verify your identity
                </p>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
