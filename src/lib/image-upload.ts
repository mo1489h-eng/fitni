import { supabase } from "@/integrations/supabase/client";
import { storageUploadErrorMessage } from "@/lib/storage-errors";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const COMPRESS_TARGET = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface UploadResult {
  signedUrl: string;
  storagePath: string;
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "نوع الملف غير مدعوم (JPG, PNG, WEBP فقط)";
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return "الملف كبير جداً (الحد الأقصى 10MB)";
  }
  return null;
}

export function compressImage(file: File, maxSize = COMPRESS_TARGET): Promise<File> {
  return new Promise((resolve) => {
    if (file.size <= maxSize) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const scale = Math.sqrt(maxSize / file.size);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          resolve(new File([blob!], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.8
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export async function uploadImage(
  file: File,
  bucket: string,
  path: string,
  options?: { upsert?: boolean }
): Promise<UploadResult> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const compressed = await compressImage(file);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, compressed, {
      contentType: compressed.type,
      upsert: options?.upsert ?? true,
    });
  if (error) {
    throw new Error(storageUploadErrorMessage(error));
  }

  const { data: signedData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (!signedData?.signedUrl) {
    throw new Error("حدث خطأ في الرفع، حاول مجدداً");
  }

  return { signedUrl: signedData.signedUrl, storagePath: path };
}
