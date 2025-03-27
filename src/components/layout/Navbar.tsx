import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, Heart, Calendar, Settings, MapPin, Book } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/useAuth';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isVenueOwner } = useAuth();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Venues', path: '/venues' },
    { name: 'Categories', path: '/categories' },
    { name: 'Cities', path: '/cities' },
  ];
  
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  
  const dropdownMenuContent = (
    <>
      <div className="px-2 py-1.5">
        <p className="text-sm font-medium text-findvenue-text">{profile?.first_name} {profile?.last_name}</p>
        <p className="text-xs text-findvenue-text-muted">
          {isVenueOwner ? 'Venue Owner' : 'Customer'}
        </p>
      </div>
      <DropdownMenuSeparator className="bg-white/10" />
      <DropdownMenuItem className="cursor-pointer hover:bg-findvenue/10">
        <Link to="/profile" className="w-full flex items-center">
          <Settings className="mr-2 h-4 w-4" />
          Profile Settings
        </Link>
      </DropdownMenuItem>
      
      {!isVenueOwner && (
        <>
          <DropdownMenuItem className="cursor-pointer hover:bg-findvenue/10">
            <Link to="/bookings" className="w-full flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              My Bookings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer hover:bg-findvenue/10">
            <Link to="/favorites" className="w-full flex items-center">
              <Heart className="mr-2 h-4 w-4" />
              My Favorites
            </Link>
          </DropdownMenuItem>
        </>
      )}
      
      {isVenueOwner && (
        <>
          <DropdownMenuItem className="cursor-pointer hover:bg-findvenue/10">
            <Link to="/customer-bookings" className="w-full flex items-center">
              <Book className="mr-2 h-4 w-4" />
              Customer Bookings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer hover:bg-findvenue/10">
            <Link to="/my-venues" className="w-full flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              My Venues
            </Link>
          </DropdownMenuItem>
        </>
      )}
      
      <DropdownMenuSeparator className="bg-white/10" />
      <DropdownMenuItem className="cursor-pointer hover:bg-destructive/10 text-destructive" onClick={handleLogout}>
        Log out
      </DropdownMenuItem>
    </>
  );
  
  const mobileMenu = (
    <>
      {user && (
        <div className="flex items-center space-x-3 mb-6 p-2">
          <Avatar className="h-10 w-10 border border-findvenue/20">
            <AvatarImage src={profile?.profile_image || "/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png"} alt={profile?.first_name} />
            <AvatarFallback className="bg-findvenue/10 text-findvenue">
              {profile?.first_name?.charAt(0) || ''}{profile?.last_name?.charAt(0) || ''}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-findvenue-text">{profile?.first_name} {profile?.last_name}</p>
            <p className="text-xs text-findvenue-text-muted">
              {isVenueOwner ? 'Venue Owner' : 'Customer'}
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
        {user ? (
          <>
            <Link to="/profile" className="block">
              <Button variant="outline" className="w-full border-findvenue text-findvenue flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Profile Settings
              </Button>
            </Link>
            
            {!isVenueOwner ? (
              <>
                <Link to="/bookings" className="block">
                  <Button variant="outline" className="w-full border-findvenue text-findvenue flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    My Bookings
                  </Button>
                </Link>
                <Link to="/favorites" className="block">
                  <Button variant="outline" className="w-full border-findvenue text-findvenue flex items-center">
                    <Heart className="mr-2 h-4 w-4" />
                    My Favorites
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/customer-bookings" className="block">
                  <Button variant="outline" className="w-full border-findvenue text-findvenue flex items-center">
                    <Book className="mr-2 h-4 w-4" />
                    Customer Bookings
                  </Button>
                </Link>
                <Link to="/my-venues" className="block">
                  <Button variant="outline" className="w-full border-findvenue text-findvenue flex items-center">
                    <MapPin className="mr-2 h-4 w-4" />
                    My Venues
                  </Button>
                </Link>
              </>
            )}
            
            {isVenueOwner && (
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
    </>
  );
  
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'py-3 backdrop-blur-lg bg-findvenue-dark-bg/80 shadow-md' : 'py-5 bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <span className="text-2xl font-bold gradient-text">FindVenue</span>
        </Link>
        
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
        
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <>
              {isVenueOwner && (
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
                      <AvatarImage src={profile?.profile_image || "/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png"} alt={profile?.first_name} />
                      <AvatarFallback className="bg-findvenue/10 text-findvenue">
                        {profile?.first_name?.charAt(0) || ''}{profile?.last_name?.charAt(0) || ''}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{profile?.first_name} {profile?.last_name}</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-findvenue-card-bg border-white/10">
                  {dropdownMenuContent}
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
        
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-findvenue-card-bg border-l border-white/10">
            <div className="flex flex-col h-full">
              {mobileMenu}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Navbar;
