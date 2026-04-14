import { supabase } from "@/integrations/supabase/client";

function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  const anonKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    "";
  return { url, anonKey };
}

/**
 * Invokes a Supabase Edge Function via fetch with explicit `apikey` + `Authorization`.
 * More reliable than `supabase.functions.invoke` in some browsers / when the JS client omits headers.
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
  const accessToken = sessionData.session?.access_token;
  const bearer = accessToken ?? anonKey;

  const endpoint = `${url}/functions/v1/${functionName}`;

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
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return {
      data: null,
      error: new Error(
        `تعذر الاتصال بدالة Edge (${functionName}): ${raw}. تحقق من الشبكة، وأن الدالة منشورة على مشروع Supabase، وأن عنوان VITE_SUPABASE_URL صحيح.`,
      ),
    };
  }
}
