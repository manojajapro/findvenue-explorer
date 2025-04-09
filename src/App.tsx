
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import { LanguageProvider } from "./hooks/useLanguage";
import Venues from "./pages/Venues";
import VenueDetails from "./pages/VenueDetails";
import Categories from "./pages/Categories";
import Cities from "./pages/Cities";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import Favorites from "./pages/Favorites";
import MyVenues from "./pages/MyVenues";
import ListVenue from "./pages/ListVenue";
import EditVenue from "./pages/EditVenue";
import CustomerBookings from "./pages/CustomerBookings";
import Messages from "./pages/Messages";

// Import Index page instead of Home as that's what exists
import Index from "./pages/Index";
// Import VenueOwnerPromo instead of VenueOwner
import VenueOwnerPromo from "./pages/VenueOwnerPromo";

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Toaster richColors />
        <Navbar />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/venue/:id" element={<VenueDetails />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/cities" element={<Cities />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/venue-owner" element={<VenueOwnerPromo />} />
          <Route path="/my-venues" element={<MyVenues />} />
          <Route path="/list-venue" element={<ListVenue />} />
          <Route path="/edit-venue/:id" element={<EditVenue />} />
          <Route path="/customer-bookings" element={<CustomerBookings />} />
          <Route path="/messages" element={<Messages />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
