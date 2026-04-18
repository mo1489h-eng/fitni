import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Admin dashboard authentication uses ADMIN_DASHBOARD_SECRET env var.
 * No hardcoded fallback — the secret MUST be configured in Edge Function secrets.
 */
const ADMIN_SECRET = Deno.env.get("ADMIN_DASHBOARD_SECRET")?.trim();
if (!ADMIN_SECRET) {
  console.error("[admin-dashboard] ADMIN_DASHBOARD_SECRET is not set. Admin dashboard is disabled.");
}

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function isValidAdminPassword(raw: string): boolean {
  if (!ADMIN_SECRET) return false;
  const password = String(raw).trim();
  if (!password) return false;
  return constantTimeCompare(password, ADMIN_SECRET);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function encodeBase64Url(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(normalized + padding);
}

async function createSignature(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return encodeBase64Url(String.fromCharCode(...new Uint8Array(signature)));
}

async function createSessionToken(secret: string) {
  const payload = encodeBase64Url(
    JSON.stringify({
      exp: Date.now() + SESSION_DURATION_MS,
      nonce: crypto.randomUUID(),
    })
  );
  const signature = await createSignature(payload, secret);
  return `${payload}.${signature}`;
}

async function verifySessionToken(token: string, secret: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = await createSignature(payload, secret);
  if (!constantTimeCompare(signature, expectedSignature)) return false;

  try {
    const parsed = JSON.parse(decodeBase64Url(payload));
    return typeof parsed?.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // If secret is not configured, admin dashboard is completely disabled
  if (!ADMIN_SECRET) {
    return jsonResponse({ error: "Admin dashboard is not configured. Set ADMIN_DASHBOARD_SECRET." }, 503);
  }

  try {
    const body = await req.json();
    const {
      password,
      session_token,
      action,
      month,
      payout_id,
      withdrawal_id,
      withdrawal_action,
      admin_notes,
    } = body as Record<string, unknown>;

    const tokenIsValid =
      typeof session_token === "string" && session_token
        ? await verifySessionToken(session_token, ADMIN_SECRET)
        : false;
    const passwordIsValid =
      typeof password === "string" && password ? isValidAdminPassword(password) : false;

    if (!tokenIsValid && !passwordIsValid) {
      return jsonResponse({ error: "unauthorized" }, 200, {
        "Cache-Control": "no-store, max-age=0",
      });
    }

    const nextSessionToken = tokenIsValid
      ? session_token
      : await createSessionToken(ADMIN_SECRET);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "mark_payout_paid" && payout_id) {
      await supabase
        .from("payout_requests")
        .update({ status: "paid", processed_at: new Date().toISOString() })
        .eq("id", payout_id);

      return jsonResponse({ success: true, session_token: nextSessionToken });
    }

    if (action === "release_pending_balance") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const cutoffIso = cutoff.toISOString();

      const { data: pendingRows, error: pendErr } = await supabase
        .from("transactions")
        .select("id, amount")
        .eq("status", "pending")
        .eq("type", "subscription")
        .lte("created_at", cutoffIso);

      if (pendErr) {
        return jsonResponse({ error: pendErr.message, session_token: nextSessionToken }, 400);
      }

      const released_count = (pendingRows ?? []).length;
      const released_amount = (pendingRows ?? []).reduce((s, r) => s + Number((r as { amount?: number }).amount ?? 0), 0);

      const { error: relErr } = await supabase.rpc("release_pending_balance");
      if (relErr) {
        return jsonResponse({ error: relErr.message, session_token: nextSessionToken }, 400);
      }

      return jsonResponse({
        success: true,
        released_count,
        released_amount,
        session_token: nextSessionToken,
      });
    }

    if (action === "process_withdrawal" && typeof withdrawal_id === "string" && withdrawal_id) {
      const act = typeof withdrawal_action === "string" ? withdrawal_action : "";
      const notes = typeof admin_notes === "string" && admin_notes.trim() ? admin_notes.trim() : null;

      const { data: row, error: fetchErr } = await supabase
        .from("withdrawals")
        .select("id, trainer_id, amount, status")
        .eq("id", withdrawal_id)
        .maybeSingle();

      if (fetchErr || !row) {
        return jsonResponse({ error: fetchErr?.message ?? "طلب غير موجود", session_token: nextSessionToken }, 400);
      }

      const amt = Number(row.amount);
      const tid = row.trainer_id as string;
      const st = String(row.status);

      const readWallet = async () => {
        const { data: w, error: wErr } = await supabase
          .from("wallets")
          .select("balance, balance_available, pending_balance")
          .eq("trainer_id", tid)
          .maybeSingle();
        if (wErr || !w) return { error: wErr?.message ?? "لا توجد محفظة" as string };
        const bal = Number((w as Record<string, unknown>).balance ?? (w as Record<string, unknown>).balance_available ?? 0);
        const pend = Number((w as Record<string, unknown>).pending_balance ?? 0);
        return { bal, pend };
      };

      if (act === "approve") {
        if (st !== "pending") {
          return jsonResponse({ error: "الحالة لا تسمح بالموافقة", session_token: nextSessionToken }, 400);
        }
        const { error: upErr } = await supabase
          .from("withdrawals")
          .update({ status: "accepted", admin_notes: notes })
          .eq("id", withdrawal_id)
          .eq("status", "pending");
        if (upErr) return jsonResponse({ error: upErr.message, session_token: nextSessionToken }, 400);
        return jsonResponse({ success: true, session_token: nextSessionToken });
      }

      if (act === "reject") {
        if (st !== "pending") {
          return jsonResponse({ error: "الحالة لا تسمح بالرفض", session_token: nextSessionToken }, 400);
        }
        const { data: wrow, error: wfe } = await supabase.from("wallets").select("*").eq("trainer_id", tid).maybeSingle();
        if (wfe || !wrow) {
          return jsonResponse({ error: wfe?.message ?? "لا توجد محفظة", session_token: nextSessionToken }, 400);
        }
        const wr = wrow as Record<string, unknown>;
        const pend = Number(wr.pending_balance ?? 0);
        if (pend < amt) {
          return jsonResponse({ error: "Insufficient pending balance to reverse withdrawal", session_token: nextSessionToken }, 400);
        }
        const { error: upErr } = await supabase
          .from("withdrawals")
          .update({ status: "rejected", admin_notes: notes })
          .eq("id", withdrawal_id)
          .eq("status", "pending");
        if (upErr) return jsonResponse({ error: upErr.message, session_token: nextSessionToken }, 400);

        const patch: Record<string, unknown> = {
          pending_balance: pend - amt,
          updated_at: new Date().toISOString(),
        };
        if (wr.balance != null) patch.balance = Number(wr.balance) + amt;
        if (wr.balance_available != null) patch.balance_available = Number(wr.balance_available) + amt;
        if (patch.balance == null && patch.balance_available == null) {
          patch.balance = Number(wr.balance ?? wr.balance_available ?? 0) + amt;
        }
        const { error: wallErr } = await supabase.from("wallets").update(patch).eq("trainer_id", tid);
        if (wallErr) return jsonResponse({ error: wallErr.message, session_token: nextSessionToken }, 400);

        return jsonResponse({ success: true, session_token: nextSessionToken });
      }

      if (act === "mark_paid") {
        if (st !== "accepted") {
          return jsonResponse({ error: "يجب الموافقة على الطلب قبل تأكيد التحويل", session_token: nextSessionToken }, 400);
        }
        const w = await readWallet();
        if ("error" in w) return jsonResponse({ error: w.error, session_token: nextSessionToken }, 400);
        if (w.pend < amt) {
          return jsonResponse({ error: "Insufficient pending balance for payout", session_token: nextSessionToken }, 400);
        }
        const { error: upErr } = await supabase
          .from("withdrawals")
          .update({
            status: "paid",
            processed_at: new Date().toISOString(),
            admin_notes: notes ?? undefined,
          })
          .eq("id", withdrawal_id)
          .eq("status", "accepted");
        if (upErr) return jsonResponse({ error: upErr.message, session_token: nextSessionToken }, 400);

        const { error: wallErr } = await supabase
          .from("wallets")
          .update({
            pending_balance: w.pend - amt,
            updated_at: new Date().toISOString(),
          })
          .eq("trainer_id", tid);
        if (wallErr) return jsonResponse({ error: wallErr.message, session_token: nextSessionToken }, 400);

        return jsonResponse({ success: true, session_token: nextSessionToken });
      }

      return jsonResponse({ error: "إجراء غير معروف", session_token: nextSessionToken }, 400);
    }

    const [
      { data: profiles },
      { data: clients },
      { data: payments },
      { data: payouts },
      { data: paymentSettings },
      { data: npsFeedback },
      coachWithdrawalsRes,
      coachWalletsRes,
      coachTransactionsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("clients").select("id, name, trainer_id, subscription_price, created_at"),
      supabase.from("client_payments").select("*"),
      supabase.from("payout_requests").select("*").order("requested_at", { ascending: false }),
      supabase.from("trainer_payment_settings").select("*"),
      supabase.from("nps_feedback").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
      supabase.from("wallets").select("*"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(8000),
    ]);
    const coachWithdrawals = coachWithdrawalsRes.error ? [] : coachWithdrawalsRes.data;
    const coachWallets = coachWalletsRes.error ? [] : coachWalletsRes.data;
    const txData = coachTransactionsRes.error ? [] : coachTransactionsRes.data;

    // Founder stats
    const allProfiles = profiles || [];
    const founderCount = allProfiles.filter((p: any) => p.is_founder === true).length;
    const founderDiscountUsed = allProfiles.filter((p: any) => p.is_founder === true && p.founder_discount_used === true).length;
    const founderDiscountRemaining = founderCount - founderDiscountUsed;
    const spotsRemaining = Math.max(0, 100 - allProfiles.length);

    const trainerMap: Record<string, any> = {};
    const mapTrainer = (p: Record<string, unknown>) => ({
      id: p.user_id,
      profile_id: p.id,
      name: p.full_name,
      phone: p.phone || "",
      role: p.role ?? null,
      plan: p.subscription_plan,
      payment_status: p.payment_status ?? null,
      subscribed_at: p.subscribed_at,
      subscription_end_date: p.subscription_end_date,
      is_founder: p.is_founder || false,
      founder_discount_used: p.founder_discount_used || false,
      created_at: p.created_at,
      client_count: 0,
      total_sales: 0,
      month_sales: 0,
      iban: "",
      bank_name: "",
      account_holder: "",
      wallet_balance_available: 0,
      wallet_pending: 0,
      wallet_total_earnings: 0,
    });

    for (const p of profiles || []) {
      const entry = mapTrainer(p as Record<string, unknown>);
      trainerMap[String(p.user_id)] = entry;
      if (p.id && String(p.id) !== String(p.user_id)) {
        trainerMap[String(p.id)] = entry;
      }
    }

    for (const ps of paymentSettings || []) {
      if (trainerMap[ps.trainer_id]) {
        trainerMap[ps.trainer_id].iban = ps.iban;
        trainerMap[ps.trainer_id].bank_name = ps.bank_name;
        trainerMap[ps.trainer_id].account_holder = ps.account_holder_name;
      }
    }

    for (const c of clients || []) {
      if (c.trainer_id && trainerMap[c.trainer_id]) {
        trainerMap[c.trainer_id].client_count++;
      }
    }

    const now = new Date();
    const filterMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    for (const pay of payments || []) {
      if (pay.status !== "paid") continue;
      const tid = pay.trainer_id as string | undefined;
      if (tid && trainerMap[tid]) {
        trainerMap[tid].total_sales += Number(pay.amount);
        const payMonth = pay.created_at?.substring(0, 7);
        if (payMonth === filterMonth) {
          trainerMap[tid].month_sales += Number(pay.amount);
        }
      }
    }

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

    const planDist: Record<string, number> = { free: 0, basic: 0, pro: 0 };
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

    // NPS stats
    const npsItems = npsFeedback || [];
    const npsCount = npsItems.length;
    const npsAvg = npsCount > 0 ? npsItems.reduce((s: number, n: any) => s + n.score, 0) / npsCount : 0;
    const promoters = npsItems.filter((n: any) => n.score >= 9).length;
    const passives = npsItems.filter((n: any) => n.score >= 7 && n.score <= 8).length;
    const detractors = npsItems.filter((n: any) => n.score <= 6).length;
    const npsScore = npsCount > 0 ? Math.round(((promoters - detractors) / npsCount) * 100) : 0;

    const npsWithNames = npsItems.slice(0, 50).map((n: any) => ({
      ...n,
      trainer_name: trainerMap[n.trainer_id]?.name || "مدرب",
    }));

    const emailByUserId = new Map<string, string>();
    try {
      let page = 1;
      const perPage = 1000;
      for (;;) {
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage });
        if (listErr) break;
        const users = listData?.users ?? [];
        for (const u of users) {
          if (u.email) emailByUserId.set(u.id, u.email);
        }
        if (users.length < perPage) break;
        page++;
      }
    } catch {
      // emails optional for admin UI
    }

    const withdrawalRows = coachWithdrawals || [];
    const withdrawalsWithTrainer = withdrawalRows.map((w: Record<string, unknown>) => {
      const tid = w.trainer_id as string | undefined;
      const name = tid ? trainerMap[tid]?.name || "—" : "—";
      const email = tid ? emailByUserId.get(tid) ?? null : null;
      return {
        ...w,
        trainer_name: name,
        trainer_email: email,
      };
    });

    const walletRows = coachWallets || [];
    for (const w of walletRows) {
      const row = w as Record<string, unknown>;
      const tid = row.trainer_id as string | undefined;
      if (!tid) continue;
      const bal = Number(row.balance_available ?? row.balance ?? 0);
      const pend = Number(row.pending_balance ?? 0);
      const earn = Number(row.total_earnings ?? row.total_earned ?? 0);
      const tm = trainerMap[tid];
      if (tm) {
        tm.wallet_balance_available = bal;
        tm.wallet_pending = pend;
        tm.wallet_total_earnings = earn;
      }
    }

    const walletsWithTrainer = walletRows.map((w: Record<string, unknown>) => {
      const tid = w.trainer_id as string | undefined;
      return {
        ...w,
        trainer_name: tid ? trainerMap[tid]?.name || "—" : "—",
        trainer_email: tid ? emailByUserId.get(tid) ?? null : null,
      };
    });

    const walletTotals = walletRows.reduce(
      (acc: { bal: number; pend: number; earn: number }, w: Record<string, unknown>) => {
        acc.bal += Number(w.balance_available ?? w.balance ?? 0);
        acc.pend += Number(w.pending_balance ?? 0);
        acc.earn += Number(w.total_earnings ?? w.total_earned ?? 0);
        return acc;
      },
      { bal: 0, pend: 0, earn: 0 },
    );

    const trainers = Array.from(
      new Map((profiles || []).map((p: any) => [String(p.user_id), trainerMap[String(p.user_id)]])).values(),
    )
      .filter(Boolean)
      .map((t: any) => ({
        ...t,
        email: emailByUserId.get(String(t.id)) ?? null,
      }));

    const coach_trainers = (profiles || [])
      .filter((p: any) => p.role === "coach")
      .map((p: any) => trainerMap[String(p.user_id)])
      .filter(Boolean)
      .map((t: any) => ({
        ...t,
        email: emailByUserId.get(String(t.id)) ?? null,
      }));

    let transactions_gross_sum = 0;
    let platform_commission_sum = 0;
    for (const t of txData || []) {
      const row = t as Record<string, unknown>;
      const g = Number(row.gross_amount);
      const comm = Number(row.commission_amount ?? row.commission ?? 0);
      const gross = g > 0 ? g : Number(row.amount ?? 0) + comm;
      transactions_gross_sum += gross;
      platform_commission_sum += comm;
    }

    const nowDate = new Date();
    const active_coaches_count = allProfiles.filter((p: any) => {
      if (p.role !== "coach") return false;
      if (p.payment_status === "active") return true;
      const plan = p.subscription_plan;
      if (plan === "basic" || plan === "pro") {
        if (!p.subscription_end_date) return false;
        return new Date(p.subscription_end_date) > nowDate;
      }
      return false;
    }).length;

    const overview_kpis = {
      total_coaches: allProfiles.filter((p: any) => p.role === "coach").length,
      total_trainees: allProfiles.filter((p: any) => p.role === "trainee").length,
      active_coaches: active_coaches_count,
      transactions_gross_sum,
      platform_commission_sum,
      pending_withdrawals_count: withdrawalRows.filter((w: any) => w.status === "pending").length,
    };

    const txChartKeys = Object.keys(monthlyRevenue);
    const commissionByMonth: Record<string, number> = Object.fromEntries(txChartKeys.map((k) => [k, 0]));
    const volumeByMonth: Record<string, number> = Object.fromEntries(txChartKeys.map((k) => [k, 0]));
    for (const t of txData || []) {
      const row = t as Record<string, unknown>;
      const key = String(row.created_at ?? "").substring(0, 7);
      if (!(key in commissionByMonth)) continue;
      const comm = Number(row.commission_amount ?? row.commission ?? 0);
      const g = Number(row.gross_amount);
      const gross = g > 0 ? g : Number(row.amount ?? 0) + comm;
      commissionByMonth[key] += comm;
      volumeByMonth[key] += gross;
    }
    const platform_revenue_chart = txChartKeys.map((k) => ({
      month: k,
      commission: commissionByMonth[k] ?? 0,
      volume: volumeByMonth[k] ?? 0,
    }));

    const transactions_log = (txData || []).map((t: Record<string, unknown>) => {
      const tid = String(t.trainer_id ?? "");
      const comm = Number(t.commission_amount ?? t.commission ?? 0);
      const g = Number(t.gross_amount);
      const gross = g > 0 ? g : Number(t.amount ?? 0) + comm;
      const net = Number(t.net_amount) > 0 ? Number(t.net_amount) : Number(t.amount ?? 0);
      return {
        ...t,
        trainer_name: trainerMap[tid]?.name ?? "—",
        trainer_email: emailByUserId.get(tid) ?? null,
        display_gross: gross,
        display_commission: comm,
        display_net: net,
      };
    });

    const sidebar_stats = {
      last_withdrawals: withdrawalsWithTrainer.slice(0, 5),
      last_coaches: (profiles || [])
        .filter((p: any) => p.role === "coach")
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((p: any) => ({
          user_id: p.user_id,
          name: p.full_name,
          email: emailByUserId.get(p.user_id) ?? null,
          created_at: p.created_at,
        })),
      commission_this_month: commissionByMonth[filterMonth] ?? 0,
    };

    return jsonResponse({
      trainers,
      coach_trainers,
      overview_kpis,
      transactions_log,
      platform_revenue_chart,
      sidebar_stats,
      payouts,
      withdrawals: withdrawalsWithTrainer,
      wallets: walletsWithTrainer,
      wallet_totals: walletTotals,
      stats: {
        total_trainers: allProfiles.length,
        total_clients: (clients || []).length,
        month_revenue: monthRevenue,
        total_revenue: totalRevenue,
        trainer_wallets_available: walletTotals.bal,
        trainer_wallets_pending: walletTotals.pend,
        trainer_wallets_lifetime_earnings: walletTotals.earn,
      },
      founders: {
        total: founderCount,
        discount_used: founderDiscountUsed,
        discount_remaining: founderDiscountRemaining,
        spots_remaining: spotsRemaining,
        limit: 100,
      },
      charts: {
        monthly_revenue: monthlyRevenue,
        trainer_growth: trainerGrowth,
        plan_distribution: planDist,
      },
      nps: {
        score: npsScore,
        avg: Math.round(npsAvg * 10) / 10,
        count: npsCount,
        promoters_pct: npsCount > 0 ? Math.round((promoters / npsCount) * 100) : 0,
        passives_pct: npsCount > 0 ? Math.round((passives / npsCount) * 100) : 0,
        detractors_pct: npsCount > 0 ? Math.round((detractors / npsCount) * 100) : 0,
        recent: npsWithNames,
      },
      filter_month: filterMonth,
      session_token: nextSessionToken,
      clients,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    console.error("[admin-dashboard]", msg);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
