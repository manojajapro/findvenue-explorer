
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = "https://esdmelfzeszjtbnoajig.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZG1lbGZ6ZXN6anRibm9hamlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4ODUwMTUsImV4cCI6MjA1ODQ2MTAxNX0.1z27OZ04RuR8AYlVGaE9L8vWWYilSrMlyq422BJcX94";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteResponseRequest {
  hostEmail: string;
  hostName?: string;
  guestEmail: string;
  guestName?: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: 'accepted' | 'declined';
  bookingId: string;
  venueId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      hostEmail,
      hostName,
      guestEmail,
      guestName,
      venueName,
      bookingDate,
      startTime,
      endTime,
      status,
      bookingId,
      venueId
    }: InviteResponseRequest = await req.json();

    if (!hostEmail || !guestEmail || !venueName || !bookingDate || !status) {
      return new Response(
        JSON.stringify({ error: "Required fields are missing" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Processing invitation response from: ${guestEmail}, status: ${status}`);

    // Format the date for better display in email
    let formattedDate = bookingDate;
    try {
      const date = new Date(bookingDate);
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      formattedDate = date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.log("Date formatting error:", error);
      // Keep original format if there's an error
    }

    // Get origin from request or use environment variables
    let appDomain = "";
    try {
      const reqUrl = new URL(req.url);
      appDomain = reqUrl.searchParams.get('appOrigin') || "";
    } catch (e) {
      console.error("Error extracting origin:", e);
    }
    
    // Use the provided appDomain if available, otherwise use a default value
    const appBaseUrl = appDomain || "http://localhost:8080";
    
    // Generate proper links
    const bookingLink = `${appBaseUrl}/bookings/${bookingId}`;
    const venueLink = venueId ? `${appBaseUrl}/venue/${venueId}` : null;

    // Create subject and content based on response status
    const subject = status === 'accepted' 
      ? `${guestName || 'A guest'} has accepted your event invitation`
      : `${guestName || 'A guest'} has declined your event invitation`;

    const statusColor = status === 'accepted' ? '#10b981' : '#ef4444';
    const statusBgColor = status === 'accepted' ? '#10b98120' : '#ef444420';
    const statusText = status === 'accepted' ? 'Accepted' : 'Declined';

    // 1. Send an email notification to the host
    const emailResponse = await resend.emails.send({
      from: "Avnu <onboarding@resend.dev>", // Replace with your verified domain in production
      to: [hostEmail],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; background-color: #0f172a; color: #FFFFFF;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2dd4bf; font-size: 24px; margin-bottom: 5px;">Invitation Response</h1>
            <p style="color: #FFFFFF; font-size: 16px;">
              <span style="background-color: ${statusBgColor}; color: ${statusColor}; padding: 4px 12px; border-radius: 20px; font-weight: bold;">${statusText}</span>
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; color: #FFFFFF;">Hello ${hostName || 'there'},</p>
          <p style="font-size: 16px; line-height: 1.5; color: #FFFFFF;">
            ${guestName || guestEmail} has ${status} your invitation to ${venueName} on ${formattedDate}.
          </p>
          
          <div style="background-color: #1e293b; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #2dd4bf; margin-top: 0; border-bottom: 1px solid #334155; padding-bottom: 10px;">Event Details:</h3>
            
            <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
              <p style="margin: 5px 0; display: flex;">
                <span style="width: 120px; color: #94a3b8; font-weight: 500;">Guest:</span> 
                <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${guestName || guestEmail}</span>
              </p>
            </div>

            <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
              <p style="margin: 5px 0; display: flex;">
                <span style="width: 120px; color: #94a3b8; font-weight: 500;">Status:</span> 
                <span style="flex: 1; color: ${statusColor}; font-weight: bold;">${statusText}</span>
              </p>
            </div>
            
            <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
              <p style="margin: 5px 0; display: flex;">
                <span style="width: 120px; color: #94a3b8; font-weight: 500;">Venue:</span> 
                <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${venueName}</span>
              </p>
            </div>
            
            <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
              <p style="margin: 5px 0; display: flex;">
                <span style="width: 120px; color: #94a3b8; font-weight: 500;">Date:</span> 
                <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${formattedDate}</span>
              </p>
            </div>
            
            <div style="padding: 10px 0;">
              <p style="margin: 5px 0; display: flex;">
                <span style="width: 120px; color: #94a3b8; font-weight: 500;">Time:</span> 
                <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${startTime} - ${endTime}</span>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="center">
                  <div>
                    <a href="${bookingLink}" style="background-color: #2dd4bf; color: #0f172a; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; display: inline-block; margin-bottom: 15px;">View Booking</a>
                  </div>
                </td>
              </tr>
              ${venueLink ? `
              <tr>
                <td align="center" style="padding-top: 15px;">
                  <div>
                    <a href="${venueLink}" style="background-color: #475569; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; display: inline-block;">View Venue Details</a>
                  </div>
                </td>
              </tr>` : ''}
            </table>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; text-align: center;">
            <p style="font-size: 14px; color: #8b94a3;">
              This notification was sent via <span style="color: #2dd4bf;">Avnu</span>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email notification sent to host:", emailResponse);

    // 2. Send in-app notification to the host (customer)
    try {
      // Find the booking to get the customer user_id
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('user_id, customer_name')
        .eq('id', bookingId)
        .single();

      if (bookingError) {
        console.error("Error fetching booking:", bookingError);
      } else if (bookingData && bookingData.user_id) {
        console.log("Found customer user ID:", bookingData.user_id);
        
        // Create notification data
        const notificationData = {
          user_id: bookingData.user_id,
          title: `Guest ${status === 'accepted' ? 'Accepted' : 'Declined'} Invitation`,
          message: `${guestName || guestEmail} has ${status} your invitation to ${venueName} on ${formattedDate}.`,
          type: 'booking',
          link: `/bookings/${bookingId}`,
          data: {
            booking_id: bookingId,
            venue_id: venueId,
            guest_email: guestEmail,
            guest_name: guestName,
            status: status,
            venue_name: venueName
          },
          read: false
        };

        // Insert notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([notificationData]);

        if (notificationError) {
          console.error("Error creating notification:", notificationError);
        } else {
          console.log("In-app notification created successfully");
        }
      }
    } catch (notificationError) {
      console.error("Error processing notification:", notificationError);
    }

    return new Response(JSON.stringify(
      { 
        success: true,
        message: `Successfully processed ${status} response for ${guestEmail}`
      }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-response function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
