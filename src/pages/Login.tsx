
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Mail, Lock } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PhoneInput } from '@/components/ui/phone-input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Separator } from '@/components/ui/separator';

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  phone: z.string().optional()
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoading } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Get redirect path from query params if it exists
  const from = location.state?.from?.pathname || '/';
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      phone: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await signIn(values.email, values.password);
      
      // If phone is provided, update the user profile
      if (values.phone) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_profiles').update({
            phone: values.phone
          }).eq('id', user.id);
          
          toast({
            title: 'Phone number updated',
            description: 'Your phone number has been saved for WhatsApp integration',
          });
        }
      }
      
      toast({
        title: 'Success',
        description: 'You have successfully logged in!',
      });
      
      // Redirect to original path or dashboard
      navigate(from, { replace: true });
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to login. Please check your credentials.',
        variant: 'destructive'
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      
      if (error) {
        console.error("Google sign-in error:", error);
        toast({
          title: 'Error',
          description: `Google login failed. Please try again.`,
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

  // If user is already logged in, redirect to home
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    
    checkSession();
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Helmet>
          <title>Login | FindVenue</title>
        </Helmet>
        <div className="text-center mb-8">
          <h2 className="mt-6 text-3xl font-extrabold text-findvenue">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-findvenue-text-muted">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-findvenue hover:text-findvenue-light">
              Sign up
            </Link>
          </p>
        </div>
        
        <Card className="p-8 glass-card border-white/10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Email</FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                    <div className="text-right">
                      <Link 
                        to="/forgot-password" 
                        className="text-sm font-medium text-findvenue hover:text-findvenue-light"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Phone Number (optional)</FormLabel>
                    <FormControl>
                      <PhoneInput
                        placeholder="+1 (555) 123-4567"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <p className="text-xs text-findvenue-text-muted">
                      Add your phone number with country code for WhatsApp integration
                    </p>
                  </FormItem>
                )}
              />
              
              <div>
                <Button 
                  type="submit" 
                  className="w-full bg-findvenue hover:bg-findvenue-dark"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </div>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              
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
                {isGoogleLoading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
