
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

interface SendInviteRequest {
  email: string;
  recipientName?: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  address?: string;
  inviteLink: string;
  venueId?: string;
  specialRequests?: string;
  guests?: number;
  hostName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      recipientName,
      venueName, 
      bookingDate, 
      startTime, 
      endTime, 
      address, 
      inviteLink,
      venueId,
      specialRequests, 
      guests,
      hostName,
      contactEmail,
      contactPhone
    }: SendInviteRequest = await req.json();

    if (!email || !venueName || !bookingDate) {
      return new Response(
        JSON.stringify({ error: "Required fields are missing" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Sending booking invite to: ${email} for venue: ${venueName}`);

    // Extract just the venue name without special characters for display
    const displayVenueName = venueName;
    
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

    // Greeting message based on recipient name
    const greetingName = recipientName ? recipientName : "there";

    // Extract booking ID from the invite link
    let bookingId = inviteLink;
    
    // If inviteLink contains a full URL, extract just the ID
    if (typeof inviteLink === 'string' && (inviteLink.includes('/') || inviteLink.includes(':'))) {
      if (inviteLink.includes('/booking-invite/')) {
        bookingId = inviteLink.split('/booking-invite/')[1];
      }
    }

    console.log("Booking ID extracted:", bookingId);
    
    // IMPORTANT: Use the correct origin for links
    // Get origin from request or use environment variables
    let appDomain = "";
    try {
      const reqUrl = new URL(req.url);
      appDomain = reqUrl.searchParams.get('appOrigin') || "";
      console.log("App domain from request:", appDomain);
    } catch (e) {
      console.error("Error extracting origin:", e);
    }
    
    // Use the provided appDomain if available, otherwise use a default value
    const appBaseUrl = appDomain || "http://localhost:8080";
    console.log("Using app base URL:", appBaseUrl);
    
    // Generate full links with the correct domain
    const fullInviteLink = `${appBaseUrl}/booking-invite/${bookingId}`;
    const venueLink = venueId ? `${appBaseUrl}/venue/${venueId}` : null;

    console.log("Full invite link:", fullInviteLink);
    console.log("Venue link:", venueLink);
    
    // First store the invitation in the database before sending the email
    try {
      const { data, error } = await supabase
        .from('booking_invites')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('email', email);

      if (error) {
        console.error("Error checking existing invite:", error);
      } else {
        // Only insert if not exists
        if (!data || data.length === 0) {
          const { error: insertError } = await supabase
            .from('booking_invites')
            .insert({
              booking_id: bookingId,
              email: email,
              name: recipientName || null,
              status: 'pending'
            });
            
          if (insertError) {
            console.error("Error inserting booking invite to database:", insertError);
          } else {
            console.log("Successfully stored booking invite in database");
          }
        } else {
          console.log("Invite already exists in database, skipping insert");
        }
      }
    } catch (dbErr) {
      console.error("Exception storing invitation in database:", dbErr);
      // Continue with sending email even if DB storage fails
    }

    const emailResponse = await resend.emails.send({
      from: "Avnu <onboarding@avnu.dev>", // Replace with your verified domain when in production
      to: [email],
      subject: `You're Invited: ${venueName} on ${formattedDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; background-color: #0f172a; color: #FFFFFF;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2dd4bf; font-size: 24px; margin-bottom: 5px;">You're Invited!</h1>
            <p style="color: #FFFFFF; font-size: 16px;">An event awaits your presence</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; color: #FFFFFF;">Hello ${greetingName},</p>
          <p style="font-size: 16px; line-height: 1.5; color: #FFFFFF;">You've been invited to an event at <strong style="color: #2dd4bf;">${displayVenueName}</strong>.</p>
          
          <div style="background-color: #1e293b; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #2dd4bf; margin-top: 0; border-bottom: 1px solid #334155; padding-bottom: 10px;">Event Details:</h3>
            
            ${hostName ? 
              `<div style="padding: 10px 0; border-bottom: 1px solid #334155;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Host:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${hostName}</span>
                </p>
              </div>` : ''
            }

            <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
              <p style="margin: 5px 0; display: flex;">
                <span style="width: 120px; color: #94a3b8; font-weight: 500;">Venue:</span> 
                <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${displayVenueName}</span>
              </p>
            </div>
            
            <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
              <p style="margin: 5px 0; display: flex;">
                <span style="width: 120px; color: #94a3b8; font-weight: 500;">Date:</span> 
                <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${formattedDate}</span>
              </p>
            </div>
            
            <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
              <p style="margin: 5px 0; display: flex;">
                <span style="width: 120px; color: #94a3b8; font-weight: 500;">Time:</span> 
                <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${startTime} - ${endTime}</span>
              </p>
            </div>
            
            ${address ? 
              `<div style="padding: 10px 0; border-bottom: 1px solid #334155;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Location:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${address}</span>
                </p>
              </div>` : ''
            }
            
            ${contactEmail ? 
              `<div style="padding: 10px 0; border-bottom: 1px solid #334155;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Contact:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${contactEmail}</span>
                </p>
              </div>` : ''
            }
            
            ${contactPhone ? 
              `<div style="padding: 10px 0; border-bottom: 1px solid #334155;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Phone:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${contactPhone}</span>
                </p>
              </div>` : ''
            }
            
            ${guests ? 
              `<div style="padding: 10px 0; border-bottom: 1px solid #334155;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Guests:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${guests} people</span>
                </p>
              </div>` : ''
            }
            
            ${specialRequests ? 
              `<div style="padding: 10px 0;">
                <p style="margin: 5px 0;">
                  <span style="color: #94a3b8; font-weight: 500; display: block; margin-bottom: 5px;">Special Requests:</span> 
                  <span style="display: block; padding-left: 10px; border-left: 2px solid #2dd4bf; color: #FFFFFF; font-weight: bold;">${specialRequests}</span>
                </p>
              </div>` : ''
            }
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="margin-bottom: 20px; color: #FFFFFF; font-weight: bold;">Please let us know if you can attend:</p>
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="center">
                  <div>
                    <a href="${fullInviteLink}" style="background-color: #2dd4bf; color: #0f172a; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; display: inline-block; margin-bottom: 15px;">Respond to Invitation</a>
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
              This invitation was sent via <span style="color: #2dd4bf;">Avnu</span>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent response:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-booking-invite function:", error);
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
