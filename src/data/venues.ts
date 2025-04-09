import { categories } from './categories';
import { saudiCities } from './cities';

export interface VenueRule {
  category: string;
  title: string;
  description: string;
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  galleryImages: string[];
  address: string;
  city: string;
  cityId: string;
  category: string;
  categoryId: string;
  capacity: {
    min: number;
    max: number;
  };
  pricing: {
    currency: string;
    startingPrice: number;
    pricePerPerson?: number;
  };
  amenities: string[];
  rating: number;
  reviews: number;
  featured?: boolean;
  popular?: boolean;
  availability?: string[];
  rules_and_regulations?: VenueRule[];
}

export const venues: Venue[] = [
  {
    id: 'four-seasons-ballroom',
    name: 'Four Seasons Ballroom',
    description: 'Elegant ballroom perfect for weddings and galas with panoramic city views.',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1507504031003-b417219a0fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    ],
    address: 'Kingdom Centre, King Fahd Road',
    city: 'Riyadh',
    cityId: 'riyadh',
    category: 'Wedding Venues',
    categoryId: 'wedding',
    capacity: {
      min: 100,
      max: 500
    },
    pricing: {
      currency: 'SAR',
      startingPrice: 25000,
      pricePerPerson: 350
    },
    amenities: ['Catering', 'Sound System', 'Lighting', 'Stage', 'Parking', 'WiFi', 'Bridal Suite'],
    rating: 4.8,
    reviews: 124,
    featured: true,
    popular: true,
    availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    rules_and_regulations: [
      {
        category: 'General Policies',
        title: 'Hours of Operation',
        description: 'Operating hours: Monday to Sunday from 8:00 AM to 11:00 PM. Last entry at 10:00 PM.'
      },
      {
        category: 'General Policies',
        title: 'Reservations and Bookings',
        description: 'Advance booking required. Minimum 7 days notice. Cancellations must be made 48 hours in advance for refund.'
      },
      {
        category: 'Conduct and Behavior',
        title: 'Guest Conduct',
        description: 'Respectful behavior expected. Appropriate attire required. Management reserves the right to refuse entry.'
      },
      {
        category: 'Facility Usage',
        title: 'Space Usage',
        description: 'Maximum capacity: 500 persons. No unauthorized access to restricted areas.'
      },
      {
        category: 'Food and Beverages',
        title: 'Catering and Refreshments',
        description: 'Outside food and beverages not permitted. Licensed caterers only.'
      }
    ]
  },
  {
    id: 'ritz-conference-center',
    name: 'The Ritz-Carlton Conference Center',
    description: 'State-of-the-art conference facilities with cutting-edge technology and professional services.',
    imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    ],
    address: 'Al Mather Street, Al Hada District',
    city: 'Riyadh',
    cityId: 'riyadh',
    category: 'Conference Spaces',
    categoryId: 'conference',
    capacity: {
      min: 50,
      max: 300
    },
    pricing: {
      currency: 'SAR',
      startingPrice: 18000,
      pricePerPerson: 250
    },
    amenities: ['AV Equipment', 'Video Conferencing', 'Business Services', 'Catering', 'WiFi', 'Parking', 'Breakout Rooms'],
    rating: 4.7,
    reviews: 98,
    featured: true,
    popular: true,
    availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Sun']
  },
  {
    id: 'hilton-garden-hall',
    name: 'Hilton Garden Hall',
    description: 'Versatile event space suitable for exhibitions, conferences, and social gatherings.',
    imageUrl: 'https://images.unsplash.com/photo-1562778612-e1e0cda9915c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1562778612-e1e0cda9915c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1540317580384-e5d43867caa6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1618506557292-ec1862b25272?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    ],
    address: 'Eastern Ring Road, Al Muruj',
    city: 'Riyadh',
    cityId: 'riyadh',
    category: 'Exhibition Halls',
    categoryId: 'exhibition',
    capacity: {
      min: 150,
      max: 700
    },
    pricing: {
      currency: 'SAR',
      startingPrice: 30000
    },
    amenities: ['Exhibition Booths', 'Loading Dock', 'High Ceilings', 'Flexible Layout', 'Catering', 'WiFi', 'Parking'],
    rating: 4.5,
    reviews: 76,
    featured: false,
    popular: true,
    availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  },
  {
    id: 'waldorf-grand-hall',
    name: 'Waldorf Grand Hall',
    description: 'Opulent event space ideal for luxury weddings and high-profile social events.',
    imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1613967193490-1d17b930c1a1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1519741347686-c1e331c5ee18?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    ],
    address: 'King Abdullah Road',
    city: 'Riyadh',
    cityId: 'riyadh',
    category: 'Wedding Venues',
    categoryId: 'wedding',
    capacity: {
      min: 200,
      max: 800
    },
    pricing: {
      currency: 'SAR',
      startingPrice: 40000,
      pricePerPerson: 400
    },
    amenities: ['Chandeliers', 'Catering', 'Valet Parking', 'Bridal Suite', 'Outdoor Terrace', 'Sound System', 'Lighting'],
    rating: 4.9,
    reviews: 152,
    featured: true,
    popular: true,
    availability: ['Thu', 'Fri', 'Sat']
  },
  {
    id: 'marsa-beach-venue',
    name: 'Marsa Beach Venue',
    description: 'Stunning beachfront location perfect for weddings and corporate events with beautiful sea views.',
    imageUrl: 'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1439130490301-25e322d88054?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1437422061949-f6efbde0a471?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1471044429572-1a9f718ace5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    ],
    address: 'Corniche Road',
    city: 'Jeddah',
    cityId: 'jeddah',
    category: 'Wedding Venues',
    categoryId: 'wedding',
    capacity: {
      min: 100,
      max: 400
    },
    pricing: {
      currency: 'SAR',
      startingPrice: 35000,
      pricePerPerson: 375
    },
    amenities: ['Beachfront', 'Outdoor Area', 'Tents', 'Catering', 'Sound System', 'Lighting', 'Parking'],
    rating: 4.7,
    reviews: 86,
    featured: true,
    popular: true,
    availability: ['Wed', 'Thu', 'Fri', 'Sat']
  },
  {
    id: 'kempinski-royal-hall',
    name: 'Kempinski Royal Hall',
    description: 'Luxurious ballroom with gold accents and crystal chandeliers, perfect for high-end events.',
    imageUrl: 'https://images.unsplash.com/photo-1515095182805-4cce456dc3a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1515095182805-4cce456dc3a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1505236858219-8359eb29e329?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1525776283233-4e2a5882a178?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    ],
    address: 'Al Khobar Corniche',
    city: 'Khobar',
    cityId: 'khobar',
    category: 'Wedding Venues',
    categoryId: 'wedding',
    capacity: {
      min: 150,
      max: 600
    },
    pricing: {
      currency: 'SAR',
      startingPrice: 38000,
      pricePerPerson: 425
    },
    amenities: ['Chandeliers', 'Gold Decor', 'Catering', 'Sound System', 'Lighting', 'Bridal Suite', 'Valet Parking'],
    rating: 4.8,
    reviews: 92,
    featured: true,
    popular: true,
    availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  {
    id: 'burj-rafal-lounge',
    name: 'Burj Rafal Lounge',
    description: 'Intimate setting with modern decor, ideal for corporate meetings and small gatherings.',
    imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1517502884422-41eaead166d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1462826303086-329426d1aef5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    ],
    address: 'King Fahd Road',
    city: 'Riyadh',
    cityId: 'riyadh',
    category: 'Corporate Events',
    categoryId: 'corporate',
    capacity: {
      min: 20,
      max: 80
    },
    pricing: {
      currency: 'SAR',
      startingPrice: 12000,
      pricePerPerson: 300
    },
    amenities: ['Video Conferencing', 'AV Equipment', 'WiFi', 'Catering', 'Coffee Break Service', 'Parking', 'Business Services'],
    rating: 4.6,
    reviews: 45,
    featured: false,
    popular: false,
    availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Sun']
  },
  {
    id: 'rosewood-sky-terrace',
    name: 'Rosewood Sky Terrace',
    description: 'Stunning rooftop venue with 360-degree city views, perfect for cocktail parties and receptions.',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1528495612343-9ca9f4a9f67c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    ],
    address: 'King Saud Road',
    city: 'Riyadh',
    cityId: 'riyadh',
    category: 'Party Venues',
    categoryId: 'party',
    capacity: {
      min: 50,
      max: 200
    },
    pricing: {
      currency: 'SAR',
      startingPrice: 22000,
      pricePerPerson: 325
    },
    amenities: ['Rooftop', 'Bar Setup', 'Lounge Furniture', 'Sound System', 'Lighting', 'Catering', 'Parking'],
    rating: 4.7,
    reviews: 68,
    featured: true,
    popular: true,
    availability: ['Wed', 'Thu', 'Fri', 'Sat']
  }
];

// Helper function to get venues by city
export const getVenuesByCity = (cityId: string): Venue[] => {
  return venues.filter(venue => venue.cityId === cityId);
};

// Helper function to get venues by category
export const getVenuesByCategory = (categoryId: string): Venue[] => {
  return venues.filter(venue => venue.categoryId === categoryId);
};

// Helper function to get popular venues
export const getPopularVenues = (): Venue[] => {
  return venues.filter(venue => venue.popular);
};

// Helper function to get featured venues
export const getFeaturedVenues = (): Venue[] => {
  return venues.filter(venue => venue.featured);
};

// Helper function to get venue by ID
export const getVenueById = (id: string): Venue | undefined => {
  return venues.find(venue => venue.id === id);
};
