
import { useState } from 'react';
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
import { Check, Upload, AlertCircle } from 'lucide-react';

const ListVenue = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
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
  
  // Handle next step
  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.description || !formData.address || !formData.city || !formData.category) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields before proceeding',
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
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const anyAvailability = Object.values(formData.availability).some(value => value);
    
    if (!anyAvailability) {
      toast({
        title: 'Availability Required',
        description: 'Please select at least one day of availability',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: 'Venue Submitted',
        description: 'Your venue has been submitted for review'
      });
      setIsLoading(false);
      
      // Reset form and go back to step 1
      setFormData({
        name: '',
        description: '',
        address: '',
        city: '',
        category: '',
        minCapacity: '',
        maxCapacity: '',
        price: '',
        pricingType: 'flat',
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
      setStep(1);
      
      // Redirect would happen here
    }, 2000);
  };
  
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
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
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Venue Type <span className="text-red-500">*</span></Label>
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
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Venue Photos</Label>
                    <div className="border border-dashed border-white/20 rounded-md p-6 text-center">
                      <div className="flex flex-col items-center">
                        <Upload className="h-10 w-10 text-findvenue-text-muted mb-2" />
                        <p className="text-findvenue-text-muted mb-2">Drag and drop photos or click to upload</p>
                        <p className="text-xs text-findvenue-text-muted mb-4">
                          Upload high-quality images (up to 10 images, max 5MB each)
                        </p>
                        <Button type="button" variant="outline" className="border-findvenue text-findvenue hover:bg-findvenue/10">
                          Select Files
                        </Button>
                      </div>
                    </div>
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
    </div>
  );
};

export default ListVenue;
