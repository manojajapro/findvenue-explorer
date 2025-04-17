
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import UserMenu from './UserMenu';
import NavbarSearchButton from './NavbarSearchButton';
import LanguageToggle from '@/components/language/LanguageToggle';
import { Building } from 'lucide-react';

const NavbarActions = () => {
  const { user, isVenueOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname.startsWith(path);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <NavbarSearchButton />
        <LanguageToggle />
        
        <Button 
          variant="ghost" 
          className="text-findvenue-text"
          onClick={() => navigate('/login')}
        >
          Log in
        </Button>
        <Button 
          className="bg-findvenue hover:bg-findvenue-dark text-white"
          onClick={() => navigate('/login?signup=true')}
        >
          Sign up
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <NavbarSearchButton />
      <LanguageToggle />
      
      {isVenueOwner && (
        <>
          <Button 
            variant={isActive('/my-venues') ? 'secondary' : 'ghost'}
            size="sm"
            className={`hidden md:flex items-center gap-1.5 ${isActive('/my-venues') ? 'bg-findvenue-surface' : ''}`}
            onClick={() => navigate('/my-venues?tab=venues')}
          >
            <Building className="h-4 w-4" />
            My Venues
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="hidden sm:flex border-white/10 hover:bg-white/5"
            onClick={() => navigate('/list-venue')}
          >
            List a Venue
          </Button>
        </>
      )}
      
      <NotificationCenter />
      <UserMenu />
    </div>
  );
};

export default NavbarActions;
