import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type User = {
  id: string;
  email?: string;
  app_metadata: any;
  user_metadata: any;
  aud: string;
};

type Session = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  user: User;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isLoading: boolean;
  isVenueOwner: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkIsFavorite: (venueId: string) => boolean;
  toggleFavoriteVenue: (venueId: string) => Promise<boolean>;
  getUserFavorites: () => Promise<string[]>;
  updateProfile: (profileData: any) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVenueOwner, setIsVenueOwner] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session as any);
        setUser(session?.user as any ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as any);
      setUser(session?.user as any ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
      setIsVenueOwner(data?.user_role === 'venue-owner');
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const checkIsFavorite = (venueId: string) => {
    if (!profile || !profile.favorites) return false;
    return profile.favorites.includes(venueId);
  };

  const toggleFavoriteVenue = async (venueId: string) => {
    if (!user) throw new Error('User must be logged in to favorite venues');
    
    try {
      const currentFavorites = profile?.favorites || [];
      const isFavorite = currentFavorites.includes(venueId);
      
      let updatedFavorites;
      if (isFavorite) {
        updatedFavorites = currentFavorites.filter((id: string) => id !== venueId);
      } else {
        updatedFavorites = [...currentFavorites, venueId];
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ favorites: updatedFavorites })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setProfile(prev => ({
        ...prev,
        favorites: updatedFavorites
      }));
      
      return !isFavorite;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  };

  const getUserFavorites = async () => {
    if (!user) return [];
    
    if (profile && profile.favorites) {
      return profile.favorites;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('favorites')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      return data.favorites || [];
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  };

  const updateProfile = async (profileData: any) => {
    if (!user) throw new Error('User must be logged in to update profile');
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('id', user.id);
      
      if (error) throw error;
      
      setProfile(prev => ({
        ...prev,
        ...profileData
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('User must be logged in to change password');
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: currentPassword
      });
      
      if (signInError) throw new Error('Current password is incorrect');
      
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating password:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    profile,
    isLoading,
    isVenueOwner,
    signIn,
    signOut,
    checkIsFavorite,
    toggleFavoriteVenue,
    getUserFavorites,
    updateProfile,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
