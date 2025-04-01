
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, LogOut, User, Building } from 'lucide-react';

const UserMenu = () => {
  const { user, signOut, isVenueOwner } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = () => {
    if (!user) return '';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer h-8 w-8 border border-white/10">
          <AvatarImage src={user?.profileImage} alt={`${user?.firstName} ${user?.lastName}`} />
          <AvatarFallback className="bg-findvenue text-white">{getInitials()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-1 bg-findvenue-card-bg border-white/10">
        <DropdownMenuLabel>
          <div className="font-normal">
            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-findvenue-text-muted truncate">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem 
          className="cursor-pointer hover:bg-white/5" 
          onClick={() => navigate('/profile')}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        {isVenueOwner && (
          <DropdownMenuItem 
            className="cursor-pointer hover:bg-white/5" 
            onClick={() => navigate('/my-venues')}
          >
            <Building className="mr-2 h-4 w-4" />
            <span>My Venues</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem 
          className="cursor-pointer hover:bg-white/5" 
          onClick={() => navigate('/bookings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>My Bookings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem 
          className="cursor-pointer hover:bg-white/5 focus:bg-destructive/10" 
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
