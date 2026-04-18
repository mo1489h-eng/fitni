import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type CreditPackageResult =
  | { ok: true; idempotent?: boolean }
  | { ok: false; error: unknown };

const SUBSCRIPTION_COMMISSION_RATE = 0.1;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Idempotent trainee package subscription credit (10% platform commission).
 * Uses transactions.reference_id = Tap charge id; claims tap_wallet_settlements first.
 */
export async function creditPackageTrainerEarningsFromTap(
  supabase: SupabaseClient,
  params: {
    tapChargeId: string;
    trainerId: string;
    grossAmount: number;
  },
): Promise<CreditPackageResult> {
  const gross = round2(Number(params.grossAmount));
  if (!Number.isFinite(gross) || gross <= 0) {
    return { ok: false, error: new Error("Invalid gross amount") };
  }

  const commission = round2(gross * SUBSCRIPTION_COMMISSION_RATE);
  const trainerAmount = round2(gross - commission);

  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id")
    .eq("reference_id", params.tapChargeId)
    .maybeSingle();

  if (existingTx) {
    return { ok: true, idempotent: true };
  }

  const { error: claimErr } = await supabase.from("tap_wallet_settlements").insert({
    tap_charge_id: params.tapChargeId,
    trainer_id: params.trainerId,
    amount: gross,
    kind: "subscription",
  });

  if (claimErr && (claimErr as { code?: string }).code === "23505") {
    const { data: txAfter } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference_id", params.tapChargeId)
      .maybeSingle();
    if (txAfter) return { ok: true, idempotent: true };
    return { ok: false, error: claimErr };
  }
  if (claimErr) {
    return { ok: false, error: claimErr };
  }

  const { error: insErr } = await supabase.from("transactions").insert({
    trainer_id: params.trainerId,
    type: "subscription",
    amount: trainerAmount,
    gross_amount: gross,
    commission_amount: commission,
    commission_rate: SUBSCRIPTION_COMMISSION_RATE,
    commission,
    net_amount: trainerAmount,
    description: "اشتراك متدرب",
    status: "pending",
    reference_id: params.tapChargeId,
  });

  if (insErr) {
    await supabase.from("tap_wallet_settlements").delete().eq("tap_charge_id", params.tapChargeId);
    if ((insErr as { code?: string }).code === "23505") {
      return { ok: true, idempotent: true };
    }
    return { ok: false, error: insErr };
  }

  const { error: walletErr } = await supabase.rpc("increment_wallet_pending_earnings", {
    p_trainer_id: params.trainerId,
    p_trainer_amount: trainerAmount,
  });

  if (walletErr) {
    await supabase.from("transactions").delete().eq("reference_id", params.tapChargeId);
    await supabase.from("tap_wallet_settlements").delete().eq("tap_charge_id", params.tapChargeId);
    return { ok: false, error: walletErr };
  }

  return { ok: true };
}
