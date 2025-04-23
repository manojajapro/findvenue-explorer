import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, LogIn, Menu, X, Heart, 
  Calendar, User, Building, PlusCircle, LogOut,
  Home, MessageCircle, Book, Bell
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { useUnreadChatsCount } from '@/hooks/useUnreadChatsCount';

const Navbar = () => {
  const { user, profile, isVenueOwner, signOut } = useAuth();
  const unreadChats = useUnreadChatsCount(user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === path;
    }
    if (path === '/my-venues') {
      return location.pathname.startsWith(path) || 
        location.pathname === '/list-venue' || 
        location.pathname.startsWith('/edit-venue');
    }
    if (path === '/customer-bookings') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleLogoClick = () => {
    if (user && isVenueOwner) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[1001] bg-findvenue-bg backdrop-blur-lg transition-all duration-300 ${isScrolled ? 'shadow-md border-b border-white/5 py-3' : 'py-5'}`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div
            className="text-xl md:text-2xl font-bold text-white cursor-pointer flex items-center"
            onClick={handleLogoClick}
          >
            <span className="bg-findvenue px-2 py-0 rounded text-white mr-0.5 ml-1"> A </span>vnu
          </div>
          <nav className="hidden md:flex items-center space-x-1">
            {!isVenueOwner && (
              <>
                <Link to="/">
                  <Button 
                    variant={isActive('/') ? 'secondary' : 'ghost'}
                    size="sm"
                    className={isActive('/') ? 'bg-findvenue-surface' : ''}
                  >
                    Home
                  </Button>
                </Link>
                
                <Link to="/venues">
                  <Button 
                    variant={isActive('/venues') ? 'secondary' : 'ghost'}
                    size="sm"
                    className={isActive('/venues') ? 'bg-findvenue-surface' : ''}
                  >
                    Venues
                  </Button>
                </Link>
                
                <Link to="/categories">
                  <Button 
                    variant={isActive('/categories') ? 'secondary' : 'ghost'}
                    size="sm"
                    className={isActive('/categories') ? 'bg-findvenue-surface' : ''}
                  >
                    Categories
                  </Button>
                </Link>
                
                <Link to="/cities">
                  <Button 
                    variant={isActive('/cities') ? 'secondary' : 'ghost'}
                    size="sm"
                    className={isActive('/cities') ? 'bg-findvenue-surface' : ''}
                  >
                    Cities
                  </Button>
                </Link>
              </>
            )}
            
            {isVenueOwner && (
              <>
                <Link to="/dashboard">
                  <Button 
                    variant={isActive('/dashboard') ? 'secondary' : 'ghost'}
                    size="sm"
                    className={isActive('/dashboard') ? 'bg-findvenue-surface' : ''}
                  >
                    Dashboard
                  </Button>
                </Link>
                
                <Link to="/my-venues?tab=venues">
                  <Button 
                    variant={isActive('/my-venues?tab=venues') ? 'secondary' : 'ghost'}
                    size="sm"
                    className={isActive('/my-venues?tab=venues') ? 'bg-findvenue-surface' : ''}
                  >
                    My Venues
                  </Button>
                </Link>
                
                <Link to="/list-venue">
                  <Button 
                    variant={isActive('/list-venue') ? 'secondary' : 'ghost'}
                    size="sm"
                    className={isActive('/list-venue') ? 'bg-findvenue-surface' : ''}
                  >
                    List Venue
                  </Button>
                </Link>
                
                <Link to="/customer-bookings">
                  <Button 
                    variant={isActive('/customer-bookings') ? 'secondary' : 'ghost'}
                    size="sm"
                    className={isActive('/customer-bookings') ? 'bg-findvenue-surface' : ''}
                  >
                    Bookings
                  </Button>
                </Link>
              </>
            )}
            
            {!user && (
              <Link to="/venue-owner">
                <Button 
                  variant={isActive('/venue-owner') ? 'secondary' : 'ghost'}
                  size="sm"
                  className={isActive('/venue-owner') ? 'bg-findvenue-surface' : ''}
                >
                  For Venue Owners
                </Button>
              </Link>
            )}
          </nav>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-1">
              <Search className="h-5 w-5" />
            </Button>
            {user && <NotificationCenter />}
            
            {user && (
              <Link to="/messages" className="relative">
                <Button
                  variant={isActive('/messages') ? 'secondary' : 'ghost'}
                  size="icon"
                  className={isActive('/messages') ? 'bg-findvenue-surface mr-1' : 'mr-1'}
                >
                  <MessageCircle className="h-5 w-5" />
                  {unreadChats > 0 && (
                    <span className="absolute -top-1.5 -right-1 bg-green-500 text-white text-xs rounded-full px-1.5 py-0 min-w-[22px] flex items-center justify-center font-bold border-2 border-findvenue-bg z-10">
                      {unreadChats > 99 ? '99+' : unreadChats}
                    </span>
                  )}
                </Button>
              </Link>
            )}
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8 border border-findvenue-surface">
                      <AvatarImage src={profile?.profile_image || ''} alt={profile?.first_name} />
                      <AvatarFallback className="bg-findvenue-surface text-sm">
                        {profile?.first_name?.charAt(0) || ''}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-56 z-[1002]" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile?.first_name} {profile?.last_name}</p>
                      <p className="text-xs leading-none text-findvenue-text-muted">{profile?.email}</p>
                      <p className="text-xs mt-1 bg-findvenue/20 py-0.5 px-1.5 rounded text-findvenue inline-block">
                        {profile?.user_role === 'venue-owner' ? 'Venue Owner' : 'Customer'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  
                  <DropdownMenuSeparator />
                  
                  {!isVenueOwner && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/favorites')}>
                        <Heart className="mr-2 h-4 w-4" />
                        <span>Favorites</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => navigate('/bookings')}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>My Bookings</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {isVenueOwner && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                        <Home className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => navigate('/my-venues?tab=venues')}>
                        <Building className="mr-2 h-4 w-4" />
                        <span>My Venues</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => navigate('/customer-bookings')}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Bookings</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => navigate('/list-venue')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>List New Venue</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuItem onClick={() => navigate('/messages')}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    <span>Messages</span>
                    {unreadChats > 0 && (
                      <span className="ml-auto bg-green-500 text-white text-xs rounded-full px-1 font-bold">
                        {unreadChats > 99 ? '99+' : unreadChats}
                      </span>
                    )}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => navigate('/login')}
                className="bg-findvenue hover:bg-findvenue-dark flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-2 md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pb-2 border-t border-findvenue-surface pt-3">
              <nav className="flex flex-col space-y-2">
                {!isVenueOwner && (
                  <>
                    <Link to="/">
                      <Button 
                        variant={isActive('/') ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`w-full justify-start ${isActive('/') ? 'bg-findvenue-surface' : ''}`}
                      >
                        <Home className="mr-2 h-4 w-4" />
                        Home
                      </Button>
                    </Link>
                    
                    <Link to="/venues">
                      <Button 
                        variant={isActive('/venues') ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`w-full justify-start ${isActive('/venues') ? 'bg-findvenue-surface' : ''}`}
                      >
                        <Building className="mr-2 h-4 w-4" />
                        Venues
                      </Button>
                    </Link>
                    
                    <Link to="/categories">
                      <Button 
                        variant={isActive('/categories') ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`w-full justify-start ${isActive('/categories') ? 'bg-findvenue-surface' : ''}`}
                      >
                        Categories
                      </Button>
                    </Link>
                    
                    <Link to="/cities">
                      <Button 
                        variant={isActive('/cities') ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`w-full justify-start ${isActive('/cities') ? 'bg-findvenue-surface' : ''}`}
                      >
                        Cities
                      </Button>
                    </Link>
                  </>
                )}
                
                {isVenueOwner && (
                  <>
                    <Link to="/dashboard">
                      <Button 
                        variant={isActive('/dashboard') ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`w-full justify-start ${isActive('/dashboard') ? 'bg-findvenue-surface' : ''}`}
                      >
                        <Home className="mr-2 h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                    
                    <Link to="/my-venues?tab=venues">
                      <Button 
                        variant={isActive('/my-venues?tab=venues') ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`w-full justify-start ${isActive('/my-venues?tab=venues') ? 'bg-findvenue-surface' : ''}`}
                      >
                        <Building className="mr-2 h-4 w-4" />
                        My Venues
                      </Button>
                    </Link>
                    
                    <Link to="/list-venue">
                      <Button 
                        variant={isActive('/list-venue') ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`w-full justify-start ${isActive('/list-venue') ? 'bg-findvenue-surface' : ''}`}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        List Venue
                      </Button>
                    </Link>
                    
                    <Link to="/customer-bookings">
                      <Button 
                        variant={isActive('/customer-bookings') ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`w-full justify-start ${isActive('/customer-bookings') ? 'bg-findvenue-surface' : ''}`}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Bookings
                      </Button>
                    </Link>
                  </>
                )}
                
                {user && (
                  <Link to="/messages">
                    <Button 
                      variant={isActive('/messages') ? 'secondary' : 'ghost'}
                      size="sm"
                      className={`w-full justify-start ${isActive('/messages') ? 'bg-findvenue-surface' : ''}`}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Messages
                      {unreadChats > 0 && (
                        <span className="absolute top-2 right-3 bg-green-500 text-white text-xs rounded-full px-1.5 font-bold">
                          {unreadChats > 99 ? '99+' : unreadChats}
                        </span>
                      )}
                    </Button>
                  </Link>
                )}
                
                {!user && (
                  <Link to="/venue-owner">
                    <Button 
                      variant={isActive('/venue-owner') ? 'secondary' : 'ghost'}
                      size="sm"
                      className={`w-full justify-start ${isActive('/venue-owner') ? 'bg-findvenue-surface' : ''}`}
                    >
                      For Venue Owners
                    </Button>
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
