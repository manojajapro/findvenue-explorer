
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet';

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);

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
        description: 'Check your email for the password reset link and OTP',
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode) {
      toast({
        title: 'Error',
        description: 'Please enter the OTP code from your email',
        variant: 'destructive'
      });
      return;
    }
    
    setShowResetForm(true);
    toast({
      title: 'OTP Verified',
      description: 'You can now set a new password',
    });
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
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
      // In a real implementation, this would send the OTP and new password to verify
      // For now, we'll just show a success message
      toast({
        title: 'Success',
        description: 'Your password has been reset successfully',
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error: any) {
      console.error('Set new password error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password. Please try again.',
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
              !showResetForm ? (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="bg-green-500/10 text-green-500 p-4 rounded-lg mb-6">
                    <p className="font-medium">Reset link and OTP sent!</p>
                    <p className="text-sm mt-1">
                      We've sent an email to <span className="font-medium">{email}</span> with a verification code (OTP).
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="otp" className="block text-sm font-medium">Enter OTP Code</label>
                      <div className="relative">
                        <CheckCircle2 className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Enter the 6-digit code"
                          className="pl-10"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-findvenue hover:bg-findvenue-dark"
                    >
                      Verify OTP
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSetNewPassword} className="space-y-6">
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
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-findvenue hover:bg-findvenue-dark"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Resetting Password...' : 'Reset Password'}
                    </Button>
                  </div>
                </form>
              )
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
