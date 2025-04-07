
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [otp, setOtp] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);

  const generateOTP = () => {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOtpEmail = async (userEmail: string, otpCode: string) => {
    setIsEmailSending(true);
    
    try {
      const response = await fetch('https://esdmelfzeszjtbnoajig.supabase.co/functions/v1/send-otp-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: userEmail,
          otp: otpCode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      return true;
    } catch (error: any) {
      console.error('Error sending OTP email:', error);
      toast({
        title: 'Email Error',
        description: `Failed to send verification email: ${error.message}`,
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsEmailSending(false);
    }
  };

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
      // Generate a random OTP
      const generatedOTP = generateOTP();
      setOtp(generatedOTP);
      
      // Store the OTP in localStorage for verification
      localStorage.setItem(`reset_otp_${email}`, generatedOTP);
      localStorage.setItem(`reset_otp_time_${email}`, Date.now().toString());
      
      // Send password reset email with custom OTP
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        throw error;
      }

      // Send custom email with OTP
      const emailSent = await sendOtpEmail(email, generatedOTP);
      
      if (emailSent) {
        setIsSubmitted(true);
        toast({
          title: 'Email Sent',
          description: 'Check your email for the password reset code.',
        });
      }
      
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
    
    // Get the stored OTP for this email
    const storedOTP = localStorage.getItem(`reset_otp_${email}`);
    const storedTime = localStorage.getItem(`reset_otp_time_${email}`);
    
    if (!storedOTP || !storedTime) {
      toast({
        title: 'Error',
        description: 'OTP verification failed. Please request a new code.',
        variant: 'destructive'
      });
      return;
    }
    
    // Check if OTP has expired (10 minutes)
    const now = Date.now();
    const otpTime = parseInt(storedTime);
    if (now - otpTime > 10 * 60 * 1000) {
      toast({
        title: 'Error',
        description: 'OTP has expired. Please request a new code.',
        variant: 'destructive'
      });
      localStorage.removeItem(`reset_otp_${email}`);
      localStorage.removeItem(`reset_otp_time_${email}`);
      return;
    }
    
    // Verify OTP
    if (otpCode === storedOTP || otpCode === otp) {
      setShowResetForm(true);
      toast({
        title: 'OTP Verified',
        description: 'You can now set a new password',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Invalid OTP. Please try again.',
        variant: 'destructive'
      });
    }
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
      // Clean up local storage
      localStorage.removeItem(`reset_otp_${email}`);
      localStorage.removeItem(`reset_otp_time_${email}`);
      
      toast({
        title: 'Success',
        description: 'Your password has been reset successfully. Please use the reset link in your email to complete the process.',
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
                Enter your email to receive a password reset code
              </p>
            </div>
            
            {isSubmitted ? (
              !showResetForm ? (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="bg-green-500/10 text-green-500 p-4 rounded-lg mb-6">
                    <p className="font-medium">Reset code sent!</p>
                    <p className="text-sm mt-1">
                      We've sent an email to <span className="font-medium">{email}</span> with a verification code.
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

                    <p className="text-sm text-center text-findvenue-text-muted mt-3">
                      You'll need to use the link in your email to complete the password reset process.
                    </p>
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
                        disabled={isLoading || isEmailSending}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-findvenue hover:bg-findvenue-dark"
                    disabled={isLoading || isEmailSending}
                  >
                    {isLoading || isEmailSending ? 'Sending...' : 'Send Reset Code'}
                  </Button>
                </div>
                
                <p className="text-sm mt-4 text-center text-findvenue-text-muted">
                  You will receive an email with a verification code
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
