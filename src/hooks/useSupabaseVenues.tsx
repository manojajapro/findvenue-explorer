
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Venue {
  id: string;
  name: string;
  description: string;
  address?: string;
  city?: string;
  cityId?: string;
  category?: string | string[];
  categoryId?: string | string[];
  imageUrl?: string;
  galleryImages?: string[];
  capacity: {
    min: number;
    max: number;
  };
  pricing: {
    startingPrice: number;
    pricePerPerson?: number;
    hourlyRate?: number;
    currency: string;
  };
  amenities?: string[];
  rating?: number;
  reviews?: number;
  featured?: boolean;
  popular?: boolean;
  latitude?: number;
  longitude?: number;
  availability?: string[];
  parking?: boolean;
  wifi?: boolean;
  accessibilityFeatures?: string[];
  acceptedPaymentMethods?: string[];
  openingHours?: Record<string, {open: string, close: string}>;
  ownerInfo?: {
    name: string;
    contact: string;
    responseTime: string;
    user_id: string;
    socialLinks?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
    };
  };
  additionalServices?: string[];
  type?: string;
  rulesAndRegulations?: Array<{
    category: string;
    title: string;
    description: string;
  }>;
  zipcode?: string;
  categoryNames?: string[];
  
  // Add these fields to bridge the gap between database fields and frontend expected fields
  // These are mapped from the database fields
  image_url?: string;
  gallery_images?: string[];
  city_name?: string;
  starting_price?: number;
  price_per_person?: number;
  currency?: string;
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
