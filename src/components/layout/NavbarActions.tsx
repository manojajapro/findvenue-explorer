
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import UserMenu from './UserMenu';
import NavbarSearchButton from './NavbarSearchButton';
import LanguageSwitcher from '@/components/language/LanguageSwitcher';

const NavbarActions = () => {
  const { user, isVenueOwner } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <NavbarSearchButton />
        <LanguageSwitcher />
        
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
      <LanguageSwitcher />
      
      {isVenueOwner && (
        <Button 
          variant="outline" 
          size="sm"
          className="hidden sm:flex border-white/10 hover:bg-white/5"
          onClick={() => navigate('/list-venue')}
        >
          List a Venue
        </Button>
      )}
      
      <NotificationCenter />
      <UserMenu />
    </div>
  );
};

export default NavbarActions;
