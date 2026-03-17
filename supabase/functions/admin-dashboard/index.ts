import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_PASSWORD = "fitni-admin-2024";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { password, action, month, payout_id } = await req.json();

    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Mark payout as paid
    if (action === "mark_payout_paid" && payout_id) {
      await supabase
        .from("payout_requests")
        .update({ status: "paid", processed_at: new Date().toISOString() })
        .eq("id", payout_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all data
    const [
      { data: profiles },
      { data: clients },
      { data: payments },
      { data: payouts },
      { data: paymentSettings },
    ] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("clients").select("id, name, trainer_id, subscription_price, created_at"),
      supabase.from("client_payments").select("*"),
      supabase.from("payout_requests").select("*").order("requested_at", { ascending: false }),
      supabase.from("trainer_payment_settings").select("*"),
    ]);

    // Build trainer summary
    const trainerMap: Record<string, any> = {};
    for (const p of profiles || []) {
      trainerMap[p.user_id] = {
        id: p.user_id,
        name: p.full_name,
        phone: p.phone || "",
        plan: p.subscription_plan,
        subscribed_at: p.subscribed_at,
        subscription_end_date: p.subscription_end_date,
        client_count: 0,
        total_sales: 0,
        month_sales: 0,
        iban: "",
        bank_name: "",
        account_holder: "",
      };
    }

    // Payment settings
    for (const ps of paymentSettings || []) {
      if (trainerMap[ps.trainer_id]) {
        trainerMap[ps.trainer_id].iban = ps.iban;
        trainerMap[ps.trainer_id].bank_name = ps.bank_name;
        trainerMap[ps.trainer_id].account_holder = ps.account_holder_name;
      }
    }

    // Client counts
    for (const c of clients || []) {
      if (c.trainer_id && trainerMap[c.trainer_id]) {
        trainerMap[c.trainer_id].client_count++;
      }
    }

    // Payment sums
    const now = new Date();
    const filterMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    for (const pay of payments || []) {
      if (pay.status !== "paid") continue;
      if (trainerMap[pay.trainer_id]) {
        trainerMap[pay.trainer_id].total_sales += Number(pay.amount);
        const payMonth = pay.created_at?.substring(0, 7);
        if (payMonth === filterMonth) {
          trainerMap[pay.trainer_id].month_sales += Number(pay.amount);
        }
      }
    }

    const trainers = Object.values(trainerMap);

    // Monthly revenue for last 6 months
    const monthlyRevenue: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue[key] = 0;
    }
    for (const pay of payments || []) {
      if (pay.status !== "paid") continue;
      const key = pay.created_at?.substring(0, 7);
      if (key && key in monthlyRevenue) {
        monthlyRevenue[key] += Number(pay.amount);
      }
    }

    // Trainer growth (by month joined)
    const trainerGrowth: Record<string, number> = {};
    for (const key of Object.keys(monthlyRevenue)) {
      trainerGrowth[key] = 0;
    }
    for (const p of profiles || []) {
      const key = p.created_at?.substring(0, 7);
      if (key && key in trainerGrowth) {
        trainerGrowth[key]++;
      }
    }

    // Plan distribution
    const planDist: Record<string, number> = { free: 0, pro: 0 };
    for (const p of profiles || []) {
      const plan = p.subscription_plan || "free";
      planDist[plan] = (planDist[plan] || 0) + 1;
    }

    const totalRevenue = (payments || [])
      .filter((p: any) => p.status === "paid")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    const monthRevenue = (payments || [])
      .filter((p: any) => p.status === "paid" && p.created_at?.substring(0, 7) === filterMonth)
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    return new Response(
      JSON.stringify({
        trainers,
        payouts,
        stats: {
          total_trainers: (profiles || []).length,
          total_clients: (clients || []).length,
          month_revenue: monthRevenue,
          total_revenue: totalRevenue,
        },
        charts: {
          monthly_revenue: monthlyRevenue,
          trainer_growth: trainerGrowth,
          plan_distribution: planDist,
        },
        filter_month: filterMonth,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
