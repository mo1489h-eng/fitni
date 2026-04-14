import { invokeEdgeFunction } from "@/lib/edgeFunctionInvoke";

/** Tap metadata values must be strings for API compatibility. */
function stringifyMetadata(
  metadata: Record<string, string | number | boolean | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (v === undefined) continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

export type PaymentCustomer = {
  name?: string;
  email?: string;
  phone?: string;
};

export type CreatePaymentSessionInput = {
  amount: number;
  currency?: string;
  description?: string;
  customer?: PaymentCustomer;
  /** Tap redirects here after checkout (single URL; success and abandonment both land here unless user closes early). */
  redirectUrl: string;
  /** Stored on the Tap charge; must include `trainer_id` and `type` for verify-platform-payment. */
  metadata: Record<string, string | number | boolean | undefined>;
};

/**
 * Creates a platform Tap charge (full amount to platform account — no split / destinations).
 */
export async function createPaymentSession(
  input: CreatePaymentSessionInput,
): Promise<{ payment_url: string; charge_id?: string }> {
  const { data, error } = await invokeEdgeFunction<{
    redirect_url?: string;
    charge_id?: string;
    error?: string;
    details?: unknown;
  }>("create-tap-charge", {
    amount: input.amount,
    currency: input.currency ?? "SAR",
    description: input.description ?? "CoachBase Payment",
    customer: input.customer ?? {},
    redirect_url: input.redirectUrl,
    metadata: stringifyMetadata(input.metadata),
  });

  if (error) throw error;
  if (!data?.redirect_url) {
    throw new Error(data?.error ?? "فشل إنشاء عملية الدفع");
  }

  return {
    payment_url: data.redirect_url,
    charge_id: data.charge_id,
  };
}

/**
 * Server-side Tap verification + trainer wallet credit (metadata-driven).
 * Use from `/payment/success` or any flow that only needs wallet settlement.
 */
export async function verifyPlatformPayment(paymentId: string): Promise<{
  success: boolean;
  idempotent?: boolean;
  trainer_id?: string;
  kind?: string;
}> {
  const { data, error } = await invokeEdgeFunction<{
    success?: boolean;
    error?: string;
    idempotent?: boolean;
    trainer_id?: string;
    kind?: string;
  }>("verify-platform-payment", { payment_id: paymentId });

  if (error) throw error;
  if (!data?.success) {
    throw new Error(data?.error ?? "فشل التحقق من الدفع");
  }
  return data as {
    success: boolean;
    idempotent?: boolean;
    trainer_id?: string;
    kind?: string;
  };
}
