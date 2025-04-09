
export interface City {
  id: string;
  name: string;
  imageUrl: string;
  venueCount: number;
  gallery_images?: string[];
}

export const cities: City[] = [
  {
    id: 'riyadh',
    name: 'Riyadh',
    imageUrl: 'https://images.unsplash.com/photo-1586724220920-24298dfe929e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 215,
    gallery_images: []
  },
  {
    id: 'jeddah',
    name: 'Jeddah',
    imageUrl: 'https://images.unsplash.com/photo-1604568530003-f22b0d49794c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 187,
    gallery_images: []
  },
  {
    id: 'dammam',
    name: 'Dammam',
    imageUrl: 'https://images.unsplash.com/photo-1518868178-952b41a0608b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 94,
    gallery_images: []
  },
  {
    id: 'mecca',
    name: 'Mecca',
    imageUrl: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 76,
    gallery_images: []
  },
  {
    id: 'medina',
    name: 'Medina',
    imageUrl: 'https://images.unsplash.com/photo-1591604122489-863e001c4e86?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 62,
    gallery_images: []
  },
  {
    id: 'taif',
    name: 'Taif',
    imageUrl: 'https://images.unsplash.com/photo-1518533954129-7774297db60f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 41,
    gallery_images: []
  }
];

// For compatibility with existing code
export const saudiCities = cities;
export const globalCities = cities;
