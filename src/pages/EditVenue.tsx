
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, MapPin, Clock, Calendar, Plus, Minus, X } from 'lucide-react';
import VenueLocationMap from '@/components/map/VenueLocationMap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const EditVenue = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isVenueOwner } = useAuth();
  const { toast } = useToast();
  
  const [venue, setVenue] = useState<any>({
    name: '',
    description: '',
    address: '',
    city_name: '',
    category_name: '',
    min_capacity: 0,
    max_capacity: 0,
    starting_price: 0,
    price_per_person: null,
    image_url: '',
    gallery_images: [],
    wifi: false,
    parking: false,
    latitude: null,
    longitude: null,
    opening_hours: {},
    accessibility_features: [],
    additional_services: [],
    accepted_payment_methods: [],
    currency: 'SAR',
    amenities: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pricingType, setPricingType] = useState<'flat' | 'perPerson' | 'hourly'>('flat');
  
  // New state for dynamic arrays
  const [newService, setNewService] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  
  // Days for opening hours
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  useEffect(() => {
    if (!isVenueOwner || !user) {
      navigate('/');
      return;
    }
    
    fetchVenueDetails();
  }, [id, user, isVenueOwner]);
  
  const fetchVenueDetails = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      // Check if the venue belongs to this owner
      const ownerInfo = typeof data.owner_info === 'string' 
        ? JSON.parse(data.owner_info) 
        : data.owner_info;
        
      if (ownerInfo && ownerInfo.user_id !== user?.id) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to edit this venue.',
          variant: 'destructive',
        });
        navigate('/my-venues');
        return;
      }
      
      console.log("Venue data:", data);
      
      // Determine pricing type based on available data
      if (data.price_per_person) {
        setPricingType('perPerson');
      } else if (data.hourly_rate) {
        setPricingType('hourly');
      } else {
        setPricingType('flat');
      }
      
      // If opening_hours is a string, parse it
      let openingHoursData = data.opening_hours;
      if (typeof openingHoursData === 'string') {
        try {
          openingHoursData = JSON.parse(openingHoursData);
        } catch (e) {
          console.error("Error parsing opening hours", e);
          openingHoursData = {};
        }
      }
      
      // Ensure arrays are properly initialized
      const venueData = {
        ...data,
        opening_hours: openingHoursData || {},
        accessibility_features: data.accessibility_features || [],
        additional_services: data.additional_services || [],
        accepted_payment_methods: data.accepted_payment_methods || ['Credit Card', 'Cash'],
        amenities: data.amenities || []
      };
      
      setVenue(venueData);
    } catch (error: any) {
      console.error('Error fetching venue details:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load venue details.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVenue(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVenue(prev => ({ ...prev, [name]: value === '' ? '' : parseInt(value, 10) }));
  };
  
  const handleFloatNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVenue(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) }));
  };
  
  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const imagesArray = e.target.value.split('\n').filter(url => url.trim() !== '');
    setVenue(prev => ({ ...prev, gallery_images: imagesArray }));
  };
  
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setVenue(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleLocationChange = (lat: number, lng: number) => {
    setVenue(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };
  
  const handlePricingTypeChange = (value: string) => {
    const type = value as 'flat' | 'perPerson' | 'hourly';
    setPricingType(type);
    
    // Reset the other pricing fields
    if (type === 'flat') {
      setVenue(prev => ({ ...prev, price_per_person: null, hourly_rate: null }));
    } else if (type === 'perPerson') {
      setVenue(prev => ({ ...prev, hourly_rate: null }));
    } else if (type === 'hourly') {
      setVenue(prev => ({ ...prev, price_per_person: null }));
    }
  };
  
  const handleOpeningHoursChange = (day: string, type: 'open' | 'close', value: string) => {
    setVenue(prev => {
      const updatedHours = { ...prev.opening_hours } || {};
      if (!updatedHours[day]) {
        updatedHours[day] = { open: '09:00', close: '17:00' };
      }
      updatedHours[day][type] = value;
      return { ...prev, opening_hours: updatedHours };
    });
  };
  
  // Functions to add items to arrays
  const addArrayItem = (field: string, value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    if (!value.trim()) return;
    
    setVenue(prev => {
      const currentArray = Array.isArray(prev[field]) ? [...prev[field]] : [];
      if (!currentArray.includes(value)) {
        return { ...prev, [field]: [...currentArray, value] };
      }
      return prev;
    });
    
    setter(''); // Clear the input
  };
  
  const removeArrayItem = (field: string, index: number) => {
    setVenue(prev => {
      const currentArray = [...prev[field]];
      currentArray.splice(index, 1);
      return { ...prev, [field]: currentArray };
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!venue.name || !venue.address) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Convert gallery_images to array if it's a string or not present
      let galleryImages = venue.gallery_images;
      if (!Array.isArray(galleryImages)) {
        galleryImages = typeof galleryImages === 'string' 
          ? galleryImages.split('\n').filter((url: string) => url.trim())
          : [];
      }
      
      // Prepare pricing data based on pricing type
      const pricingData: any = {
        starting_price: venue.starting_price,
        price_per_person: null,
        hourly_rate: null
      };
      
      if (pricingType === 'perPerson') {
        pricingData.price_per_person = venue.price_per_person || venue.starting_price;
      } else if (pricingType === 'hourly') {
        pricingData.hourly_rate = venue.hourly_rate || venue.starting_price;
      }
      
      const { error } = await supabase
        .from('venues')
        .update({
          name: venue.name,
          description: venue.description,
          address: venue.address,
          city_name: venue.city_name,
          category_name: venue.category_name,
          min_capacity: venue.min_capacity,
          max_capacity: venue.max_capacity,
          starting_price: venue.starting_price,
          price_per_person: pricingData.price_per_person,
          hourly_rate: pricingData.hourly_rate,
          image_url: venue.image_url,
          gallery_images: galleryImages,
          wifi: venue.wifi,
          parking: venue.parking,
          updated_at: new Date().toISOString(),
          latitude: venue.latitude,
          longitude: venue.longitude,
          opening_hours: venue.opening_hours,
          accessibility_features: venue.accessibility_features,
          additional_services: venue.additional_services,
          accepted_payment_methods: venue.accepted_payment_methods,
          amenities: venue.amenities,
          currency: venue.currency
        })
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Venue details updated successfully.',
      });
      
      navigate('/my-venues');
    } catch (error: any) {
      console.error('Error updating venue:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update venue details.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-findvenue" />
          <p className="mt-4 text-findvenue-text-muted">Loading venue details...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Edit Venue Details</h1>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Basic Information Card */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Update the basic details of your venue</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Venue Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={venue.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={venue.description || ''}
                      onChange={handleInputChange}
                      className="min-h-[120px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category_name">Category</Label>
                      <Input
                        id="category_name"
                        name="category_name"
                        value={venue.category_name || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city_name">City</Label>
                      <Input
                        id="city_name"
                        name="city_name"
                        value={venue.city_name || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      name="address"
                      value={venue.address || ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={venue.currency || 'SAR'} 
                      onValueChange={(value) => setVenue(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Select Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">Saudi Riyal (SAR)</SelectItem>
                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                        <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Location Map */}
                  <div className="space-y-2 mt-4">
                    <Label>Venue Location on Map</Label>
                    <VenueLocationMap
                      name={venue.name}
                      address={venue.address || ""}
                      latitude={venue.latitude}
                      longitude={venue.longitude}
                      editable={true}
                      onLocationChange={handleLocationChange}
                    />
                    <p className="text-sm text-findvenue-text-muted">
                      Set the exact location of your venue by clicking on the map or dragging the marker.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Capacity & Pricing Card */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle>Capacity & Pricing</CardTitle>
                  <CardDescription>Update capacity and pricing information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_capacity">Minimum Capacity</Label>
                      <Input
                        id="min_capacity"
                        name="min_capacity"
                        type="number"
                        min="0"
                        value={venue.min_capacity || 0}
                        onChange={handleNumberChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_capacity">Maximum Capacity</Label>
                      <Input
                        id="max_capacity"
                        name="max_capacity"
                        type="number"
                        min="0"
                        value={venue.max_capacity || 0}
                        onChange={handleNumberChange}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pricingType">Pricing Type</Label>
                    <Select value={pricingType} onValueChange={handlePricingTypeChange}>
                      <SelectTrigger id="pricingType">
                        <SelectValue placeholder="Select pricing type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat Rate</SelectItem>
                        <SelectItem value="perPerson">Per Person</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {pricingType === 'flat' && (
                    <div className="space-y-2">
                      <Label htmlFor="starting_price">Base Price ({venue.currency})</Label>
                      <Input
                        id="starting_price"
                        name="starting_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={venue.starting_price || 0}
                        onChange={handleFloatNumberChange}
                      />
                    </div>
                  )}
                  
                  {pricingType === 'perPerson' && (
                    <div className="space-y-2">
                      <Label htmlFor="price_per_person">Price Per Person ({venue.currency})</Label>
                      <Input
                        id="price_per_person"
                        name="price_per_person"
                        type="number"
                        min="0"
                        step="0.01"
                        value={venue.price_per_person || 0}
                        onChange={handleFloatNumberChange}
                      />
                    </div>
                  )}
                  
                  {pricingType === 'hourly' && (
                    <div className="space-y-2">
                      <Label htmlFor="hourly_rate">Hourly Rate ({venue.currency})</Label>
                      <Input
                        id="hourly_rate"
                        name="hourly_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={venue.hourly_rate || 0}
                        onChange={handleFloatNumberChange}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Opening Hours Card */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle>Opening Hours</CardTitle>
                  <CardDescription>Set your venue's operating hours</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {days.map((day) => (
                    <div key={day} className="flex items-center space-x-4">
                      <div className="w-24">
                        <Label>{day}</Label>
                      </div>
                      <div className="flex flex-1 items-center space-x-2">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-findvenue-text-muted" />
                          <Input
                            type="time"
                            value={venue.opening_hours?.[day]?.open || '09:00'}
                            onChange={(e) => handleOpeningHoursChange(day, 'open', e.target.value)}
                            className="w-32"
                          />
                        </div>
                        <span>to</span>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-findvenue-text-muted" />
                          <Input
                            type="time"
                            value={venue.opening_hours?.[day]?.close || '17:00'}
                            onChange={(e) => handleOpeningHoursChange(day, 'close', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              {/* Images Card */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle>Images</CardTitle>
                  <CardDescription>Update venue images</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image_url">Main Image URL</Label>
                    <Input
                      id="image_url"
                      name="image_url"
                      value={venue.image_url || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gallery_images">Gallery Images (one URL per line)</Label>
                    <Textarea
                      id="gallery_images"
                      value={(venue.gallery_images || []).join('\n')}
                      onChange={handleGalleryImagesChange}
                      className="min-h-[120px]"
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Amenities Card */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                  <CardDescription>Update available amenities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="wifi"
                        checked={venue.wifi || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('wifi', checked as boolean)
                        }
                      />
                      <Label htmlFor="wifi">Wi-Fi Available</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="parking"
                        checked={venue.parking || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('parking', checked as boolean)
                        }
                      />
                      <Label htmlFor="parking">Parking Available</Label>
                    </div>
                  </div>
                  
                  {/* Custom Amenities */}
                  <div className="space-y-2 mt-4">
                    <Label>Custom Amenities</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add amenity (e.g. Sound System)"
                        value={newAmenity}
                        onChange={(e) => setNewAmenity(e.target.value)}
                      />
                      <Button 
                        type="button" 
                        onClick={() => addArrayItem('amenities', newAmenity, setNewAmenity)}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {venue.amenities?.map((amenity: string, index: number) => (
                        <div key={index} className="flex items-center justify-between bg-findvenue-surface/30 px-3 py-2 rounded-md">
                          <span className="text-sm">{amenity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeArrayItem('amenities', index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Additional Services Card */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle>Additional Services</CardTitle>
                  <CardDescription>Add extra services you offer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add service (e.g. Catering, Decoration)"
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                    />
                    <Button 
                      type="button" 
                      onClick={() => addArrayItem('additional_services', newService, setNewService)}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {venue.additional_services?.map((service: string, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-findvenue-surface/30 px-3 py-2 rounded-md">
                        <span className="text-sm">{service}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayItem('additional_services', index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Accessibility Features Card */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle>Accessibility Features</CardTitle>
                  <CardDescription>Update accessibility options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add feature (e.g. Wheelchair Access)"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                    />
                    <Button 
                      type="button" 
                      onClick={() => addArrayItem('accessibility_features', newFeature, setNewFeature)}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {venue.accessibility_features?.map((feature: string, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-findvenue-surface/30 px-3 py-2 rounded-md">
                        <span className="text-sm">{feature}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayItem('accessibility_features', index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Payment Methods Card */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Update accepted payment methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add payment method (e.g. Bank Transfer)"
                      value={newPaymentMethod}
                      onChange={(e) => setNewPaymentMethod(e.target.value)}
                    />
                    <Button 
                      type="button" 
                      onClick={() => addArrayItem('accepted_payment_methods', newPaymentMethod, setNewPaymentMethod)}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {venue.accepted_payment_methods?.map((method: string, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-findvenue-surface/30 px-3 py-2 rounded-md">
                        <span className="text-sm">{method}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayItem('accepted_payment_methods', index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/my-venues')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-findvenue hover:bg-findvenue-dark"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditVenue;
