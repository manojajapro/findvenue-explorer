import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionContext } from '@supabase/auth-helpers-react';
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
} from "@/components/ui/form"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover';
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  const { supabaseClient } = useSessionContext();
  const { toast } = useToast();

  const [venue, setVenue] = useState<Database['public']['Tables']['venues']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
	const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const form = useForm<VenueValues>({
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
  })

  const fetchVenue = useCallback(async () => {
    if (!id) {
      setError('Venue ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabaseClient
        .from('venues')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setVenue(data);
        // Set default values for the form
        form.reset({
          name: data.name,
          description: data.description || "",
          address: data.address || "",
          city_id: data.city_id || "",
          category_id: data.category_id || "",
          min_capacity: data.min_capacity || 1,
          max_capacity: data.max_capacity || 1,
          starting_price: data.starting_price || 0,
          price_per_person: data.price_per_person,
          amenities: data.amenities || [],
          wifi: data.wifi || false,
          parking: data.parking || false,
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
  }, [id, supabaseClient, form]);

  useEffect(() => {
    fetchVenue();
  }, [fetchVenue]);

  useEffect(() => {
		const fetchCategories = async () => {
			try {
				const { data, error } = await supabaseClient
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
		};

		fetchCategories();
	}, [supabaseClient]);

	useEffect(() => {
		const fetchCities = async () => {
			try {
				const { data, error } = await supabaseClient
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
		};

		fetchCities();
	}, [supabaseClient]);

  const onSubmit = async (values: VenueValues) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabaseClient
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
      navigate('/venues');
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Update failed!",
        description: "Something went wrong. Please try again.",
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
      const { error } = await supabaseClient
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

  const { session } = useSessionContext();
  const user = session?.user;

  // New code to safely check the user ID:
  const ownerInfoObj = typeof venue?.owner_info === 'object'
    ? venue.owner_info
    : null;

  const isOwner = !!user?.id && !!ownerInfoObj && 'user_id' in ownerInfoObj && ownerInfoObj.user_id === user.id;

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!venue) {
    return <div>Venue not found.</div>;
  }

  if (!isOwner) {
    return <div>You are not authorized to edit this venue.</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5">Edit Venue</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description"
                      className="resize-none"
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
									<Select onValueChange={field.onChange} defaultValue={field.value}>
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
									<Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    />
                  </FormControl>
                  <FormDescription>
                    The starting price of the venue.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Amenities */}
          <FormField
            control={form.control}
            name="amenities"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amenities</FormLabel>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="wifi"
                      checked={field.value?.includes("wifi")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange([...(field.value || []), "wifi"])
                        } else {
                          field.onChange(field.value?.filter((value) => value !== "wifi"))
                        }
                      }}
                    />
                    <label
                      htmlFor="wifi"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      WiFi
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="parking"
                      checked={field.value?.includes("parking")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange([...(field.value || []), "parking"])
                        } else {
                          field.onChange(field.value?.filter((value) => value !== "parking"))
                        }
                      }}
                    />
                    <label
                      htmlFor="parking"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Parking
                    </label>
                  </div>
                  {/* Add more amenities here */}
                </div>
                <FormDescription>
                  Select the amenities that your venue offers.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Opening Hours */}
          <FormField
            control={form.control}
            name="opening_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening Hours</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="open">Open</Label>
                    <Input
                      type="time"
                      id="open"
                      defaultValue="09:00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="close">Close</Label>
                    <Input
                      type="time"
                      id="close"
                      defaultValue="17:00"
                      className="mt-1"
                    />
                  </div>
                </div>
                <FormDescription>
                  Set the opening hours for your venue.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Venue"}
          </Button>
        </form>
      </Form>

      {/* Delete Venue */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="mt-5">Delete Venue</Button>
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
  );
};

export default EditVenue;
