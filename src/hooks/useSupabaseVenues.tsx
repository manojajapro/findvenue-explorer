
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
  };
  additionalServices?: string[];
  type?: string; // Adding the missing type property
  rulesAndRegulations?: Array<{
    category: string;
    title: string;
    description: string;
  }>;
  zipcode?: string;
  categoryNames?: string[];
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
