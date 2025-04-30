
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, Lock, User, Building, ArrowLeft, Phone } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { PhoneInput } from '@/components/ui/phone-input';

const Register = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [userRole, setUserRole] = useState('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handlePhoneChange = (value: string) => {
    setPhone(value);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
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
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            user_role: userRole
          }
        }
      });
      
      if (error) throw error;

      if (data?.user) {
        // If the user was created successfully, update their profile to include phone number
        if (phone) {
          await supabase
            .from('user_profiles')
            .update({ phone })
            .eq('id', data.user.id);
        }

        toast({
          title: 'Success',
          description: 'Registration successful! Please check your email to verify your account.',
        });
      
        // If we have a pending venue ID to redirect to
        const redirectVenueId = localStorage.getItem('redirectVenueId');
        if (redirectVenueId) {
          localStorage.removeItem('redirectVenueId');
          navigate(`/venue/${redirectVenueId}`);
        } else {
          navigate('/login');
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to register. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: `${window.location.origin}/auth/callback`,
          // Set user_role metadata to 'customer'
          data: {
            user_role: 'customer'
          }
        }
      });
      
      if (error) {
        console.error("Google sign-in error:", error);
        toast({
          title: 'Error',
          description: `Google login failed: ${error.message}. Please ensure Google auth is enabled in Supabase dashboard.`,
          variant: 'destructive'
        });
        setIsGoogleLoading(false);
      }
      
    } catch (error: any) {
      console.error('Google login error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to login with Google. Please try again.',
        variant: 'destructive'
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Helmet>
          <title>Register | FindVenue</title>
        </Helmet>
        <div className="text-center mb-8">
          <h2 className="mt-6 text-3xl font-extrabold text-findvenue">
            Create your FindVenue account
          </h2>
          <p className="mt-2 text-sm text-findvenue-text-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-findvenue hover:text-findvenue-light">
              Sign in
            </Link>
          </p>
        </div>
        
        <Card className="p-8 glass-card border-white/10">
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="block text-sm font-medium">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      className="pl-10"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="block text-sm font-medium">Last Name</label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium">Phone Number (with country code)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                  <PhoneInput
                    id="phone"
                    className="pl-10"
                    placeholder="+1 (555) 123-4567"
                    onChange={handlePhoneChange}
                    value={phone}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-findvenue-text-muted">
                  Add your phone number with country code for WhatsApp integration
                </p>
              </div>
              
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
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirm-password" className="block text-sm font-medium">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="user-role" className="block text-sm font-medium">I want to...</label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={userRole === 'customer' ? 'default' : 'outline'}
                    className={`flex items-center justify-center ${userRole === 'customer' ? 'bg-findvenue' : ''}`}
                    onClick={() => setUserRole('customer')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Book Venues
                  </Button>
                  <Button
                    type="button"
                    variant={userRole === 'venue-owner' ? 'default' : 'outline'}
                    className={`flex items-center justify-center ${userRole === 'venue-owner' ? 'bg-findvenue' : ''}`}
                    onClick={() => setUserRole('venue-owner')}
                  >
                    <Building className="mr-2 h-4 w-4" />
                    List Venues
                  </Button>
                </div>
              </div>
            </div>
            
            <div>
              <Button 
                type="submit" 
                className="w-full bg-findvenue hover:bg-findvenue-dark"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
            
            {userRole === 'customer' && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
                  </div>
                </div>
                
                <div>
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full border-white/10 hover:bg-white/5 flex items-center justify-center gap-2"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {isGoogleLoading ? 'Signing up...' : 'Sign up with Google'}
                  </Button>
                  <p className="text-xs text-center mt-2 text-findvenue-text-muted">
                    Google registration is for customers only
                  </p>
                </div>
              </>
            )}
            
            <p className="text-xs text-center text-findvenue-text-muted">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Register;
