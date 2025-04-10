
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Index from "./pages/Index";
import VenueDetails from "./pages/VenueDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ListVenue from "./pages/ListVenue";
import VenueOwnerPromo from "./pages/VenueOwnerPromo";
import NotFound from "./pages/NotFound";
import Venues from "./pages/Venues";
import Categories from "./pages/Categories";
import Cities from "./pages/Cities";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import CustomerBookings from "./pages/CustomerBookings";
import Favorites from "./pages/Favorites";
import Messages from "./pages/Messages";
import MyVenues from "./pages/MyVenues";
import EditVenue from "./pages/EditVenue";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient();

// Separating the ProtectedRoute into its own component outside of App
const ProtectedRoute = ({ children, allowedRoles = [] }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const { user, isLoading, profile } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    // Save the current URL to localStorage for post-login redirect
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && profile) {
    if (!allowedRoles.includes(profile.user_role)) {
      return <Navigate to="/" replace />;
    }
  }
  
  return children;
};

// Creating a separate HomeRoute component
const HomeRoute = () => {
  const { user, isVenueOwner } = useAuth();
  
  if (user && isVenueOwner) {
    return <Navigate to="/my-venues?tab=dashboard" replace />;
  }
  
  return <Index />;
};

// Creating a separate LoginRoute component
const LoginRoute = () => {
  const { user, isVenueOwner } = useAuth();
  
  if (user) {
    // Check if there's a saved redirect path from before login
    const savedPath = localStorage.getItem('redirectAfterLogin');
    if (savedPath) {
      localStorage.removeItem('redirectAfterLogin');
      return <Navigate to={savedPath} replace />;
    }
    
    // Default redirects if no saved path exists
    if (isVenueOwner) {
      return <Navigate to="/my-venues?tab=dashboard" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }
  
  return <Login />;
};

// Creating a separate VenueDetailsRoute component to handle venue owner vs customer views
const VenueDetailsRoute = () => {
  const { isVenueOwner } = useAuth();
  const { id } = useParams<{ id: string }>();
  
  // Venue owners should be redirected to the edit page for their venues,
  // but we need to check if they own this venue first
  // For now, let them see the regular view
  return <VenueDetails />;
};

function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

function RevealOnScroll() {
  useEffect(() => {
    function reveal() {
      const reveals = document.querySelectorAll('.reveal');
      
      for (let i = 0; i < reveals.length; i++) {
        const windowHeight = window.innerHeight;
        const elementTop = reveals[i].getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < windowHeight - elementVisible) {
          reveals[i].classList.add('active');
        }
      }
    }
    
    window.addEventListener('scroll', reveal);
    reveal(); // Initial check
    
    return () => window.removeEventListener('scroll', reveal);
  }, []);
  
  return null;
}

// Creating a separate AppContent component that uses useAuth
function AppContent() {
  const { isVenueOwner } = useAuth();
  
  return (
    <div className="app">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Navbar />
        <main className="min-h-screen">
          <Routes>
            {/* Common routes for all users */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/venue-owner" element={<VenueOwnerPromo />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messages/:contactId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            
            {/* Routes accessible to both users */}
            <Route path="/venue/:id" element={<VenueDetailsRoute />} />
            
            {/* Customer-only routes */}
            {!isVenueOwner && (
              <>
                <Route path="/venues" element={<Venues />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/cities" element={<Cities />} />
                <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute allowedRoles={['customer']}><Favorites /></ProtectedRoute>} />
              </>
            )}
            
            {/* Venue owner-only routes */}
            <Route path="/list-venue" element={<ProtectedRoute allowedRoles={['venue-owner']}><ListVenue /></ProtectedRoute>} />
            <Route path="/my-venues" element={<ProtectedRoute allowedRoles={['venue-owner']}><MyVenues /></ProtectedRoute>} />
            <Route path="/edit-venue/:id" element={<ProtectedRoute allowedRoles={['venue-owner']}><EditVenue /></ProtectedRoute>} />
            <Route path="/customer-bookings" element={<ProtectedRoute allowedRoles={['venue-owner']}><CustomerBookings /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <ScrollToTop />
        <RevealOnScroll />
      </TooltipProvider>
    </div>
  );
}

// App component now provides the context and doesn't use useAuth itself
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
