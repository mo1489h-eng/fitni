/** Body shape from `send-invite-email` (always JSON when deploy is current). */
export type SendInviteEmailPayload = {
  success?: boolean;
  emailSent?: boolean;
  setupLink?: string;
  message?: string;
  error?: string;
  reason?: string;
  code?: string;
  skipped?: boolean;
  resendId?: string;
};

/**
 * `supabase.functions.invoke` only fills `data` when the Edge Function returns 2xx.
 * For non-2xx, the JSON body is on `FunctionsHttpError.context` (a `Response`).
 */
export async function parseSendInviteEmailInvoke(
  data: unknown,
  fnError: unknown,
): Promise<{ payload: SendInviteEmailPayload | null; invokeError: string | null }> {
  if (data != null && typeof data === "object") {
    return { payload: data as SendInviteEmailPayload, invokeError: null };
  }
  if (fnError && typeof fnError === "object" && "context" in fnError) {
    const ctx = (fnError as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        const j: unknown = await ctx.clone().json();
        if (j && typeof j === "object") {
          return { payload: j as SendInviteEmailPayload, invokeError: null };
        }
      } catch {
        /* fall through */
      }
    }
  }
  const msg = fnError instanceof Error ? fnError.message : String(fnError ?? "");
  return { payload: null, invokeError: msg };
}
