import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  ClipboardList,
  Clock,
  Lock,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import TrainerLayout from "@/components/TrainerLayout";
import UpgradeModal from "@/components/UpgradeModal";
import PremiumSkeleton from "@/components/PremiumSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import usePageTitle from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";

const Copilot = () => {
  usePageTitle("AI كوبايلت");
  const { user } = useAuth();
  const { isPro, hasCopilotAccess } = usePlanLimits();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: recommendations = [], isLoading: loadingRecs } = useQuery({
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
    enabled: !!user && hasCopilotAccess,
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
    enabled: !!user && hasCopilotAccess,
  });

  const pendingRecs = recommendations.filter((r: any) => r.status === "pending");
  const resolvedRecs = recommendations.filter((r: any) => r.status !== "pending");

  if (!hasCopilotAccess) {
    return (
      <TrainerLayout title="AI كوبايلت">
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card">
            <Lock className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-foreground">هذه الميزة للباقة الاحترافية</h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            كوبايلت الذكاء الاصطناعي يساعدك على إنشاء برامج تدريب متكاملة وتوصيات أسبوعية ذكية لكل عميل
          </p>
          <Button
            className="mt-8 rounded-full px-8"
            size="lg"
            onClick={() => setShowUpgrade(true)}
          >
            <Sparkles className="ml-2 h-4 w-4" strokeWidth={1.5} />
            ترقية الآن - 69 ر.س/شهر
          </Button>
          <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} title="هذه الميزة للباقة الاحترافية" description="كوبايلت الذكاء الاصطناعي متاح فقط في الباقة الاحترافية" onUpgrade={() => { setShowUpgrade(false); navigate("/subscription"); }} />
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout title="AI كوبايلت">
      <div className="space-y-6 page-enter">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">توصيات معلقة</div>
                <div className="text-2xl font-bold text-foreground">{pendingRecs.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">برامج تم إنشاؤها</div>
                <div className="text-2xl font-bold text-foreground">
                  {recommendations.filter((r: any) => r.type === "program").length}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <Users className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">عملاء مع كوبايلت</div>
                <div className="text-2xl font-bold text-foreground">
                  {new Set(recommendations.map((r: any) => r.client_id)).size}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generate New */}
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bot className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-foreground">إنشاء برنامج بالذكاء الاصطناعي</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-5">
              اختر عميلاً لإنشاء برنامج تدريب مخصص بالذكاء الاصطناعي، أو افتح ملف العميل واستخدم الكوبايلت من هناك.
            </p>
            {clients.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clients.slice(0, 6).map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-right transition-all duration-200 hover:border-primary/30 hover:bg-card"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {client.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{client.name}</div>
                      <div className="text-xs text-muted-foreground">فتح الكوبايلت</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
                <p className="mt-3 text-muted-foreground">أضف عملاء أولاً لاستخدام الكوبايلت</p>
                <Button className="mt-4 rounded-full" onClick={() => navigate("/clients")}>
                  إضافة عميل
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Recommendations */}
        {pendingRecs.length > 0 && (
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-5 w-5 text-yellow-400" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold text-foreground">توصيات بانتظار المراجعة</h3>
              </div>
              <div className="space-y-3">
                {pendingRecs.map((rec: any) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => navigate(`/clients/${rec.client_id}`)}
                    className="flex w-full items-center gap-4 rounded-xl border border-border bg-background px-5 py-4 text-right transition-all duration-200 hover:border-primary/30"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/10">
                      <Sparkles className="h-4 w-4 text-yellow-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground">{rec.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {rec.clients?.name || "عميل"} · {new Date(rec.created_at).toLocaleDateString("ar-SA")}
                      </div>
                    </div>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {loadingRecs ? (
          <PremiumSkeleton rows={4} />
        ) : resolvedRecs.length > 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold text-foreground">آخر التوليدات</h3>
              </div>
              <div className="space-y-3">
                {resolvedRecs.slice(0, 10).map((rec: any) => (
                  <div
                    key={rec.id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-background px-5 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                      <ClipboardList className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground">{rec.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {rec.clients?.name || "عميل"} · {rec.status === "approved" ? "تمت الموافقة" : rec.status === "rejected" ? "مرفوض" : rec.status}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(rec.created_at).toLocaleDateString("ar-SA")}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
              <p className="mt-4 text-lg font-semibold text-foreground">لم تُنشئ أي برامج بالكوبايلت بعد</p>
              <p className="mt-2 text-sm text-muted-foreground">اختر عميلاً واستخدم الذكاء الاصطناعي لإنشاء برنامج تدريب مخصص</p>
            </CardContent>
          </Card>
        )}
      </div>
    </TrainerLayout>
  );
};

export default Copilot;
