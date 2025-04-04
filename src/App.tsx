
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import Index from "./pages/Index";
import VenueDetails from "./pages/VenueDetails";
import Login from "./pages/Login";
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
import ChatBot from "./components/chat/ChatBot";
import { VoiceAssistant } from "./components/ui";
import { AuthProvider } from "./hooks/useAuth";

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles = [] }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const { user, isLoading, profile } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && profile) {
    if (!allowedRoles.includes(profile.user_role)) {
      return <Navigate to="/" replace />;
    }
  }
  
  return children;
};

// Home page route with role-based redirection
const HomeRoute = () => {
  const { user, isVenueOwner } = useAuth();
  
  if (user && isVenueOwner) {
    return <Navigate to="/my-venues?tab=dashboard" replace />;
  }
  
  return <Index />;
};

// Login route with role-based redirection
const LoginRoute = () => {
  const { user, isVenueOwner } = useAuth();
  
  if (user) {
    if (isVenueOwner) {
      return <Navigate to="/my-venues?tab=dashboard" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }
  
  return <Login />;
};

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

// For revealing animations on scroll
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

const queryClient = new QueryClient();

// Main App component as a function component to properly use hooks
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Navbar />
          <main className="min-h-screen">
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/venue/:id" element={<VenueDetails />} />
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/venues" element={<Venues />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/cities" element={<Cities />} />
              <Route path="/venue-owner" element={<VenueOwnerPromo />} />
              
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute allowedRoles={['customer']}><Favorites /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/messages/:contactId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              
              <Route path="/list-venue" element={<ProtectedRoute allowedRoles={['venue-owner']}><ListVenue /></ProtectedRoute>} />
              <Route path="/my-venues" element={<ProtectedRoute allowedRoles={['venue-owner']}><MyVenues /></ProtectedRoute>} />
              <Route path="/edit-venue/:id" element={<ProtectedRoute allowedRoles={['venue-owner']}><EditVenue /></ProtectedRoute>} />
              <Route path="/customer-bookings" element={<ProtectedRoute allowedRoles={['venue-owner']}><CustomerBookings /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <ChatBot />
          <VoiceAssistant />
          <ScrollToTop />
          <RevealOnScroll />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
