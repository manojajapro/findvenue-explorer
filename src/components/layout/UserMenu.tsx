
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
import { Settings, LogOut, User, Building, Calendar, Home } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

const UserMenu = () => {
  const { user, signOut, isVenueOwner } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleNavigate = (path: string) => {
    navigate(path, { replace: false });
  };

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSigningOut) return; // Prevent multiple clicks
    
    setIsSigningOut(true);
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: "There was a problem signing you out. Please try again.",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const getInitials = () => {
    if (!user) return '';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const defaultAvatar = "/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer h-8 w-8 border border-white/10">
          <AvatarImage src={user?.profileImage || defaultAvatar} alt={`${user?.firstName} ${user?.lastName}`} />
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
          onClick={() => handleNavigate('/profile')}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        {isVenueOwner && (
          <>
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-white/5" 
              onClick={() => handleNavigate('/dashboard')}
            >
              <Home className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-white/5" 
              onClick={() => handleNavigate('/my-venues')}
            >
              <Building className="mr-2 h-4 w-4" />
              <span>My Venues</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-white/5" 
              onClick={() => handleNavigate('/customer-bookings')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span>Bookings</span>
            </DropdownMenuItem>
          </>
        )}
        {!isVenueOwner && (
          <DropdownMenuItem 
            className="cursor-pointer hover:bg-white/5" 
            onClick={() => handleNavigate('/bookings')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span>My Bookings</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem 
          className="cursor-pointer hover:bg-white/5 focus:bg-destructive/10" 
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
