import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Calendar, DollarSign, Globe, Clock, Building } from 'lucide-react';
const VenueOwnerPromo = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row items-center gap-10 mb-20">
          <div className="md:w-1/2">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 gradient-text leading-tight">
              Let ready-to-book customers find your venue
            </h1>
            <p className="text-lg text-findvenue-text-muted mb-8">
              List your venue with FindVenue to be seen by thousands of event planners 
              and increase your revenue by up to 30%.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-findvenue hover:bg-findvenue-dark text-lg py-6 px-8" onClick={() => navigate('/login', {
              state: {
                role: 'venue-owner'
              }
            })}>
                Get Started
              </Button>
              <Button variant="outline" className="border-white/20 hover:bg-findvenue-surface/50 text-lg py-6 px-8">
                Learn More
              </Button>
            </div>
          </div>
          <div className="md:w-1/2">
            <img alt="Venue Owner" className="rounded-lg w-full max-w-lg mx-auto" src="https://res.cloudinary.com/dbrzhkxtm/image/upload/v1744099920/venues/ta0n5k2q1lsrv1ea8p4u.jpg" />
          </div>
        </div>
        
        {/* Every venue is FindVenue */}
        <div className="text-center mb-24">
          <h2 className="text-3xl font-bold mb-6">Every venue is FindVenue</h2>
          <p className="text-findvenue-text-muted max-w-3xl mx-auto mb-12">
            From elegant hotels and corporate venues to intimate bar spaces, 
            we help all types of venues reach their revenue potential and connect with more clients.
          </p>
          
          <div className="bg-findvenue-surface/20 rounded-2xl p-8 border border-white/10">
            <h3 className="text-2xl font-bold mb-4">30,000+ events booked every year</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-10">
              <Card className="p-6 bg-findvenue-surface/30 border-white/10 text-center">
                <h4 className="text-lg font-semibold mb-2">Wedding Venues</h4>
                <p className="text-findvenue-text-muted text-sm">100+ venues</p>
              </Card>
              
              <Card className="p-6 bg-findvenue-surface/30 border-white/10 text-center">
                <h4 className="text-lg font-semibold mb-2">Corporate Events</h4>
                <p className="text-findvenue-text-muted text-sm">200+ venues</p>
              </Card>
              
              <Card className="p-6 bg-findvenue-surface/30 border-white/10 text-center">
                <h4 className="text-lg font-semibold mb-2">Birthday Parties</h4>
                <p className="text-findvenue-text-muted text-sm">150+ venues</p>
              </Card>
              
              <Card className="p-6 bg-findvenue-surface/30 border-white/10 text-center">
                <h4 className="text-lg font-semibold mb-2">Conference Rooms</h4>
                <p className="text-findvenue-text-muted text-sm">80+ venues</p>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Make money with FindVenue */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold mb-12 text-center">Make money with FindVenue</h2>
          
          <div className="space-y-12">
            <div className="flex flex-col-reverse md:flex-row items-center gap-10">
              <div className="md:w-1/2">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-findvenue rounded-full h-8 w-8 flex items-center justify-center text-white font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Sign up & display your venue</h3>
                    <p className="text-findvenue-text-muted">
                      Create a stunning profile for your venue with high-quality photos and comprehensive information to attract the right customers.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-findvenue rounded-full h-8 w-8 flex items-center justify-center text-white font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Control availability, rates and more</h3>
                    <p className="text-findvenue-text-muted">
                      Easily manage your venue's availability calendar, pricing, and special offers through our intuitive dashboard.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-findvenue rounded-full h-8 w-8 flex items-center justify-center text-white font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Sit back and enjoy</h3>
                    <p className="text-findvenue-text-muted">
                      Let the bookings come to you while our platform handles inquiries, payments, and customer communication.
                    </p>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2">
                <img src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1674&q=80" alt="Venue Owner Dashboard" className="rounded-lg w-full" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Why choose FindVenue */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold mb-10 text-center">Why venues choose FindVenue</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-6 bg-findvenue-surface/20 border-white/10">
              <div className="flex gap-4">
                <CheckCircle className="h-6 w-6 text-findvenue shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Increased visibility</h3>
                  <p className="text-findvenue-text-muted">
                    Get discovered by thousands of potential customers actively searching for venues in Saudi Arabia.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-findvenue-surface/20 border-white/10">
              <div className="flex gap-4">
                <Calendar className="h-6 w-6 text-findvenue shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Fill your calendar</h3>
                  <p className="text-findvenue-text-muted">
                    Maximize occupancy by filling gaps in your schedule with bookings you might otherwise miss.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-findvenue-surface/20 border-white/10">
              <div className="flex gap-4">
                <DollarSign className="h-6 w-6 text-findvenue shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Boost revenue</h3>
                  <p className="text-findvenue-text-muted">
                    Increase your revenue stream with bookings from a wider audience and better utilization of your space.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-findvenue-surface/20 border-white/10">
              <div className="flex gap-4">
                <Globe className="h-6 w-6 text-findvenue shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Market expansion</h3>
                  <p className="text-findvenue-text-muted">
                    Reach new customer segments and markets that might not otherwise discover your venue.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-findvenue-surface/20 border-white/10">
              <div className="flex gap-4">
                <Clock className="h-6 w-6 text-findvenue shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Save time</h3>
                  <p className="text-findvenue-text-muted">
                    Our platform handles inquiries, bookings, and payments, freeing up your time to focus on your venue.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-findvenue-surface/20 border-white/10">
              <div className="flex gap-4">
                <Building className="h-6 w-6 text-findvenue shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Professional tools</h3>
                  <p className="text-findvenue-text-muted">
                    Access professional venue management tools, analytics, and insights to optimize your business.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        {/* CTA */}
        <div className="text-center mb-20">
          <h2 className="text-3xl font-bold mb-6">Start growing your venue business today</h2>
          <p className="text-findvenue-text-muted max-w-2xl mx-auto mb-8">
            Join thousands of successful venue owners across Saudi Arabia who are growing their business with FindVenue.
          </p>
          <Button className="bg-findvenue hover:bg-findvenue-dark text-lg py-6 px-10" onClick={() => navigate('/login', {
          state: {
            role: 'venue-owner'
          }
        })}>
            Get Started Now
          </Button>
        </div>
      </div>
    </div>;
};
export default VenueOwnerPromo;