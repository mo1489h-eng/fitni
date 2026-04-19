import { supabase } from "@/integrations/supabase/client";
import { storageUploadErrorMessage } from "@/lib/storage-errors";

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

/** Raw POST to Storage REST API so upload progress can be reported (supabase-js upload has no callback). */
function putVaultObjectWithProgress(
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const apikey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !apikey) {
    return Promise.reject(new Error("إعدادات الخادم ناقصة (رابط أو مفتاح Supabase)."));
  }

  return supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.access_token) {
      throw new Error("يجب تسجيل الدخول لرفع الملفات.");
    }

    const url = `${baseUrl}/storage/v1/object/${VAULT_BUCKET}/${path}`;

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("apikey", apikey);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("Cache-Control", "max-age=3600");

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && onProgress) {
          onProgress(Math.min(100, Math.round((ev.loaded / ev.total) * 100)));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }
        let raw = `خطأ HTTP ${xhr.status}`;
        try {
          const j = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          raw = j.message || j.error || raw;
        } catch {
          /* ignore */
        }
        reject(new Error(storageUploadErrorMessage(new Error(raw))));
      };
      xhr.onerror = () => reject(new Error(storageUploadErrorMessage(new Error("network"))));
      xhr.send(file);
    });
  });
}

/** Path: {trainer_id}/{unit_id}/{filename} */
export async function uploadVaultLessonFile(
  file: File,
  trainerId: string,
  unitId: string,
  kind: "pdf" | "video" | "image",
  onProgress?: (percent: number) => void,
): Promise<{ publicUrl: string; fileSize: number }> {
  const err = validateVaultFile(file, kind);
  if (err) throw new Error(err);

  const path = `${trainerId}/${unitId}/${Date.now()}_${sanitizeFilename(file.name)}`;
  onProgress?.(0);
  await putVaultObjectWithProgress(path, file, onProgress);
  onProgress?.(100);

  const { data } = supabase.storage.from(VAULT_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl) throw new Error("تعذّر إنشاء رابط الملف. حاول مجدداً.");
  return { publicUrl, fileSize: file.size };
}

export function isVideoEmbedUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return /youtube\.com|youtu\.be|vimeo\.com/.test(u);
}
