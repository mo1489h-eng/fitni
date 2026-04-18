import { Card } from "@/components/ui/card";
import { Eye, ExternalLink, Lightbulb, Dumbbell, Apple, Flame, Megaphone, Camera, Music2, Link2, LucideIcon } from "lucide-react";

const POST_BADGES: Record<string, { icon: LucideIcon; color: string }> = {
  "نصيحة": { icon: Lightbulb, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  "تمرين": { icon: Dumbbell, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  "وجبة": { icon: Apple, color: "bg-primary/15 text-primary border-primary/20" },
  "تحفيز": { icon: Flame, color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  "إعلان": { icon: Megaphone, color: "bg-primary/10 text-muted-foreground border-primary/20" },
};

const getYouTubeId = (url: string): string | null => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

const isYouTubeUrl = (url: string) => /youtube\.com|youtu\.be/.test(url);
const isInstagramUrl = (url: string) => /instagram\.com/.test(url);
const isTikTokUrl = (url: string) => /tiktok\.com/.test(url);

interface PostCardProps {
  post: {
    id: string;
    post_type: string;
    content: string;
    image_url?: string | null;
    video_url?: string | null;
    link_url?: string | null;
    views_count?: number;
    created_at: string;
  };
  actions?: React.ReactNode;
}

const PostCard = ({ post, actions }: PostCardProps) => {
  const badge = POST_BADGES[post.post_type] || POST_BADGES["نصيحة"];
  const ytId = post.link_url ? getYouTubeId(post.link_url) : null;
  const BadgeIcon = badge.icon;

  return (
    <Card className="overflow-hidden">
      {post.image_url && (
        <div className="w-full aspect-video bg-muted">
          <img
            src={post.image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {ytId && (
        <div className="w-full aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video"
          />
        </div>
      )}

      {post.video_url && (
        <div className="w-full aspect-video bg-muted">
          <video
            src={post.video_url}
            controls
            className="w-full h-full object-cover"
            preload="metadata"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${badge.color}`}>
            <BadgeIcon className="w-3.5 h-3.5" />
            {post.post_type}
          </span>
          <div className="flex items-center gap-2">
            {typeof post.views_count === "number" && post.views_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" />
                {post.views_count}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString("ar-SA", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {actions}
          </div>
        </div>

        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post.content}</p>

        {post.link_url && !ytId && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate inline-flex items-center gap-1.5">
                {isInstagramUrl(post.link_url) ? (
                  <><Camera className="w-3.5 h-3.5" /> منشور انستقرام</>
                ) : isTikTokUrl(post.link_url) ? (
                  <><Music2 className="w-3.5 h-3.5" /> فيديو تيك توك</>
                ) : (
                  <><Link2 className="w-3.5 h-3.5" /> رابط خارجي</>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground truncate" dir="ltr">
                {post.link_url}
              </p>
            </div>
          </a>
        )}
      </div>
    </Card>
  );
};

export default PostCard;
export { POST_BADGES };
