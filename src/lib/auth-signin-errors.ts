/**
 * Map Supabase Auth errors to user-facing Arabic copy.
 * The API often returns 400 with the same HTTP status for wrong password, unconfirmed email, captcha, etc.
 */
export function describeSignInError(err: unknown): { title: string; description: string } {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const msg = raw.toLowerCase();

  const e = err as { code?: string; status?: number };
  const code = (e.code ?? "").toLowerCase();

  if (msg.includes("email not confirmed") || code === "email_not_confirmed") {
    return {
      title: "البريد غير مؤكّد",
      description: "افتح رابط التأكيد من بريدك، أو استخدم «نسيت كلمة المرور؟» لإرسال رابط جديد.",
    };
  }

  if (msg.includes("captcha") || msg.includes("hcaptcha") || msg.includes("turnstile")) {
    return {
      title: "تحقق أمني مطلوب",
      description:
        "المشروع يتطلب تحققاً من الروبوت في لوحة Supabase. عطّل Captcha مؤقتاً للاختبار أو أضف مفتاح Captcha في التطبيق.",
    };
  }

  if (
    msg.includes("invalid login") ||
    msg.includes("invalid grant") ||
    msg.includes("invalid credentials") ||
    code === "invalid_credentials"
  ) {
    return {
      title: "بيانات الدخول غير صحيحة",
      description:
        "تأكد من البريد (بدون مسافات) وكلمة المرور. إذا أنشأت حساباً للتو، جرّب «نسيت كلمة المرور؟» لإعادة التعيين.",
    };
  }

  if (msg.includes("too many") || msg.includes("rate") || msg.includes("429")) {
    return {
      title: "محاولات كثيرة",
      description: "انتظر دقيقة ثم حاول مرة أخرى.",
    };
  }

  return {
    title: "تعذّر تسجيل الدخول",
    description: raw || "حدث خطأ غير متوقع.",
  };
}
