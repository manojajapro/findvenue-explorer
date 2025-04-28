
export interface Venue {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  gallery_images?: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
  starting_price?: number;
  price_per_person?: number;
  min_capacity?: number;
  max_capacity?: number;
  amenities?: string[];
  owner_info?: {
    user_id: string;
    name?: string;
    email?: string;
  };
  status?: string;
}
