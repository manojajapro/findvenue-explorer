
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from './UserMenu';
import NavbarSearchButton from './NavbarSearchButton';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../language/LanguageSwitcher';

const NavbarActions = () => {
  const { user, isVenueOwner } = useAuth();
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center gap-4">
      {/* Language Switcher */}
      <LanguageSwitcher />
      
      {/* Search Button */}
      <NavbarSearchButton />
      
      {/* Auth Actions */}
      {user ? (
        <UserMenu />
      ) : (
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" className="text-findvenue-text hover:text-white">
              {t('auth.login')}
            </Button>
          </Link>
          <Link to="/register">
            <Button className="bg-findvenue hover:bg-findvenue-dark">
              {t('auth.register')}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default NavbarActions;
