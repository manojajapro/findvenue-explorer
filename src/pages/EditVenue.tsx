import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isVenueOwner, getVenueOwnerId } from '@/utils/venueHelpers';
import { X, Upload } from 'lucide-react';
import TagInput from '@/components/ui/TagInput';

const venueSchema = z.object({
  name: z.string().min(3, {
    message: "Venue name must be at least 3 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  address: z.string().min(5, {
    message: "Address must be at least 5 characters.",
  }),
  city_id: z.string().min(1, {
    message: "Please select a city.",
  }),
  category_id: z.string().min(1, {
    message: "Please select a category.",
  }),
  min_capacity: z.number().min(1, {
    message: "Minimum capacity must be at least 1.",
  }).max(10000, {
    message: "Minimum capacity must be less than 10,000.",
  }),
  max_capacity: z.number().min(1, {
    message: "Maximum capacity must be at least 1.",
  }).max(10000, {
    message: "Maximum capacity must be less than 10,000.",
  }),
  starting_price: z.number().min(0, {
    message: "Starting price must be at least 0.",
  }),
  price_per_person: z.number().optional(),
  amenities: z.array(z.string()).default([]),
  wifi: z.boolean().default(false),
  parking: z.boolean().default(false),
  opening_hours: z.record(
    z.object({
      open: z.string(),
      close: z.string(),
    })
  ).optional(),
  availability: z.array(z.string()).default([]),
  accepted_payment_methods: z.array(z.string()).default([]),
  accessibility_features: z.array(z.string()).default([]),
  additional_services: z.array(z.string()).default([]),
  gallery_images: z.array(z.string()).default([]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  featured: z.boolean().optional(),
  popular: z.boolean().optional(),
  currency: z.string().optional(),
  rating: z.number().optional(),
  reviews_count: z.number().optional(),
  owner_info: z.object({
    name: z.string().optional(),
    contact: z.string().optional(),
    response_time: z.string().optional(),
    user_id: z.string().optional(),
  }).optional(),
  type: z.string().optional(),
  zipcode: z.string().optional(),
  rules_and_regulations: z.object({
    general: z.array(z.string()).optional(),
    booking: z.array(z.string()).optional()
  }).optional(),
});

type VenueValues = z.infer<typeof venueSchema>

const EditVenue = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [venue, setVenue] = useState<Database['public']['Tables']['venues']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);
  const [customAccessibility, setCustomAccessibility] = useState<string[]>([]);
  const [customPaymentMethods, setCustomPaymentMethods] = useState<string[]>([]);
  const [customServices, setCustomServices] = useState<string[]>([]);
  const [customRulesGeneral, setCustomRulesGeneral] = useState<string[]>([
    'No smoking indoors',
    'No pets allowed',
    'No outside food or beverages',
    'All decorations must be approved by management',
    'Noise levels must be kept reasonable after 10 PM'
  ]);
  
  const [customRulesBooking, setCustomRulesBooking] = useState<string[]>([
    '50% advance payment required to confirm booking',
    'Cancellations within 48 hours are non-refundable',
    'Venue must be vacated at agreed time',
    'Damage to property will incur additional charges',
    'COVID safety protocols must be followed'
  ]);

  const [categoryNames, setCategoryNames] = useState<string[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    
    getUser();
  }, []);

  const form = useForm<z.infer<typeof venueSchema>>({
    resolver: zodResolver(venueSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      city_id: "",
      category_id: "",
      min_capacity: 1,
      max_capacity: 1,
      starting_price: 0,
      amenities: [],
      wifi: false,
      parking: false,
      opening_hours: {
        monday: { open: "09:00", close: "17:00" },
        tuesday: { open: "09:00", close: "17:00" },
        wednesday: { open: "09:00", close: "17:00" },
        thursday: { open: "09:00", close: "17:00" },
        friday: { open: "09:00", close: "17:00" },
        saturday: { open: "09:00", close: "17:00" },
        sunday: { open: "09:00", close: "17:00" }
      }
    },
    mode: "onChange",
  });

  const fetchVenue = useCallback(async () => {
    if (!id) {
      setError('Venue ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        console.log("Fetched venue data:", data);
        setVenue(data);
        
        if (data.gallery_images && Array.isArray(data.gallery_images)) {
          setGalleryImages(data.gallery_images);
        }
        
        if (data.amenities && Array.isArray(data.amenities)) {
          setCustomAmenities(data.amenities);
        }
        
        if (data.accessibility_features && Array.isArray(data.accessibility_features)) {
          setCustomAccessibility(data.accessibility_features);
        }
        
        if (data.accepted_payment_methods && Array.isArray(data.accepted_payment_methods)) {
          setCustomPaymentMethods(data.accepted_payment_methods);
        }
        
        if (data.additional_services && Array.isArray(data.additional_services)) {
          setCustomServices(data.additional_services);
        }
        
        if (data.category_name) {
          let processedCategories: string[] = [];
          
          if (Array.isArray(data.category_name)) {
            processedCategories = data.category_name.map(String);
          } else if (typeof data.category_name === 'string') {
            try {
              const parsed = JSON.parse(data.category_name);
              if (Array.isArray(parsed)) {
                processedCategories = parsed.map(String);
              } else {
                processedCategories = [String(data.category_name)];
              }
            } catch (e) {
              processedCategories = [String(data.category_name)];
            }
          }
          
          console.log("Processed category names:", processedCategories);
          setCategoryNames(processedCategories);
        }
        
        let ownerInfo = null;
        if (data.owner_info) {
          try {
            if (typeof data.owner_info === 'string') {
              ownerInfo = JSON.parse(data.owner_info);
            } else if (typeof data.owner_info === 'object' && !Array.isArray(data.owner_info)) {
              ownerInfo = data.owner_info;
            }
          } catch (err) {
            console.error("Error parsing owner_info:", err);
          }
        }
        
        let openingHours = null;
        if (data.opening_hours) {
          try {
            if (typeof data.opening_hours === 'string') {
              openingHours = JSON.parse(data.opening_hours);
            } else if (typeof data.opening_hours === 'object') {
              openingHours = data.opening_hours;
            }
          } catch (err) {
            console.error("Error parsing opening_hours:", err);
            openingHours = {
              monday: { open: "09:00", close: "17:00" },
              tuesday: { open: "09:00", close: "17:00" },
              wednesday: { open: "09:00", close: "17:00" },
              thursday: { open: "09:00", close: "17:00" },
              friday: { open: "09:00", close: "17:00" },
              saturday: { open: "09:00", close: "17:00" },
              sunday: { open: "09:00", close: "17:00" }
            };
          }
        } else {
          openingHours = {
            monday: { open: "09:00", close: "17:00" },
            tuesday: { open: "09:00", close: "17:00" },
            wednesday: { open: "09:00", close: "17:00" },
            thursday: { open: "09:00", close: "17:00" },
            friday: { open: "09:00", close: "17:00" },
            saturday: { open: "09:00", close: "17:00" },
            sunday: { open: "09:00", close: "17:00" }
          };
        }
        
        let rulesAndRegulations = null;
        if (data.rules_and_regulations) {
          try {
            if (typeof data.rules_and_regulations === 'string') {
              rulesAndRegulations = JSON.parse(data.rules_and_regulations);
            } else if (typeof data.rules_and_regulations === 'object') {
              rulesAndRegulations = data.rules_and_regulations;
            }
            
            if (rulesAndRegulations) {
              if (Array.isArray(rulesAndRegulations.general)) {
                setCustomRulesGeneral(rulesAndRegulations.general);
              }
              
              if (Array.isArray(rulesAndRegulations.booking)) {
                setCustomRulesBooking(rulesAndRegulations.booking);
              }
            }
          } catch (err) {
            console.error("Error parsing rules_and_regulations:", err);
          }
        }
        
        form.reset({
          name: data.name,
          description: data.description || "",
          address: data.address || "",
          city_id: data.city_id || "",
          category_id: data.category_id || "",
          min_capacity: data.min_capacity || 1,
          max_capacity: data.max_capacity || 1,
          starting_price: data.starting_price || 0,
          price_per_person: data.price_per_person || undefined,
          amenities: data.amenities || [],
          wifi: data.wifi || false,
          parking: data.parking || false,
          accepted_payment_methods: data.accepted_payment_methods || [],
          accessibility_features: data.accessibility_features || [],
          additional_services: data.additional_services || [],
          gallery_images: data.gallery_images || [],
          featured: data.featured || false,
          popular: data.popular || false,
          currency: data.currency || "SAR",
          rating: data.rating,
          reviews_count: data.reviews_count,
          latitude: data.latitude,
          longitude: data.longitude,
          opening_hours: openingHours,
          owner_info: ownerInfo as any,
          availability: data.availability || [],
          type: data.type || "",
          zipcode: data.zipcode || "",
          rules_and_regulations: rulesAndRegulations || {
            general: customRulesGeneral,
            booking: customRulesBooking
          },
        });
      } else {
        setError('Venue not found.');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch venue:', err);
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('category_groups')
        .select('category_id, category_name')
        .order('category_name');

      if (error) {
        throw error;
      }

      if (data) {
        console.log("Fetched categories:", data);
        const uniqueCategories = new Map();
        data.forEach(cat => {
          if (cat.category_id && cat.category_name) {
            uniqueCategories.set(cat.category_id, {
              id: cat.category_id,
              name: cat.category_name
            });
          }
        });
        
        const formattedCategories = Array.from(uniqueCategories.values());
        console.log("Formatted unique categories:", formattedCategories);
        setCategories(formattedCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchCities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('city_groups')
        .select('city_id, city_name')
        .order('city_name');

      if (error) {
        throw error;
      }

      if (data) {
        console.log("Fetched cities:", data);
        const uniqueCities = new Map();
        data.forEach(city => {
          if (city.city_id && city.city_name) {
            uniqueCities.set(city.city_id, {
              id: city.city_id,
              name: city.city_name
            });
          }
        });
        
        const formattedCities = Array.from(uniqueCities.values());
        console.log("Formatted unique cities:", formattedCities);
        setCities(formattedCities);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  }, []);

  const onSubmit = async (values: z.infer<typeof venueSchema>) => {
    console.log("Submit button clicked");
    console.log("Form values:", values);
    console.log("User:", user);
    console.log("Venue ID:", id);
    setLoading(true);
    setError(null);
    
    try {
      console.log("Starting venue update with ID:", id);
      console.log("Form values before updating custom fields:", values);
      
      values.amenities = customAmenities;
      values.accessibility_features = customAccessibility;
      values.accepted_payment_methods = customPaymentMethods;
      values.additional_services = customServices;
      values.gallery_images = galleryImages;
      
      values.category_name = categoryNames;
      
      if (venue && venue.owner_info && !values.owner_info) {
        if (typeof venue.owner_info === 'string') {
          try {
            values.owner_info = JSON.parse(venue.owner_info);
          } catch (err) {
            console.error("Error parsing venue owner_info:", err);
          }
        } else {
          values.owner_info = venue.owner_info as any;
        }
      }

      if (!values.owner_info) {
        values.owner_info = {
          user_id: user?.id || '',
          name: '',
          contact: '',
          response_time: ''
        };
      }

      console.log("Final venue update values:", values);

      const { data, error: updateError } = await supabase
        .from('venues')
        .update(values)
        .eq('id', id)
        .select();

      console.log("Update response:", data);
      console.log("Update error:", updateError);

      if (updateError) {
        console.error("Supabase update error:", updateError);
        throw updateError;
      }

      toast({
        title: "Venue updated successfully!",
        description: "Your venue details have been updated.",
      });
      navigate(`/venue/${id}`);
    } catch (err: any) {
      console.error('Failed to update venue:', err);
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Update failed!",
        description: err.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Venue deleted successfully!",
        description: "Your venue has been removed.",
      });
      navigate('/venues');
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Deletion failed!",
        description: "Something went wrong. Please try again.",
      });
      console.error('Failed to delete venue:', err);
    } finally {
      setLoading(false);
      setIsDeleteAlertOpen(false);
    }
  };

  const checkIsOwner = useCallback(() => {
    if (!user || !venue) return false;
    return isVenueOwner(venue, user.id);
  }, [user, venue]);

  useEffect(() => {
    fetchVenue();
  }, [fetchVenue]);

  useEffect(() => {
    fetchCategories();
    fetchCities();
  }, [fetchCategories, fetchCities]);

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Empty URL",
        description: "Please enter a valid image URL",
      });
      return;
    }
    
    if (galleryImages.includes(newImageUrl)) {
      toast({
        variant: "destructive",
        title: "Duplicate URL",
        description: "This image URL is already in your gallery",
      });
      return;
    }
    
    setGalleryImages(prev => [...prev, newImageUrl]);
    setNewImageUrl('');
    
    toast({
      title: "Image Added",
      description: "Your image has been added to the gallery",
    });
  };
  
  const handleRemoveImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingImage(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > 5 * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: "File Too Large",
            description: `${file.name} exceeds the 5MB limit`,
          });
          continue;
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `venues/${user?.id}/${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('venue-images')
          .upload(filePath, file);
          
        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: `Failed to upload ${file.name}: ${uploadError.message}`,
          });
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('venue-images')
          .getPublicUrl(filePath);
          
        setGalleryImages(prev => [...prev, publicUrl]);
        
        toast({
          title: "Upload Successful",
          description: `${file.name} has been uploaded`,
        });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: error.message || "An unexpected error occurred during upload",
      });
    } finally {
      setUploadingImage(false);
      
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  if (loading) {
    return <div className="container mx-auto py-10 text-center">Loading venue data...</div>;
  }

  if (error) {
    return <div className="container mx-auto py-10 text-center">Error: {error}</div>;
  }

  if (!venue) {
    return <div className="container mx-auto py-10 text-center">Venue not found.</div>;
  }

  if (!checkIsOwner()) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Not Authorized</h1>
        <p className="mb-6">You don't have permission to edit this venue.</p>
        <Button onClick={() => navigate(`/venue/${id}`)}>
          View Venue Details
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5">Edit Venue</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => {
          console.log("Form submitted with values:", values);
          onSubmit(values);
        }, (errors) => {
          console.error("Form validation errors:", errors);
        })} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Edit the basic details of your venue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Venue Name" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is the name of your venue.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Type</FormLabel>
                      <FormControl>
                        <Input placeholder="Venue Type (e.g. Ballroom, Conference Hall)" {...field} />
                      </FormControl>
                      <FormDescription>
                        The type of venue you're offering.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Description"
                          className="resize-none h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Describe your venue.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Address" {...field} />
                      </FormControl>
                      <FormDescription>
                        The physical address of the venue.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zipcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Zipcode" {...field} />
                      </FormControl>
                      <FormDescription>
                        The postal/zip code of the venue.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city name" {...field} />
                      </FormControl>
                      <FormDescription>
                        The city where the venue is located.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-1 md:col-span-2">
                  <div className="space-y-2">
                    <Label htmlFor="category_names">Categories</Label>
                    <TagInput
                      tags={categoryNames}
                      setTags={setCategoryNames}
                      placeholder="Add category and press Enter"
                      className="w-full"
                    />
                    <FormDescription>
                      The categories for your venue (e.g., Wedding, Conference, Birthday). Enter multiple categories if needed.
                    </FormDescription>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Capacity and Pricing</CardTitle>
              <CardDescription>Set capacity limits and pricing options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="min_capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Capacity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Minimum Capacity"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        The minimum capacity of the venue.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Capacity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Maximum Capacity"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        The maximum capacity of the venue.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="starting_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Starting Price"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        The starting price of the venue.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price_per_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Per Person</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Price Per Person"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(Number(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        The price per person (if applicable).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'SAR'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SAR">SAR (Saudi Riyal)</SelectItem>
                          <SelectItem value="USD">USD (US Dollar)</SelectItem>
                          <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The currency for your venue pricing.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amenities and Features</CardTitle>
              <CardDescription>Manage amenities and features your venue offers</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="wifi"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">WiFi</FormLabel>
                      <FormDescription>
                        Does your venue offer WiFi?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parking"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Parking</FormLabel>
                      <FormDescription>
                        Does your venue offer parking?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Amenities</h3>
                  <TagInput
                    tags={customAmenities}
                    setTags={setCustomAmenities}
                    placeholder="Add amenity and press Enter"
                    className="w-full"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Accessibility Features</h3>
                  <TagInput
                    tags={customAccessibility}
                    setTags={setCustomAccessibility}
                    placeholder="Add accessibility feature and press Enter"
                    className="w-full"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Accepted Payment Methods</h3>
                  <TagInput
                    tags={customPaymentMethods}
                    setTags={setCustomPaymentMethods}
                    placeholder="Add payment method and press Enter"
                    className="w-full"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Additional Services</h3>
                  <TagInput
                    tags={customServices}
                    setTags={setCustomServices}
                    placeholder="Add additional service and press Enter"
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rules and Regulations</CardTitle>
              <CardDescription>Set venue rules and booking terms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">General Rules</h3>
                  <TagInput
                    tags={customRulesGeneral}
                    setTags={setCustomRulesGeneral}
                    placeholder="Add rule and press Enter"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Booking Terms</h3>
                  <TagInput
                    tags={customRulesBooking}
                    setTags={setCustomRulesBooking}
                    placeholder="Add booking term and press Enter"
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gallery Images</CardTitle>
              <CardDescription>Add images of your venue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input 
                    placeholder="Image URL" 
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddImageUrl}
                    disabled={!newImageUrl.trim()}
                  >
                    Add URL
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="file-upload" className="cursor-pointer bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors flex items-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Images
                  </Label>
                  <Input 
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    multiple
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  {uploadingImage && <span className="text-sm text-muted-foreground">Uploading...</span>}
                </div>
                
                {galleryImages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Gallery Preview</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {galleryImages.map((url, index) => (
                        <div key={index} className="group relative rounded-md overflow-hidden aspect-square">
                          <img 
                            src={url} 
                            alt={`Gallery image ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" type="button">
                  Delete Venue
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your venue
                    and remove it from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <div className="space-x-2">
              <Button type="button" variant="outline" onClick={() => navigate('/my-venues?tab=my-venues')}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditVenue;
