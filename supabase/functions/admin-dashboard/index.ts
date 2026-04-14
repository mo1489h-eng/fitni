import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Official CoachBase admin password when `ADMIN_DASHBOARD_SECRET` is not set in Edge secrets.
 * Must remain exactly: fitni@2026@!Asa (fitni, @, 2026, @, !, Asa).
 */
const DEFAULT_ADMIN_SECRET = "fitni@2026@!Asa" as const;
// Guard against accidental edits breaking login (same literal).
if (DEFAULT_ADMIN_SECRET !== "fitni@2026@!Asa") {
  throw new Error("admin-dashboard: DEFAULT_ADMIN_SECRET must be fitni@2026@!Asa");
}
/** Empty/whitespace-only env counts as unset (avoids accidental blank secret in dashboard). */
const ADMIN_SECRET =
  Deno.env.get("ADMIN_DASHBOARD_SECRET")?.trim() || DEFAULT_ADMIN_SECRET;
/** If `"true"`, only `ADMIN_DASHBOARD_SECRET` (or unset default) is accepted — not the bundled fallback when a custom secret differs. */
const DEFAULT_PASSWORD_DISABLED = Deno.env.get("DISABLE_DEFAULT_ADMIN_PASSWORD") === "true";
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Strip accidental leading/trailing spaces from pasted input. */
function normalizeAdminPassword(s: string): string {
  return s.trim();
}

/** Password matches configured secret, or the documented default (unless disabled). Fixes mismatch when Edge secret was set to something else but ops still use the documented password. */
function isValidAdminPassword(raw: string): boolean {
  const password = normalizeAdminPassword(String(raw));
  if (!password) return false;
  if (constantTimeCompare(password, normalizeAdminPassword(ADMIN_SECRET))) return true;
  if (DEFAULT_PASSWORD_DISABLED) return false;
  return constantTimeCompare(password, normalizeAdminPassword(DEFAULT_ADMIN_SECRET));
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

    /** 200 (not 401) so all clients reliably parse JSON; `error` signals auth failure. */
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

    if (action === "process_withdrawal" && typeof withdrawal_id === "string" && withdrawal_id) {
      const act = typeof withdrawal_action === "string" ? withdrawal_action : "";
      const notes = typeof admin_notes === "string" ? admin_notes : null;
      const { error: rpcErr } = await supabase.rpc("admin_process_withdrawal", {
        p_withdrawal_id: withdrawal_id,
        p_action: act,
        p_admin_notes: notes,
      });
      if (rpcErr) {
        return jsonResponse({ error: rpcErr.message, session_token: nextSessionToken }, 400);
      }
      return jsonResponse({ success: true, session_token: nextSessionToken });
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
    ] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("clients").select("id, name, trainer_id, subscription_price, created_at"),
      supabase.from("client_payments").select("*"),
      supabase.from("payout_requests").select("*").order("requested_at", { ascending: false }),
      supabase.from("trainer_payment_settings").select("*"),
      supabase.from("nps_feedback").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
      supabase.from("wallets").select("*"),
    ]);
    const coachWithdrawals = coachWithdrawalsRes.error ? [] : coachWithdrawalsRes.data;
    const coachWallets = coachWalletsRes.error ? [] : coachWalletsRes.data;

    // Founder stats
    const allProfiles = profiles || [];
    const founderCount = allProfiles.filter((p: any) => p.is_founder === true).length;
    const founderDiscountUsed = allProfiles.filter((p: any) => p.is_founder === true && p.founder_discount_used === true).length;
    const founderDiscountRemaining = founderCount - founderDiscountUsed;
    const spotsRemaining = Math.max(0, 100 - allProfiles.length);

    /** Canonical key is auth.users.id (= profiles.user_id). Also alias profiles.id for legacy FKs. */
    const trainerMap: Record<string, any> = {};
    const mapTrainer = (p: Record<string, unknown>) => ({
      id: p.user_id,
      profile_id: p.id,
      name: p.full_name,
      phone: p.phone || "",
      plan: p.subscription_plan,
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

    const trainers = Object.values(trainerMap);
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

    // NPS stats
    const npsItems = npsFeedback || [];
    const npsCount = npsItems.length;
    const npsAvg = npsCount > 0 ? npsItems.reduce((s: number, n: any) => s + n.score, 0) / npsCount : 0;
    const promoters = npsItems.filter((n: any) => n.score >= 9).length;
    const passives = npsItems.filter((n: any) => n.score >= 7 && n.score <= 8).length;
    const detractors = npsItems.filter((n: any) => n.score <= 6).length;
    const npsScore = npsCount > 0 ? Math.round(((promoters - detractors) / npsCount) * 100) : 0;

    // Map trainer names for NPS
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
      const earn = Number(row.total_earnings ?? 0);
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
        acc.earn += Number(w.total_earnings ?? 0);
        return acc;
      },
      { bal: 0, pend: 0, earn: 0 },
    );

    return jsonResponse({
      trainers,
      payouts,
      withdrawals: withdrawalsWithTrainer,
      wallets: walletsWithTrainer,
      wallet_totals: walletTotals,
      stats: {
        total_trainers: allProfiles.length,
        total_clients: (clients || []).length,
        month_revenue: monthRevenue,
        total_revenue: totalRevenue,
        /** Aggregated trainer wallet balances (platform owes trainers / pending / lifetime). */
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
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    console.error("[admin-dashboard]", msg);
    return jsonResponse({ error: "Internal server error", detail: msg }, 500);
  }
});