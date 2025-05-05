import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendInviteRequest {
  email: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  address?: string;
  inviteLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, venueName, bookingDate, startTime, endTime, address, inviteLink }: SendInviteRequest = await req.json();

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

    const emailResponse = await resend.emails.send({
      from: "FindVenue <onboarding@resend.dev>", // Replace with your verified domain when in production
      to: [email],
      subject: `You're Invited: ${venueName} on ${formattedDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; background-color: #0f172a; color: #e2e8f0;">
          <h2 style="color: #2dd4bf; text-align: center;">You're Invited!</h2>
          <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
          <p style="font-size: 16px; line-height: 1.5;">You've been invited to an event at ${displayVenueName}.</p>
          
          <div style="background-color: #1e293b; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #2dd4bf; margin-top: 0;">Event Details:</h3>
            <p style="margin: 5px 0;"><strong>Venue:</strong> ${displayVenueName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${startTime} - ${endTime}</p>
            ${address ? `<p style="margin: 5px 0;"><strong>Address:</strong> ${address}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
            <a href="${inviteLink}" style="background-color: #2dd4bf; color: #0f172a; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold;">View Event Details</a>
          </div>
          
          <p style="font-size: 14px; color: #94a3b8; text-align: center; margin-top: 30px;">
            This invitation was sent via FindVenue
          </p>
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
