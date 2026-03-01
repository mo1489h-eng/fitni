import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientName, clientEmail, trainerName, inviteToken } = await req.json();

    if (!clientEmail || !inviteToken) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Build the registration link - use the published URL if available
    const appUrl = Deno.env.get("APP_URL") || supabaseUrl.replace(".supabase.co", ".lovable.app");
    const setupLink = `https://fitni.lovable.app/client-register/${inviteToken}`;

    // Send email via Supabase Auth admin API (using built-in email service)
    const { error } = await supabase.auth.admin.inviteUserByEmail(clientEmail, {
      redirectTo: setupLink,
      data: {
        is_client_invite: true,
        invite_token: inviteToken,
        client_name: clientName,
        trainer_name: trainerName,
      },
    });

    // If invite fails (user may already exist), send a custom email via Resend or fallback
    // For now, we'll use a simpler approach: generate a magic link style email
    if (error) {
      console.log("Auth invite failed (user may exist), using direct SMTP:", error.message);
      
      // Fallback: Send email using Supabase's built-in email
      // We'll use the Resend API if available, otherwise log the link
      const resendKey = Deno.env.get("RESEND_API_KEY");
      
      if (resendKey) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "fitni <noreply@fitni.lovable.app>",
            to: [clientEmail],
            subject: `مرحباً ${clientName} 👋 - دعوة من ${trainerName}`,
            html: `
              <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a1a2e; color: #ffffff; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="color: #22c55e; font-size: 28px; margin: 0;">fitni</h1>
                </div>
                <h2 style="font-size: 22px; margin-bottom: 8px;">مرحباً ${clientName} 👋</h2>
                <p style="color: #a0a0a0; font-size: 16px; line-height: 1.8;">
                  مدربك <strong style="color: #22c55e;">${trainerName}</strong> أضافك على منصة fitni
                </p>
                <p style="color: #a0a0a0; font-size: 16px;">أنشئ حسابك المجاني الآن:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${setupLink}" style="display: inline-block; background: #22c55e; color: #000; font-weight: bold; padding: 14px 40px; border-radius: 12px; text-decoration: none; font-size: 18px;">
                    أنشئ حسابي 💪
                  </a>
                </div>
                <p style="color: #666; font-size: 12px; text-align: center;">
                  إذا لم تطلب هذا الرابط، يمكنك تجاهل هذا الإيميل
                </p>
              </div>
            `,
          }),
        });
        
        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error("Resend error:", errText);
          return new Response(JSON.stringify({ success: false, error: "Failed to send email", fallback: setupLink }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        // No Resend key - return the link so the trainer can share it manually
        console.log("No RESEND_API_KEY configured. Registration link:", setupLink);
        return new Response(JSON.stringify({ success: true, setupLink, emailSent: false, message: "لم يتم إعداد خدمة الإيميل. شارك الرابط يدوياً" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, setupLink, emailSent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
