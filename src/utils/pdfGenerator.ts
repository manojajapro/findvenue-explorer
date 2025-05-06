
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import * as QRCode from "qrcode";

interface BookingPDFData {
  id: string;
  venue_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  guests: number;
  address?: string;
  venue_id: string;
  pricePerPerson?: number;
  cityName?: string;
}

export const generateBookingConfirmationPDF = async (booking: BookingPDFData): Promise<string> => {
  // Create PDF document with modern styling
  const doc = new jsPDF();
  
  // Set background color for the entire page
  doc.setFillColor(16, 24, 39); // Dark blue background
  doc.rect(0, 0, 210, 297, 'F');
  
  // Add decorative elements - blurred circles in brand colors
  const addBlurredCircle = (x: number, y: number, radius: number, color: [number, number, number], alpha: number) => {
    // Create gradient effect manually with decreasing opacity circles
    for (let i = radius; i > 0; i -= 2) {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(x, y, i, 'F');
    }
  };
  
  // Add decorative blurred circles
  addBlurredCircle(30, 30, 60, [16, 185, 129], 0.3); // Avnu green
  addBlurredCircle(170, 240, 80, [41, 128, 185], 0.2); // Avnu blue
  
  // Add semi-transparent overlay to enhance text readability
  doc.setFillColor(16, 24, 39);
  doc.rect(15, 15, 180, 267, 'F');
  
  // Add decorative header bar
  doc.setFillColor(16, 185, 129); // Avnu green
  doc.rect(15, 15, 180, 8, 'F');
  
  // Add Avnu logo/text header
  doc.setFontSize(38);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("AVNU", 105, 40, { align: 'center' });
  
  // Add confirmation title
  doc.setFontSize(22);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 220, 220);
  doc.text("Booking Confirmation", 105, 55, { align: 'center' });
  
  // Add modern divider
  doc.setDrawColor(16, 185, 129); // Avnu green
  doc.setLineWidth(0.5);
  doc.line(40, 65, 170, 65);
  
  // Status section with color
  const statusColors: Record<string, [number, number, number]> = {
    'confirmed': [16, 185, 129], // Avnu green
    'pending': [241, 196, 15],
    'cancelled': [231, 76, 60],
    'default': [41, 128, 185] // Avnu blue
  };
  
  const statusColor = statusColors[booking.status.toLowerCase()] || statusColors['default'];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(25, 75, 160, 15, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`STATUS: ${booking.status.toUpperCase()}`, 105, 84, { align: 'center' });
  
  // Reset text color for regular content
  doc.setTextColor(220, 220, 220);
  doc.setFont("helvetica", "normal");
  
  // Booking details section
  const startY = 105;
  const leftColumnX = 25;
  const rightColumnX = 115;
  
  // Helper function for adding labeled info
  const addLabeledInfo = (label: string, value: string, x: number, y: number) => {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(label, x, y);
    
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(value || 'N/A', x, y + 7);
    
    return y + 20; // Return next Y position
  };
  
  // Left column details
  let currentY = startY;
  currentY = addLabeledInfo("VENUE", booking.venue_name, leftColumnX, currentY);
  currentY = addLabeledInfo("DATE", format(new Date(booking.booking_date), "MMMM d, yyyy"), leftColumnX, currentY);
  currentY = addLabeledInfo("TIME", `${booking.start_time} - ${booking.end_time}`, leftColumnX, currentY);
  currentY = addLabeledInfo("NUMBER OF GUESTS", booking.guests.toString(), leftColumnX, currentY);
  
  // Reset for right column
  currentY = startY;
  
  // Right column details - Address handling
  const fullAddress = booking.address || 'Address not available';
  const displayAddress = booking.cityName ? `${fullAddress}, ${booking.cityName}` : fullAddress;
  
  currentY = addLabeledInfo("ADDRESS", displayAddress, rightColumnX, currentY);
  if (booking.pricePerPerson && booking.pricePerPerson > 0) {
    currentY = addLabeledInfo("PRICE PER PERSON", `SAR ${booking.pricePerPerson.toLocaleString()}`, rightColumnX, currentY);
  }
  currentY = addLabeledInfo("BOOKING ID", booking.id, rightColumnX, currentY);
  
  // Add divider before pricing section
  const priceSectionY = Math.max(currentY + 15, 200);
  doc.setDrawColor(16, 185, 129); // Avnu green
  doc.setLineWidth(0.5);
  doc.line(25, priceSectionY - 10, 185, priceSectionY - 10);
  
  // Total price section with larger font and highlight box
  doc.setFillColor(30, 41, 59); // Darker blue for price box
  doc.roundedRect(25, priceSectionY - 5, 160, 25, 3, 3, 'F');
  
  doc.setFontSize(12);
  doc.setTextColor(150, 150, 150);
  doc.text("TOTAL PRICE", 35, priceSectionY + 8);
  
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129); // Avnu green
  doc.setFont("helvetica", "bold");
  doc.text(`SAR ${booking.total_price.toLocaleString()}`, 175, priceSectionY + 8, { align: 'right' });
  
  // If there's price per person, show the calculation
  if (booking.guests > 1 && booking.pricePerPerson && booking.pricePerPerson > 0) {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(`(${booking.guests} guests × SAR ${booking.pricePerPerson.toLocaleString()})`, 175, priceSectionY + 18, { align: 'right' });
  }
  
  // Add special notes section if applicable
  if (booking.status === 'confirmed') {
    const notesY = priceSectionY + 35;
    doc.setFillColor(30, 41, 59); // Darker blue
    doc.roundedRect(25, notesY, 160, 30, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(220, 220, 220);
    doc.setFont("helvetica", "bold");
    doc.text("IMPORTANT INFORMATION", 35, notesY + 10);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Please arrive 15 minutes before your booking time.", 35, notesY + 20);
    doc.text("Don't forget to bring your booking confirmation.", 35, notesY + 28);
  }
  
  // Generate and add QR code
  try {
    const qrCodeData = JSON.stringify({
      bookingId: booking.id,
      venueId: booking.venue_id,
      venueName: booking.venue_name,
      date: booking.booking_date,
      status: booking.status
    });
    
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(qrCodeData, {
      width: 40,
      margin: 0,
      color: {
        dark: '#10b981',  // QR code color (Avnu green)
        light: '#0d1117'  // Background color
      }
    });
    
    // Add QR code to PDF
    doc.addImage(qrCodeDataURL, 'PNG', 85, 220, 40, 40);
    
    // Add QR code container with styling
    doc.setFillColor(40, 50, 70);
    doc.roundedRect(80, 215, 50, 50, 2, 2, 'F');
    
    doc.setDrawColor(16, 185, 129); // Avnu green
    doc.setLineWidth(0.5);
    doc.roundedRect(85, 220, 40, 40, 1, 1, 'S');
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("SCAN QR CODE", 105, 280, { align: 'center' });
    doc.text("TO VERIFY BOOKING", 105, 286, { align: 'center' });
  } catch (error) {
    console.error("Error generating QR code:", error);
    // Show placeholder if QR generation fails
    doc.setFillColor(40, 50, 70);
    doc.roundedRect(80, 215, 50, 50, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("QR CODE", 105, 240, { align: 'center' });
    doc.text("UNAVAILABLE", 105, 246, { align: 'center' });
  }
  
  // Add footer
  const footerY = 275;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for choosing Avnu!", 105, footerY, { align: 'center' });
  doc.text(`Generated on: ${format(new Date(), "MMMM d, yyyy, HH:mm")}`, 105, footerY + 5, { align: 'center' });
  doc.text(`Confirmation ID: ${booking.id}`, 105, footerY + 10, { align: 'center' });
  
  // Save PDF with a well-formatted name
  const filename = `Avnu_Booking_${booking.venue_name.replace(/\s+/g, '_')}_${format(new Date(booking.booking_date), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
  
  return filename;
};
