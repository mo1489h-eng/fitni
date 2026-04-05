import { useState, useEffect } from "react";
import { usePortalToken } from "@/hooks/usePortalToken";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BookOpen, Video, FileText, Type, ChevronDown, ChevronUp,
  CheckCircle2, Circle, ArrowRight, X
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
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
  return url;
};

const PortalVault = () => {
  const { token } = usePortalToken();
  const [units, setUnits] = useState<PortalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<PortalLesson | null>(null);

  const fetchVault = async () => {
    if (!token) return;
    const { data, error } = await supabase.rpc("get_portal_vault", { p_token: token });
    if (!error && data) {
      setUnits(data as unknown as PortalUnit[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchVault(); }, [token]);

  const toggleComplete = async (lesson: PortalLesson) => {
    if (!token) return;
    const { data, error } = await supabase.rpc("toggle_portal_vault_progress", {
      p_token: token,
      p_lesson_id: lesson.id,
    });
    if (!error) {
      toast.success(data ? "تم تسجيل المشاهدة" : "تم الغاء التسجيل");
      fetchVault();
    }
  };

  if (activeLesson) {
    return (
      <ClientPortalLayout>
        <div className="space-y-4" dir="rtl">
          <button
            onClick={() => setActiveLesson(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            العودة للمكتبة
          </button>

          <h2 className="text-lg font-bold text-foreground">{activeLesson.title}</h2>

          {activeLesson.content_type === "video" && activeLesson.content_url && (
            <div className="aspect-video rounded-xl overflow-hidden border border-[hsl(0_0%_13%)] bg-black">
              <iframe
                src={getEmbedUrl(activeLesson.content_url) || ""}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {activeLesson.content_type === "pdf" && activeLesson.content_url && (
            <div className="rounded-xl overflow-hidden border border-[hsl(0_0%_13%)] bg-black" style={{ height: "70vh" }}>
              <iframe src={activeLesson.content_url} className="w-full h-full" />
            </div>
          )}

          {activeLesson.content_type === "article" && activeLesson.content_text && (
            <Card className="bg-[hsl(0_0%_7%)] border-[hsl(0_0%_13%)] p-5">
              <div className="prose prose-invert prose-sm max-w-none text-foreground whitespace-pre-wrap leading-7">
                {activeLesson.content_text}
              </div>
            </Card>
          )}

          <Button
            variant={activeLesson.completed ? "outline" : "default"}
            className="w-full gap-2"
            onClick={() => toggleComplete(activeLesson)}
          >
            {activeLesson.completed ? (
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
        </div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
      <div className="space-y-5" dir="rtl">
        <h1 className="text-xl font-bold text-foreground">المكتبة التعليمية</h1>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
        ) : units.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 bg-[hsl(0_0%_7%)] border-[hsl(0_0%_13%)]">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">لا توجد محتويات متاحة حاليا</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {units.map((unit) => {
              const expanded = expandedUnit === unit.id;
              const completedCount = unit.lessons.filter((l) => l.completed).length;
              const totalCount = unit.lessons.length;
              const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

              return (
                <Card key={unit.id} className="bg-[hsl(0_0%_7%)] border-[hsl(0_0%_13%)] overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-[hsl(0_0%_9%)] transition-colors"
                    onClick={() => setExpandedUnit(expanded ? null : unit.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground text-sm">{unit.title}</h3>
                      {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    {unit.description && (
                      <p className="text-xs text-muted-foreground mb-2">{unit.description}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="h-1.5 flex-1 bg-[hsl(0_0%_13%)]" />
                      <span className="text-[10px] text-muted-foreground shrink-0">{completedCount}/{totalCount}</span>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-[hsl(0_0%_13%)] divide-y divide-[hsl(0_0%_10%)]">
                      {unit.lessons.sort((a, b) => a.lesson_order - b.lesson_order).map((lesson) => {
                        const Icon = contentTypeIcons[lesson.content_type] || FileText;
                        return (
                          <div
                            key={lesson.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-[hsl(0_0%_9%)] cursor-pointer transition-colors"
                            onClick={() => setActiveLesson(lesson)}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleComplete(lesson); }}
                              className="shrink-0"
                            >
                              {lesson.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                              )}
                            </button>
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                            <span className={`text-sm flex-1 ${lesson.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {lesson.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default PortalVault;
