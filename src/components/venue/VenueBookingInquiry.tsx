import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, Users, Star, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { formatRating } from '@/utils/venueHelpers';

interface VenueBookingInquiryProps {
  venueId: string;
  venueName: string;
  ownerInfo: {
    name: string;
    contact?: string;
    user_id: string;
    response_time?: string;
    response_rate?: string;
  } | null;
  maxCapacity?: number;
}

const VenueBookingInquiry = ({
  venueId,
  venueName,
  ownerInfo,
  maxCapacity = 100
}: VenueBookingInquiryProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [people, setPeople] = useState<string>("10");
  const [layout, setLayout] = useState<string>("");
  const [isFlexible, setIsFlexible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const ownerName = ownerInfo?.name || 'Venue Manager';
  const ownerId = ownerInfo?.user_id || '';
  const responseTime = ownerInfo?.response_time || '24 hours';
  const responseRate = ownerInfo?.response_rate || '95%';
  
  const ownerFirstName = ownerName.split(' ')[0];
  const ownerInitial = ownerFirstName[0] || 'M';
  
  const handleInquire = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to send an inquiry",
        variant: "destructive"
      });
      
      navigate('/login');
      return;
    }
    
    if (!ownerId) {
      toast({
        title: "Error",
        description: "Could not find venue owner information",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const messageContent = `Inquiry for ${venueName}: I'm interested in booking this venue for ${people} people${layout ? ' with a ' + layout + ' layout' : ''}. ${isFlexible ? 'I am flexible on dates and times.' : ''}`;
      
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            content: messageContent,
            sender_id: user.id,
            receiver_id: ownerId,
            venue_id: venueId,
            venue_name: venueName,
            read: false,
            sender_name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email,
            receiver_name: ownerName
          }
        ])
        .select();
        
      if (error) throw error;
      
      toast({
        title: "Inquiry sent!",
        description: `Your inquiry has been sent to ${ownerFirstName}. They typically respond within ${responseTime}.`,
      });
      
      navigate('/messages');
      
    } catch (error: any) {
      console.error("Error sending inquiry:", error);
      toast({
        title: "Failed to send inquiry",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center space-x-4 mb-6">
        <Avatar className="h-14 w-14 bg-green-100">
          <AvatarImage src="" />
          <AvatarFallback className="bg-green-100 text-green-800">
            {ownerInitial}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-lg">{ownerFirstName}</h3>
          <p className="text-sm text-white-500">Event Manager from {venueName}</p>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1 text-sm">
              <Activity className="h-4 w-4" />
              <span>Response rate - {responseRate}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4" />
              <span>Response time - {responseTime}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">People</h4>
          <div className="flex items-center border rounded-md px-3 py-2">
            <Users className="h-5 w-5 mr-2 text-gray-400" />
            <Input 
              type="number" 
              placeholder="Number of guests" 
              value={people} 
              min={1}
              max={maxCapacity}
              onChange={e => setPeople(e.target.value)}
              className="border-0 p-0 focus-visible:ring-0"
            />
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Layout</h4>
          <Select value={layout} onValueChange={setLayout}>
            <SelectTrigger>
              <SelectValue placeholder="Select layout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="theatre">Theatre Style</SelectItem>
              <SelectItem value="classroom">Classroom</SelectItem>
              <SelectItem value="banquet">Banquet</SelectItem>
              <SelectItem value="reception">Reception</SelectItem>
              <SelectItem value="boardroom">Boardroom</SelectItem>
              <SelectItem value="ushape">U-Shape</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Date and time</h4>
          <Select>
            <SelectTrigger className="mb-3">
              <Calendar className="h-5 w-5 mr-2 text-gray-400" />
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="next-week">Next week</SelectItem>
              <SelectItem value="next-month">Next month</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="grid grid-cols-2 gap-3">
            <Select>
              <SelectTrigger>
                <Clock className="h-5 w-5 mr-2 text-gray-400" />
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }).map((_, i) => (
                  <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                    {i.toString().padStart(2, '0')}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select>
              <SelectTrigger>
                <Clock className="h-5 w-5 mr-2 text-gray-400" />
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }).map((_, i) => (
                  <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                    {i.toString().padStart(2, '0')}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="flexible" 
            checked={isFlexible} 
            onCheckedChange={(checked) => setIsFlexible(checked === true)}
          />
          <Label htmlFor="flexible">I'm flexible on dates and time</Label>
        </div>
        
        <Button 
          onClick={handleInquire}
          disabled={isSubmitting}
          className="w-full bg-red-400 hover:bg-red-500 text-white h-12 text-lg"
        >
          Enquire now
        </Button>
        
        <div className="flex justify-center items-center gap-1 mt-4">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className={`h-5 w-5 ${star <= 4.7 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <span className="text-sm">4.7 Rating</span>
          <span className="text-sm text-gray-500">on</span>
          <span className="font-bold text-sm">REVIEWS.io</span>
        </div>
      </div>
    </div>
  );
};

export default VenueBookingInquiry;
