import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bot, ClipboardList, Clock, Sparkles, TrendingUp, Users, Zap,
} from "lucide-react";

const CopilotPrograms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["copilot-all-recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("copilot_recommendations")
        .select("*, clients!copilot_recommendations_client_id_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["copilot-clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const pendingRecs = recommendations.filter((r: any) => r.status === "pending");
  const resolvedRecs = recommendations.filter((r: any) => r.status !== "pending");

  return (
    <div className="space-y-5">
      {/* Quick Stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">توصيات معلقة</div>
              <div className="text-xl font-bold text-foreground">{pendingRecs.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">برامج تم إنشاؤها</div>
              <div className="text-xl font-bold text-foreground">
                {recommendations.filter((r: any) => r.type === "program").length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Users className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">عملاء مع كوبايلت</div>
              <div className="text-xl font-bold text-foreground">
                {new Set(recommendations.map((r: any) => r.client_id)).size}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate New */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <Bot className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-foreground">إنشاء برنامج بالذكاء الاصطناعي</h3>
          </div>
          <p className="text-muted-foreground text-xs mb-4">
            اختر عميلاً لإنشاء برنامج تدريب مخصص، أو افتح ملف العميل واستخدم الكوبايلت من هناك.
          </p>
          {clients.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {clients.slice(0, 6).map(client => (
                <button
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-right transition-all hover:border-primary/30 hover:bg-card"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {client.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{client.name}</p>
                    <p className="text-[10px] text-muted-foreground">فتح الكوبايلت</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Users className="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-2 text-sm text-muted-foreground">أضف عملاء أولاً لاستخدام الكوبايلت</p>
              <Button className="mt-3 rounded-full" size="sm" onClick={() => navigate("/clients")}>إضافة عميل</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending */}
      {pendingRecs.length > 0 && (
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="h-5 w-5 text-warning" strokeWidth={1.5} />
              <h3 className="text-base font-semibold text-foreground">توصيات بانتظار المراجعة</h3>
            </div>
            <div className="space-y-2">
              {pendingRecs.map((rec: any) => (
                <button
                  key={rec.id}
                  onClick={() => navigate(`/clients/${rec.client_id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-right transition-all hover:border-primary/30"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-warning/20 bg-warning/10">
                    <Sparkles className="h-4 w-4 text-warning" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {rec.clients?.name || "عميل"} - {new Date(rec.created_at).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : resolvedRecs.length > 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <h3 className="text-base font-semibold text-foreground">آخر التوليدات</h3>
            </div>
            <div className="space-y-2">
              {resolvedRecs.slice(0, 10).map((rec: any) => (
                <div key={rec.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                    <ClipboardList className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {rec.clients?.name || "عميل"} - {rec.status === "accepted" ? "تمت الموافقة" : rec.status === "rejected" ? "مرفوض" : rec.status}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(rec.created_at).toLocaleDateString("ar-SA")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/20" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-semibold text-foreground">لم تُنشئ أي برامج بالكوبايلت بعد</p>
            <p className="mt-1 text-xs text-muted-foreground">اختر عميلاً واستخدم الذكاء الاصطناعي لإنشاء برنامج مخصص</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CopilotPrograms;
