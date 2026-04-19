import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { creditPackageTrainerEarningsFromTap } from "./creditPackageTrainerEarnings.ts";

export type WalletKind = "program_sale" | "subscription" | "vault_sale";

export type CreditWalletResult =
  | { ok: true; idempotent?: boolean }
  | { ok: false; error: unknown };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Idempotent trainer wallet credit for a Tap charge.
 * subscription: 10% commission, pending_balance + total_earnings (7-day release).
 * program_sale: 20% commission, immediate balance_available + total_earnings.
 * vault_sale: 10% commission, immediate balance_available + total_earnings.
 */
export async function creditTrainerWalletFromTap(
  supabase: SupabaseClient,
  params: {
    tapChargeId: string;
    trainerId: string;
    amount: number;
    kind: WalletKind;
  },
): Promise<CreditWalletResult> {
  if (params.kind === "subscription") {
    return creditPackageTrainerEarningsFromTap(supabase, {
      tapChargeId: params.tapChargeId,
      trainerId: params.trainerId,
      grossAmount: params.amount,
    });
  }

  const gross = round2(Number(params.amount));
  const isVault = params.kind === "vault_sale";
  const commissionRate = isVault ? 0.1 : 0.2;
  const commission = round2(gross * commissionRate);
  const net = round2(gross - commission);
  const settlementKind = isVault ? "vault_sale" : "program_sale";
  const txType = isVault ? "vault_sale" : "program_sale";
  const description = isVault ? "بيع وحدة مكتبة تعليمية" : "بيع برنامج";

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
    kind: settlementKind,
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
    type: txType,
    amount: net,
    gross_amount: gross,
    commission_amount: commission,
    commission_rate: commissionRate,
    commission,
    net_amount: net,
    description,
    status: "completed",
    reference_id: params.tapChargeId,
  });

  if (insErr) {
    await supabase.from("tap_wallet_settlements").delete().eq("tap_charge_id", params.tapChargeId);
    if ((insErr as { code?: string }).code === "23505") {
      return { ok: true, idempotent: true };
    }
    return { ok: false, error: insErr };
  }

  const { error: walletErr } = await supabase.rpc("increment_wallet_available_credit", {
    p_trainer_id: params.trainerId,
    p_net_amount: net,
  });

  if (walletErr) {
    await supabase.from("transactions").delete().eq("reference_id", params.tapChargeId);
    await supabase.from("tap_wallet_settlements").delete().eq("tap_charge_id", params.tapChargeId);
    return { ok: false, error: walletErr };
  }

  return { ok: true };
}
