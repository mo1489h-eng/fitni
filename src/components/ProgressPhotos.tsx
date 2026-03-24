import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Images, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/image-upload";

interface ProgressPhotosProps {
  clientId: string;
  uploadedBy: "trainer" | "client";
  trainerId?: string;
  portalToken?: string;
}

const ProgressPhotos = ({ clientId, uploadedBy, trainerId, portalToken }: ProgressPhotosProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["progress-photos", clientId, portalToken],
    queryFn: async () => {
      let items: Array<{
        id: string;
        client_id: string;
        photo_type: string;
        photo_url: string;
        uploaded_by: string;
        created_at: string;
      }>;

      if (portalToken) {
        // Portal access: use secure RPC
        const { data, error } = await supabase.rpc("get_portal_progress_photos" as any, {
          p_token: portalToken,
        });
        if (error) throw error;
        items = (data || []) as typeof items;
      } else {
        // Trainer access: direct query (RLS enforced)
        const { data, error } = await (supabase as any)
          .from("progress_photos")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        items = data as typeof items;
      }

      // Resolve signed URLs for non-http paths (new format)
      const resolved = await Promise.all(
        items.map(async (item) => {
          if (item.photo_url.startsWith("http")) return item;
          const { data: signedData } = await supabase.storage
            .from("progress-photos")
            .createSignedUrl(item.photo_url, 60 * 60);
          return { ...item, photo_url: signedData?.signedUrl || item.photo_url };
        })
      );
      return resolved;
    },
    enabled: !!clientId,
  });

  const handleUpload = async (file: File, type: "before" | "after") => {
    if (!file) return;
    setUploading(type);
    try {
      const path = `${trainerId || "portal"}/${clientId}/${type}_${Date.now()}.jpg`;
      const result = await uploadImage(file, "progress-photos", path);

      if (portalToken) {
        const { error: dbErr } = await supabase.rpc("insert_portal_progress_photo" as any, {
          p_token: portalToken,
          p_photo_type: type,
          p_photo_url: result.storagePath,
        });
        if (dbErr) throw dbErr;
      } else {
        const { error: dbErr } = await (supabase as any)
          .from("progress_photos")
          .insert({
            client_id: clientId,
            trainer_id: trainerId || null,
            photo_type: type,
            photo_url: result.storagePath,
            uploaded_by: uploadedBy,
          });
        if (dbErr) throw dbErr;
      }

      queryClient.invalidateQueries({ queryKey: ["progress-photos", clientId, portalToken] });
      toast({ title: "تم رفع الصورة بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ في رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (photo: { id: string; photo_url: string }) => {
      // photo_url is either a storage path or a full public URL (legacy)
      let storagePath = photo.photo_url;
      if (photo.photo_url.startsWith("http")) {
        const url = new URL(photo.photo_url);
        const pathParts = url.pathname.split("/storage/v1/object/public/progress-photos/");
        storagePath = pathParts[1] ? decodeURIComponent(pathParts[1]) : photo.photo_url;
      }
      await supabase.storage.from("progress-photos").remove([storagePath]);
      const { error } = await (supabase as any).from("progress_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-photos", clientId, portalToken] });
      toast({ title: "تم حذف الصورة" });
    },
  });

  const beforePhotos = photos.filter((p) => p.photo_type === "before");
  const afterPhotos = photos.filter((p) => p.photo_type === "after");
  const latestBefore = beforePhotos[0];
  const latestAfter = afterPhotos[0];

  return (
    <Card className="p-4">
      <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
        <Images className="w-4 h-4 text-primary" />
        صور التقدم
      </h3>

      {/* Upload buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <input
            ref={beforeRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f, "before");
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            className="w-full gap-1.5"
            size="sm"
            disabled={!!uploading}
            onClick={() => beforeRef.current?.click()}
          >
            {uploading === "before" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            صورة قبل
          </Button>
        </div>
        <div>
          <input
            ref={afterRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f, "after");
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            className="w-full gap-1.5"
            size="sm"
            disabled={!!uploading}
            onClick={() => afterRef.current?.click()}
          >
            {uploading === "after" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            صورة بعد
          </Button>
        </div>
      </div>

      {/* Comparison */}
      {(latestBefore || latestAfter) ? (
        <div className="grid grid-cols-2 gap-3">
          {[{ label: "قبل", photo: latestBefore }, { label: "بعد", photo: latestAfter }].map(({ label, photo }) => (
            <div key={label} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground text-center">{label}</p>
              {photo ? (
                <div className="relative group">
                  <img
                    src={photo.photo_url}
                    alt={label}
                    className="w-full aspect-[3/4] object-cover rounded-lg border border-border"
                  />
                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                    {new Date(photo.created_at).toLocaleDateString("ar-SA")}
                  </p>
                  <button
                    onClick={() => deleteMutation.mutate(photo)}
                    className="absolute top-1.5 left-1.5 bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-full aspect-[3/4] rounded-lg border border-dashed border-border flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">لا توجد صورة</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          <Camera className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
          <p className="text-xs">لم يتم رفع صور بعد</p>
        </div>
      )}

      {/* All photos history */}
      {photos.length > 2 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">جميع الصور ({photos.length})</p>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative group">
                <img
                  src={p.photo_url}
                  alt={p.photo_type}
                  className="w-full aspect-square object-cover rounded-lg border border-border"
                />
                <span className="absolute bottom-1 right-1 text-[9px] bg-background/80 text-foreground px-1 rounded">
                  {p.photo_type === "before" ? "قبل" : "بعد"}
                </span>
                <button
                  onClick={() => deleteMutation.mutate(p)}
                  className="absolute top-1 left-1 bg-destructive/90 text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProgressPhotos;
