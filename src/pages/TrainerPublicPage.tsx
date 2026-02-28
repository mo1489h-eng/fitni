import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PostCard from "@/components/PostCard";
import { Card } from "@/components/ui/card";
import { Dumbbell, Loader2 } from "lucide-react";

const TrainerPublicPage = () => {
  const { trainerId } = useParams();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["public-profile", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, specialization, bio, avatar_url")
        .eq("user_id", trainerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["public-posts", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_posts")
        .select("*")
        .eq("trainer_id", trainerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Filter to only public posts (audience = 'all')
      return (data || []).filter((p: any) => p.audience === "all");
    },
    enabled: !!trainerId,
  });

  if (profileLoading || postsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-primary px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary-foreground" />
          <span className="font-black text-primary-foreground">fitni</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Profile Header */}
        <Card className="p-6 text-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full mx-auto mb-3 object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">
                {profile?.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || "?"}
              </span>
            </div>
          )}
          <h1 className="text-xl font-bold text-foreground">{profile?.full_name || "مدرب"}</h1>
          {profile?.specialization && (
            <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium inline-block mt-2">
              {profile.specialization}
            </span>
          )}
          {profile?.bio && <p className="text-sm text-muted-foreground mt-3">{profile.bio}</p>}
        </Card>

        {/* Posts */}
        {posts.length === 0 ? (
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
      </main>
    </div>
  );
};

export default TrainerPublicPage;
