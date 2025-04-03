
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isSameDay, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract initials from a name
 * @param name Full name
 * @returns Initials (up to 2 characters)
 */
export function getInitials(name: string): string {
  if (!name) return '';
  
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

/**
 * Check if a date is booked based on existing bookings
 * @param date Date to check
 * @param existingBookings Array of existing bookings
 * @returns Boolean indicating if date is booked
 */
export function isDateBooked(date: Date, existingBookings: any[]): boolean {
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  return existingBookings.some(booking => {
    // Skip cancelled bookings
    if (booking.status === 'cancelled') return false;
    
    // Check if booking date matches
    return booking.booking_date === formattedDate;
  });
}

/**
 * Get available time slots for a given date
 * @param date Date to check
 * @param existingBookings Array of existing bookings
 * @returns Array of available time slots
 */
export function getAvailableTimeSlots(date: Date, existingBookings: any[]): string[] {
  const allTimeSlots = generateTimeSlots();
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  // Filter bookings for the specific date
  const dateBookings = existingBookings.filter(booking => {
    // Skip cancelled bookings
    if (booking.status === 'cancelled') return false;
    
    // Check if booking date matches
    return booking.booking_date === formattedDate;
  });
  
  if (dateBookings.length === 0) {
    return allTimeSlots;
  }
  
  // Remove booked time slots
  return allTimeSlots.filter(timeSlot => {
    const hour = parseInt(timeSlot.split(':')[0]);
    
    return !dateBookings.some(booking => {
      const startHour = parseInt(booking.start_time.split(':')[0]);
      const endHour = parseInt(booking.end_time.split(':')[0]);
      
      // Check if time slot is within a booked period
      return hour >= startHour && hour < endHour;
    });
  });
}

/**
 * Generate time slots from 9:00 to 22:00
 * @returns Array of time slots
 */
export function generateTimeSlots(): string[] {
  const slots = [];
  for (let i = 9; i <= 21; i++) {
    slots.push(`${i.toString().padStart(2, '0')}:00`);
  }
  return slots;
}

/**
 * Checks if a time slot is available for a specific date
 * @param date Date to check
 * @param startTime Start time to check
 * @param endTime End time to check
 * @param existingBookings Array of existing bookings
 * @returns Boolean indicating if time slot is available
 */
export function isTimeSlotAvailable(
  date: Date, 
  startTime: string, 
  endTime: string, 
  existingBookings: any[]
): boolean {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return !existingBookings.some(booking => {
    // Skip cancelled bookings
    if (booking.status === 'cancelled') return false;
    
    // Skip bookings for different dates
    if (booking.booking_date !== dateStr) return false;
    
    const bookingStart = booking.start_time;
    const bookingEnd = booking.end_time;
    
    // Check if the time slots overlap
    return (startTime < bookingEnd && endTime > bookingStart);
  });
}
