/** Maps Supabase Storage / network errors to Arabic user-facing messages. */
export function storageUploadErrorMessage(err: unknown): string {
  const raw =
    err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
      ? (err as { message: string }).message
      : typeof err === "string"
        ? err
        : "";
  const m = raw.toLowerCase();
  if (m.includes("row-level security") || m.includes("rls") || m.includes("violates policy")) {
    return "تم رفض الرفع لأسباب صلاحيات. تأكد من تسجيل الدخول أو أن المسار صحيح.";
  }
  if (m.includes("duplicate") || m.includes("already exists")) {
    return "يوجد ملف بنفس الاسم. احذف النسخة القديمة أو أعد المحاولة.";
  }
  if (m.includes("mime") || m.includes("mime type") || m.includes("invalid mime")) {
    return "نوع الملف غير مدعوم.";
  }
  if (m.includes("size") || m.includes("payload") || m.includes("too large") || m.includes("entity too large")) {
    return "حجم الملف يتجاوز الحد المسموح.";
  }
  if (m.includes("bucket not found") || m.includes("bucket")) {
    return "تعذّر الوصول إلى مساحة التخزين. حاول لاحقاً أو تواصل مع الدعم.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "تعذّر الاتصال بالخادم. تحقق من الشبكة وحاول مجدداً.";
  }
  return "حدث خطأ في الرفع، حاول مجدداً.";
}
