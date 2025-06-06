
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define the User type with the properties needed
type User = {
  id: string;
  email?: string;
  app_metadata: any;
  user_metadata: any;
  aud: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
};

// Define the Session type
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
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // First set up the auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change event:", event);
        const sessionUser = session?.user as any;
        setSession(session as any);
        
        if (sessionUser) {
          const enhancedUser = {
            ...sessionUser,
            firstName: profile?.first_name || '',
            lastName: profile?.last_name || '',
            profileImage: profile?.avatar_url || '',
          };
          setUser(enhancedUser);
          
          // Use setTimeout to avoid deadlock with Supabase client
          setTimeout(() => {
            fetchUserProfile(sessionUser.id);
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
          setIsVenueOwner(false);
          setAuthError(null);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      const sessionUser = session?.user as any;
      setSession(session as any);
      
      if (sessionUser) {
        const enhancedUser = {
          ...sessionUser,
          firstName: '',
          lastName: '',
          profileImage: '',
        };
        setUser(enhancedUser);
        fetchUserProfile(sessionUser.id);
      } else {
        setIsLoading(false);
        setUser(null);
        setProfile(null);
        setIsVenueOwner(false);
        
        if (error) {
          console.error("Session error:", error);
          setAuthError(error.message);
        }
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
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }

      if (data) {
        setProfile(data);
        
        if (!data.first_name && user?.user_metadata?.full_name) {
          const nameParts = user.user_metadata.full_name.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          await updateProfile({
            first_name: firstName,
            last_name: lastName,
            avatar_url: user.user_metadata.avatar_url || data.avatar_url
          });
        }
        
        setUser(prev => {
          if (!prev) return null;
          return {
            ...prev,
            firstName: data?.first_name || prev.user_metadata?.full_name?.split(' ')[0] || '',
            lastName: data?.last_name || prev.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            profileImage: data?.avatar_url || prev.user_metadata?.avatar_url || '',
          };
        });
        
        setIsVenueOwner(data?.user_role === 'venue-owner');
      } else {
        // No profile found, clear venue owner status
        setIsVenueOwner(false);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    setIsLoading(true);
    
    try {
      console.log("Attempting login with email:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Login error:", error);
        setAuthError(error.message);
        throw error;
      }
      
      console.log("Login success:", data);
      return data;
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // First clear local state to avoid UI issues
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsVenueOwner(false);
      setAuthError(null);
      
      // Clear local storage items used by Supabase Auth
      try {
        const localStorageKeys = Object.keys(localStorage);
        // Clean up any Supabase auth related items
        localStorageKeys.forEach(key => {
          if (key.includes('supabase.auth') || key.includes('-auth-token')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn("Could not clear local storage items:", e);
      }
      
      // Now call the signOut method
      await supabase.auth.signOut();
    } catch (error) {
      console.error("SignOut error:", error);
      throw error;
    }
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
        .maybeSingle();
      
      if (error) throw error;
      
      return data?.favorites || [];
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  };

  const updateProfile = async (profileData: any) => {
    if (!user) throw new Error('User must be logged in to update profile');
    
    try {
      // If the profile image is a base64 string, it's a new upload
      if (profileData.profile_image && profileData.profile_image.startsWith('data:image')) {
        // We'll save the base64 image directly
        // In a production app, you might want to upload to a storage bucket instead
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('id', user.id);
      
      if (error) throw error;
      
      setProfile(prev => ({
        ...prev,
        ...profileData
      }));
      
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          firstName: profileData.first_name || prev.firstName,
          lastName: profileData.last_name || prev.lastName,
          profileImage: profileData.profile_image || prev.profileImage,
        };
      });
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
