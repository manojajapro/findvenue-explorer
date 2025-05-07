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

interface BookingInviteRequest {
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
    // Validate request payload
    let requestData: BookingInviteRequest;
    
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
    } = requestData;

    if (!email || !venueName || !bookingDate || !startTime || !endTime || !inviteLink) {
      return new Response(
        JSON.stringify({ 
          error: "Required fields are missing",
          missingFields: [
            !email && "email",
            !venueName && "venueName", 
            !bookingDate && "bookingDate",
            !startTime && "startTime",
            !endTime && "endTime",
            !inviteLink && "inviteLink",
          ].filter(Boolean)
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Sending booking invitation to: ${email} for venue: ${venueName}`);

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
    const invitationLink = `${appBaseUrl}/booking-invite/${inviteLink}`;
    const venueLink = venueId ? `${appBaseUrl}/venue/${venueId}` : null;

    // Create subject and content for the email
    const subject = `You're invited to ${venueName} on ${formattedDate}`;

    // Send the invitation email
    try {
      const emailResponse = await resend.emails.send({
        from: "Avnu <onboarding@resend.dev>", // Using verified Resend default domain
        to: [email],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; background-color: #0f172a; color: #FFFFFF;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2dd4bf; font-size: 24px; margin-bottom: 5px;">Event Invitation</h1>
              <p style="color: #FFFFFF; font-size: 16px;">
                You're invited to an event at ${venueName}
              </p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.5; color: #FFFFFF;">Hello ${recipientName || 'there'},</p>
            <p style="font-size: 16px; line-height: 1.5; color: #FFFFFF;">
              ${hostName ? `${hostName} has` : 'You have been'} invited you to ${venueName} on ${formattedDate}.
            </p>
            
            <div style="background-color: #1e293b; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2dd4bf; margin-top: 0; border-bottom: 1px solid #334155; padding-bottom: 10px;">Event Details:</h3>
              
              ${hostName ? `
              <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Host:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${hostName}</span>
                </p>
              </div>
              ` : ''}
              
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
              
              <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Time:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${startTime} - ${endTime}</span>
                </p>
              </div>
              
              ${address ? `
              <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Address:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${address}</span>
                </p>
              </div>
              ` : ''}
              
              ${contactEmail ? `
              <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Contact:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${contactEmail}</span>
                </p>
              </div>
              ` : ''}
              
              ${contactPhone ? `
              <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Phone:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${contactPhone}</span>
                </p>
              </div>
              ` : ''}
              
              ${guests ? `
              <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Guests:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${guests} people</span>
                </p>
              </div>
              ` : ''}
              
              ${specialRequests ? `
              <div style="padding: 10px 0;">
                <p style="margin: 5px 0; display: flex;">
                  <span style="width: 120px; color: #94a3b8; font-weight: 500;">Notes:</span> 
                  <span style="flex: 1; color: #FFFFFF; font-weight: bold;">${specialRequests}</span>
                </p>
              </div>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #94a3b8; margin-bottom: 15px;">Please respond to this invitation:</p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center">
                    <div>
                      <a href="${invitationLink}" style="background-color: #2dd4bf; color: #0f172a; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; display: inline-block; margin-bottom: 15px;">Respond to Invitation</a>
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
  
      console.log("Invitation email sent:", emailResponse);
      
      // Store the invitation in the database
      try {
        // Create admin client for database operations with service role key
        const adminClient = createClient(
          supabaseUrl,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || supabaseAnonKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );
        
        // Check if an invitation already exists
        const { data: existingInvite, error: checkError } = await adminClient
          .from('booking_invites')
          .select('id')
          .eq('booking_id', inviteLink)
          .eq('email', email)
          .maybeSingle();
          
        if (checkError) {
          console.error("Error checking existing invite:", checkError);
        }
        
        if (existingInvite) {
          // Update existing invite - avoid using name column if it causes issues
          console.log("Found existing invite ID:", existingInvite.id);
          const { error: updateError } = await adminClient
            .from('booking_invites')
            .update({ status: 'pending' })
            .eq('id', existingInvite.id);
            
          if (updateError) {
            console.error("Error updating invite:", updateError);
            throw new Error(`Error updating invite: ${updateError.message}`);
          } else {
            console.log("Updated existing invite for:", email);
          }
        } else {
          // Create new invite - without using name column to avoid issues
          const inviteData = {
            booking_id: inviteLink,
            email: email,
            status: 'pending'
          };
          
          console.log("Creating new invite with data:", inviteData);
          
          const { data: newInvite, error: insertError } = await adminClient
            .from('booking_invites')
            .insert([inviteData])
            .select();
            
          if (insertError) {
            console.error("Error inserting invite to database:", insertError);
            throw new Error(`Error inserting invite: ${insertError.message}`);
          } else {
            console.log("Stored invite in database:", newInvite);
          }
        }
      } catch (dbErr) {
        console.error("Exception handling database operation:", dbErr);
        throw dbErr;
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Invitation sent to ${email}`,
          data: {
            email: email,
            inviteLink: invitationLink
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (emailError: any) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send invitation email",
          details: emailError.message || "Unknown email error"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in send-booking-invite function:", error);
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
