import { useState, useEffect } from "react";
import { usePortalToken } from "@/hooks/usePortalToken";
import { useParams, useNavigate } from "react-router-dom";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Circle, Video, FileText, Type, BookOpen
} from "lucide-react";

type PortalLesson = {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  lesson_order: number;
  completed: boolean;
};

type PortalUnit = {
  id: string;
  title: string;
  description: string | null;
  lessons: PortalLesson[];
};

const contentTypeIcons: Record<string, React.ElementType> = {
  video: Video,
  pdf: FileText,
  article: Type,
};

const getEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
  return url;
};

const PortalLessonPlayer = () => {
  const { token } = usePortalToken();
  const { unitId, lessonId } = useParams();
  const navigate = useNavigate();

  const [unit, setUnit] = useState<PortalUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    const { data, error } = await supabase.rpc("get_portal_vault", { p_token: token });
    if (!error && data) {
      const units = data as unknown as PortalUnit[];
      const found = units.find(u => u.id === unitId);
      if (found) setUnit(found);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [token, unitId]);

  if (loading) {
    return (
      <ClientPortalLayout>
        <div className="text-center py-20 text-[hsl(0_0%_30%)]">جاري التحميل...</div>
      </ClientPortalLayout>
    );
  }

  if (!unit) {
    return (
      <ClientPortalLayout>
        <div className="text-center py-20 text-[hsl(0_0%_30%)]">الوحدة غير موجودة</div>
      </ClientPortalLayout>
    );
  }

  const sortedLessons = [...unit.lessons].sort((a, b) => a.lesson_order - b.lesson_order);
  const currentIdx = sortedLessons.findIndex(l => l.id === lessonId);
  const lesson = currentIdx >= 0 ? sortedLessons[currentIdx] : null;
  const prevLesson = currentIdx > 0 ? sortedLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < sortedLessons.length - 1 ? sortedLessons[currentIdx + 1] : null;

  if (!lesson) {
    return (
      <ClientPortalLayout>
        <div className="text-center py-20 text-[hsl(0_0%_30%)]">الدرس غير موجود</div>
      </ClientPortalLayout>
    );
  }

  const toggleComplete = async () => {
    if (!token) return;
    const { data, error } = await supabase.rpc("toggle_portal_vault_progress", {
      p_token: token,
      p_lesson_id: lesson.id,
    });
    if (!error) {
      toast.success(data ? "تم تسجيل المشاهدة" : "تم الغاء التسجيل");
      // Auto-advance on complete
      if (data && nextLesson) {
        navigate(`/portal/vault/${unitId}/${nextLesson.id}`, { replace: true });
      }
      fetchData();
    }
  };

  const navigateToLesson = (id: string) => {
    navigate(`/portal/vault/${unitId}/${id}`, { replace: true });
  };

  return (
    <ClientPortalLayout>
      <div className="space-y-4 animate-fade-in" dir="rtl">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/portal/vault")}
            className="flex items-center gap-2 text-sm text-[hsl(0_0%_40%)] hover:text-white transition-colors"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            {unit.title}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-1.5 text-xs text-[hsl(0_0%_45%)] hover:text-white transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
            {currentIdx + 1}/{sortedLessons.length}
          </button>
        </div>

        {/* Lesson sidebar (mobile drawer) */}
        {sidebarOpen && (
          <div className="rounded-xl border border-[hsl(0_0%_10%)] bg-[hsl(0_0%_5%)] overflow-hidden">
            {sortedLessons.map((l, i) => {
              const Icon = contentTypeIcons[l.content_type] || FileText;
              const isCurrent = l.id === lesson.id;
              return (
                <button
                  key={l.id}
                  onClick={() => { navigateToLesson(l.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${
                    isCurrent ? "bg-primary/10 border-r-2 border-primary" : "hover:bg-[hsl(0_0%_8%)]"
                  }`}
                >
                  {l.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
                  ) : (
                    <Circle className={`h-4 w-4 shrink-0 ${isCurrent ? "text-primary" : "text-[hsl(0_0%_25%)]"}`} strokeWidth={1.5} />
                  )}
                  <Icon className="h-3.5 w-3.5 text-[hsl(0_0%_35%)] shrink-0" strokeWidth={1.5} />
                  <span className={`text-xs flex-1 truncate ${isCurrent ? "text-white font-medium" : l.completed ? "text-[hsl(0_0%_35%)]" : "text-[hsl(0_0%_55%)]"}`}>
                    {l.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Lesson title */}
        <h2 className="text-lg font-bold text-white">{lesson.title}</h2>

        {/* Content player */}
        {lesson.content_type === "video" && lesson.content_url && (
          <div className="aspect-video rounded-xl overflow-hidden border border-[hsl(0_0%_10%)] bg-black">
            <iframe
              src={getEmbedUrl(lesson.content_url) || ""}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {lesson.content_type === "pdf" && lesson.content_url && (
          <div className="rounded-xl overflow-hidden border border-[hsl(0_0%_10%)] bg-black" style={{ height: "65vh" }}>
            <iframe src={lesson.content_url} className="w-full h-full" />
          </div>
        )}

        {lesson.content_type === "article" && lesson.content_text && (
          <div className="rounded-xl border border-[hsl(0_0%_10%)] bg-[hsl(0_0%_5%)] p-5">
            <div className="prose prose-invert prose-sm max-w-none text-[hsl(0_0%_75%)] whitespace-pre-wrap leading-8 text-sm">
              {lesson.content_text}
            </div>
          </div>
        )}

        {/* Bottom nav bar */}
        <div className="flex items-center gap-2 pt-2">
          {prevLesson ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-[hsl(0_0%_12%)] text-[hsl(0_0%_50%)] hover:text-white flex-1"
              onClick={() => navigateToLesson(prevLesson.id)}
            >
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              السابق
            </Button>
          ) : <div className="flex-1" />}

          <Button
            size="sm"
            variant={lesson.completed ? "outline" : "default"}
            className={`gap-1.5 flex-[2] ${lesson.completed ? "border-primary/30 text-primary" : ""}`}
            onClick={toggleComplete}
          >
            {lesson.completed ? (
              <>
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                تمت المشاهدة
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" strokeWidth={1.5} />
                تمت المشاهدة
              </>
            )}
          </Button>

          {nextLesson ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-[hsl(0_0%_12%)] text-[hsl(0_0%_50%)] hover:text-white flex-1"
              onClick={() => navigateToLesson(nextLesson.id)}
            >
              التالي
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          ) : <div className="flex-1" />}
        </div>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalLessonPlayer;
