import { supabase } from "@/integrations/supabase/client";

function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  const anonKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    "";
  return { url, anonKey };
}

async function parseFunctionResponse<T>(res: Response): Promise<{ data: T | null; error: Error | null }> {
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      return {
        data: null,
        error: new Error(
          res.ok
            ? "استجابة غير صالحة من الخادم"
            : `خطأ ${res.status}: ${text.slice(0, 200)}`,
        ),
      };
    }
  }

  if (!res.ok) {
    const j = json as { error?: string; message?: string } | null;
    const msg = j?.error ?? j?.message ?? `HTTP ${res.status}`;
    return { data: null, error: new Error(msg) };
  }

  return { data: json as T, error: null };
}

/**
 * Calls Edge Function via fetch. Used after SDK or for dev proxy path.
 */
async function invokeViaFetch(
  endpoint: string,
  body: Record<string, unknown>,
  anonKey: string,
  bearer: string,
): Promise<{ data: unknown | null; error: Error | null }> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });
    return parseFunctionResponse(res);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return {
      data: null,
      error: new Error(raw),
    };
  }
}

/**
 * Invokes Supabase Edge Functions reliably:
 * - **Development**: prefers same-origin `/functions/v1/...` (Vite proxy) to avoid browser "Failed to fetch" to *.supabase.co.
 * - **Production**: uses `supabase.functions.invoke` first, then direct fetch as fallback.
 */
export async function invokeEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: Error | null }> {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    return {
      data: null,
      error: new Error(
        "إعداد Supabase غير مكتمل: عرّف VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY في ملف .env ثم أعد تشغيل السيرفر.",
      ),
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const bearer = sessionData.session?.access_token ?? anonKey;

  const remoteEndpoint = `${url}/functions/v1/${functionName}`;

  // --- Local dev: Vite proxies /functions/v1 → VITE_SUPABASE_URL (same-origin = no cross-origin fetch failures)
  if (import.meta.env.DEV) {
    const localFirst = await invokeViaFetch(`/functions/v1/${functionName}`, body, anonKey, bearer);
    if (!localFirst.error) {
      return { data: localFirst.data as T, error: null };
    }

    const sdk = await supabase.functions.invoke<T>(functionName, { body });
    if (!sdk.error) {
      return { data: sdk.data as T, error: null };
    }

    const remote = await invokeViaFetch(remoteEndpoint, body, anonKey, bearer);
    if (!remote.error) {
      return { data: remote.data as T, error: null };
    }

    return {
      data: null,
      error: new Error(
        `فشل الاتصال بدالة ${functionName}. تأكد من: (1) تشغيل npm من مجلد المشروع حيث يعمل Vite proxy، (2) نشر الدالة: supabase functions deploy ${functionName}، (3) تعطيل مانع الإعلانات مؤقتاً. آخر خطأ: ${localFirst.error.message}`,
      ),
    };
  }

  // --- Production: official SDK first (handles client version & headers)
  const sdk = await supabase.functions.invoke<T>(functionName, { body });
  if (!sdk.error) {
    return { data: sdk.data as T, error: null };
  }

  const sdkErr = sdk.error;
  const remote = await invokeViaFetch(remoteEndpoint, body, anonKey, bearer);
  if (!remote.error) {
    return { data: remote.data as T, error: null };
  }

  const hint =
    /failed to fetch|networkerror|load failed/i.test(sdkErr?.message ?? "") ||
    /failed to fetch|networkerror/i.test(remote.error.message)
      ? " غالباً: حظر الشبكة أو الإضافات، أو مشروع Supabase متوقف، أو الدالة غير منشورة. Tap: عرّف TAP_SECRET_KEY في Supabase → Edge Functions → Secrets للدالة create-tap-charge."
      : "";

  return {
    data: null,
    error: new Error(
      `${sdkErr?.message ?? remote.error.message}${hint}`,
    ),
  };
}
