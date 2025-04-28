
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
import Dashboard from "./pages/Dashboard";
import EditVenue from "./pages/EditVenue";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import AuthCallback from "./pages/AuthCallback";
import HomePageVenueChatbot from "@/components/chat/HomePageVenueChatbot";
import ManageVenueCalendar from "@/components/calendar/ManageVenueCalendar";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles = [] }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const { user, isLoading, profile } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
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

const HomeRoute = () => {
  const { user, isVenueOwner } = useAuth();
  
  if (user && isVenueOwner) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Index />;
};

const LoginRoute = () => {
  const { user, isVenueOwner } = useAuth();
  
  if (user) {
    const savedPath = localStorage.getItem('redirectAfterLogin');
    if (savedPath) {
      localStorage.removeItem('redirectAfterLogin');
      return <Navigate to={savedPath} replace />;
    }
    
    if (isVenueOwner) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }
  
  return <Login />;
};

const VenueDetailsRoute = () => {
  const { isVenueOwner } = useAuth();
  const { id } = useParams<{ id: string }>();
  
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
            
            <Route path="/venue/:id" element={<VenueDetailsRoute />} />
            <Route path="/venue/:id/calendar" element={<ProtectedRoute allowedRoles={['venue-owner']}><ManageVenueCalendar /></ProtectedRoute>} />
            
            {!isVenueOwner && (
              <>
                <Route path="/venues" element={<Venues />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/cities" element={<Cities />} />
                <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute allowedRoles={['customer']}><Favorites /></ProtectedRoute>} />
              </>
            )}
            
            <Route path="/list-venue" element={<ProtectedRoute allowedRoles={['venue-owner']}><ListVenue /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['venue-owner']}><Dashboard /></ProtectedRoute>} />
            <Route path="/my-venues" element={<ProtectedRoute allowedRoles={['venue-owner']}><MyVenues /></ProtectedRoute>} />
            <Route path="/edit-venue/:id" element={<ProtectedRoute allowedRoles={['venue-owner']}><EditVenue /></ProtectedRoute>} />
            <Route path="/customer-bookings" element={<ProtectedRoute allowedRoles={['venue-owner']}><CustomerBookings /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <ScrollToTop />
        <RevealOnScroll />
        {!isVenueOwner && <HomePageVenueChatbot />}
      </TooltipProvider>
    </div>
  );
}

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
