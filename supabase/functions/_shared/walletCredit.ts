import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type WalletKind = "program_sale" | "subscription";

export type CreditWalletResult =
  | { ok: true; idempotent?: boolean }
  | { ok: false; error: unknown };

/**
 * Idempotent trainer wallet credit for a Tap charge.
 * Inserts into tap_wallet_settlements first (claim), then add_transaction.
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
  const { error: claimErr } = await supabase.from("tap_wallet_settlements").insert({
    tap_charge_id: params.tapChargeId,
    trainer_id: params.trainerId,
    amount: params.amount,
    kind: params.kind,
  });

  if (claimErr && (claimErr as { code?: string }).code === "23505") {
    return { ok: true, idempotent: true };
  }
  if (claimErr) {
    return { ok: false, error: claimErr };
  }

  const commission =
    params.kind === "program_sale"
      ? Math.round(params.amount * 0.2 * 100) / 100
      : 0;
  const net = Math.round((params.amount - commission) * 100) / 100;

  const { error: rpcError } = await supabase.rpc("add_transaction", {
    p_trainer_id: params.trainerId,
    p_type: params.kind,
    p_amount: params.amount,
    p_commission: commission,
    p_net_amount: net,
    p_status: "completed",
  });

  if (rpcError) {
    await supabase.from("tap_wallet_settlements").delete().eq("tap_charge_id", params.tapChargeId);
    return { ok: false, error: rpcError };
  }

  return { ok: true };
}
