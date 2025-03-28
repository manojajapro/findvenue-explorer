
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
import { Loader2, MapPin } from 'lucide-react';
import VenueLocationMap from '@/components/map/VenueLocationMap';

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
    image_url: '',
    gallery_images: [],
    wifi: false,
    parking: false,
    latitude: null,
    longitude: null
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
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
      setVenue(data);
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
          ? galleryImages.split('\n').filter(url => url.trim())
          : [];
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
          image_url: venue.image_url,
          gallery_images: galleryImages,
          wifi: venue.wifi,
          parking: venue.parking,
          updated_at: new Date().toISOString(),
          latitude: venue.latitude,
          longitude: venue.longitude
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
                    <Label htmlFor="starting_price">Starting Price (SAR)</Label>
                    <Input
                      id="starting_price"
                      name="starting_price"
                      type="number"
                      min="0"
                      value={venue.starting_price || 0}
                      onChange={handleNumberChange}
                    />
                  </div>
                </CardContent>
              </Card>
              
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
              
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                  <CardDescription>Update available amenities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
