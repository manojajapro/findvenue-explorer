
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X, ChevronDown, Building2, CalendarClock, Heart, LogOut, User, Settings } from 'lucide-react';

const Navbar = () => {
  const { user, profile, signOut, isVenueOwner } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Change navbar appearance on scroll
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close mobile menu when location changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };
  
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!profile) return 'U';
    return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`;
  };
  
  // Navigate on logo click based on user role
  const handleLogoClick = () => {
    if (user && isVenueOwner) {
      navigate('/my-venues');
    } else {
      navigate('/');
    }
  };
  
  return (
    <header 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled || location.pathname !== '/' 
          ? 'bg-findvenue-card-bg/50 backdrop-blur-md border-b border-white/10 py-2' 
          : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4">
        <nav className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={handleLogoClick}>
            <h1 className="text-lg md:text-xl font-bold text-white">FindVenue</h1>
            <span className="text-findvenue ml-1 font-normal text-lg md:text-xl">Plus</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Show navigation items only for customers, not for venue owners */}
            {(!user || !isVenueOwner) && (
              <>
                <Link to="/" className="text-white hover:text-findvenue transition-colors">Home</Link>
                <Link to="/venues" className="text-white hover:text-findvenue transition-colors">Venues</Link>
                <Link to="/categories" className="text-white hover:text-findvenue transition-colors">Categories</Link>
                <Link to="/cities" className="text-white hover:text-findvenue transition-colors">Cities</Link>
              </>
            )}
            
            {/* Show venue owner links only for venue owners */}
            {user && isVenueOwner && (
              <>
                <Link to="/my-venues" className="text-white hover:text-findvenue transition-colors">Dashboard</Link>
                <Link to="/customer-bookings" className="text-white hover:text-findvenue transition-colors">Customer Bookings</Link>
                <Link to="/list-venue" className="text-white hover:text-findvenue transition-colors">List Venue</Link>
              </>
            )}
          </div>
          
          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile?.profile_image || ''} alt={profile?.first_name || 'User'} />
                      <AvatarFallback className="bg-findvenue text-white">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-findvenue-card-bg border-white/10" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile?.first_name} {profile?.last_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  
                  {isVenueOwner ? (
                    // Venue owner menu items
                    <>
                      <DropdownMenuItem onClick={() => navigate('/my-venues')} className="cursor-pointer">
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>My Venues</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/customer-bookings')} className="cursor-pointer">
                        <CalendarClock className="mr-2 h-4 w-4" />
                        <span>Customer Bookings</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    // Customer menu items
                    <>
                      <DropdownMenuItem onClick={() => navigate('/bookings')} className="cursor-pointer">
                        <CalendarClock className="mr-2 h-4 w-4" />
                        <span>My Bookings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/favorites')} className="cursor-pointer">
                        <Heart className="mr-2 h-4 w-4" />
                        <span>Favorites</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-white hover:text-findvenue hover:bg-findvenue-surface/30">
                    Sign In
                  </Button>
                </Link>
                <Link to="/venue-owner">
                  <Button className="bg-findvenue hover:bg-findvenue-dark">Become a Venue Owner</Button>
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 p-0">
                  <span className="sr-only">Toggle menu</span>
                  {isOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-findvenue-card-bg border-white/10 pt-10">
                <div className="flex flex-col space-y-4">
                  {user ? (
                    <div className="flex items-center p-2 mb-4">
                      <Avatar className="h-9 w-9 mr-3">
                        <AvatarImage src={profile?.profile_image || ''} alt={profile?.first_name || 'User'} />
                        <AvatarFallback className="bg-findvenue text-white">{getUserInitials()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{profile?.first_name} {profile?.last_name}</span>
                        <span className="text-xs text-findvenue-text-muted">{isVenueOwner ? 'Venue Owner' : 'Customer'}</span>
                      </div>
                    </div>
                  ) : null}
                  
                  {/* Mobile navigation for non-venue-owners */}
                  {(!user || !isVenueOwner) && (
                    <>
                      <Link to="/" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors">Home</Link>
                      <Link to="/venues" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors">Venues</Link>
                      <Link to="/categories" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors">Categories</Link>
                      <Link to="/cities" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors">Cities</Link>
                    </>
                  )}
                  
                  {/* Mobile navigation for venue owners */}
                  {user && isVenueOwner && (
                    <>
                      <Link to="/my-venues" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors">Dashboard</Link>
                      <Link to="/customer-bookings" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors">Customer Bookings</Link>
                      <Link to="/list-venue" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors">List Venue</Link>
                    </>
                  )}
                  
                  {user ? (
                    // Logged in mobile options
                    <>
                      <div className="h-px bg-white/10 my-2"></div>
                      
                      {isVenueOwner ? (
                        // Venue owner links
                        <>
                          <Link to="/my-venues" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors flex items-center">
                            <Building2 className="mr-2 h-4 w-4" />
                            <span>My Venues</span>
                          </Link>
                          <Link to="/customer-bookings" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors flex items-center">
                            <CalendarClock className="mr-2 h-4 w-4" />
                            <span>Customer Bookings</span>
                          </Link>
                        </>
                      ) : (
                        // Customer links
                        <>
                          <Link to="/bookings" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors flex items-center">
                            <CalendarClock className="mr-2 h-4 w-4" />
                            <span>My Bookings</span>
                          </Link>
                          <Link to="/favorites" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors flex items-center">
                            <Heart className="mr-2 h-4 w-4" />
                            <span>Favorites</span>
                          </Link>
                        </>
                      )}
                      
                      <Link to="/profile" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                      <div className="h-px bg-white/10 my-2"></div>
                      <button 
                        onClick={handleSignOut} 
                        className="p-2 hover:bg-findvenue-surface rounded-md transition-colors text-left flex items-center"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </>
                  ) : (
                    // Logged out mobile options
                    <>
                      <div className="h-px bg-white/10 my-2"></div>
                      <Link to="/login" className="p-2 hover:bg-findvenue-surface rounded-md transition-colors">Sign In</Link>
                      <Link to="/venue-owner">
                        <Button className="w-full bg-findvenue hover:bg-findvenue-dark mt-2">Become a Venue Owner</Button>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
