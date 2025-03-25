
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import VenueDetails from "./pages/VenueDetails";
import Login from "./pages/Login";
import ListVenue from "./pages/ListVenue";
import VenueOwnerPromo from "./pages/VenueOwnerPromo";
import NotFound from "./pages/NotFound";
import Venues from "./pages/Venues";
import Categories from "./pages/Categories";
import Cities from "./pages/Cities";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ChatBot from "./components/chat/ChatBot";
import { VoiceAssistant } from "./components/ui";
import { AuthProvider } from "./hooks/useAuth";

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

const AppContent = () => {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/venue/:id" element={<VenueDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/list-venue" element={<ListVenue />} />
          <Route path="/venue-owner" element={<VenueOwnerPromo />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/cities" element={<Cities />} />
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
