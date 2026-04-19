import { supabase } from "@/integrations/supabase/client";

export const VAULT_BUCKET = "vault-content";

export const MAX_VAULT_PDF_BYTES = 50 * 1024 * 1024;
export const MAX_VAULT_VIDEO_BYTES = 500 * 1024 * 1024;
export const MAX_VAULT_IMAGE_BYTES = 10 * 1024 * 1024;

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\u0600-\u06FF-]+/g, "_").slice(0, 180) || "file";
}

export function validateVaultFile(
  file: File,
  kind: "pdf" | "video" | "image",
): string | null {
  if (kind === "pdf") {
    if (file.size > MAX_VAULT_PDF_BYTES) return "حجم PDF يتجاوز 50 ميجابايت";
    if (file.type !== "application/pdf") return "الملف يجب أن يكون PDF";
  }
  if (kind === "video") {
    if (file.size > MAX_VAULT_VIDEO_BYTES) return "حجم الفيديو يتجاوز 500 ميجابايت";
    if (!/^video\//.test(file.type)) return "الملف يجب أن يكون فيديو";
  }
  if (kind === "image") {
    if (file.size > MAX_VAULT_IMAGE_BYTES) return "حجم الصورة يتجاوز 10 ميجابايت";
    if (!/^image\//.test(file.type)) return "الملف يجب أن يكون صورة";
  }
  return null;
}

/** Path: {trainer_id}/{unit_id}/{filename} */
export async function uploadVaultLessonFile(
  file: File,
  trainerId: string,
  unitId: string,
  kind: "pdf" | "video" | "image",
): Promise<{ publicUrl: string; fileSize: number }> {
  const err = validateVaultFile(file, kind);
  if (err) throw new Error(err);

  const path = `${trainerId}/${unitId}/${Date.now()}_${sanitizeFilename(file.name)}`;
  const { error: upErr } = await supabase.storage.from(VAULT_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (upErr) throw new Error(upErr.message);

  const { data } = supabase.storage.from(VAULT_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl) throw new Error("لم يُنشأ رابط الملف");
  return { publicUrl, fileSize: file.size };
}

export function isVideoEmbedUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return /youtube\.com|youtu\.be|vimeo\.com/.test(u);
}
