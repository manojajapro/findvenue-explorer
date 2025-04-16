
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Venue {
  id: string;
  name: string;
  description: string;
  address?: string;
  city?: string;
  city_name?: string;
  cityId?: string;
  category?: string | string[];
  category_name?: string[];
  categoryId?: string | string[];
  imageUrl?: string;
  image_url?: string;
  gallery_images?: string[];
  galleryImages?: string[];
  capacity?: {
    min: number;
    max: number;
  };
  min_capacity?: number;
  max_capacity?: number;
  pricing?: {
    startingPrice: number;
    pricePerPerson?: number;
    hourlyRate?: number;
    currency: string;
  };
  starting_price?: number;
  price_per_person?: number;
  currency?: string;
  amenities?: string[];
  rating?: number;
  reviews?: number;
  reviews_count?: number;
  featured?: boolean;
  popular?: boolean;
  latitude?: number;
  longitude?: number;
  availability?: string[];
  parking?: boolean;
  wifi?: boolean;
  accessibility_features?: string[];
  accepted_payment_methods?: string[];
  opening_hours?: Record<string, {open: string, close: string}>;
  owner_info?: {
    name: string;
    contact: string;
    responseTime: string;
    user_id: string;
  };
  additional_services?: string[];
  type?: string;
  rules_and_regulations?: Array<{
    category: string;
    title: string;
    description: string;
  }>;
  zipcode?: string;
  categoryNames?: string[];
  status?: string;
}

export interface VenueFilter {
  city?: string;
  category?: string;
  minCapacity?: number;
  maxPrice?: number;
  amenities?: string[];
  priceRange?: [number, number];
  capacityRange?: [number, number];
  searchTerm?: string;
}
