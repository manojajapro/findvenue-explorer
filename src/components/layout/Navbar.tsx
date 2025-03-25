
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'customer' | 'venue-owner'>('customer');
  const [userName, setUserName] = useState('Sarah Ahmed');
  
  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simulating user authentication check
  useEffect(() => {
    // This would normally be a real auth check
    const checkLoginStatus = () => {
      // For demo purposes, we'll just assume the user is logged in
      // In a real app, this would check session/local storage or context
      setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
      setUserRole(localStorage.getItem('userRole') as 'customer' | 'venue-owner' || 'customer');
    };
    
    checkLoginStatus();
  }, []);
  
  // Navbar items
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Venues', path: '/?view=all' },
    { name: 'Categories', path: '/?view=categories' },
    { name: 'Cities', path: '/?view=cities' },
  ];
  
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    setIsLoggedIn(false);
    // In a real app, this would also redirect to home or login page
  };
  
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'py-3 backdrop-blur-lg bg-findvenue-dark-bg/80 shadow-md' : 'py-5 bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <span className="text-2xl font-bold gradient-text">FindVenue</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`text-sm font-medium transition-colors hover:text-findvenue relative ${
                location.pathname === item.path ? 'text-findvenue after:content-[""] after:absolute after:w-full after:h-0.5 after:bg-findvenue after:bottom-[-6px] after:left-0' : 'text-findvenue-text'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        
        {/* Auth Buttons or User Profile */}
        <div className="hidden md:flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              {userRole === 'venue-owner' && (
                <Link to="/list-venue">
                  <Button className="bg-findvenue hover:bg-findvenue-dark">
                    List Your Venue
                  </Button>
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center space-x-3 cursor-pointer">
                    <Avatar className="h-9 w-9 border border-findvenue/20">
                      <AvatarImage src="/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png" alt={userName} />
                      <AvatarFallback className="bg-findvenue/10 text-findvenue">
                        {userName.split(' ').map(part => part[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{userName}</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-findvenue-card-bg border-white/10">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium text-findvenue-text">{userName}</p>
                    <p className="text-xs text-findvenue-text-muted">
                      {userRole === 'venue-owner' ? 'Venue Owner' : 'Customer'}
                    </p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="cursor-pointer hover:bg-findvenue/10">
                    <Link to="/profile" className="w-full">Profile</Link>
                  </DropdownMenuItem>
                  {userRole === 'venue-owner' && (
                    <DropdownMenuItem className="cursor-pointer hover:bg-findvenue/10">
                      <Link to="/my-venues" className="w-full">My Venues</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="cursor-pointer hover:bg-findvenue/10">
                    <Link to="/bookings" className="w-full">My Bookings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="cursor-pointer hover:bg-destructive/10 text-destructive" onClick={handleLogout}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" className="hover:bg-white/5">
                  Log in
                </Button>
              </Link>
              <Link to="/venue-owner">
                <Button className="bg-findvenue hover:bg-findvenue-dark">
                  List Your Venue
                </Button>
              </Link>
            </>
          )}
        </div>
        
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-findvenue-card-bg border-l border-white/10">
            <div className="flex flex-col h-full">
              {/* User Profile for Mobile */}
              {isLoggedIn && (
                <div className="flex items-center space-x-3 mb-6 p-2">
                  <Avatar className="h-10 w-10 border border-findvenue/20">
                    <AvatarImage src="/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png" alt={userName} />
                    <AvatarFallback className="bg-findvenue/10 text-findvenue">
                      {userName.split(' ').map(part => part[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-findvenue-text">{userName}</p>
                    <p className="text-xs text-findvenue-text-muted">
                      {userRole === 'venue-owner' ? 'Venue Owner' : 'Customer'}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="space-y-4 py-4">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`block px-2 py-2 text-lg ${
                      location.pathname === item.path ? 'text-findvenue font-medium' : 'text-findvenue-text'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              
              <div className="mt-auto space-y-4">
                {isLoggedIn ? (
                  <>
                    <Link to="/profile" className="block">
                      <Button variant="outline" className="w-full border-findvenue text-findvenue">
                        Profile
                      </Button>
                    </Link>
                    {userRole === 'venue-owner' && (
                      <Link to="/list-venue" className="block">
                        <Button className="w-full bg-findvenue hover:bg-findvenue-dark">
                          List Your Venue
                        </Button>
                      </Link>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full border-white/10 text-destructive hover:bg-destructive/10"
                      onClick={handleLogout}
                    >
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block">
                      <Button variant="outline" className="w-full border-findvenue text-findvenue">
                        Log in
                      </Button>
                    </Link>
                    <Link to="/venue-owner" className="block">
                      <Button className="w-full bg-findvenue hover:bg-findvenue-dark">
                        List Your Venue
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Navbar;
