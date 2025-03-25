import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Facebook, Mail, Lock, Eye, EyeOff, User, Building } from 'lucide-react';

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState('customer');
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please enter both email and password',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    setTimeout(() => {
      toast({
        title: 'Success',
        description: 'You have been logged in successfully'
      });
      setIsLoading(false);
      
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', userRole);
      
      if (userRole === 'venue-owner') {
        navigate('/list-venue');
      } else {
        navigate('/');
      }
    }, 1500);
  };
  
  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    setTimeout(() => {
      toast({
        title: 'Account Created',
        description: 'Your account has been created successfully'
      });
      setIsLoading(false);
      
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', userRole);
      
      if (userRole === 'venue-owner') {
        navigate('/list-venue');
      } else {
        navigate('/');
      }
    }, 1500);
  };
  
  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card className="p-8 glass-card border-white/10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Welcome to FindVenue</h1>
              <p className="text-findvenue-text-muted">
                Log in or create an account to get started
              </p>
            </div>
            
            <div className="mb-6">
              <Label className="mb-2 block">I am a:</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all ${
                    userRole === 'customer'
                      ? 'border-findvenue bg-findvenue/10'
                      : 'border-white/10 hover:bg-findvenue-surface/50'
                  }`}
                  onClick={() => setUserRole('customer')}
                >
                  <User className={`h-6 w-6 mb-2 ${userRole === 'customer' ? 'text-findvenue' : 'text-findvenue-text-muted'}`} />
                  <span className={userRole === 'customer' ? 'text-findvenue font-medium' : 'text-findvenue-text'}>Customer</span>
                </div>
                
                <div
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all ${
                    userRole === 'venue-owner'
                      ? 'border-findvenue bg-findvenue/10'
                      : 'border-white/10 hover:bg-findvenue-surface/50'
                  }`}
                  onClick={() => setUserRole('venue-owner')}
                >
                  <Building className={`h-6 w-6 mb-2 ${userRole === 'venue-owner' ? 'text-findvenue' : 'text-findvenue-text-muted'}`} />
                  <span className={userRole === 'venue-owner' ? 'text-findvenue font-medium' : 'text-findvenue-text'}>Venue Owner</span>
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid grid-cols-2 mb-6 bg-findvenue-surface/50">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="password">Password</Label>
                        <Link to="/forgot-password" className="text-xs text-findvenue hover:text-findvenue-light transition-colors">
                          Forgot Password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 text-findvenue-text-muted hover:text-findvenue-text"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-findvenue hover:bg-findvenue-dark"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Logging in...' : userRole === 'venue-owner' ? 'Log In as Venue Owner' : 'Log In'}
                    </Button>
                    
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10"></span>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-findvenue-card-bg px-2 text-findvenue-text-muted">Or continue with</span>
                      </div>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full border-white/10 hover:bg-findvenue-surface/50"
                    >
                      <Facebook className="mr-2 h-4 w-4" />
                      Continue with Facebook
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 text-findvenue-text-muted hover:text-findvenue-text"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-xs text-findvenue-text-muted">
                        By signing up, you agree to our <Link to="/terms" className="text-findvenue hover:text-findvenue-light">Terms of Service</Link> and <Link to="/privacy" className="text-findvenue hover:text-findvenue-light">Privacy Policy</Link>.
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-findvenue hover:bg-findvenue-dark"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Account...' : userRole === 'venue-owner' ? 'Create Venue Owner Account' : 'Create Customer Account'}
                    </Button>
                    
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10"></span>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-findvenue-card-bg px-2 text-findvenue-text-muted">Or continue with</span>
                      </div>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full border-white/10 hover:bg-findvenue-surface/50"
                    >
                      <Facebook className="mr-2 h-4 w-4" />
                      Continue with Facebook
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
