import { useState, useRef } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import PostCard from "@/components/PostCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, Copy, ExternalLink, Loader2,
  Image as ImageIcon, Video, Link2, X, Camera,
} from "lucide-react";

const POST_TYPES = [
  { value: "نصيحة", label: "نصيحة" },
  { value: "تمرين", label: "تمرين" },
  { value: "وجبة", label: "وجبة" },
  { value: "تحفيز", label: "تحفيز" },
  { value: "إعلان", label: "إعلان" },
];

const TrainerContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [postType, setPostType] = useState("نصيحة");
  const [postContent, setPostContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["trainer-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_posts")
        .select("*")
        .eq("trainer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const resetForm = () => {
    setEditingPost(null);
    setPostType("نصيحة");
    setPostContent("");
    setImageFile(null);
    setImagePreview(null);
    setVideoFile(null);
    setVideoPreview(null);
    setLinkUrl("");
    setAudience("all");
    setSelectedClients([]);
  };

  const openNewPost = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditPost = (post: any) => {
    setEditingPost(post);
    setPostType(post.post_type);
    setPostContent(post.content);
    setImagePreview(post.image_url || null);
    setVideoPreview(post.video_url || null);
    setLinkUrl(post.link_url || "");
    setAudience(post.audience === "selected" ? "selected" : "all");
    setSelectedClients(post.audience_client_ids || []);
    setImageFile(null);
    setVideoFile(null);
    setShowDialog(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "حجم الصورة كبير جداً (الحد 5MB)", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "حجم الفيديو كبير جداً (الحد 20MB)", variant: "destructive" });
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const fileName = `${user!.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(fileName, file);
    if (error) throw error;
    // Store the path; create signed URL when displaying
    const { data } = await supabase.storage.from("post-media").createSignedUrl(fileName, 60 * 60 * 24 * 365);
    return data?.signedUrl || fileName;
  };

  const handlePublish = async () => {
    if (!postContent.trim()) {
      toast({ title: "اكتب محتوى المنشور", variant: "destructive" });
      return;
    }
    setPublishing(true);
    try {
      let uploadedImageUrl = editingPost?.image_url || null;
      let uploadedVideoUrl = editingPost?.video_url || null;

      if (imageFile) {
        uploadedImageUrl = await uploadFile(imageFile, "images");
      }
      if (!imagePreview) uploadedImageUrl = null;

      if (videoFile) {
        uploadedVideoUrl = await uploadFile(videoFile, "videos");
      }
      if (!videoPreview) uploadedVideoUrl = null;

      const postData = {
        trainer_id: user!.id,
        post_type: postType,
        content: postContent,
        image_url: uploadedImageUrl,
        video_url: uploadedVideoUrl,
        link_url: linkUrl || null,
        audience: audience,
        audience_client_ids: audience === "selected" ? selectedClients : [],
      };

      if (editingPost) {
        const { error } = await supabase
          .from("trainer_posts")
          .update(postData)
          .eq("id", editingPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trainer_posts").insert(postData);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["trainer-posts"] });
      setShowDialog(false);
      resetForm();
      toast({ title: editingPost ? "تم تحديث المنشور" : "تم النشر بنجاح" });
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainer_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-posts"] });
      toast({ title: "تم حذف المنشور" });
    },
  });

  const publicUrl = `${window.location.origin}/trainer/${user?.id}`;

  return (
    <TrainerLayout>
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">المحتوى</h1>
            <p className="text-muted-foreground text-sm">انشر محتوى لعملائك ومتابعيك</p>
          </div>
          <Button onClick={openNewPost} className="gap-2">
            <Plus className="w-4 h-4" />
            منشور جديد
          </Button>
        </div>

        {/* Public page link */}
        <Card className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">صفحتك العامة</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              navigator.clipboard.writeText(publicUrl);
              toast({ title: "تم نسخ الرابط" });
            }}
          >
            <Copy className="w-3 h-3" /> نسخ
          </Button>
        </Card>

        {/* Posts Feed */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="p-12 text-center">
            <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد منشورات بعد</h3>
            <p className="text-muted-foreground text-sm mb-4">شارك نصائح وتمارين مع متدربيك</p>
            <Button onClick={openNewPost} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> أول منشور
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <PostCard
                key={post.id}
                post={post}
                actions={
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEditPost(post)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => deletePost.mutate(post.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingPost ? "تعديل المنشور" : "إنشاء منشور جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Post Type Tabs */}
            <div className="flex flex-wrap gap-2">
              {POST_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setPostType(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    postType === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <Textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="اكتب منشورك..."
              rows={4}
              className="resize-none"
            />

            {/* Media Attachments */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">إرفاق وسائط</p>

              {/* Image */}
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={imagePreview} alt="" className="w-full max-h-48 object-cover rounded-xl" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 left-2 h-7 w-7 p-0 bg-black/50 text-white rounded-full hover:bg-black/70"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="w-4 h-4" />
                  إضافة صورة
                </Button>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              {/* Video */}
              {videoPreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <video
                    src={videoPreview}
                    className="w-full max-h-48 rounded-xl"
                    controls
                    preload="metadata"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 left-2 h-7 w-7 p-0 bg-black/50 text-white rounded-full hover:bg-black/70"
                    onClick={() => {
                      setVideoFile(null);
                      setVideoPreview(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Video className="w-4 h-4" />
                  إضافة فيديو
                </Button>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoSelect}
              />

              {/* Link */}
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="رابط YouTube / Instagram / TikTok"
                  dir="ltr"
                  className="text-sm"
                />
              </div>

              {/* YouTube preview in dialog */}
              {linkUrl && /youtube\.com|youtu\.be/.test(linkUrl) && (() => {
                const match = linkUrl.match(
                  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/
                );
                return match ? (
                  <div className="rounded-xl overflow-hidden aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${match[1]}`}
                      className="w-full h-full"
                      allowFullScreen
                      title="Preview"
                    />
                  </div>
                ) : null;
              })()}
            </div>

            {/* Audience Selector */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">الجمهور</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAudience("all")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    audience === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  كل العملاء
                </button>
                <button
                  onClick={() => setAudience("selected")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    audience === "selected"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  عملاء محددين
                </button>
              </div>

              {audience === "selected" && (
                <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                  {clients.map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={selectedClients.includes(c.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedClients([...selectedClients, c.id]);
                          else setSelectedClients(selectedClients.filter((id) => id !== c.id));
                        }}
                      />
                      <span className="text-sm text-foreground">{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Publish Button */}
            <Button
              className="w-full gap-2"
              disabled={!postContent.trim() || publishing}
              onClick={handlePublish}
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري النشر...
                </>
              ) : (
                editingPost ? "تحديث المنشور" : "نشر الآن ✅"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TrainerLayout>
  );
};

export default TrainerContent;
