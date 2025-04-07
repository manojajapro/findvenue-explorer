import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { ReloadIcon } from "@radix-ui/react-icons"
import { Helmet } from 'react-helmet';

interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  category: string;
  images: string[];
  price: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
}

interface Booking {
  id: string;
  venue_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  number_of_guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

const MyVenues = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [editVenueId, setEditVenueId] = useState<string | null>(null);
  const [venueDetails, setVenueDetails] = useState<Venue | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoadingVenues, setIsLoadingVenues] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // State for venue form
  const [venueName, setVenueName] = useState('');
  const [venueDescription, setVenueDescription] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [venueCategory, setVenueCategory] = useState('');
  const [venuePrice, setVenuePrice] = useState<number | undefined>(undefined);
  const [venueImages, setVenueImages] = useState<string[]>([]);

  // State for edit venue form
  const [editVenueName, setEditVenueName] = useState('');
  const [editVenueDescription, setEditVenueDescription] = useState('');
  const [editVenueAddress, setEditVenueAddress] = useState('');
  const [editVenueCity, setEditVenueCity] = useState('');
  const [editVenueCategory, setEditVenueCategory] = useState('');
  const [editVenuePrice, setEditVenuePrice] = useState<number | undefined>(undefined);
  const [editVenueImages, setEditVenueImages] = useState<string[]>([]);

  // State for bookings filter
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Fetch venues owned by the current user
  const { data: venues, refetch: refetchVenues } = useQuery<Venue[]>(
    ['myVenues', user?.id],
    async () => {
      setIsLoadingVenues(true);
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('user_id', user.id);
      setIsLoadingVenues(false);
      if (error) {
        console.error('Error fetching venues:', error);
        throw error;
      }
      return data || [];
    },
    {
      enabled: !!user?.id,
    }
  );

  // Fetch bookings for venues owned by the current user
  const { data: bookings, refetch: refetchBookings } = useQuery<Booking[]>(
    ['myBookings', user?.id],
    async () => {
      setIsLoadingBookings(true);
      if (!user?.id) return [];
      const venueIds = venues?.map((venue) => venue.id) || [];
      if (venueIds.length === 0) return [];

      let query = supabase
        .from('bookings')
        .select('*')
        .in('venue_id', venueIds);

      if (date) {
        const formattedDate = format(date, 'yyyy-MM-dd');
        query = query.gte('start_date', formattedDate).lte('end_date', formattedDate);
      }

      const { data, error } = await query;
      setIsLoadingBookings(false);
      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
      return data || [];
    },
    {
      enabled: !!user?.id && !!venues,
    }
  );

  // Mutation to publish a venue
  const publishVenueMutation = useMutation(
    async (venueId: string) => {
      const { data, error } = await supabase
        .from('venues')
        .update({ is_published: true })
        .eq('id', venueId);
      if (error) {
        console.error('Error publishing venue:', error);
        throw error;
      }
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['myVenues', user?.id]);
        toast({
          title: 'Venue Published',
          description: 'The venue has been successfully published.',
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to publish the venue. Please try again.',
          variant: 'destructive',
        });
      },
      onSettled: () => {
        setIsPublishing(false);
      },
    }
  );

  // Mutation to unpublish a venue
  const unpublishVenueMutation = useMutation(
    async (venueId: string) => {
      const { data, error } = await supabase
        .from('venues')
        .update({ is_published: false })
        .eq('id', venueId);
      if (error) {
        console.error('Error unpublishing venue:', error);
        throw error;
      }
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['myVenues', user?.id]);
        toast({
          title: 'Venue Unpublished',
          description: 'The venue has been successfully unpublished.',
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to unpublish the venue. Please try again.',
          variant: 'destructive',
        });
      },
      onSettled: () => {
        setIsUnpublishing(false);
      },
    }
  );

  // Mutation to delete a venue
  const deleteVenueMutation = useMutation(
    async (venueId: string) => {
      const { data, error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId);
      if (error) {
        console.error('Error deleting venue:', error);
        throw error;
      }
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['myVenues', user?.id]);
        toast({
          title: 'Venue Deleted',
          description: 'The venue has been successfully deleted.',
        });
        setIsDrawerOpen(false);
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete the venue. Please try again.',
          variant: 'destructive',
        });
      },
      onSettled: () => {
        setIsDeleting(false);
      },
    }
  );

  // Mutation to confirm a booking
  const confirmBookingMutation = useMutation(
    async (bookingId: string) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);
      if (error) {
        console.error('Error confirming booking:', error);
        throw error;
      }
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['myBookings', user?.id]);
        toast({
          title: 'Booking Confirmed',
          description: 'The booking has been successfully confirmed.',
        });
        setIsBookingDrawerOpen(false);
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to confirm the booking. Please try again.',
          variant: 'destructive',
        });
      },
      onSettled: () => {
        setIsConfirming(false);
      },
    }
  );

  // Mutation to cancel a booking
  const cancelBookingMutation = useMutation(
    async (bookingId: string) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
      if (error) {
        console.error('Error cancelling booking:', error);
        throw error;
      }
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['myBookings', user?.id]);
        toast({
          title: 'Booking Cancelled',
          description: 'The booking has been successfully cancelled.',
        });
        setIsBookingDrawerOpen(false);
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to cancel the booking. Please try again.',
          variant: 'destructive',
        });
      },
      onSettled: () => {
        setIsCancelling(false);
      },
    }
  );

  // Mutation to update a venue
  const updateVenueMutation = useMutation(
    async (venue: Venue) => {
      const { data, error } = await supabase
        .from('venues')
        .update({
          name: venue.name,
          description: venue.description,
          address: venue.address,
          city: venue.city,
          category: venue.category,
          price: venue.price,
          images: venue.images,
        })
        .eq('id', venue.id);
      if (error) {
        console.error('Error updating venue:', error);
        throw error;
      }
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['myVenues', user?.id]);
        toast({
          title: 'Venue Updated',
          description: 'The venue has been successfully updated.',
        });
        setEditVenueId(null);
        setIsDrawerOpen(false);
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update the venue. Please try again.',
          variant: 'destructive',
        });
      },
    }
  );

  // Handlers
  const handleVenueClick = async (venueId: string) => {
    setSelectedVenueId(venueId);
    setEditVenueId(null);
    setIsDrawerOpen(true);

    // Fetch venue details
    if (venues) {
      const selectedVenue = venues.find((venue) => venue.id === venueId);
      if (selectedVenue) {
        setVenueDetails(selectedVenue);
      }
    }
  };

  const handleBookingClick = (bookingId: string) => {
    const selected = bookings?.find((booking) => booking.id === bookingId);
    if (selected) {
      setSelectedBooking(selected);
      setIsBookingDrawerOpen(true);
    }
  };

  const handlePublish = async (venueId: string) => {
    setIsPublishing(true);
    await publishVenueMutation.mutateAsync(venueId);
  };

  const handleUnpublish = async (venueId: string) => {
    setIsUnpublishing(true);
    await unpublishVenueMutation.mutateAsync(venueId);
  };

  const handleDelete = async (venueId: string) => {
    setIsDeleting(true);
    await deleteVenueMutation.mutateAsync(venueId);
  };

  const handleConfirmBooking = async (bookingId: string) => {
    setIsConfirming(true);
    await confirmBookingMutation.mutateAsync(bookingId);
  };

  const handleCancelBooking = async (bookingId: string) => {
    setIsCancelling(true);
    await cancelBookingMutation.mutateAsync(bookingId);
  };

  const handleEditVenue = (venueId: string) => {
    setEditVenueId(venueId);
    setSelectedVenueId(null);

    // Populate the edit form with the venue details
    if (venues) {
      const selectedVenue = venues.find((venue) => venue.id === venueId);
      if (selectedVenue) {
        setEditVenueName(selectedVenue.name);
        setEditVenueDescription(selectedVenue.description);
        setEditVenueAddress(selectedVenue.address);
        setEditVenueCity(selectedVenue.city);
        setEditVenueCategory(selectedVenue.category);
        setEditVenuePrice(selectedVenue.price);
        setEditVenueImages(selectedVenue.images);
        setVenueDetails(selectedVenue);
      }
    }
  };

  const handleUpdateVenue = async () => {
    if (!venueDetails) return;

    // Validate the form
    if (!editVenueName || !editVenueDescription || !editVenueAddress || !editVenueCity || !editVenueCategory || !editVenuePrice || !editVenueImages) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    // Create a new venue object with the updated values
    const updatedVenue: Venue = {
      id: venueDetails.id,
      name: editVenueName,
      description: editVenueDescription,
      address: editVenueAddress,
      city: editVenueCity,
      category: editVenueCategory,
      price: editVenuePrice,
      images: editVenueImages,
      user_id: venueDetails.user_id,
      created_at: venueDetails.created_at,
      updated_at: venueDetails.updated_at,
      is_published: venueDetails.is_published,
    };

    // Call the update venue mutation
    await updateVenueMutation.mutateAsync(updatedVenue);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditVenueId(null);
    setSelectedVenueId(null);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/my-venues?tab=${tab}`);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [window.location.search]);

  return (
    <div className="min-h-screen pt-28 pb-16">
      <Helmet>
        <title>My Venues | FindVenue</title>
      </Helmet>
      <div className="container mx-auto px-4">
        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard" onClick={() => handleTabChange('dashboard')}>Dashboard</TabsTrigger>
            <TabsTrigger value="bookings" onClick={() => handleTabChange('bookings')}>Bookings</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">My Venues</h1>
              <p className="text-findvenue-text-muted">Manage your venues and their details.</p>
            </div>

            {isLoadingVenues ? (
              <div className="flex items-center justify-center">
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Loading venues...
              </div>
            ) : venues && venues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map((venue) => (
                  <Card key={venue.id} className="glass-card border-white/10">
                    <CardHeader>
                      <CardTitle>{venue.name}</CardTitle>
                      <CardDescription>{venue.city}, {venue.category}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-findvenue-text-muted">{venue.description.substring(0, 100)}...</p>
                      <div className="mt-4">
                        {venue.is_published ? (
                          <Badge className="bg-green-500 text-white">Published</Badge>
                        ) : (
                          <Badge className="bg-red-500 text-white">Unpublished</Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="secondary" onClick={() => handleVenueClick(venue.id)}>
                        View Details
                      </Button>
                      {venue.is_published ? (
                        <Button
                          variant="destructive"
                          disabled={isUnpublishing}
                          onClick={() => handleUnpublish(venue.id)}
                        >
                          {isUnpublishing ? (
                            <>
                              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                              Unpublishing...
                            </>
                          ) : (
                            'Unpublish'
                          )}
                        </Button>
                      ) : (
                        <Button
                          className="bg-findvenue hover:bg-findvenue-dark"
                          disabled={isPublishing}
                          onClick={() => handlePublish(venue.id)}
                        >
                          {isPublishing ? (
                            <>
                              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                              Publishing...
                            </>
                          ) : (
                            'Publish'
                          )}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-findvenue-text-muted">No venues found. <Link to="/list-venue" className="text-findvenue hover:text-findvenue-light transition-colors">List your venue now!</Link></p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="bookings" className="mt-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
              <p className="text-findvenue-text-muted">Manage bookings for your venues.</p>
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) =>
                      date > new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={() => {
                setDate(undefined);
                refetchBookings();
              }}>Clear Date</Button>
              <Button onClick={() => refetchBookings()}>Apply Filter</Button>
            </div>

            {isLoadingBookings ? (
              <div className="flex items-center justify-center">
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Loading bookings...
              </div>
            ) : bookings && bookings.length > 0 ? (
              <ScrollArea>
                <Table>
                  <TableCaption>A list of your recent bookings.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Booking ID</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.id}</TableCell>
                        <TableCell>
                          {venues?.find((venue) => venue.id === booking.venue_id)?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>{format(new Date(booking.start_date), 'PPP')}</TableCell>
                        <TableCell>{format(new Date(booking.end_date), 'PPP')}</TableCell>
                        <TableCell>{booking.number_of_guests}</TableCell>
                        <TableCell>${booking.total_price}</TableCell>
                        <TableCell>
                          {booking.status === 'pending' && (
                            <Badge className="bg-amber-500 text-white text-xs">{booking.status}</Badge>
                          )}
                          {booking.status === 'confirmed' && (
                            <Badge className="bg-green-500 text-white text-xs">{booking.status}</Badge>
                          )}
                          {booking.status === 'cancelled' && (
                            <Badge className="bg-red-500 text-white text-xs">cancelled</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="secondary" onClick={() => handleBookingClick(booking.id)}>
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center">
                <p className="text-findvenue-text-muted">No bookings found for your venues.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Venue Details Drawer */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>
            <Button>Open</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{editVenueId ? 'Edit Venue' : 'Venue Details'}</DrawerTitle>
              <DrawerDescription>
                {editVenueId
                  ? 'Make changes to your venue details here. Click update when you\'re done. '
                  : 'View details of your venue.'}
              </DrawerDescription>
            </DrawerHeader>
            <Separator />

            {venueDetails && (
              <div className="p-4">
                {editVenueId ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Venue Name"
                        value={editVenueName}
                        onChange={(e) => setEditVenueName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Venue Description"
                        value={editVenueDescription}
                        onChange={(e) => setEditVenueDescription(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        placeholder="Venue Address"
                        value={editVenueAddress}
                        onChange={(e) => setEditVenueAddress(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="Venue City"
                        value={editVenueCity}
                        onChange={(e) => setEditVenueCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={editVenueCategory} onValueChange={setEditVenueCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Restaurant">Restaurant</SelectItem>
                          <SelectItem value="Hotel">Hotel</SelectItem>
                          <SelectItem value="Event Space">Event Space</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="price">Price per night</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="Venue Price"
                        value={editVenuePrice !== undefined ? editVenuePrice.toString() : ''}
                        onChange={(e) => setEditVenuePrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="images">Images (comma-separated URLs)</Label>
                      <Input
                        id="images"
                        placeholder="Image URLs"
                        value={editVenueImages.join(',')}
                        onChange={(e) => setEditVenueImages(e.target.value.split(','))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Name</h3>
                      <p>{venueDetails.name}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Description</h3>
                      <p>{venueDetails.description}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Address</h3>
                      <p>{venueDetails.address}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">City</h3>
                      <p>{venueDetails.city}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Category</h3>
                      <p>{venueDetails.category}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Price per night</h3>
                      <p>${venueDetails.price}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Images</h3>
                      <div className="flex space-x-2">
                        {venueDetails.images.map((image, index) => (
                          <img key={index} src={image} alt={`Venue ${index + 1}`} className="w-20 h-20 object-cover rounded-md" />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DrawerFooter>
              {editVenueId ? (
                <div className="space-x-2">
                  <Button variant="secondary" onClick={() => {
                    setEditVenueId(null);
                    handleCloseDrawer();
                  }}>
                    Cancel
                  </Button>
                  <Button className="bg-findvenue hover:bg-findvenue-dark" onClick={handleUpdateVenue}>
                    Update Venue
                  </Button>
                </div>
              ) : (
                <div className="space-x-2">
                  <Button variant="secondary" onClick={() => {
                    handleEditVenue(venueDetails?.id || '');
                  }}>
                    Edit Venue
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => handleDelete(venueDetails?.id || '')}
                  >
                    {isDeleting ? (
                      <>
                        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Venue'
                    )}
                  </Button>
                </div>
              )}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Booking Details Drawer */}
        <Drawer open={isBookingDrawerOpen} onOpenChange={setIsBookingDrawerOpen}>
          <DrawerTrigger asChild>
            <Button>Open</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Booking Details</DrawerTitle>
              <DrawerDescription>
                View details of the booking and manage its status.
              </DrawerDescription>
            </DrawerHeader>
            <Separator />

            {selectedBooking && (
              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Venue</h3>
                    <p>{venues?.find((venue) => venue.id === selectedBooking.venue_id)?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Start Date</h3>
                    <p>{format(new Date(selectedBooking.start_date), 'PPP')}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">End Date</h3>
                    <p>{format(new Date(selectedBooking.end_date), 'PPP')}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Number of Guests</h3>
                    <p>{selectedBooking.number_of_guests}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Total Price</h3>
                    <p>${selectedBooking.total_price}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Status</h3>
                    <Badge className="bg-amber-500 text-white">{selectedBooking.status}</Badge>
                  </div>
                </div>
              </div>
            )}

            <DrawerFooter>
              <div className="space-x-2">
                {selectedBooking?.status === 'pending' && (
                  <>
                    <Button
                      className="bg-green-500 hover:bg-green-700 text-white"
                      disabled={isConfirming}
                      onClick={() => handleConfirmBooking(selectedBooking.id)}
                    >
                      {isConfirming ? (
                        <>
                          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        'Confirm Booking'
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={isCancelling}
                      onClick={() => handleCancelBooking(selectedBooking.id)}
                    >
                      {isCancelling ? (
                        <>
                          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        'Cancel Booking'
                      )}
                    </Button>
                  </>
                )}
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};

export default MyVenues;
