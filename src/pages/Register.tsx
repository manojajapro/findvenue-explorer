
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, Lock, User, Building, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';

const Register = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userRole, setUserRole] = useState('customer');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
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
      const { error } = await supabase.auth.signUp({ 
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
      
      toast({
        title: 'Success',
        description: 'Registration successful! Please check your email to verify your account.',
      });
      
      navigate('/login');
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
                  />
                </div>
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
