
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          try {
            // Use a type assertion to specify the expected return type
            const { data: profileData, error } = await supabase
              .rpc('get_user_profile', { user_id: currentSession.user.id }) as { 
                data: UserProfile | null;
                error: any;
              };
              
            if (profileData) {
              console.log("Profile data loaded:", profileData);
              setProfile(profileData as UserProfile);
              setIsVenueOwner(profileData.user_role === 'venue-owner');
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

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Checking for existing session:", currentSession?.user?.id);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        // Use a type assertion to specify the expected return type
        supabase
          .rpc('get_user_profile', { user_id: currentSession.user.id }) as unknown as {
            data: UserProfile | null;
            error: any;
            then: (onfulfilled?: ((value: { data: UserProfile | null; error: any; }) => any)) => any;
          }
          .then(({ data: profileData, error }) => {
            if (profileData) {
              console.log("Initial profile data loaded:", profileData);
              setProfile(profileData as UserProfile);
              setIsVenueOwner(profileData.user_role === 'venue-owner');
            } else {
              console.error("Failed to fetch initial user profile:", error);
              setProfile(null);
              setIsVenueOwner(false);
            }
            
            setIsLoading(false);
          })
          .catch((error) => {
            console.error("Error in initial profile fetch:", error);
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    });

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

  const value = {
    session,
    user,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    isVenueOwner,
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
