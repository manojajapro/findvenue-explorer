import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Database, Json } from '@/integrations/supabase/types';
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
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { isVenueOwner, getVenueOwnerId } from '@/utils/venueHelpers';

// Define the venue schema for form validation
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
  city_id: z.string().uuid({
    message: "Please select a city.",
  }),
  category_id: z.string().uuid({
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
  amenities: z.string().array().optional(),
  wifi: z.boolean().default(false).optional(),
  parking: z.boolean().default(false).optional(),
  opening_hours: z.record(
    z.object({
      open: z.string(),
      close: z.string(),
    })
  ).optional(),
  availability: z.string().array().optional(),
  accepted_payment_methods: z.string().array().optional(),
  accessibility_features: z.string().array().optional(),
  additional_services: z.string().array().optional(),
  gallery_images: z.string().array().optional(),
  image_url: z.string().optional(),
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

  // Get the current user on mount
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
        
        // Parse amenities from the database
        let amenitiesArray = data.amenities || [];
        
        // Parse owner_info if it's a string
        let ownerInfo = null;
        if (data.owner_info) {
          try {
            ownerInfo = typeof data.owner_info === 'string' 
              ? JSON.parse(data.owner_info) 
              : data.owner_info;
          } catch (err) {
            console.error("Error parsing owner_info:", err);
          }
        }
        
        // Set default values for the form with all venue attributes
        form.reset({
          name: data.name,
          description: data.description || "",
          address: data.address || "",
          city_id: data.city_id || "",
          category_id: data.category_id || "",
          min_capacity: data.min_capacity || 1,
          max_capacity: data.max_capacity || 1,
          starting_price: data.starting_price || 0,
          price_per_person: data.price_per_person || 0,
          amenities: amenitiesArray,
          wifi: data.wifi || false,
          parking: data.parking || false,
          // Additional fields
          accepted_payment_methods: data.accepted_payment_methods || [],
          accessibility_features: data.accessibility_features || [],
          additional_services: data.additional_services || [],
          gallery_images: data.gallery_images || [],
          image_url: data.image_url || "",
          featured: data.featured || false,
          popular: data.popular || false,
          currency: data.currency || "SAR",
          // These fields might be treated as read-only or computed
          rating: data.rating,
          reviews_count: data.reviews_count,
          latitude: data.latitude,
          longitude: data.longitude,
          // Include opening_hours if available
          opening_hours: data.opening_hours as any,
          // Include owner_info if available
          owner_info: ownerInfo
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
        const formattedCategories = data.map(cat => ({
          id: cat.category_id || '',
          name: cat.category_name || ''
        })).filter(cat => cat.id && cat.name);

        setCategories(formattedCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [supabase]);

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
        const formattedCities = data.map(city => ({
          id: city.city_id || '',
          name: city.city_name || ''
        })).filter(city => city.id && city.name);

        setCities(formattedCities);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  }, [supabase]);

  const onSubmit = async (values: z.infer<typeof venueSchema>) => {
    setLoading(true);
    setError(null);
    
    // Preserve the original owner_info when updating
    if (venue && venue.owner_info && !values.owner_info) {
      values.owner_info = venue.owner_info;
    }

    console.log("Submitting venue update with values:", values);

    try {
      const { error } = await supabase
        .from('venues')
        .update(values)
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Venue updated successfully!",
        description: "Your venue details have been updated.",
      });
      navigate(`/venue/${id}`);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Update failed!",
        description: err.message || "Something went wrong. Please try again.",
      });
      console.error('Failed to update venue:', err);
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
  }, [supabase]);

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Edit the basic details of your venue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Venue Name */}
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

                {/* Venue Description */}
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

                {/* Venue Address */}
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

                {/* City Select */}
                <FormField
                  control={form.control}
                  name="city_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a city" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cities.map((city) => (
                            <SelectItem key={city.id} value={city.id}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The city where the venue is located.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category Select */}
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The category of the venue.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image URL */}
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Image URL" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL to the main image of your venue.
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
              <CardTitle>Capacity and Pricing</CardTitle>
              <CardDescription>Set capacity limits and pricing options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Minimum Capacity */}
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

                {/* Maximum Capacity */}
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

                {/* Starting Price */}
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

                {/* Price Per Person */}
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

                {/* Currency */}
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
              <CardDescription>Select the amenities and features your venue offers</CardDescription>
            </CardHeader>
            <CardContent>
              {/* WiFi */}
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

              {/* Parking */}
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

              {/* More Amenities as checkboxes */}
              <FormField
                control={form.control}
                name="amenities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Amenities</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {['air_conditioning', 'catering', 'sound_system', 'projector', 'stage', 'security'].map((amenity) => (
                        <div key={amenity} className="flex items-center space-x-2">
                          <Checkbox
                            id={amenity}
                            checked={field.value?.includes(amenity)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...(field.value || []), amenity]);
                              } else {
                                field.onChange(field.value?.filter((value) => value !== amenity));
                              }
                            }}
                          />
                          <label
                            htmlFor={amenity}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {amenity.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormDescription>
                      Select the amenities that your venue offers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Accessibility Features */}
              <FormField
                control={form.control}
                name="accessibility_features"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Accessibility Features</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {['wheelchair_access', 'elevator', 'accessible_restroom', 'accessible_parking'].map((feature) => (
                        <div key={feature} className="flex items-center space-x-2">
                          <Checkbox
                            id={feature}
                            checked={field.value?.includes(feature)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...(field.value || []), feature]);
                              } else {
                                field.onChange(field.value?.filter((value) => value !== feature));
                              }
                            }}
                          />
                          <label
                            htmlFor={feature}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {feature.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormDescription>
                      Select the accessibility features that your venue offers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Methods */}
              <FormField
                control={form.control}
                name="accepted_payment_methods"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Accepted Payment Methods</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {['Credit Card', 'Cash', 'Bank Transfer', 'Mobile Payment'].map((method) => (
                        <div key={method} className="flex items-center space-x-2">
                          <Checkbox
                            id={method.replace(' ', '_').toLowerCase()}
                            checked={field.value?.includes(method)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...(field.value || []), method]);
                              } else {
                                field.onChange(field.value?.filter((value) => value !== method));
                              }
                            }}
                          />
                          <label
                            htmlFor={method.replace(' ', '_').toLowerCase()}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {method}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormDescription>
                      Select the payment methods you accept.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Services</CardTitle>
              <CardDescription>Add any additional services your venue offers</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="additional_services"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Services</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {['catering', 'decoration', 'entertainment', 'photography', 'cleaning', 'valet_parking'].map((service) => (
                        <div key={service} className="flex items-center space-x-2">
                          <Checkbox
                            id={`service-${service}`}
                            checked={field.value?.includes(service)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...(field.value || []), service]);
                              } else {
                                field.onChange(field.value?.filter((value) => value !== service));
                              }
                            }}
                          />
                          <label
                            htmlFor={`service-${service}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {service.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormDescription>
                      Select additional services you provide with the venue.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Venue"}
            </Button>

            {/* Delete Venue */}
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Venue</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your venue
                    and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsDeleteAlertOpen(false)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditVenue;
