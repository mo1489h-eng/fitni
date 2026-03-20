import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const { payment_id, plan } = await req.json();

    if (!payment_id || typeof payment_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing payment_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!plan || !["basic", "pro"].includes(plan)) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment with Moyasar API
    const moyasarSecret = Deno.env.get("MOYASAR_SECRET_KEY");
    if (!moyasarSecret) {
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const moyasarRes = await fetch(`https://api.moyasar.com/v1/payments/${payment_id}`, {
      headers: {
        Authorization: `Basic ${btoa(moyasarSecret + ":")}`,
      },
    });

    if (!moyasarRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to verify payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await moyasarRes.json();

    // Verify payment status
    if (payment.status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not completed", status: payment.status }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify amount matches plan
    const expectedAmount = plan === "basic" ? 9900 : 19900;
    if (payment.amount !== expectedAmount) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for payment replay — ensure this payment_id hasn't been used before
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("last_payment_id", payment_id)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: "Payment already used" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile with subscription

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_plan: plan,
        subscribed_at: now.toISOString(),
        subscription_end_date: endDate.toISOString(),
        payment_status: "active",
        last_payment_id: payment_id,
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send confirmation email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && userEmail) {
      const planName = plan === "basic" ? "أساسي" : "احترافي";
      const renewDate = endDate.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "fitni <onboarding@resend.dev>",
            to: [userEmail],
            subject: "شكراً لاشتراكك في fitni 🎉",
            html: `
              <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a1a2e; color: #ffffff; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="color: #22c55e; font-size: 28px; margin: 0;">fitni</h1>
                </div>
                <h2 style="font-size: 22px; margin-bottom: 8px;">شكراً لاشتراكك في fitni 🎉</h2>
                <p style="color: #a0a0a0; font-size: 16px; line-height: 1.8;">
                  تم تفعيل اشتراكك بنجاح
                </p>
                <div style="background: rgba(34,197,94,0.1); border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <p style="margin: 8px 0; font-size: 16px;">
                    <strong style="color: #22c55e;">الخطة:</strong> ${planName}
                  </p>
                  <p style="margin: 8px 0; font-size: 16px;">
                    <strong style="color: #22c55e;">تاريخ التجديد:</strong> ${renewDate}
                  </p>
                </div>
                <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
                  شكراً لثقتك بنا — فريق fitni
                </p>
              </div>
            `,
          }),
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, plan, end_date: endDate.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
