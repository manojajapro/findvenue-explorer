
export interface City {
  id: string;
  name: string;
  imageUrl: string;
  venueCount: number;
  featured?: boolean;
  gallery_images?: string[];
}

export const saudiCities: City[] = [
  {
    id: 'riyadh',
    name: 'Riyadh',
    imageUrl: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 245,
    featured: true
  },
  {
    id: 'jeddah',
    name: 'Jeddah',
    imageUrl: 'https://images.unsplash.com/photo-1631724355047-896ce6478e8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 178,
    featured: true
  },
  {
    id: 'dammam',
    name: 'Dammam',
    imageUrl: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 112,
    featured: true
  },
  {
    id: 'mecca',
    name: 'Mecca',
    imageUrl: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 89,
    featured: true
  },
  {
    id: 'medina',
    name: 'Medina',
    imageUrl: 'https://images.unsplash.com/photo-1591604130107-0b14342fc586?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 75,
    featured: false
  },
  {
    id: 'tabuk',
    name: 'Tabuk',
    imageUrl: 'https://images.unsplash.com/photo-1578895101408-1a6b23e3de02?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 43,
    featured: false
  },
  {
    id: 'abha',
    name: 'Abha',
    imageUrl: 'https://images.unsplash.com/photo-1528702748617-c64d49f918af?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 38,
    featured: false
  },
  {
    id: 'khobar',
    name: 'Khobar',
    imageUrl: 'https://images.unsplash.com/photo-1578321272354-e31cd748bdd2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 92,
    featured: true
  }
];

export const globalCities: City[] = [
  {
    id: 'dubai',
    name: 'Dubai, UAE',
    imageUrl: 'https://images.unsplash.com/photo-1546412414-e1885e51b9e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 320
  },
  {
    id: 'london',
    name: 'London, UK',
    imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 498
  },
  {
    id: 'newyork',
    name: 'New York, US',
    imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 567
  },
  {
    id: 'paris',
    name: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 412
  },
  {
    id: 'tokyo',
    name: 'Tokyo, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 386
  },
  {
    id: 'sydney',
    name: 'Sydney, Australia',
    imageUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    venueCount: 278
  }
];
