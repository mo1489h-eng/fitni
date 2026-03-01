import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import PostCard from "@/components/PostCard";
import { Loader2 } from "lucide-react";

const PortalContent = () => {
  const { token } = useParams();

  const { data: client } = useQuery({
    queryKey: ["portal-client", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_client_by_portal_token", { p_token: token! });
      if (error) throw error;
      return (data && data.length > 0) ? data[0] : null;
    },
    enabled: !!token,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["portal-trainer-posts", client?.trainer_id, client?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_posts")
        .select("*")
        .eq("trainer_id", client!.trainer_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Filter: show posts for 'all' audience OR posts that include this client
      return (data || []).filter(
        (p: any) =>
          p.audience === "all" ||
          (p.audience === "selected" && (p.audience_client_ids || []).includes(client!.id))
      );
    },
    enabled: !!client?.trainer_id,
  });

  return (
    <ClientPortalLayout>
      <div className="space-y-4" dir="rtl">
        <h1 className="text-xl font-bold text-foreground">محتوى مدربك 📢</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">لا توجد منشورات بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default PortalContent;
