import { useState } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Lightbulb, Dumbbell, UtensilsCrossed, Flame, Copy, ExternalLink } from "lucide-react";

const POST_TYPES = [
  { value: "نصيحة", label: "💡 نصيحة اليوم", icon: Lightbulb },
  { value: "تمرين", label: "🏋️ تمرين اليوم", icon: Dumbbell },
  { value: "وجبة", label: "🥗 وجبة صحية", icon: UtensilsCrossed },
  { value: "تحفيز", label: "🔥 تحفيز", icon: Flame },
];

const POST_EMOJI: Record<string, string> = {
  "نصيحة": "💡",
  "تمرين": "🏋️",
  "وجبة": "🥗",
  "تحفيز": "🔥",
};

const TrainerContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [postType, setPostType] = useState("نصيحة");
  const [postContent, setPostContent] = useState("");

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

  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("trainer_posts").insert({
        trainer_id: user!.id,
        post_type: postType,
        content: postContent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-posts"] });
      setShowDialog(false);
      setPostContent("");
      toast({ title: "تم نشر المحتوى ✅" });
    },
  });

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
            <p className="text-muted-foreground text-sm">انشر نصائح وتمارين لعملائك</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="gap-2">
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
          <Button variant="outline" size="sm" className="gap-1" onClick={() => {
            navigator.clipboard.writeText(publicUrl);
            toast({ title: "تم نسخ الرابط 📋" });
          }}>
            <Copy className="w-3 h-3" /> نسخ الرابط
          </Button>
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : posts.length === 0 ? (
          <Card className="p-12 text-center">
            <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد منشورات بعد</h3>
            <p className="text-muted-foreground text-sm mb-4">شارك نصائح وتمارين مع متدربيك</p>
            <Button onClick={() => setShowDialog(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> أول منشور
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((post: any) => (
              <Card key={post.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {POST_EMOJI[post.post_type] || "📝"} {post.post_type}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deletePost.mutate(post.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>منشور جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">نوع المحتوى</label>
              <Select value={postType} onValueChange={setPostType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">المحتوى</label>
              <Textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="اكتب محتواك هنا..."
                rows={4}
              />
            </div>
            <Button
              className="w-full"
              disabled={!postContent.trim() || createPost.isPending}
              onClick={() => createPost.mutate()}
            >
              {createPost.isPending ? "جاري النشر..." : "نشر"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TrainerLayout>
  );
};

export default TrainerContent;
