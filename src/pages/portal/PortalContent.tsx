import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const POST_EMOJI: Record<string, string> = {
  "نصيحة": "💡",
  "تمرين": "🏋️",
  "وجبة": "🥗",
  "تحفيز": "🔥",
};

const PortalContent = () => {
  const { token } = useParams();

  // Get client to find trainer_id
  const { data: client } = useQuery({
    queryKey: ["portal-client", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("trainer_id")
        .eq("portal_token", token!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["portal-trainer-posts", client?.trainer_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_posts")
        .select("*")
        .eq("trainer_id", client!.trainer_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!client?.trainer_id,
  });

  return (
    <ClientPortalLayout>
      <div className="space-y-4" dir="rtl">
        <h1 className="text-xl font-bold text-foreground">محتوى مدربك</h1>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">لا توجد منشورات بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post: any) => (
              <Card key={post.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {POST_EMOJI[post.post_type] || "📝"} {post.post_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default PortalContent;
