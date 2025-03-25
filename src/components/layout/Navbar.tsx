
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  
  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Navbar items
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Venues', path: '/?view=all' },
    { name: 'Categories', path: '/?view=categories' },
    { name: 'Cities', path: '/?view=cities' },
  ];
  
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
        
        {/* Auth Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <Link to="/login">
            <Button variant="ghost" className="hover:bg-white/5">
              Log in
            </Button>
          </Link>
          <Link to="/list-venue">
            <Button className="bg-findvenue hover:bg-findvenue-dark">
              List Your Venue
            </Button>
          </Link>
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
                <Link to="/login" className="block">
                  <Button variant="outline" className="w-full border-findvenue text-findvenue">
                    Log in
                  </Button>
                </Link>
                <Link to="/list-venue" className="block">
                  <Button className="w-full bg-findvenue hover:bg-findvenue-dark">
                    List Your Venue
                  </Button>
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Navbar;
