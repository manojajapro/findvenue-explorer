
export interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  venueCount: number;
  gallery_images?: string[];
}

export const categories: Category[] = [
  {
    id: 'wedding',
    name: 'Wedding Venues',
    description: 'Perfect spaces for your special day',
    imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 189,
    gallery_images: []
  },
  {
    id: 'conference',
    name: 'Conference Spaces',
    description: 'Professional settings for business events',
    imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 246,
    gallery_images: []
  },
  {
    id: 'party',
    name: 'Party Venues',
    description: 'Celebrate in style at these vibrant spaces',
    imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 173,
    gallery_images: []
  },
  {
    id: 'corporate',
    name: 'Corporate Events',
    description: 'Impress clients and colleagues',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 204,
    gallery_images: []
  },
  {
    id: 'exhibition',
    name: 'Exhibition Halls',
    description: 'Showcase your products in spacious settings',
    imageUrl: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 98,
    gallery_images: []
  },
  {
    id: 'private',
    name: 'Private Dining',
    description: 'Intimate meals in exclusive settings',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 156,
    gallery_images: []
  }
];
