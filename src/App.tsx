import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import Index from "./pages/Index";
import VenueDetails from "./pages/VenueDetails";
import Login from "./pages/Login";
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
    // Show loading state if auth is still being determined
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  
  // If roles are specified, check if user has the required role
  if (allowedRoles.length > 0 && profile) {
    if (!allowedRoles.includes(profile.user_role)) {
      // Redirect to home if user doesn't have the required role
      return <Navigate to="/" replace />;
    }
  }
  
  return children;
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

// Separate AppContent as a React component
const AppContent = () => {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/venue/:id" element={<VenueDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/cities" element={<Cities />} />
          <Route path="/venue-owner" element={<VenueOwnerPromo />} />
          
          {/* Protected Routes */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute allowedRoles={['customer']}><Favorites /></ProtectedRoute>} />
          
          {/* Venue Owner Routes */}
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
    </>
  );
};

// Main App component as a function component to properly use hooks
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
