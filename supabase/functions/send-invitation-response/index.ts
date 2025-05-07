import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = "https://esdmelfzeszjtbnoajig.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZG1lbGZ6ZXN6anRibm9hamlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4ODUwMTUsImV4cCI6MjA1ODQ2MTAxNX0.1z27OZ04RuR8AYlVGaE9L8vWWYilSrMlyq422BJcX94";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Create a Supabase client with anonymous key for public operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a Supabase admin client with service role key for admin operations
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
  userId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request payload
    let requestData: InviteResponseRequest;
    
    try {
      requestData = await req.json();
      console.log("Request data received:", requestData);
    } catch (parseError) {
      console.error("Error parsing JSON payload:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
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
      venueId,
      userId
    } = requestData;

    // Check required fields (make hostName and hostEmail optional)
    if (!guestEmail || !bookingId) {
      return new Response(
        JSON.stringify({ 
          error: "Required fields are missing",
          missingFields: [
            !guestEmail && "guestEmail",
            !bookingId && "bookingId",
          ].filter(Boolean)
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Processing invitation response from: ${guestEmail}, status: ${status}, bookingId: ${bookingId}`);

    // Verify the invitation exists first - this is the most important check
    const { data: inviteData, error: inviteError } = await supabase
      .from('booking_invites')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('email', guestEmail)
      .maybeSingle();

    if (inviteError) {
      console.error("Error validating invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Could not validate invitation", details: inviteError.message }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    if (!inviteData) {
      // Try to find any invites for this booking
      const { data: allInvites, error: allInvitesError } = await supabase
        .from('booking_invites')
        .select('email')
        .eq('booking_id', bookingId);
        
      if (allInvitesError) {
        console.error("Error checking all invitations:", allInvitesError);
      }
      
      const errorMsg = allInvites && allInvites.length > 0
        ? `Invitation not found for email: ${guestEmail}. Available invitations are for: ${allInvites.map(i => i.email).join(', ')}`
        : `Invitation not found for email: ${guestEmail}`;
        
      console.error(errorMsg);
      
      return new Response(
        JSON.stringify({ 
          error: "Invitation not found",
          details: errorMsg,
          availableInvites: allInvites
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Since we have a valid invite, we can proceed even if booking details are limited
    // We can use venue_name from the invitation if available
    const actualVenueName = venueName || inviteData.venue_name || "Event Venue";
    
    // Check if booking exists and fetch user_id of the booking creator
    let bookingData = null;
    let bookingUserId = null;
    let actualUserId = userId;  // Start with provided userId if available
    
    try {
      console.log("Fetching booking details to get user_id (creator/host)...");
      const { data, error } = await supabase
        .from('bookings')
        .select('id, user_id, venue_name, customer_name, customer_email, venue_id')
        .eq('id', bookingId)
        .maybeSingle();
        
      if (error) {
        console.error("Error checking booking:", error);
      } else if (data) {
        bookingData = data;
        bookingUserId = data.user_id;
        // If no userId was provided in the request, use the one from booking
        if (!actualUserId && bookingUserId) {
          actualUserId = bookingUserId;
          console.log(`Using booking's user_id for notification: ${actualUserId}`);
        }
        console.log("Found booking data:", bookingData);
      } else {
        console.log("Booking not found with id:", bookingId);
      }
    } catch (err) {
      console.error("Exception checking booking:", err);
    }

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
    const actualVenueId = venueId || (bookingData?.venue_id ? bookingData.venue_id : null);
    const venueLink = actualVenueId ? `${appBaseUrl}/venue/${actualVenueId}` : null;

    // Create subject and content based on response status
    const formattedHostName = hostName || bookingData?.customer_name || 'Host'; 
    const actualHostEmail = hostEmail || bookingData?.customer_email || "";
    
    const subject = status === 'accepted' 
      ? `${guestName || 'A guest'} has accepted your event invitation`
      : `${guestName || 'A guest'} has declined your event invitation`;

    const statusColor = status === 'accepted' ? '#10b981' : '#ef4444';
    const statusBgColor = status === 'accepted' ? '#10b98120' : '#ef444420';
    const statusText = status === 'accepted' ? 'Accepted' : 'Declined';

    // 1. Send an email notification to the host if we have an email address
    let emailSent = false;
    
    try {
      if (actualHostEmail) {
        const emailResponse = await resend.emails.send({
          from: "Avnu <onboarding@resend.dev>", // Using verified Resend default domain
          to: [actualHostEmail],
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; background-color: #0f172a; color: #FFFFFF;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2dd4bf; font-size: 24px; margin-bottom: 5px;">Invitation Response</h1>
                <p style="color: #FFFFFF; font-size: 16px;">
                  <span style="background-color: ${statusBgColor}; color: ${statusColor}; padding: 4px 12px; border-radius: 20px; font-weight: bold;">${statusText}</span>
                </p>
              </div>
              
              <p style="font-size: 16px; line-height: 1.5; color: #FFFFFF;">Hello ${formattedHostName},</p>
              <p style="font-size: 16px; line-height: 1.5; color: #FFFFFF;">
                ${guestName || guestEmail} has ${status} your invitation to ${actualVenueName} on ${formattedDate}.
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
                    <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${actualVenueName}</span>
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
        emailSent = true;
      } else {
        console.log("No host email provided, skipping email notification");
      }
    } catch (emailError: any) {
      console.error("Error sending email:", emailError);
      emailSent = false;
      // Continue with the rest of the process even if email fails
    }

    // Update the invitation status in the database using the admin client
    // This ensures the update works even with RLS policies
    let inviteUpdated = false;
    try {
      console.log(`Updating invitation status to ${status} for booking: ${bookingId}, email: ${guestEmail}`);
      
      // Use admin client instead of public client for more reliable updates
      const { error: updateError } = await adminClient
        .from('booking_invites')
        .update({ status: status })
        .eq('booking_id', bookingId)
        .eq('email', guestEmail);

      if (updateError) {
        console.error("Error updating invitation status with admin client:", updateError);
        
        // Fallback to public client if admin client fails
        const { error: publicUpdateError } = await supabase
          .from('booking_invites')
          .update({ status: status })
          .eq('booking_id', bookingId)
          .eq('email', guestEmail);
          
        if (publicUpdateError) {
          console.error("Error also updating with public client:", publicUpdateError);
          inviteUpdated = false;
        } else {
          console.log(`Successfully updated invitation status to ${status} for ${guestEmail} using public client`);
          inviteUpdated = true;
        }
      } else {
        console.log(`Successfully updated invitation status to ${status} for ${guestEmail} using admin client`);
        inviteUpdated = true;
      }
    } catch (dbError) {
      console.error("Error updating invitation in database:", dbError);
      inviteUpdated = false;
    }

    // Create notification for the host if we have their ID
    let notificationSent = false;
    if (actualUserId) {
      try {
        console.log(`Creating in-app notification for host with ID: ${actualUserId}`);
        
        // Create notification data
        const notificationData = {
          user_id: actualUserId,
          title: `Guest ${status === 'accepted' ? 'Accepted' : 'Declined'} Invitation`,
          message: `${guestName || guestEmail} has ${status} your invitation to ${actualVenueName} on ${formattedDate}.`,
          type: 'booking',
          link: `/bookings/${bookingId}`,
          data: {
            booking_id: bookingId,
            venue_id: actualVenueId,
            guest_email: guestEmail,
            guest_name: guestName,
            status: status,
            venue_name: actualVenueName,
            notification_time: new Date().toISOString()
          },
          read: false
        };

        console.log("Notification data to be inserted:", notificationData);

        // Try both clients for maximum reliability
        let success = false;
        
        // First try with admin client (most reliable)
        try {
          console.log("Attempting to create notification with admin client...");
          const { data, error } = await adminClient
            .from('notifications')
            .insert([notificationData])
            .select();
            
          if (error) {
            console.error("Admin client notification failed:", error);
          } else {
            console.log("Successfully created notification with admin client:", data);
            success = true;
          }
        } catch (err) {
          console.error("Exception with admin client notification:", err);
        }
        
        // If admin client fails, try public client
        if (!success) {
          console.log("Admin client notification failed, trying public client...");
          try {
            const { data, error } = await supabase
              .from('notifications')
              .insert([notificationData])
              .select();
              
            if (error) {
              console.error("Public client notification failed:", error);
            } else {
              console.log("Successfully created notification with public client:", data);
              success = true;
            }
          } catch (err) {
            console.error("Exception with public client notification:", err);
          }
        }
        
        notificationSent = success;
      } catch (err) {
        console.error("General error creating notification:", err);
        notificationSent = false;
      }
    } else {
      console.error("No user_id found for notification - cannot create in-app notification");
    }

    // Return results including status of all operations
    return new Response(JSON.stringify(
      { 
        success: inviteUpdated,
        message: `Successfully processed ${status} response for ${guestEmail}`,
        email_sent: emailSent,
        notification_sent: notificationSent,
        invite_updated: inviteUpdated,
        host_user_id: actualUserId || null
      }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-response function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
