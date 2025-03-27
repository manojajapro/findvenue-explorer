import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  profile_image?: string;
  user_role: 'customer' | 'venue-owner';
  created_at?: string;
  favorites?: string[];
};

type Booking = {
  id: string;
  user_id: string;
  venue_id: string;
  venue_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  total_price: number;
  created_at: string;
  guests: number;
  special_requests?: string;
};

type AuthContextType = {
  session: any | null;
  user: any | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  isVenueOwner: boolean;
  updateProfile: (updates: Partial<Omit<UserProfile, 'id'>>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getUserBookings: () => Promise<Booking[]>;
  toggleFavoriteVenue: (venueId: string) => Promise<void>;
  checkIsFavorite: (venueId: string) => boolean;
  getUserFavorites: () => Promise<string[]>;
  getOwnerVenues: () => Promise<any[]>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVenueOwner, setIsVenueOwner] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          try {
            const { data: profileData, error } = await supabase
              .from('user_profiles' as any)
              .select('*')
              .eq('id', currentSession.user.id)
              .single();
              
            if (profileData) {
              console.log("Profile data loaded:", profileData);
              const userProfileData = profileData as unknown as UserProfile;
              setProfile(userProfileData);
              setIsVenueOwner(userProfileData.user_role === 'venue-owner');
            } else {
              console.error("Failed to fetch user profile:", error);
              setProfile(null);
              setIsVenueOwner(false);
            }
          } catch (error) {
            console.error("Error fetching profile:", error);
            setProfile(null);
            setIsVenueOwner(false);
          }
        } else {
          setProfile(null);
          setIsVenueOwner(false);
        }
        
        setIsLoading(false);
      }
    );

    const getInitialSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Checking for existing session:", currentSession?.user?.id);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          try {
            const { data: profileData, error } = await supabase
              .from('user_profiles' as any)
              .select('*')
              .eq('id', currentSession.user.id)
              .single();
              
            if (profileData) {
              console.log("Initial profile data loaded:", profileData);
              const userProfileData = profileData as unknown as UserProfile;
              setProfile(userProfileData);
              setIsVenueOwner(userProfileData.user_role === 'venue-owner');
            } else {
              console.error("Failed to fetch initial user profile:", error);
              setProfile(null);
              setIsVenueOwner(false);
            }
          } catch (error) {
            console.error("Error in initial profile fetch:", error);
          }
        }
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign in:", email);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      
    } catch (error: any) {
      console.error("Sign in error:", error.message);
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      console.log("Attempting to sign up:", email, userData);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            user_role: userData.userRole,
          },
        },
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
      
    } catch (error: any) {
      console.error("Sign up error:", error.message);
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log("Signing out");
      await supabase.auth.signOut();
      
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
      
    } catch (error: any) {
      console.error("Sign out error:", error.message);
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'id'>>) => {
    try {
      if (!user) throw new Error("No user logged in");
      
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);
        
      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error.message);
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error: any) {
      console.error("Error changing password:", error.message);
      toast({
        title: "Error changing password",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!user || !user.email) throw new Error("No user logged in");
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      
      if (signInError) throw new Error("Current password is incorrect");
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error: any) {
      console.error("Error updating password:", error.message);
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const getUserBookings = async () => {
    try {
      if (!user) throw new Error("No user logged in");
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false });
        
      if (error) throw error;
      
      return data as Booking[];
    } catch (error: any) {
      console.error("Error fetching bookings:", error.message);
      toast({
        title: "Error fetching bookings",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  const toggleFavoriteVenue = async (venueId: string) => {
    try {
      if (!user) throw new Error("No user logged in");
      
      const currentFavorites = profile?.favorites || [];
      
      let updatedFavorites;
      if (currentFavorites.includes(venueId)) {
        updatedFavorites = currentFavorites.filter(id => id !== venueId);
      } else {
        updatedFavorites = [...currentFavorites, venueId];
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ favorites: updatedFavorites })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, favorites: updatedFavorites } : null);
      
      toast({
        title: currentFavorites.includes(venueId) ? "Removed from favorites" : "Added to favorites",
        description: currentFavorites.includes(venueId) 
          ? "Venue removed from your favorites." 
          : "Venue added to your favorites.",
      });
    } catch (error: any) {
      console.error("Error toggling favorite:", error.message);
      toast({
        title: "Error updating favorites",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const checkIsFavorite = (venueId: string) => {
    if (!profile?.favorites) return false;
    return profile.favorites.includes(venueId);
  };

  const getUserFavorites = async () => {
    try {
      if (!user) throw new Error("No user logged in");
      
      if (profile?.favorites) {
        return profile.favorites;
      }
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('favorites')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      const favorites = data.favorites || [];
      
      setProfile(prev => prev ? { ...prev, favorites } : null);
      
      return favorites;
    } catch (error: any) {
      console.error("Error fetching favorites:", error.message);
      return [];
    }
  };

  const getOwnerVenues = async () => {
    try {
      if (!user) throw new Error("No user logged in");
      if (!isVenueOwner) throw new Error("User is not a venue owner");
      
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .filter('owner_info->user_id', 'eq', user.id);
        
      if (error) throw error;
      
      return data;
    } catch (error: any) {
      console.error("Error fetching owner venues:", error.message);
      toast({
        title: "Error fetching venues",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  const value = {
    session,
    user,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    isVenueOwner,
    updateProfile,
    changePassword,
    updatePassword,
    getUserBookings,
    toggleFavoriteVenue,
    checkIsFavorite,
    getUserFavorites,
    getOwnerVenues,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
