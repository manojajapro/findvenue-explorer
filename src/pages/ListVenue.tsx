import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { saudiCities } from '@/data/cities';
import { categories } from '@/data/categories';
import { Check, Upload, AlertCircle, ImageIcon, X, MapPin, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import VenueLocationMap from '@/components/map/VenueLocationMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const ListVenue = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [mapModalOpen, setMapModalOpen] = useState(false);
  
  // Verification states
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  
  // Selection mode tabs
  const [cityInputMode, setCityInputMode] = useState('dropdown'); // 'dropdown' or 'manual'
  const [categoryInputMode, setCategoryInputMode] = useState('dropdown'); // 'dropdown' or 'manual'
  const [manualCity, setManualCity] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    category: '',
    minCapacity: '',
    maxCapacity: '',
    price: '',
    pricingType: 'flat',
    latitude: '',
    longitude: '',
    amenities: {
      wifi: false,
      parking: false,
      catering: false,
      soundSystem: false,
      lighting: false,
      stage: false,
      videoEquipment: false
    },
    availability: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    }
  });
  
  // Update form data
  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Update map location
  const handleLocationChange = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString()
    }));
  };
  
  // Update amenities
  const updateAmenity = (amenity: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [amenity]: checked
      }
    }));
  };
  
  // Update availability
  const updateAvailability = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: checked
      }
    }));
  };
  
  // Add image URL to the list
  const handleAddImageUrl = () => {
    if (!imageUrl.trim()) {
      toast({
        title: 'Empty URL',
        description: 'Please enter a valid image URL',
        variant: 'destructive'
      });
      return;
    }
    
    if (uploadedImages.includes(imageUrl)) {
      toast({
        title: 'Duplicate URL',
        description: 'This image URL is already in your gallery',
        variant: 'destructive'
      });
      return;
    }
    
    setUploadedImages(prev => [...prev, imageUrl]);
    setImageUrl('');
    toast({
      title: 'Image Added',
      description: 'Your image has been added to the gallery'
    });
  };
  
  // Remove image from the list
  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingImage(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'File Too Large',
            description: `${file.name} exceeds the 5MB limit`,
            variant: 'destructive'
          });
          continue;
        }
        
        // Create a unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `venues/${user?.id}/${fileName}`;
        
        // Upload to Supabase storage
        const { error: uploadError, data } = await supabase.storage
          .from('venue-images')
          .upload(filePath, file);
          
        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: 'Upload Failed',
            description: `Failed to upload ${file.name}: ${uploadError.message}`,
            variant: 'destructive'
          });
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('venue-images')
          .getPublicUrl(filePath);
          
        setUploadedImages(prev => [...prev, publicUrl]);
        
        toast({
          title: 'Upload Successful',
          description: `${file.name} has been uploaded`
        });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Error',
        description: error.message || 'An unexpected error occurred during upload',
        variant: 'destructive'
      });
    } finally {
      setUploadingImage(false);
      
      // Reset the file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };
  
  // Handle next step
  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.description || !formData.address) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields before proceeding',
          variant: 'destructive'
        });
        return;
      }
      
      // Check city input based on mode
      if (cityInputMode === 'dropdown' && !formData.city) {
        toast({
          title: 'Missing Information',
          description: 'Please select a city before proceeding',
          variant: 'destructive'
        });
        return;
      } else if (cityInputMode === 'manual' && !manualCity) {
        toast({
          title: 'Missing Information',
          description: 'Please enter a city name before proceeding',
          variant: 'destructive'
        });
        return;
      }
      
      // Check category input based on mode
      if (categoryInputMode === 'dropdown' && !formData.category) {
        toast({
          title: 'Missing Information',
          description: 'Please select a venue type before proceeding',
          variant: 'destructive'
        });
        return;
      } else if (categoryInputMode === 'manual' && !manualCategory) {
        toast({
          title: 'Missing Information',
          description: 'Please enter a venue type before proceeding',
          variant: 'destructive'
        });
        return;
      }
    } else if (step === 2) {
      if (!formData.minCapacity || !formData.maxCapacity || !formData.price) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields before proceeding',
          variant: 'destructive'
        });
        return;
      }
    }
    
    setStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };
  
  // Handle previous step
  const handlePrevStep = () => {
    setStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };
  
  // Send verification email with OTP
  const sendVerificationEmail = async () => {
    setVerificationLoading(true);
    setOtpError('');
    
    try {
      // For this example, we'll simulate sending an OTP to the user's email
      // In a real application, you would call an edge function to send the actual email with OTP
      
      // Generate a 6-digit OTP
      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the OTP in localStorage for verification (in a real app, this would be handled server-side)
      localStorage.setItem('venueOTP', generatedOTP);
      localStorage.setItem('venueOTPExpiry', (Date.now() + 10 * 60 * 1000).toString());
      
      // In a real application, you would call a Supabase edge function to send the email
      console.log(`OTP generated for verification: ${generatedOTP}`);
      
      toast({
        title: 'Verification Code Sent',
        description: `A verification code has been sent to ${profile?.email}. (For demo: ${generatedOTP})`,
      });
      
      setVerificationSent(true);
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      toast({
        title: 'Error Sending Verification',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setVerificationLoading(false);
    }
  };
  
  // Verify OTP code
  const verifyOTPCode = () => {
    setVerificationLoading(true);
    setOtpError('');
    
    // Get stored OTP and expiry time
    const storedOTP = localStorage.getItem('venueOTP');
    const expiry = localStorage.getItem('venueOTPExpiry');
    
    if (!storedOTP || !expiry) {
      setOtpError('Verification code expired or not found. Please request a new one.');
      setVerificationLoading(false);
      return;
    }
    
    // Check if OTP has expired
    if (Date.now() > parseInt(expiry)) {
      setOtpError('Verification code has expired. Please request a new one.');
      localStorage.removeItem('venueOTP');
      localStorage.removeItem('venueOTPExpiry');
      setVerificationLoading(false);
      return;
    }
    
    // Verify OTP
    if (otpCode === storedOTP) {
      setOtpVerified(true);
      localStorage.removeItem('venueOTP');
      localStorage.removeItem('venueOTPExpiry');
      toast({
        title: 'Verification Successful',
        description: 'Your email has been verified successfully.',
      });
      
      // Submit the venue data to Supabase
      handleVenueSubmission();
    } else {
      setOtpError('Incorrect verification code. Please try again.');
    }
    
    setVerificationLoading(false);
  };
  
  // Handle venue form submission after verification
  const handleVenueSubmission = async () => {
    if (!user || !profile) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to add a venue',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Validate required fields
      const anyAvailability = Object.values(formData.availability).some(value => value);
      
      if (!anyAvailability) {
        toast({
          title: 'Availability Required',
          description: 'Please select at least one day of availability',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      
      if (uploadedImages.length === 0) {
        toast({
          title: 'Images Required',
          description: 'Please upload at least one venue image',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      
      // Convert amenities object to array for Supabase
      const amenitiesArray = Object.entries(formData.amenities)
        .filter(([_, value]) => value)
        .map(([key]) => {
          // Convert camelCase to readable format
          return key === 'wifi' ? 'WiFi' :
                 key === 'soundSystem' ? 'Sound System' :
                 key === 'videoEquipment' ? 'Video Equipment' :
                 key.charAt(0).toUpperCase() + key.slice(1);
        });
      
      // Convert availability object to array for Supabase
      const availabilityArray = Object.entries(formData.availability)
        .filter(([_, value]) => value)
        .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));
      
      // Get city and category information
      let cityId = '';
      let cityName = '';
      
      if (cityInputMode === 'dropdown') {
        const cityObject = saudiCities.find(city => city.id === formData.city);
        cityId = cityObject?.id || '';
        cityName = cityObject?.name || '';
      } else {
        // For manually entered cities, use the input as both ID and name
        cityId = manualCity;
        cityName = manualCity;
      }
      
      // Format category arrays
      let categoryIdArray: string[] = [];
      let categoryNameArray: string[] = [];
      
      if (categoryInputMode === 'dropdown') {
        const categoryObject = categories.find(cat => cat.id === formData.category);
        if (categoryObject) {
          categoryIdArray = [categoryObject.id];
          categoryNameArray = [categoryObject.name];
        }
      } else {
        // For manually entered categories, use the input as both ID and name
        categoryIdArray = [manualCategory];
        categoryNameArray = [manualCategory];
      }
      
      // Prepare owner info
      const ownerInfo = {
        user_id: user.id,
        name: `${profile.first_name} ${profile.last_name}`,
        contact: profile.email,
        response_time: "24 hours"
      };
      
      // Calculate starting price based on pricing type
      const startingPrice = parseInt(formData.price);
      
      // Prepare venue data for Supabase
      const venueData = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        city_id: cityId,
        city_name: cityName,
        category_id: categoryIdArray,
        category_name: categoryNameArray,
        min_capacity: parseInt(formData.minCapacity),
        max_capacity: parseInt(formData.maxCapacity),
        starting_price: startingPrice,
        price_per_person: formData.pricingType === 'perPerson' ? startingPrice : null,
        image_url: uploadedImages[0], // Main image is the first one
        gallery_images: uploadedImages, // All images including the main one
        amenities: amenitiesArray,
        availability: availabilityArray,
        wifi: formData.amenities.wifi,
        parking: formData.amenities.parking,
        owner_info: ownerInfo,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        // Set approval status (venues initially need approval)
        featured: false,
        popular: false,
        // Set status to pending
        status: 'pending',
        // Add default values
        currency: 'SAR',
        rating: 0,
        reviews_count: 0
      };
      
      // Submit to Supabase
      const { data, error } = await supabase
        .from('venues')
        .insert(venueData)
        .select();
      
      if (error) throw error;
      
      toast({
        title: 'Venue Submitted',
        description: 'Your venue has been submitted and is pending approval'
      });
      
      // Navigate to my venues page
      navigate('/my-venues');
    } catch (error: any) {
      console.error('Error submitting venue:', error);
      toast({
        title: 'Error Submitting Venue',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setShowVerificationDialog(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data before showing verification dialog
    const anyAvailability = Object.values(formData.availability).some(value => value);
    
    if (!anyAvailability) {
      toast({
        title: 'Availability Required',
        description: 'Please select at least one day of availability',
        variant: 'destructive'
      });
      return;
    }
    
    if (uploadedImages.length === 0) {
      toast({
        title: 'Images Required',
        description: 'Please upload at least one venue image',
        variant: 'destructive'
      });
      return;
    }
    
    if (!user || !profile) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to add a venue',
        variant: 'destructive'
      });
      return;
    }
    
    // Set verification email from user's profile
    setVerificationEmail(profile.email);
    
    // Show verification dialog
    setShowVerificationDialog(true);
    setVerificationSent(false);
    setOtpVerified(false);
    setOtpCode('');
    setOtpError('');
  };
  
  // Effect to auto-populate email field
  useEffect(() => {
    if (profile && profile.email) {
      setVerificationEmail(profile.email);
    }
  }, [profile]);
  
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">List Your Venue</h1>
            <p className="text-findvenue-text-muted max-w-2xl mx-auto">
              Join thousands of venue owners across Saudi Arabia and reach millions of potential customers
            </p>
          </div>
          
          {/* Progress Steps */}
          <div className="flex justify-between items-center mb-8 relative">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-findvenue-surface -translate-y-1/2 z-0"></div>
            
            {[1, 2, 3].map((stepNumber) => (
              <div 
                key={stepNumber} 
                className={`flex flex-col items-center relative z-10 ${step >= stepNumber ? 'text-findvenue' : 'text-findvenue-text-muted'}`}
              >
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    step > stepNumber 
                      ? 'bg-findvenue text-white' 
                      : step === stepNumber 
                        ? 'bg-findvenue-surface border-2 border-findvenue text-findvenue' 
                        : 'bg-findvenue-surface text-findvenue-text-muted'
                  }`}
                >
                  {step > stepNumber ? <Check className="w-5 h-5" /> : stepNumber}
                </div>
                <span className="text-sm font-medium">
                  {stepNumber === 1 ? 'Basic Info' : stepNumber === 2 ? 'Capacity & Pricing' : 'Amenities & Availability'}
                </span>
              </div>
            ))}
          </div>
          
          <Card className="p-6 md:p-8 glass-card border-white/10">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Basic Information */}
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-semibold mb-6">Venue Details</h2>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Venue Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateForm('name', e.target.value)}
                      placeholder="e.g. Royal Ballroom"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateForm('description', e.target.value)}
                      placeholder="Describe your venue, its unique features, and what makes it special..."
                      rows={4}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateForm('address', e.target.value)}
                      placeholder="e.g. 123 King Fahd Road"
                      required
                    />
                  </div>
                  
                  {/* City selection with tabs */}
                  <div className="space-y-2">
                    <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                    <Tabs value={cityInputMode} onValueChange={setCityInputMode} className="w-full">
                      <TabsList className="grid grid-cols-2 mb-2">
                        <TabsTrigger value="dropdown">Select from list</TabsTrigger>
                        <TabsTrigger value="manual">Enter manually</TabsTrigger>
                      </TabsList>
                      <TabsContent value="dropdown" className="mt-0">
                        <Select
                          value={formData.city}
                          onValueChange={(value) => updateForm('city', value)}
                        >
                          <SelectTrigger id="city" className="bg-findvenue-surface/50 border-white/10">
                            <SelectValue placeholder="Select a city" />
                          </SelectTrigger>
                          <SelectContent className="bg-findvenue-card-bg border-white/10">
                            {saudiCities.map((city) => (
                              <SelectItem key={city.id} value={city.id}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TabsContent>
                      <TabsContent value="manual" className="mt-0">
                        <Input
                          id="manualCity"
                          value={manualCity}
                          onChange={(e) => setManualCity(e.target.value)}
                          placeholder="Enter city name"
                          className="bg-findvenue-surface/50 border-white/10"
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  {/* Venue Type selection with tabs */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Venue Type <span className="text-red-500">*</span></Label>
                    <Tabs value={categoryInputMode} onValueChange={setCategoryInputMode} className="w-full">
                      <TabsList className="grid grid-cols-2 mb-2">
                        <TabsTrigger value="dropdown">Select from list</TabsTrigger>
                        <TabsTrigger value="manual">Enter manually</TabsTrigger>
                      </TabsList>
                      <TabsContent value="dropdown" className="mt-0">
                        <Select
                          value={formData.category}
                          onValueChange={(value) => updateForm('category', value)}
                        >
                          <SelectTrigger id="category" className="bg-findvenue-surface/50 border-white/10">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent className="bg-findvenue-card-bg border-white/10">
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TabsContent>
                      <TabsContent value="manual" className="mt-0">
                        <Input
                          id="manualCategory"
                          value={manualCategory}
                          onChange={(e) => setManualCategory(e.target.value)}
                          placeholder="Enter venue type"
                          className="bg-findvenue-surface/50 border-white/10"
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  {/* Location Map */}
                  <div className="space-y-2 mt-4">
                    <Label>Venue Location on Map</Label>
                    <VenueLocationMap
                      name={formData.name || "Your Venue"}
                      address={formData.address || "Address will appear here"}
                      latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
                      longitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
                      editable={true}
                      onLocationChange={handleLocationChange}
                    />
                    <p className="text-sm text-findvenue-text-muted">
                      Set the exact location of your venue by clicking on the map or dragging the marker.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <Label>Venue Photos <span className="text-red-500">*</span></Label>
                    <p className="text-sm text-findvenue-text-muted">
                      Upload high-quality images to showcase your venue (at least one image required)
                    </p>
                    
                    {/* Image upload methods */}
                    <div className="space-y-4">
                      {/* File upload method */}
                      <div className="border border-dashed border-white/20 rounded-md p-6">
                        <div className="flex flex-col items-center">
                          <Upload className="h-10 w-10 text-findvenue-text-muted mb-2" />
                          <p className="text-findvenue-text-muted mb-2 text-center">
                            Drag and drop photos or click to select from your device
                          </p>
                          <p className="text-xs text-findvenue-text-muted mb-4 text-center">
                            Supported formats: JPG, PNG, WebP (up to 5MB each)
                          </p>
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleFileUpload}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              disabled={uploadingImage}
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="border-findvenue text-findvenue hover:bg-findvenue/10"
                              disabled={uploadingImage}
                            >
                              {uploadingImage ? (
                                <>
                                  <span className="animate-spin mr-2">⟳</span>
                                  Uploading...
                                </>
                              ) : (
                                'Select Files'
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* URL input method */}
                      <div className="mt-4">
                        <Label htmlFor="imageUrl">Or add image URL</Label>
                        <div className="flex mt-2 gap-2">
                          <Input
                            id="imageUrl"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="flex-grow"
                          />
                          <Button 
                            type="button" 
                            onClick={handleAddImageUrl}
                            className="bg-findvenue hover:bg-findvenue-dark shrink-0"
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Image preview area */}
                    {uploadedImages.length > 0 && (
                      <div className="mt-6">
                        <Label className="block mb-3">Uploaded Images ({uploadedImages.length})</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {uploadedImages.map((image, index) => (
                            <div key={index} className="relative group aspect-video rounded-md overflow-hidden border border-white/10">
                              <img 
                                src={image} 
                                alt={`Venue image ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  className="text-xs"
                                  onClick={() => handleRemoveImage(index)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                              {index === 0 && (
                                <div className="absolute top-2 left-2 bg-findvenue/80 text-white text-xs px-2 py-1 rounded">
                                  Main Image
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-findvenue-text-muted mt-2">
                          The first image will be used as the main display image for your venue.
                          Drag to reorder images.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Step 2: Capacity & Pricing */}
              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-semibold mb-6">Capacity & Pricing</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minCapacity">Minimum Capacity <span className="text-red-500">*</span></Label>
                      <Input
                        id="minCapacity"
                        type="number"
                        value={formData.minCapacity}
                        onChange={(e) => updateForm('minCapacity', e.target.value)}
                        placeholder="e.g. 50"
                        min="1"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxCapacity">Maximum Capacity <span className="text-red-500">*</span></Label>
                      <Input
                        id="maxCapacity"
                        type="number"
                        value={formData.maxCapacity}
                        onChange={(e) => updateForm('maxCapacity', e.target.value)}
                        placeholder="e.g. 300"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pricingType">Pricing Type</Label>
                    <Select
                      value={formData.pricingType}
                      onValueChange={(value) => updateForm('pricingType', value)}
                    >
                      <SelectTrigger id="pricingType" className="bg-findvenue-surface/50 border-white/10">
                        <SelectValue placeholder="Select pricing type" />
                      </SelectTrigger>
                      <SelectContent className="bg-findvenue-card-bg border-white/10">
                        <SelectItem value="flat">Flat Rate</SelectItem>
                        <SelectItem value="perPerson">Per Person</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">
                      {formData.pricingType === 'flat' 
                        ? 'Base Price (SAR)' 
                        : formData.pricingType === 'perPerson' 
                          ? 'Price Per Person (SAR)' 
                          : 'Hourly Rate (SAR)'} 
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => updateForm('price', e.target.value)}
                      placeholder="e.g. 5000"
                      min="0"
                      required
                    />
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 rounded-md bg-findvenue/10">
                    <AlertCircle className="h-5 w-5 text-findvenue shrink-0 mt-0.5" />
                    <div className="text-sm text-findvenue-text-muted">
                      <p className="font-medium text-white mb-1">Pricing Tips</p>
                      <p>Consider your venue's unique features and local market rates when setting your price. 
                      You can always adjust your pricing later based on demand.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 3: Amenities & Availability */}
              {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-semibold mb-6">Amenities & Availability</h2>
                  
                  <div className="space-y-2">
                    <Label className="text-base">Amenities</Label>
                    <p className="text-sm text-findvenue-text-muted mb-4">
                      Select all amenities available at your venue
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 'wifi', label: 'WiFi' },
                        { id: 'parking', label: 'Parking' },
                        { id: 'catering', label: 'Catering' },
                        { id: 'soundSystem', label: 'Sound System' },
                        { id: 'lighting', label: 'Lighting' },
                        { id: 'stage', label: 'Stage' },
                        { id: 'videoEquipment', label: 'Video Equipment' }
                      ].map((amenity) => (
                        <div key={amenity.id} className="flex items-center space-x-3">
                          <Switch
                            id={`amenity-${amenity.id}`}
                            checked={formData.amenities[amenity.id as keyof typeof formData.amenities]}
                            onCheckedChange={(checked) => updateAmenity(amenity.id, checked)}
                          />
                          <Label htmlFor={`amenity-${amenity.id}`}>{amenity.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-base">Availability <span className="text-red-500">*</span></Label>
                    <p className="text-sm text-findvenue-text-muted mb-4">
                      Select the days your venue is typically available
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                      {[
                        { id: 'monday', label: 'Monday' },
                        { id: 'tuesday', label: 'Tuesday' },
                        { id: 'wednesday', label: 'Wednesday' },
                        { id: 'thursday', label: 'Thursday' },
                        { id: 'friday', label: 'Friday' },
                        { id: 'saturday', label: 'Saturday' },
                        { id: 'sunday', label: 'Sunday' }
                      ].map((day) => (
                        <div 
                          key={day.id} 
                          className={`p-3 rounded-md border text-center cursor-pointer transition-colors ${
                            formData.availability[day.id as keyof typeof formData.availability]
                              ? 'bg-findvenue/20 border-findvenue'
                              : 'bg-findvenue-surface/20 border-white/10 hover:bg-findvenue-surface/30'
                          }`}
                          onClick={() => updateAvailability(
                            day.id, 
                            !formData.availability[day.id as keyof typeof formData.availability]
                          )}
                        >
                          <span className={
                            formData.availability[day.id as keyof typeof formData.availability]
                              ? 'text-findvenue'
                              : 'text-findvenue-text-muted'
                          }>
                            {day.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-10">
                {step > 1 ? (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handlePrevStep}
                    className="border-white/20 hover:bg-findvenue-surface/50"
                  >
                    Previous
                  </Button>
                ) : (
                  <div></div> // Placeholder to maintain layout
                )}
                
                {step < 3 ? (
                  <Button 
                    type="button" 
                    onClick={handleNextStep}
                    className="bg-findvenue hover:bg-findvenue-dark"
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    className="bg-findvenue hover:bg-findvenue-dark"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Submitting...' : 'Submit Venue'}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>
      </div>
      
      {/* Email Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-md bg-findvenue-card-bg border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Email Verification Required
            </DialogTitle>
            <DialogDescription>
              We need to verify your email address before listing your venue.
            </DialogDescription>
          </DialogHeader>
          
          {!verificationSent ? (
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="verificationEmail">Your Email</Label>
                <Input 
                  id="verificationEmail"
                  value={verificationEmail}
                  onChange={(e) => setVerificationEmail(e.target.value)}
                  disabled={!!profile?.email}
                  className="bg-findvenue-surface/50 border-white/10"
                />
                <p className="text-sm text-findvenue-text-muted">
                  We'll send a verification code to this email address.
                </p>
              </div>
              
              <DialogFooter className="sm:justify-start pt-2">
                <Button
                  type="button"
                  variant="default"
                  onClick={sendVerificationEmail}
                  disabled={verificationLoading || !verificationEmail}
                  className="bg-findvenue hover:bg-findvenue-dark w-full"
                >
                  {verificationLoading ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="otpCode">Verification Code</Label>
                <Input 
                  id="otpCode"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="bg-findvenue-surface/50 border-white/10"
                />
                {otpError && (
                  <p className="text-sm text-red-500 mt-1">{otpError}</p>
                )}
                <p className="text-sm text-findvenue-text-muted">
                  Enter the verification code sent to {verificationEmail}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendVerificationEmail}
                  disabled={verificationLoading}
                  className="border-white/20 hover:bg-findvenue-surface/50"
                >
                  Resend Code
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={verifyOTPCode}
                  disabled={verificationLoading || otpCode.length !== 6}
                  className="bg-findvenue hover:bg-findvenue-dark w-full sm:w-auto"
                >
                  {verificationLoading ? 'Verifying...' : 'Verify & Submit'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListVenue;
